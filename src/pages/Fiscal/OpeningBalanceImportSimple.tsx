import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'

import { useArabicLanguage } from '@/services/ArabicLanguageService'
import { OpeningBalanceImportService, type ImportResult } from '@/services/OpeningBalanceImportService'
import EnhancedOBImportResultsModal from '@/components/Fiscal/EnhancedOBImportResultsModal'
import { supabase } from '@/utils/supabase'
import { audit } from '@/utils/audit'
import SearchableSelect, { type SearchableSelectOption } from '@/components/Common/SearchableSelect'
import DraggablePanelContainer from '@/components/Common/DraggablePanelContainer'
import UnifiedCRUDForm, { type FormConfig } from '@/components/Common/UnifiedCRUDForm'
import { useFiscalYears } from '@/services/fiscal/hooks/useFiscalYear'
import { useTransactionsData } from '@/contexts/TransactionsDataContext'
import { useScopeOptional } from '@/contexts/ScopeContext'

import './FiscalPages.css'

type ManualRow = {
  account_code: string
  opening_balance_debit: string
  opening_balance_credit: string
  currency_code: string
}

type ExistingBalanceRow = {
  id: string
  account_id: string
  project_id: string | null
  cost_center_id: string | null
  amount: number
  currency_code: string | null
  import_id: string | null
  created_at: string
}

export default function OpeningBalanceImportSimple() {
  const { isRTL } = useArabicLanguage()

  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''

  const txData = useTransactionsData()
  const [fiscalYearId, setFiscalYearId] = useState<string>('')

  const [projectCode, setProjectCode] = useState<string>('')
  const [costCenterCode, setCostCenterCode] = useState<string>('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [costCenterId, setCostCenterId] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currencyOptions, setCurrencyOptions] = useState<string[]>([])
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { account_code: '', opening_balance_debit: '', opening_balance_credit: '', currency_code: 'EGP' },
  ])

  const [replaceExisting, setReplaceExisting] = useState(true)

  const [existingBalances, setExistingBalances] = useState<ExistingBalanceRow[]>([])
  const [existingLoading, setExistingLoading] = useState(false)
  const [enrichedMap, setEnrichedMap] = useState<{ accounts: Map<string, any>; projects: Map<string, any>; costCenters: Map<string, any> } | null>(null)

  const [importStatus, setImportStatus] = useState<ImportResult | null>(null)
  const [showResultsModal, setShowResultsModal] = useState(false)

  const [obCrudOpen, setObCrudOpen] = useState(false)
  const [obCrudMode, setObCrudMode] = useState<'create' | 'edit'>('create')
  const [obEditingRow, setObEditingRow] = useState<ExistingBalanceRow | null>(null)

  const fiscalYearsQuery = useFiscalYears(orgId)

  useEffect(() => {
    setProjectCode('')
    setCostCenterCode('')
    setFiscalYearId('')
  }, [orgId])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('opening_balance_fiscal_year') || ''
      if (saved && saved !== fiscalYearId) setFiscalYearId(saved)
    } catch {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    try {
      if (fiscalYearId) localStorage.setItem('opening_balance_fiscal_year', fiscalYearId)
    } catch {
      // noop
    }
  }, [fiscalYearId])

  useEffect(() => {
    ;(async () => {
      try {
        const currencies = await OpeningBalanceImportService.fetchCurrencies()
        setCurrencyOptions(currencies || [])
      } catch {
        setCurrencyOptions([])
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!orgId) {
        setProjectId(null)
        setCostCenterId(null)
        return
      }

      try {
        if (projectCode && projectCode.trim()) {
          const { data, error } = await supabase
            .from('projects')
            .select('id')
            .or(`org_id.eq.${orgId},org_id.is.null`)
            .eq('code', projectCode.trim())
            .limit(1)
          if (error) throw error
          setProjectId((data?.[0] as any)?.id || null)
        } else {
          setProjectId(null)
        }
      } catch {
        setProjectId(null)
      }

      try {
        if (costCenterCode && costCenterCode.trim()) {
          const { data, error } = await supabase
            .from('cost_centers')
            .select('id')
            .eq('org_id', orgId)
            .eq('code', costCenterCode.trim())
            .limit(1)
          if (error) throw error
          setCostCenterId((data?.[0] as any)?.id || null)
        } else {
          setCostCenterId(null)
        }
      } catch {
        setCostCenterId(null)
      }
    })()
  }, [orgId, projectCode, costCenterCode])

  const orgOptions = txData.organizations
  const projects = txData.projects
  const costCenters = txData.costCenters
  const accounts = txData.accounts

  const accountHasChildren = useMemo(() => {
    const childCount = new Map<string, number>()
    for (const a of (accounts || []) as any[]) {
      if (a?.parent_id) {
        const k = String(a.parent_id)
        childCount.set(k, (childCount.get(k) || 0) + 1)
      }
    }
    return (id: string) => (childCount.get(id) || 0) > 0
  }, [accounts])

  const orgLabel = useMemo(() => {
    const found = orgOptions.find((o: any) => o.id === orgId)
    if (!found) return ''
    return found.code ? `${found.code} - ${found.name}` : (found.name || found.id)
  }, [orgOptions, orgId])

  const orgSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return (orgOptions || []).map((o: any) => ({
      value: String(o.id),
      label: o.code ? `${o.code} - ${o.name}` : (o.name || o.id),
      searchText: `${o.code || ''} ${o.name || ''}`.toLowerCase(),
    }))
  }, [orgOptions])

  const fiscalYearSelectOptions: SearchableSelectOption[] = useMemo(() => {
    const rows = (fiscalYearsQuery.data || []) as any[]
    return rows
      .slice()
      .sort((a, b) => String(b.yearNumber || b.year_number || '').localeCompare(String(a.yearNumber || a.year_number || '')))
      .map((fy) => ({
        value: String(fy.id),
        label: isRTL ? (fy.nameAr || fy.name_ar || fy.nameEn || fy.name_en || fy.yearNumber || fy.year_number || fy.id) : (fy.nameEn || fy.name_en || fy.nameAr || fy.name_ar || fy.yearNumber || fy.year_number || fy.id),
        searchText: `${fy.nameEn || fy.name_en || ''} ${fy.nameAr || fy.name_ar || ''} ${fy.yearNumber || fy.year_number || ''}`.toLowerCase(),
      }))
  }, [fiscalYearsQuery.data, isRTL])

  const selectedFiscalYear = useMemo(() => {
    const rows = (fiscalYearsQuery.data || []) as any[]
    return rows.find((fy) => String((fy as any).id) === String(fiscalYearId)) || null
  }, [fiscalYearsQuery.data, fiscalYearId])

  const fiscalYearStatus = useMemo(() => {
    const s = (selectedFiscalYear as any)?.status
    return typeof s === 'string' ? s : null
  }, [selectedFiscalYear])

  const canMutateOpeningBalances = useMemo(() => {
    if (!orgId || !fiscalYearId) return false
    if (fiscalYearStatus === 'closed' || fiscalYearStatus === 'archived') return false
    return true
  }, [orgId, fiscalYearId, fiscalYearStatus])

  const accountIdSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return (accounts || [])
      .filter((a: any) => !orgId || !a.org_id || a.org_id === orgId)
      .filter((a: any) => {
        const hasPostableFlags = a.is_postable !== undefined || a.is_leaf !== undefined
        const isPostable = hasPostableFlags ? (a.is_postable === true || a.is_leaf === true) : true
        const allowTx = a.allow_transactions !== false
        const isLeaf = !accountHasChildren(String(a.id))
        return isPostable && allowTx && isLeaf
      })
      .slice()
      .sort((a: any, b: any) => String(a.code || '').localeCompare(String(b.code || '')))
      .map((a: any) => ({
        value: String(a.id),
        label: `${a.code} - ${(a.name_ar || a.name || '')}`.substring(0, 60),
        searchText: `${a.code} ${(a.name_ar || a.name || '')}`.toLowerCase(),
      }))
  }, [accounts, orgId, accountHasChildren])

  const projectIdSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return (projects || [])
      .filter((p: any) => !orgId || !p.org_id || p.org_id === orgId)
      .slice()
      .sort((a: any, b: any) => String(a.code || '').localeCompare(String(b.code || '')))
      .map((p: any) => ({
        value: String(p.id),
        label: `${p.code} - ${p.name}`.substring(0, 52),
        searchText: `${p.code} ${p.name}`.toLowerCase(),
      }))
  }, [projects, orgId])

  const costCenterIdSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return (costCenters || [])
      .filter((c: any) => !orgId || !c.org_id || c.org_id === orgId)
      .slice()
      .sort((a: any, b: any) => String(a.code || '').localeCompare(String(b.code || '')))
      .map((c: any) => ({
        value: String(c.id),
        label: `${c.code} - ${c.name}`.substring(0, 52),
        searchText: `${c.code} ${c.name}`.toLowerCase(),
      }))
  }, [costCenters, orgId])

  const projectSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: isRTL ? 'كل المشاريع' : 'All projects', searchText: '' },
      ...(projects || [])
        .filter((p: any) => !orgId || !p.org_id || p.org_id === orgId)
        .slice()
        .sort((a: any, b: any) => String(a.code || '').localeCompare(String(b.code || '')))
        .map((p: any) => ({ value: String(p.code || ''), label: `${p.code} - ${p.name}`.substring(0, 52), searchText: `${p.code} ${p.name}`.toLowerCase() })),
    ]
  }, [projects, isRTL, orgId])

  const costCenterSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: isRTL ? 'كل مراكز التكلفة' : 'All cost centers', searchText: '' },
      ...(costCenters || [])
        .filter((c: any) => !orgId || !c.org_id || c.org_id === orgId)
        .slice()
        .sort((a: any, b: any) => String(a.code || '').localeCompare(String(b.code || '')))
        .map((c: any) => ({ value: String(c.code || ''), label: `${c.code} - ${c.name}`.substring(0, 52), searchText: `${c.code} ${c.name}`.toLowerCase() })),
    ]
  }, [costCenters, isRTL, orgId])

  const accountSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return (accounts || [])
      .filter((a: any) => !orgId || !a.org_id || a.org_id === orgId)
      .filter((a: any) => {
        // Match transaction wizard expectations: leaf + postable + allow_transactions
        const isPostable = !!a.is_postable
        const allowTx = a.allow_transactions !== false
        const isLeaf = !accountHasChildren(String(a.id))
        return isPostable && allowTx && isLeaf
      })
      .slice()
      .sort((a: any, b: any) => String(a.code || '').localeCompare(String(b.code || '')))
      .map((a: any) => ({ value: String(a.code || ''), label: `${a.code} - ${(a.name_ar || a.name || '')}`.substring(0, 60), searchText: `${a.code} ${(a.name_ar || a.name || '')}`.toLowerCase() }))
  }, [accounts, orgId, accountHasChildren])

  const accountIdByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of (accounts || []) as any[]) {
      if (a?.code && a?.id) map.set(String(a.code), String(a.id))
    }
    return map
  }, [accounts])

  const canImport = !!orgId && !!fiscalYearId && !!file && !loading

  const deleteExistingForAccountCodes = useCallback(async (codes: string[]) => {
    const uniq = Array.from(new Set((codes || []).map((c) => String(c || '').trim()).filter(Boolean)))
    if (!uniq.length) return
    if (!orgId || !fiscalYearId) return

    if (projectCode && !projectId) throw new Error(isRTL ? 'المشروع غير صحيح' : 'Invalid project selection')
    if (costCenterCode && !costCenterId) throw new Error(isRTL ? 'مركز التكلفة غير صحيح' : 'Invalid cost center selection')

    const accIds = uniq.map((c) => accountIdByCode.get(c)).filter(Boolean) as string[]
    if (!accIds.length) return

    let dq = supabase
      .from('opening_balances')
      .delete()
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .in('account_id', accIds as any)

    if (projectCode) dq = dq.eq('project_id', projectId as string)
    if (costCenterCode) dq = dq.eq('cost_center_id', costCenterId as string)

    const delRes = await dq
    if (delRes.error) throw delRes.error

    await audit(supabase, 'opening_balances.bulk_delete', 'opening_balances', null, {
      page: 'Fiscal/OpeningBalanceImport',
      table: 'opening_balances',
      operation: 'bulk_delete',
      org_id: orgId,
      fiscal_year_id: fiscalYearId,
      account_ids: accIds,
      project_id: projectCode ? (projectId as string) : null,
      cost_center_id: costCenterCode ? (costCenterId as string) : null,
    })
  }, [orgId, fiscalYearId, projectCode, costCenterCode, projectId, costCenterId, isRTL, accountIdByCode])

  const totals = useMemo(() => {
    const debit = manualRows.reduce((s, r) => s + (Number(r.opening_balance_debit) || 0), 0)
    const credit = manualRows.reduce((s, r) => s + (Number(r.opening_balance_credit) || 0), 0)
    const diff = debit - credit
    const hasAnyAmount = manualRows.some(
      (r) => String(r.opening_balance_debit || '').trim() !== '' || String(r.opening_balance_credit || '').trim() !== ''
    )
    const hasAnyAccount = manualRows.some((r) => String(r.account_code || '').trim() !== '')
    return { debit, credit, diff, isBalanced: Math.round(diff * 100) === 0, hasAnyAmount, hasAnyAccount }
  }, [manualRows])

  const addManualRow = useCallback(() => {
    setManualRows((prev) => [
      ...prev,
      { account_code: '', opening_balance_debit: '', opening_balance_credit: '', currency_code: 'EGP' },
    ])
  }, [])

  const removeManualRow = useCallback((idx: number) => {
    setManualRows((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const updateManualRow = useCallback((idx: number, patch: Partial<ManualRow>) => {
    setManualRows((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }, [])

  const handleDownloadTemplate = useCallback(async () => {
    if (!orgId) return
    setError(null)
    try {
      const blob = await OpeningBalanceImportService.generateAccountsPrefilledTemplate(orgId, { includeCurrency: true })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'opening_balances_template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || String(e))
    }
  }, [orgId])

  const handleImport = useCallback(async () => {
    if (!file || !orgId || !fiscalYearId) return
    setLoading(true)
    setError(null)
    setImportStatus(null)

    try {
      if (replaceExisting) {
        const codes = await OpeningBalanceImportService.extractAccountCodesFromExcel(file)
        await deleteExistingForAccountCodes(codes)
      }

      const result = await OpeningBalanceImportService.importFromExcel(orgId, fiscalYearId, file, undefined, {
        overrideProjectCode: projectCode ? projectCode : undefined,
        overrideCostCenterCode: costCenterCode ? costCenterCode : undefined,
      })
      setImportStatus(result)
      setShowResultsModal(true)

      setFile(null)
      setManualRows([{ account_code: '', opening_balance_debit: '', opening_balance_credit: '', currency_code: 'EGP' }])
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [file, orgId, fiscalYearId, replaceExisting, projectCode, costCenterCode, deleteExistingForAccountCodes])

  const canManualImport = !!orgId && !!fiscalYearId && totals.hasAnyAccount && totals.hasAnyAmount && totals.isBalanced && !loading

  const handleManualImport = useCallback(async () => {
    if (!orgId || !fiscalYearId) return
    setLoading(true)
    setError(null)
    setImportStatus(null)
    try {
      if (replaceExisting) {
        const codes = manualRows.map((r) => r.account_code)
        await deleteExistingForAccountCodes(codes)
      }

      const items = manualRows.map((r) => ({
        account_code: r.account_code,
        opening_balance_debit: r.opening_balance_debit,
        opening_balance_credit: r.opening_balance_credit,
        currency_code: r.currency_code,
        project_code: projectCode ? projectCode : null,
        cost_center_code: costCenterCode ? costCenterCode : null,
      }))
      const result = await OpeningBalanceImportService.importFromManualRows(orgId, fiscalYearId, items as any)
      setImportStatus(result)
      setShowResultsModal(true)

      setFile(null)
      setManualRows([{ account_code: '', opening_balance_debit: '', opening_balance_credit: '', currency_code: 'EGP' }])
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [fiscalYearId, manualRows, orgId, replaceExisting, projectCode, costCenterCode, deleteExistingForAccountCodes])

  const refreshExisting = useCallback(async () => {
    if (!orgId || !fiscalYearId) {
      setExistingBalances([])
      setEnrichedMap(null)
      return
    }
    setExistingLoading(true)
    try {
      if (projectCode && !projectId) {
        setExistingBalances([])
        setEnrichedMap(null)
        return
      }
      if (costCenterCode && !costCenterId) {
        setExistingBalances([])
        setEnrichedMap(null)
        return
      }

      let q = supabase
        .from('opening_balances')
        .select('id, account_id, project_id, cost_center_id, amount, currency_code, import_id, created_at')
        .eq('org_id', orgId)
        .eq('fiscal_year_id', fiscalYearId)
        .order('created_at', { ascending: false })
        .limit(2000)
      if (projectCode) q = q.eq('project_id', projectId as string)
      if (costCenterCode) q = q.eq('cost_center_id', costCenterId as string)
      const { data, error } = await q
      if (error) throw error
      const rows = ((data || []) as any[]) as ExistingBalanceRow[]
      setExistingBalances(rows)

      const maps = await OpeningBalanceImportService.fetchEnrichmentMaps({
        accountIds: rows.map((r) => r.account_id),
        projectIds: rows.map((r) => r.project_id),
        costCenterIds: rows.map((r) => r.cost_center_id),
      })
      setEnrichedMap(maps as any)
    } catch (e: any) {
      setExistingBalances([])
      setEnrichedMap(null)
      setError(e?.message || String(e))
    } finally {
      setExistingLoading(false)
    }
  }, [orgId, fiscalYearId, projectCode, costCenterCode, projectId, costCenterId])

  const openCreateOpeningBalance = useCallback(() => {
    setObCrudMode('create')
    setObEditingRow(null)
    setObCrudOpen(true)
  }, [])

  const openEditOpeningBalance = useCallback((row: ExistingBalanceRow) => {
    setObCrudMode('edit')
    setObEditingRow(row)
    setObCrudOpen(true)
  }, [])

  const closeOpeningBalanceCrud = useCallback(() => {
    setObCrudOpen(false)
    setObEditingRow(null)
  }, [])

  const openingBalanceCrudConfig: FormConfig = useMemo(() => {
    const isEdit = obCrudMode === 'edit'
    return {
      title: isRTL
        ? (isEdit ? 'تعديل رصيد افتتاحي' : 'إضافة رصيد افتتاحي')
        : (isEdit ? 'Edit Opening Balance' : 'Add Opening Balance'),
      formId: 'opening_balance.crud',
      fields: [
        {
          id: 'account_id',
          type: 'searchable-select',
          label: isRTL ? 'الحساب' : 'Account',
          required: true,
          options: accountIdSelectOptions,
          placeholder: isRTL ? 'اختر الحساب' : 'Select account',
          searchable: true,
          clearable: true,
          disabled: isEdit,
        },
        {
          id: 'project_id',
          type: 'searchable-select',
          label: isRTL ? 'المشروع' : 'Project',
          required: false,
          options: projectIdSelectOptions,
          placeholder: isRTL ? 'اختياري' : 'Optional',
          searchable: true,
          clearable: true,
          disabled: !!projectCode,
        },
        {
          id: 'cost_center_id',
          type: 'searchable-select',
          label: isRTL ? 'مركز التكلفة' : 'Cost Center',
          required: false,
          options: costCenterIdSelectOptions,
          placeholder: isRTL ? 'اختياري' : 'Optional',
          searchable: true,
          clearable: true,
          disabled: !!costCenterCode,
        },
        {
          id: 'amount',
          type: 'number',
          label: isRTL ? 'المبلغ' : 'Amount',
          required: true,
        },
        {
          id: 'currency_code',
          type: 'select',
          label: isRTL ? 'العملة' : 'Currency',
          required: false,
          options: (currencyOptions.length ? currencyOptions : ['EGP']).map((c) => ({ value: c, label: c, searchText: c })),
        },
      ],
      submitLabel: isRTL ? 'حفظ' : 'Save',
      cancelLabel: isRTL ? 'إغلاق' : 'Close',
      customValidator: (data) => {
        const raw = (data as any).amount
        const n = raw === '' || raw === null || raw === undefined ? NaN : Number(raw)
        const errors = [] as any[]
        if (!isFinite(n)) errors.push({ field: 'amount', message: isRTL ? 'المبلغ مطلوب' : 'Amount is required' })
        return { isValid: errors.length === 0, errors }
      },
    }
  }, [isRTL, obCrudMode, accountIdSelectOptions, projectIdSelectOptions, costCenterIdSelectOptions, currencyOptions, projectCode, costCenterCode])

  const handleOpeningBalanceCrudSubmit = useCallback(async (data: Record<string, unknown>) => {
    if (!orgId || !fiscalYearId) throw new Error(isRTL ? 'يجب اختيار المؤسسة والسنة المالية' : 'Organization and fiscal year are required')
    if (!canMutateOpeningBalances) {
      throw new Error(isRTL ? 'لا يمكن تعديل الأرصدة في سنة مالية مغلقة/مؤرشفة' : 'Cannot edit balances for a closed/archived fiscal year')
    }

    if (projectCode && !projectId) throw new Error(isRTL ? 'المشروع غير صحيح' : 'Invalid project selection')
    if (costCenterCode && !costCenterId) throw new Error(isRTL ? 'مركز التكلفة غير صحيح' : 'Invalid cost center selection')

    const accountId = String((data as any).account_id || '').trim()
    if (!accountId) throw new Error(isRTL ? 'الحساب مطلوب' : 'Account is required')

    const projectIdVal = projectCode ? (projectId as string) : ((data as any).project_id ? String((data as any).project_id) : null)
    const costCenterIdVal = costCenterCode ? (costCenterId as string) : ((data as any).cost_center_id ? String((data as any).cost_center_id) : null)
    const amount = Number((data as any).amount)
    const currencyCode = (data as any).currency_code ? String((data as any).currency_code) : null

    if (!isFinite(amount)) throw new Error(isRTL ? 'المبلغ غير صالح' : 'Invalid amount')

    if (obCrudMode === 'create') {
      const { data: insData, error: insErr } = await supabase
        .from('opening_balances')
        .insert({
          org_id: orgId,
          fiscal_year_id: fiscalYearId,
          account_id: accountId,
          project_id: projectIdVal,
          cost_center_id: costCenterIdVal,
          amount,
          currency_code: currencyCode,
        } as any)
        .select('id')
        .single()

      if (insErr) throw insErr

      await audit(supabase, 'opening_balances.create', 'opening_balances', (insData as any)?.id ?? null, {
        page: 'Fiscal/OpeningBalanceImport',
        table: 'opening_balances',
        operation: 'create',
        org_id: orgId,
        fiscal_year_id: fiscalYearId,
        account_id: accountId,
        project_id: projectIdVal,
        cost_center_id: costCenterIdVal,
        amount,
        currency_code: currencyCode,
      })
    } else {
      if (!obEditingRow?.id) throw new Error(isRTL ? 'سجل غير صالح' : 'Invalid record')

      const { error: updErr } = await supabase
        .from('opening_balances')
        .update({
          project_id: projectIdVal,
          cost_center_id: costCenterIdVal,
          amount,
          currency_code: currencyCode,
        } as any)
        .eq('id', obEditingRow.id)

      if (updErr) throw updErr

      await audit(supabase, 'opening_balances.update', 'opening_balances', obEditingRow.id, {
        page: 'Fiscal/OpeningBalanceImport',
        table: 'opening_balances',
        operation: 'update',
        org_id: orgId,
        fiscal_year_id: fiscalYearId,
        record_id: obEditingRow.id,
        account_id: accountId,
        project_id: projectIdVal,
        cost_center_id: costCenterIdVal,
        amount,
        currency_code: currencyCode,
      })
    }

    closeOpeningBalanceCrud()
    await refreshExisting()
  }, [orgId, fiscalYearId, isRTL, canMutateOpeningBalances, projectCode, costCenterCode, projectId, costCenterId, obCrudMode, obEditingRow?.id, closeOpeningBalanceCrud, refreshExisting])

  const handleDeleteOpeningBalance = useCallback(async (row: ExistingBalanceRow) => {
    if (!canMutateOpeningBalances) {
      setError(isRTL ? 'لا يمكن حذف الأرصدة في سنة مالية مغلقة/مؤرشفة' : 'Cannot delete balances for a closed/archived fiscal year')
      return
    }
    const ok = window.confirm(
      isRTL
        ? 'هل أنت متأكد من حذف هذا الرصيد الافتتاحي؟'
        : 'Are you sure you want to delete this opening balance?'
    )
    if (!ok) return

    setExistingLoading(true)
    setError(null)
    try {
      const { error: delErr } = await supabase.from('opening_balances').delete().eq('id', row.id)
      if (delErr) throw delErr

      await audit(supabase, 'opening_balances.delete', 'opening_balances', row.id, {
        page: 'Fiscal/OpeningBalanceImport',
        table: 'opening_balances',
        operation: 'delete',
        org_id: orgId,
        fiscal_year_id: fiscalYearId,
        record_id: row.id,
        account_id: row.account_id,
        project_id: row.project_id,
        cost_center_id: row.cost_center_id,
        amount: row.amount,
        currency_code: row.currency_code,
      })
      await refreshExisting()
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setExistingLoading(false)
    }
  }, [canMutateOpeningBalances, isRTL, refreshExisting, orgId, fiscalYearId])

  useEffect(() => {
    refreshExisting()
  }, [refreshExisting])

  useEffect(() => {
    if (importStatus?.importId) refreshExisting()
  }, [importStatus?.importId, refreshExisting])

  return (
    <div className="fiscal-page" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="fiscal-page-header">
        <div className="fiscal-page-header-left">
          <div>
            <h1 className="fiscal-page-title">{isRTL ? 'استيراد الأرصدة الافتتاحية' : 'Opening Balance Import'}</h1>
            <p className="fiscal-page-subtitle">
              {isRTL ? 'ملف أو إدخال يدوي (نفس تصميم لوحة المالية)' : 'File import or manual entry (dashboard unified theme)'}
            </p>
          </div>
        </div>
        <div className="fiscal-page-actions">
          <button className="ultimate-btn ultimate-btn-primary" onClick={handleDownloadTemplate} disabled={!orgId}>
            <span className="btn-content">
              <DownloadIcon fontSize="small" />
              <span>{isRTL ? 'تحميل قالب' : 'Download Template'}</span>
            </span>
          </button>
        </div>
      </div>

      <div className="fiscal-page-content">
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <div className="fiscal-card">
          <div className="fiscal-card-header">
            <h3 className="fiscal-card-title">{isRTL ? 'اختيار السنة المالية' : 'Select Fiscal Year'}</h3>
          </div>

          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} flexWrap="wrap">
            <Box sx={{ minWidth: 280 }}>
              <SearchableSelect
                id="opening_balance.org"
                value={orgId}
                options={orgSelectOptions}
                onChange={(v) => { if (scope) void scope.setOrganization(String(v || '')) }}
                placeholder={isRTL ? 'المؤسسة' : 'Organization'}
                clearable={false}
              />
            </Box>

            <Box sx={{ minWidth: 260 }}>
              <SearchableSelect
                id="opening_balance.fiscal_year"
                value={fiscalYearId}
                options={fiscalYearSelectOptions}
                onChange={(v) => setFiscalYearId(String(v || ''))}
                placeholder={isRTL ? 'السنة المالية' : 'Fiscal Year'}
                clearable
                disabled={!orgId || fiscalYearsQuery.isLoading}
              />
            </Box>

            <Box sx={{ minWidth: 260 }}>
              <SearchableSelect
                id="opening_balance.project"
                value={projectCode}
                options={projectSelectOptions}
                onChange={(v) => setProjectCode(String(v || ''))}
                placeholder={isRTL ? 'كل المشاريع' : 'All projects'}
                clearable
                disabled={!orgId || loading}
              />
            </Box>

            <Box sx={{ minWidth: 260 }}>
              <SearchableSelect
                id="opening_balance.cost_center"
                value={costCenterCode}
                options={costCenterSelectOptions}
                onChange={(v) => setCostCenterCode(String(v || ''))}
                placeholder={isRTL ? 'كل مراكز التكلفة' : 'All cost centers'}
                clearable
                disabled={!orgId || loading}
              />
            </Box>
          </Stack>

          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Checkbox checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />}
              label={isRTL ? 'استبدال البيانات الحالية قبل الاستيراد (منع التكرار)' : 'Replace existing balances before import (prevent duplicates)'}
            />
            <Button size="small" variant="outlined" onClick={refreshExisting} disabled={!orgId || !fiscalYearId || existingLoading || loading}>
              {isRTL ? 'تحديث القائمة' : 'Refresh list'}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={openCreateOpeningBalance}
              disabled={!canMutateOpeningBalances || existingLoading || loading}
            >
              {isRTL ? 'إضافة رصيد' : 'Add balance'}
            </Button>
          </Stack>
        </div>

        <div className="fiscal-card">
          <div className="fiscal-card-header">
            <h3 className="fiscal-card-title">{isRTL ? 'الأرصدة الحالية (للتحقق)' : 'Current Opening Balances (Verification)'}</h3>
          </div>

          {existingLoading ? (
            <LinearProgress sx={{ mb: 2 }} />
          ) : existingBalances.length === 0 ? (
            <Alert severity="info">
              {isRTL ? 'لا توجد أرصدة افتتاحية لهذا الاختيار.' : 'No opening balances found for the current selection.'}
            </Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table className="fiscal-table fiscal-import-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>{isRTL ? 'الحساب' : 'Account'}</th>
                    <th style={{ minWidth: 200 }}>{isRTL ? 'الاسم' : 'Name'}</th>
                    <th style={{ minWidth: 180 }}>{isRTL ? 'المشروع' : 'Project'}</th>
                    <th style={{ minWidth: 180 }}>{isRTL ? 'مركز التكلفة' : 'Cost Center'}</th>
                    <th style={{ minWidth: 140 }}>{isRTL ? 'المبلغ' : 'Amount'}</th>
                    <th style={{ minWidth: 120 }}>{isRTL ? 'العملة' : 'Currency'}</th>
                    <th style={{ minWidth: 220 }}>{isRTL ? 'Import' : 'Import'}</th>
                    <th style={{ minWidth: 180 }}>{isRTL ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {existingBalances.map((r) => {
                    const acc = enrichedMap?.accounts?.get(r.account_id)
                    const proj = r.project_id ? enrichedMap?.projects?.get(r.project_id) : null
                    const cc = r.cost_center_id ? enrichedMap?.costCenters?.get(r.cost_center_id) : null
                    const accCode = acc?.code || r.account_id
                    const accName = isRTL ? (acc?.name_ar || acc?.name || '') : (acc?.name || acc?.name_ar || '')
                    const projText = proj ? (proj?.code ? `${proj.code} - ${proj.name || ''}` : (proj?.name || proj?.id)) : ''
                    const ccText = cc ? (cc?.code ? `${cc.code} - ${cc.name || ''}` : (cc?.name || cc?.id)) : ''
                    return (
                      <tr key={r.id}>
                        <td>{accCode}</td>
                        <td>{accName}</td>
                        <td>{projText}</td>
                        <td>{ccText}</td>
                        <td>{Number(r.amount || 0).toLocaleString('ar-EG')}</td>
                        <td>{r.currency_code || ''}</td>
                        <td>{r.import_id || ''}</td>
                        <td>
                          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} sx={{ flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openEditOpeningBalance(r)}
                              disabled={!canMutateOpeningBalances || existingLoading || loading}
                            >
                              {isRTL ? 'تعديل' : 'Edit'}
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => handleDeleteOpeningBalance(r)}
                              disabled={!canMutateOpeningBalances || existingLoading || loading}
                            >
                              {isRTL ? 'حذف' : 'Delete'}
                            </Button>
                          </Stack>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          )}
        </div>

        <DraggablePanelContainer
          storageKey="panel:opening-balances:crud"
          isOpen={obCrudOpen}
          onClose={closeOpeningBalanceCrud}
          title={openingBalanceCrudConfig.title}
          defaults={{
            position: () => ({ x: 120, y: 90 }),
            size: () => ({ width: 980, height: 640 }),
            dockPosition: 'right',
          }}
        >
          <Box sx={{ p: 2 }}>
            <UnifiedCRUDForm
              config={openingBalanceCrudConfig}
              initialData={
                obCrudMode === 'edit' && obEditingRow
                  ? {
                      account_id: obEditingRow.account_id,
                      project_id: obEditingRow.project_id ?? '',
                      cost_center_id: obEditingRow.cost_center_id ?? '',
                      amount: obEditingRow.amount,
                      currency_code: obEditingRow.currency_code || 'EGP',
                    }
                  : { currency_code: currencyOptions[0] || 'EGP' }
              }
              onSubmit={handleOpeningBalanceCrudSubmit}
              onCancel={closeOpeningBalanceCrud}
            />
            {fiscalYearStatus && (fiscalYearStatus === 'closed' || fiscalYearStatus === 'archived') && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {isRTL ? 'هذه السنة المالية مغلقة/مؤرشفة. لا يمكن تعديل الأرصدة.' : 'This fiscal year is closed/archived. Balances cannot be modified.'}
              </Alert>
            )}
          </Box>
        </DraggablePanelContainer>

        <div className="fiscal-card">
          <div className="fiscal-card-header">
            <h3 className="fiscal-card-title">{isRTL ? 'الإدخال اليدوي' : 'Manual Entry'}</h3>
            <div>
              <button className="ultimate-btn ultimate-btn-add" onClick={addManualRow} disabled={!orgId || !fiscalYearId || loading}>
                <span className="btn-content">
                  <AddIcon fontSize="small" />
                  <span>{isRTL ? 'إضافة صف' : 'Add Row'}</span>
                </span>
              </button>
            </div>
          </div>

          <Box sx={{ mb: 2 }}>
            {!!orgLabel && <Chip color="info" label={(isRTL ? 'المؤسسة: ' : 'Org: ') + orgLabel} />}
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <table className="fiscal-table fiscal-import-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 280 }}>{isRTL ? 'الحساب' : 'Account'}</th>
                  <th style={{ minWidth: 140 }}>{isRTL ? 'مدين' : 'Debit'}</th>
                  <th style={{ minWidth: 140 }}>{isRTL ? 'دائن' : 'Credit'}</th>
                  <th style={{ minWidth: 140 }}>{isRTL ? 'العملة' : 'Currency'}</th>
                  <th style={{ minWidth: 120 }}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {manualRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <SearchableSelect
                        id={`opening_balance.row.${idx}.account`}
                        value={row.account_code}
                        options={accountSelectOptions}
                        onChange={(v) => updateManualRow(idx, { account_code: String(v || '') })}
                        placeholder={isRTL ? 'الحساب' : 'Account'}
                        disabled={!orgId || !fiscalYearId || loading}
                        clearable
                        compact
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        type="number"
                        value={row.opening_balance_debit}
                        onChange={(e) => updateManualRow(idx, { opening_balance_debit: e.target.value })}
                        disabled={!orgId || !fiscalYearId || loading}
                        fullWidth
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        type="number"
                        value={row.opening_balance_credit}
                        onChange={(e) => updateManualRow(idx, { opening_balance_credit: e.target.value })}
                        disabled={!orgId || !fiscalYearId || loading}
                        fullWidth
                      />
                    </td>
                    <td>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={row.currency_code || 'EGP'}
                          onChange={(e) => updateManualRow(idx, { currency_code: String(e.target.value || 'EGP') })}
                          disabled={!orgId || !fiscalYearId || loading}
                        >
                          {(currencyOptions.length ? currencyOptions : ['EGP']).map((c) => (
                            <MenuItem key={c} value={c}>{c}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </td>
                    <td>
                      <Tooltip title={isRTL ? 'حذف' : 'Delete'}>
                        <span>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => removeManualRow(idx)}
                            disabled={manualRows.length <= 1 || loading}
                            startIcon={<DeleteIcon fontSize="small" />}
                          >
                            {isRTL ? 'حذف' : 'Delete'}
                          </Button>
                        </span>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <div className="fiscal-grid" style={{ marginTop: '16px' }}>
            <div className="fiscal-grid-item">
              <div className="fiscal-grid-item-label">{isRTL ? 'إجمالي المدين' : 'Total Debit'}</div>
              <div className="fiscal-grid-item-value">{totals.debit.toLocaleString('ar-EG')}</div>
            </div>
            <div className="fiscal-grid-item">
              <div className="fiscal-grid-item-label">{isRTL ? 'إجمالي الدائن' : 'Total Credit'}</div>
              <div className="fiscal-grid-item-value">{totals.credit.toLocaleString('ar-EG')}</div>
            </div>
            <div className="fiscal-grid-item">
              <div className="fiscal-grid-item-label">{isRTL ? 'الفرق' : 'Difference'}</div>
              <div className={'fiscal-grid-item-value ' + (totals.isBalanced ? 'positive' : '')}>
                {totals.diff.toLocaleString('ar-EG')}
              </div>
            </div>
          </div>

          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems="center" sx={{ mt: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={<Checkbox checked={totals.isBalanced} disabled />}
              label={isRTL ? 'البيانات متوازنة' : 'Balanced'}
            />
            {!totals.isBalanced && totals.hasAnyAmount && (
              <Alert severity="warning" sx={{ flexGrow: 1 }}>
                {isRTL ? 'يجب أن يتساوى المدين مع الدائن قبل الحفظ' : 'Debit and Credit must balance before saving'}
              </Alert>
            )}
          </Stack>

          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <button className="ultimate-btn ultimate-btn-primary" onClick={handleManualImport} disabled={!canManualImport}>
              <span className="btn-content">
                <CloudUploadIcon fontSize="small" />
                <span>{isRTL ? 'حفظ / استيراد' : 'Save / Import'}</span>
              </span>
            </button>
          </Stack>
        </div>

        <div className="fiscal-card">
          <div className="fiscal-card-header">
            <h3 className="fiscal-card-title">{isRTL ? 'الاستيراد من ملف' : 'Import From File'}</h3>
          </div>

          <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={2} alignItems="center" flexWrap="wrap">
            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled={!orgId || !fiscalYearId || loading}>
              {isRTL ? 'اختيار ملف' : 'Choose File'}
              <input
                hidden
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setFile(f)
                  setImportStatus(null)
                }}
              />
            </Button>
            {file && <Chip label={file.name} />}
            <Button variant="contained" onClick={handleImport} disabled={!canImport}>
              {loading ? (isRTL ? 'جاري الاستيراد...' : 'Importing...') : (isRTL ? 'استيراد' : 'Import')}
            </Button>
          </Stack>

          <Alert severity="info" sx={{ mt: 2 }}>
            {isRTL
              ? 'ملاحظة: إذا لم تُنشأ سجلات في opening_balance_imports فهذا يعني أن RPC لم يُنفَّذ أو فشل قبل إنشاء العملية.'
              : 'Note: if no rows appear in opening_balance_imports, the RPC was not executed or failed before creating the job.'}
          </Alert>
        </div>

        {importStatus && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={importStatus.status === 'completed' ? 'success' : importStatus.status === 'failed' ? 'error' : 'info'}>
              <Stack direction={isRTL ? 'row-reverse' : 'row'} spacing={1} flexWrap="wrap" alignItems="center">
                <Typography variant="body2">
                  {(isRTL ? 'Job: ' : 'Job: ') + importStatus.importId}
                </Typography>
                <Chip label={(isRTL ? 'الحالة: ' : 'Status: ') + importStatus.status} />
                <Chip label={(isRTL ? 'الإجمالي: ' : 'Total: ') + importStatus.totalRows} />
                <Chip label={(isRTL ? 'ناجحة: ' : 'Success: ') + importStatus.successRows} color="success" />
                <Chip label={(isRTL ? 'فاشلة: ' : 'Failed: ') + importStatus.failedRows} color="error" />
                <Button size="small" variant="outlined" onClick={() => setShowResultsModal(true)}>
                  {isRTL ? 'عرض التفاصيل' : 'View Details'}
                </Button>
              </Stack>
            </Alert>
          </Box>
        )}
      </div>

      <EnhancedOBImportResultsModal
        open={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        importId={importStatus?.importId || ''}
        orgId={orgId}
        fiscalYearId={fiscalYearId}
        uploadHeaders={[]}
      />
    </div>
  )
}
