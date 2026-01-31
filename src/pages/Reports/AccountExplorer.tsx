import React, { useEffect, useMemo, useRef, useState } from 'react'
import './StandardFinancialStatements.css'
import styles from './TrialBalanceAllLevels.module.css'
import { supabase } from '../../utils/supabase'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { tableColWidths, type ExplorerMode } from '../../components/Reports/AccountColumns'
import ReportTreeView from '../../components/TreeView/ReportTreeView'
import {
  fetchProjects,
  fetchOrganizations,
  type LookupOption,
  fetchAccountsMinimal
} from '../../services/lookups'
import { getAllTransactionClassifications, type TransactionClassification } from '../../services/transaction-classification'
import { getExpensesCategoriesList } from '../../services/sub-tree'
import { getCostCentersForSelector } from '../../services/cost-centers'
import { listWorkItemsAll } from '../../services/work-items'
import { getCompanyConfig } from '../../services/company-config'
import { fetchGLSummary, type UnifiedFilters } from '../../services/reports/unified-financial-query'
import SearchableSelect, { type SearchableSelectOption } from '../../components/Common/SearchableSelect'
import { useScope } from '../../contexts/ScopeContext'
import useAppStore from '../../store/useAppStore'
import TableView from '@mui/icons-material/TableView'
import Print from '@mui/icons-material/Print'
import PictureAsPdf from '@mui/icons-material/PictureAsPdf'
import Refresh from '@mui/icons-material/Refresh'
import UnfoldMore from '@mui/icons-material/UnfoldMore'
import UnfoldLess from '@mui/icons-material/UnfoldLess'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { generateFinancialPDF, type PDFTableData, type PDFOptions } from '../../services/pdf-generator'

// Account Explorer (Financial Reports)
// Read-only page that reuses chart-of-accounts hierarchy and displays balances in tree and table views.
// Shows final debit, final credit, and net. Supports posted-only vs all transactions and project filter.

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function startOfYearISO() {
  const d = new Date()
  return `${d.getFullYear()}-01-01`
}

interface Amounts {
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  closing_debit: number
  closing_credit: number
}

interface Node {
  id: string
  code: string
  name: string
  name_ar: string | null
  level: number
  parent_id: string | null
  status: string
  category: string | null
  children: Node[]
  amounts: Amounts
  rollup: Amounts
}

const defaultAmounts = (): Amounts => ({
  opening_debit: 0,
  opening_credit: 0,
  period_debits: 0,
  period_credits: 0,
  closing_debit: 0,
  closing_credit: 0,
})

const sumAmounts = (a: Amounts, b: Amounts): Amounts => ({
  opening_debit: a.opening_debit + b.opening_debit,
  opening_credit: a.opening_credit + b.opening_credit,
  period_debits: a.period_debits + b.period_debits,
  period_credits: a.period_credits + b.period_credits,
  closing_debit: a.closing_debit + b.closing_debit,
  closing_credit: a.closing_credit + b.closing_credit,
})

const AccountExplorerReport: React.FC = () => {
  const { currentOrg, currentProject } = useScope()
  const lang = useAppStore((s: any) => s.language)
  const isAr = lang === 'ar'

  // View toggles
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree')
  const [mode, setMode] = useState<ExplorerMode>('asof')

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(startOfYearISO())
  const [dateTo, setDateTo] = useState<string>(todayISO())
  const [postedOnly, setPostedOnly] = useState<boolean>(false)
  const [includeZeros, setIncludeZeros] = useState<boolean>(false)
  const uiLang = isAr ? 'ar' : 'en'
  const [showOpeningInRange, setShowOpeningInRange] = useState<boolean>(true)
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true)
  const [currencySymbol, setCurrencySymbol] = useState<string>('none')

  // Data
  const [nodes, setNodes] = useState<Node[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')

  // Fullscreen
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch { }
  }

  // Advanced filters
  const [classifications, setClassifications] = useState<TransactionClassification[]>([])
  const [expensesCategories, setExpensesCategories] = useState<any[]>([])
  const [workItems, setWorkItems] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [accountsOptions, setAccountsOptions] = useState<SearchableSelectOption[]>([])

  const [classificationId, setClassificationId] = useState<string>('')
  const [expensesCategoryId, setExpensesCategoryId] = useState<string>('')
  const [workItemId, setWorkItemId] = useState<string>('')
  const [costCenterId, setCostCenterId] = useState<string>('')
  const [debitAccountId, setDebitAccountId] = useState<string>('')
  const [creditAccountId, setCreditAccountId] = useState<string>('')
  const [amountMin, setAmountMin] = useState<string>('')
  const [amountMax, setAmountMax] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Load company currency
  useEffect(() => {
    (async () => {
      try { const cfg = await getCompanyConfig(); setCurrencySymbol(cfg.currency_symbol || cfg.currency_code || 'EGP'); setCompanyName(cfg?.company_name || '') } catch { }
    })()
  }, [])

  // Load lookups on org change
  useEffect(() => {
    (async () => {
      try {
        if (currentOrg?.id) {
          const [classes, cats, wItems, ccs, accs] = await Promise.all([
            getAllTransactionClassifications().catch(() => []),
            getExpensesCategoriesList(currentOrg.id).catch(() => []),
            listWorkItemsAll(currentOrg.id).catch(() => []),
            getCostCentersForSelector(currentOrg.id).catch(() => []),
            fetchAccountsMinimal().catch(() => []),
          ])
          setClassifications(classes || [])
          setExpensesCategories(cats || [])
          setWorkItems(wItems || [])
          setCostCenters((ccs || []).map((c: any) => ({ id: String(c.id), code: String(c.code), name: String(c.name) })))
          const accOpts: SearchableSelectOption[] = (accs || []).map((a: any) => ({ value: String(a.id), label: `${String(a.code)} - ${String(a.name_ar || a.name)}`, searchText: `${String(a.code)} ${String(a.name_ar || a.name)}` }))
          setAccountsOptions([{ value: '', label: uiLang === 'ar' ? 'كل الحسابات' : 'All Accounts', searchText: '' }, ...accOpts])
        }
      } catch { /* noop */ }
    })()
  }, [currentOrg?.id, uiLang])

  // Load data
  async function loadData() {
    setLoading(true)
    setError('')
    try {
      // 1) Fetch accounts for selected org
      let accQ = supabase
        .from('accounts')
        .select('id, code, name, name_ar, level, parent_id, status, category, org_id')
        .order('code', { ascending: true })
      if (currentOrg?.id) accQ = accQ.eq('org_id', currentOrg.id)
      const accRes = await accQ
      if (accRes.error) throw accRes.error
      const accounts = (accRes.data || []) as Array<{
        id: string
        code: string
        name: string
        name_ar?: string
        level: number
        parent_id?: string
        status: string
        category?: string
        org_id: string
      }>

      // 2) Fetch GL summary using unified-financial-query for consistency
      const filters: UnifiedFilters = {
        dateFrom: mode === 'range' ? (dateFrom || null) : null,
        dateTo: dateTo || null,
        orgId: currentOrg?.id || null,
        projectId: currentProject?.id || null,
        postedOnly,
        classificationId: classificationId || null,
        analysisWorkItemId: workItemId || null,
        expensesCategoryId: expensesCategoryId || null,
        subTreeId: expensesCategoryId || null,
      }
      const summaryRows = await fetchGLSummary(filters)
      const amountsById = new Map<string, Amounts>()
      for (const r of summaryRows) {
        amountsById.set(r.account_id, {
          opening_debit: Number(r.opening_debit || 0),
          opening_credit: Number(r.opening_credit || 0),
          period_debits: Number(r.period_debits || 0),
          period_credits: Number(r.period_credits || 0),
          closing_debit: Number(r.closing_debit || 0),
          closing_credit: Number(r.closing_credit || 0),
        })
      }

      // 3) Build nodes
      const nodeMap = new Map<string, Node>()
      for (const a of accounts) {
        const amt = amountsById.get(a.id) || defaultAmounts()
        nodeMap.set(a.id, {
          id: a.id,
          code: a.code,
          name: a.name,
          name_ar: a.name_ar || null,
          level: Number(a.level || 1),
          parent_id: a.parent_id ?? null,
          status: a.status || 'active',
          category: a.category || null,
          children: [],
          amounts: amt,
          rollup: defaultAmounts(),
        })
      }
      // 4) Link children and gather roots
      const roots: Node[] = []
      for (const n of nodeMap.values()) {
        if (n.parent_id && nodeMap.has(n.parent_id)) nodeMap.get(n.parent_id)!.children.push(n)
        else roots.push(n)
      }
      // 5) Rollup values
      const dfs = (n: Node): Amounts => {
        let acc = { ...n.amounts }
        for (const c of n.children) acc = sumAmounts(acc, dfs(c))
        n.rollup = acc
        return acc
      }
      for (const r of roots) dfs(r)

      // expand level 1 by default
      const l1 = new Set<string>()
      for (const r of roots) l1.add(r.id)
      setExpanded(l1)

      setNodes(roots)
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  // Auto-load data when page opens or when filters change (debounced + visibility-aware)
  useEffect(() => {
    let canceled = false
    const t = setTimeout(() => {
      if (!canceled && !document.hidden) {
        loadData()
      }
    }, 250)
    return () => { canceled = true; clearTimeout(t) }
  }, [currentOrg?.id, currentProject?.id, postedOnly, mode, dateFrom, dateTo, classificationId, expensesCategoryId, workItemId, costCenterId, debitAccountId, creditAccountId, amountMin, amountMax])

  // Initial data load once on mount (in case orgId is not set yet)
  useEffect(() => {
    let canceled = false
    const run = () => { if (!canceled && !document.hidden) loadData() }
    const vis = () => { if (!document.hidden) run() }
    // Slight delay to allow initial UI settle
    const t = setTimeout(run, 200)
    document.addEventListener('visibilitychange', vis)
    return () => { canceled = true; clearTimeout(t); document.removeEventListener('visibilitychange', vis) }
  }, [])

  // Helpers
  const isZero = (n: Node) => {
    if (mode === 'range') return Number(n.rollup.period_debits || 0) === 0 && Number(n.rollup.period_credits || 0) === 0
    return Number(n.rollup.closing_debit || 0) === 0 && Number(n.rollup.closing_credit || 0) === 0
  }

  // Open General Ledger drilldown with current filters
  const openGL = (accountId: string) => {
    const params = new URLSearchParams()
    params.set('accountId', accountId)
    if (currentOrg?.id) params.set('orgId', currentOrg.id)
    if (currentProject?.id) params.set('projectId', currentProject.id)
    params.set('postedOnly', String(!!postedOnly))
    params.set('includeOpening', mode === 'range' ? String(true) : String(false))
    if (mode === 'range') {
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
    } else {
      if (dateTo) params.set('dateTo', dateTo)
    }
    // Advanced filters
    if (classificationId) params.set('classificationId', classificationId)
    if (costCenterId) params.set('costCenterId', costCenterId)
    if (workItemId) params.set('workItemId', workItemId)
    if (expensesCategoryId) params.set('expensesCategoryId', expensesCategoryId)
    if (debitAccountId) params.set('debitAccountId', debitAccountId)
    if (creditAccountId) params.set('creditAccountId', creditAccountId)
    if (amountMin) params.set('amountMin', amountMin)
    if (amountMax) params.set('amountMax', amountMax)
    const url = `/reports/general-ledger?${params.toString()}`
    try { window.open(url, '_blank', 'noopener') } catch { }
  }

  const flattenNodes = (roots: Node[]): Node[] => {
    const out: Node[] = []
    const walk = (n: Node) => { out.push(n); n.children.forEach(walk) }
    roots.forEach(walk)
    return out
  }

  const isBranchTotalName = (n: Node) => {
    const nm = (n.name_ar || n.name || '').toLowerCase()
    return nm.includes('مجموع') || nm.includes('total')
  }

  const visibleFlat = useMemo(() => {
    const flat = flattenNodes(nodes)
    const filteredZeros = includeZeros ? flat : flat.filter(n => !isZero(n))
    // Hide branch totals to avoid duplicate rollups
    const noBranchTotals = filteredZeros.filter(n => !isBranchTotalName(n))
    const term = (searchTerm || '').trim().toLowerCase()
    if (!term) return noBranchTotals
    return noBranchTotals.filter(n =>
      (n.code || '').toLowerCase().includes(term) ||
      (n.name_ar || n.name || '').toLowerCase().includes(term)
    )
  }, [nodes, includeZeros, mode, searchTerm])

  // Expand helpers
  const expandAll = () => setExpanded(prev => { const s = new Set(prev); visibleFlat.forEach(n => s.add(n.id)); return s })
  const collapseAll = () => setExpanded(new Set())
  const expandToLevel = (L: number) => setExpanded(prev => { const s = new Set(prev); visibleFlat.forEach(n => { if (n.level <= L) s.add(n.id); else s.delete(n.id) }); return s })

  // Export helpers (simple CSV for now)
  function exportCSV() {
    const cols: string[] = [uiLang === 'ar' ? 'الكود' : 'Code', uiLang === 'ar' ? 'اسم الحساب' : 'Account', uiLang === 'ar' ? 'نوع الحساب' : 'Type', uiLang === 'ar' ? 'المستوى' : 'Level']
    if (mode === 'range') {
      if (showOpeningInRange) cols.push(uiLang === 'ar' ? 'افتتاحي مدين' : 'Opening Debit', uiLang === 'ar' ? 'افتتاحي دائن' : 'Opening Credit')
      cols.push(
        uiLang === 'ar' ? 'مدين الفترة' : 'Period Debits',
        uiLang === 'ar' ? 'دائن الفترة' : 'Period Credits',
        uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit',
        uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit',
        uiLang === 'ar' ? 'صافي الفترة' : 'Period Net',
        uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net',
      )
    } else {
      cols.push(uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit', uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit', uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net')
    }

    const rows = visibleFlat.map(n => {
      const row: (string | number)[] = [String(n.code), String(n.name_ar || n.name), String(n.category || ''), String(n.level)]
      const openingDebit = Number(n.rollup.opening_debit || 0)
      const openingCredit = Number(n.rollup.opening_credit || 0)
      const periodDebits = Number(n.rollup.period_debits || 0)
      const periodCredits = Number(n.rollup.period_credits || 0)
      const closingDebit = Number(n.rollup.closing_debit || 0)
      const closingCredit = Number(n.rollup.closing_credit || 0)
      const periodNet = periodDebits - periodCredits
      const finalNet = closingDebit - closingCredit
      if (mode === 'range') {
        if (showOpeningInRange) { row.push(openingDebit, openingCredit) }
        row.push(periodDebits, periodCredits, closingDebit, closingCredit, periodNet, finalNet)
      } else {
        row.push(closingDebit, closingCredit, finalNet)
      }
      return row
    })

    const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'account-explorer.csv'; a.click(); URL.revokeObjectURL(url)
  }

  // Professional commercial print function
  // Professional PDF generation function
  async function generatePDF() {
    try {
      // const _projectName = projectId ? projectOptions.find(p => p.id === projectId)?.name : (uiLang === 'ar' ? 'كل المشاريع' : 'All Projects')
      const reportTitle = uiLang === 'ar' ? 'مستكشف الحسابات - التقرير المالي' : 'Account Explorer - Financial Report'
      const periodText = mode === 'range' ? `${uiLang === 'ar' ? 'من' : 'From'} ${dateFrom} ${uiLang === 'ar' ? 'إلى' : 'To'} ${dateTo}` : `${uiLang === 'ar' ? 'حتى تاريخ' : 'As of'} ${dateTo}`

      // Build PDF table structure
      const pdfColumns: import('../../services/pdf-generator').PDFTableColumn[] = [
        { key: 'code', header: uiLang === 'ar' ? 'رمز الحساب' : 'Account Code', width: '100px', align: 'center', type: 'text' },
        { key: 'name', header: uiLang === 'ar' ? 'اسم الحساب' : 'Account Name', width: '300px', align: 'right', type: 'text' },
        { key: 'type', header: uiLang === 'ar' ? 'نوع الحساب' : 'Account Type', width: '120px', align: 'center', type: 'text' },
        { key: 'level', header: uiLang === 'ar' ? 'المستوى' : 'Level', width: '80px', align: 'center', type: 'number' }
      ]

      // Add dynamic columns based on mode
      if (mode === 'range') {
        if (showOpeningInRange) {
          pdfColumns.push(
            { key: 'opening_debit', header: uiLang === 'ar' ? 'افتتاحي مدين' : 'Opening Debit', width: '120px', align: 'right', type: 'currency' },
            { key: 'opening_credit', header: uiLang === 'ar' ? 'افتتاحي دائن' : 'Opening Credit', width: '120px', align: 'right', type: 'currency' }
          )
        }
        pdfColumns.push(
          { key: 'period_debits', header: uiLang === 'ar' ? 'مدين الفترة' : 'Period Debits', width: '120px', align: 'right', type: 'currency' },
          { key: 'period_credits', header: uiLang === 'ar' ? 'دائن الفترة' : 'Period Credits', width: '120px', align: 'right', type: 'currency' },
          { key: 'closing_debit', header: uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit', width: '120px', align: 'right', type: 'currency' },
          { key: 'closing_credit', header: uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit', width: '120px', align: 'right', type: 'currency' },
          { key: 'period_net', header: uiLang === 'ar' ? 'صافي الفترة' : 'Period Net', width: '120px', align: 'right', type: 'currency' },
          { key: 'final_net', header: uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net', width: '120px', align: 'right', type: 'currency' }
        )
      } else {
        pdfColumns.push(
          { key: 'closing_debit', header: uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit', width: '120px', align: 'right', type: 'currency' },
          { key: 'closing_credit', header: uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit', width: '120px', align: 'right', type: 'currency' },
          { key: 'final_net', header: uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net', width: '120px', align: 'right', type: 'currency' }
        )
      }

      // Build PDF rows
      const pdfRows = visibleFlat.map(n => {
        const periodNet = Number(n.rollup.period_debits || 0) - Number(n.rollup.period_credits || 0)
        const finalNet = Number(n.rollup.closing_debit || 0) - Number(n.rollup.closing_credit || 0)

        const row: Record<string, any> = {
          code: n.code,
          name: n.name_ar || n.name,
          type: n.category || '—',
          level: n.level,
          closing_debit: Number(n.rollup.closing_debit || 0),
          closing_credit: Number(n.rollup.closing_credit || 0),
          final_net: finalNet
        }

        if (mode === 'range') {
          row.opening_debit = Number(n.rollup.opening_debit || 0)
          row.opening_credit = Number(n.rollup.opening_credit || 0)
          row.period_debits = Number(n.rollup.period_debits || 0)
          row.period_credits = Number(n.rollup.period_credits || 0)
          row.period_net = periodNet
        }

        return row
      })

      // Calculate totals from root accounts (same as UI)
      const rootAccounts = nodes.filter(n => !n.parent_id)
      const totalClosingDebits = rootAccounts.reduce((sum, acc) => sum + Number(acc.rollup.closing_debit || 0), 0)
      const totalClosingCredits = rootAccounts.reduce((sum, acc) => sum + Number(acc.rollup.closing_credit || 0), 0)
      const totalPeriodDebits = rootAccounts.reduce((sum, acc) => sum + Number(acc.rollup.period_debits || 0), 0)
      const totalPeriodCredits = rootAccounts.reduce((sum, acc) => sum + Number(acc.rollup.period_credits || 0), 0)
      const totalNet = totalClosingDebits - totalClosingCredits

      // Build totals object
      const totals: Record<string, number> = {
        totalClosingDebits,
        totalClosingCredits,
        netTotal: totalNet
      }

      if (mode === 'range') {
        totals.totalPeriodDebits = totalPeriodDebits
        totals.totalPeriodCredits = totalPeriodCredits
      }

      const tableData: PDFTableData = {
        columns: pdfColumns,
        rows: pdfRows,
        totals
      }

      const pdfOptions: PDFOptions = {
        title: reportTitle,
        subtitle: periodText,
        companyName: companyName,
        reportDate: dateTo,
        orientation: 'landscape', // Better for financial reports with many columns
        language: uiLang,
        numbersOnly: numbersOnly,
        currencySymbol: numbersOnly ? 'none' : currencySymbol,
        showHeader: true,
        showFooter: true
      }

      await generateFinancialPDF(tableData, pdfOptions)

    } catch (error) {
      console.error('PDF generation failed:', error)
      alert(uiLang === 'ar' ? 'فشل في إنشاء ملف PDF' : 'Failed to generate PDF')
    }
  }

  function printReport() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Prepare report data
    const currentDate = new Date().toLocaleDateString('ar-EG')
    const reportTitle = uiLang === 'ar' ? 'مستكشف الحسابات - التقرير المالي' : 'Account Explorer - Financial Report'

    // Build professional commercial report HTML
    const reportHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${reportTitle}</title>
          <style>
            /* Commercial Accounting Report Styles */
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            body { 
              font-family: 'Arial', 'Tahoma', sans-serif;
              direction: rtl;
              background: white;
              color: black;
              font-size: 12px;
              line-height: 1.3;
              padding: 15mm;
            }
            
            /* Report Header - Commercial Standard */
            .print-header {
              text-align: center;
              margin-bottom: 25px;
              border: 2px solid black;
              padding: 15px;
            }
            
            .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 8px;
              color: black;
              text-transform: uppercase;
            }
            
            .report-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 8px;
              color: black;
              text-decoration: underline;
            }
            
            .report-period {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
              color: black;
            }
            
            .report-filters {
              font-size: 11px;
              color: black;
              border-top: 1px solid black;
              padding-top: 8px;
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
            }
            
            .filter-item {
              margin: 2px 10px;
              font-weight: normal;
            }
            
            /* Table Structure */
            .report-content {
              margin-top: 20px;
            }
            
            .accounts-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid black;
              background: white;
              font-size: 11px;
            }
            
            .accounts-table thead {
              background: white;
              border-bottom: 2px solid black;
              font-weight: bold;
              color: black;
            }
            
            .accounts-table th {
              padding: 8px 6px;
              text-align: center;
              font-size: 12px;
              border-right: 1px solid black;
              font-weight: bold;
            }
            
            .accounts-table th:last-child {
              border-right: none;
            }
            
            .accounts-table td {
              padding: 4px 6px;
              border-right: 1px solid #ddd;
              border-bottom: 1px solid #eee;
              color: black;
            }
            
            .accounts-table td:last-child {
              border-right: none;
            }
            
            .account-code {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              text-align: center;
              width: 80px;
            }
            
            .account-name {
              text-align: right;
              font-weight: normal;
              width: 250px;
            }
            
            .account-level {
              text-align: center;
              font-weight: normal;
              width: 60px;
            }
            
            .account-type {
              text-align: center;
              font-weight: normal;
              width: 100px;
            }
            
            .amount-cell {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              text-align: right;
              width: 110px;
            }
            
            .parent-row {
              background: #f8f8f8;
              font-weight: bold;
            }
            
            .level-1 {
              background: #f0f0f0;
              font-weight: bold;
            }
            
            .level-2 {
              background: #f5f5f5;
              font-weight: bold;
            }
            
            /* Grand Total Section */
            .grand-total {
              margin-top: 20px;
              border: 2px solid black;
              background: white;
            }
            
            .grand-total-header {
              background: white;
              color: black;
              padding: 10px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              border-bottom: 2px solid black;
            }
            
            .total-row {
              display: flex;
              padding: 8px 12px;
              border-bottom: 1px solid #666;
              font-weight: bold;
              font-size: 13px;
            }
            
            .total-row:last-child {
              border-bottom: none;
              background: white;
              border-top: 2px solid black;
            }
            
            .total-label {
              flex: 1;
              color: black;
              font-weight: bold;
            }
            
            .total-amount {
              width: 120px;
              text-align: right;
              font-family: 'Courier New', monospace;
              color: black;
              font-weight: bold;
              margin-left: 20px;
            }
            
            /* Print-specific */
            @media print {
              body { padding: 10mm; }
              .accounts-table { font-size: 10px; }
              @page { 
                size: A4 landscape;
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <!-- Professional Commercial Report Header -->
          <div class="print-header">
            <div class="company-name">${companyName || (uiLang === 'ar' ? 'الشركة التجارية' : 'Commercial Company')}</div>
            <div class="report-title">${reportTitle}</div>
            <div class="report-period">${mode === 'range' ? `${uiLang === 'ar' ? 'من' : 'From'}: ${dateFrom} ${uiLang === 'ar' ? 'إلى' : 'To'}: ${dateTo}` : `${uiLang === 'ar' ? 'حتى تاريخ' : 'As of'}: ${dateTo}`}</div>
            <div class="report-filters">
              <span class="filter-item">${uiLang === 'ar' ? 'المشروع' : 'Project'}: ${currentProject?.name || (uiLang === 'ar' ? 'الكل' : 'All')}</span>
              <span class="filter-item">${uiLang === 'ar' ? 'تاريخ الطباعة' : 'Print Date'}: ${currentDate}</span>
              <span class="filter-item">${uiLang === 'ar' ? 'وضع العرض' : 'View Mode'}: ${viewMode === 'table' ? (uiLang === 'ar' ? 'جدول' : 'Table') : (uiLang === 'ar' ? 'شجرة' : 'Tree')}</span>
              ${postedOnly ? `<span class="filter-item">${uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted Only'}</span>` : ''}
              ${!includeZeros ? `<span class="filter-item">${uiLang === 'ar' ? 'إخفاء الأصفار' : 'Hide Zeros'}</span>` : ''}
              ${searchTerm ? `<span class="filter-item">${uiLang === 'ar' ? 'البحث' : 'Search'}: ${searchTerm}</span>` : ''}
            </div>
          </div>
          
          <!-- Report Content -->
          <div class="report-content">
            ${generateAccountsPrintContent()}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(reportHTML)
    printWindow.document.close()

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  // Generate accounts print content with proper commercial formatting
  function generateAccountsPrintContent(): string {
    let html = ''

    // Main accounts table
    html += `
      <table class="accounts-table">
        <thead>
          <tr>
            <th class="account-code">${uiLang === 'ar' ? 'رمز الحساب' : 'Account Code'}</th>
            <th class="account-name">${uiLang === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
            <th class="account-type">${uiLang === 'ar' ? 'نوع الحساب' : 'Account Type'}</th>
            <th class="account-level">${uiLang === 'ar' ? 'المستوى' : 'Level'}</th>`

    // Dynamic columns based on mode
    if (mode === 'range') {
      if (showOpeningInRange) {
        html += `
            <th class="amount-cell">${uiLang === 'ar' ? 'افتتاحي مدين' : 'Opening Debit'}</th>
            <th class="amount-cell">${uiLang === 'ar' ? 'افتتاحي دائن' : 'Opening Credit'}</th>`
      }
      html += `
            <th class="amount-cell">${uiLang === 'ar' ? 'مدين الفترة' : 'Period Debit'}</th>
            <th class="amount-cell">${uiLang === 'ar' ? 'دائن الفترة' : 'Period Credit'}</th>
            <th class="amount-cell">${uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit'}</th>
            <th class="amount-cell">${uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit'}</th>
            <th class="amount-cell">${uiLang === 'ar' ? 'صافي الفترة' : 'Period Net'}</th>
            <th class="amount-cell">${uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net'}</th>`
    } else {
      html += `
            <th class="amount-cell">${uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit'}</th>
            <th class="amount-cell">${uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit'}</th>
            <th class="amount-cell">${uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net'}</th>`
    }

    html += `
          </tr>
        </thead>
        <tbody>`

    // Generate account rows
    for (const account of visibleFlat) {
      if (!includeZeros && isZero(account)) continue

      const periodNet = Number(account.rollup.period_debits || 0) - Number(account.rollup.period_credits || 0)
      const finalNet = Number(account.rollup.closing_debit || 0) - Number(account.rollup.closing_credit || 0)
      const hasChildren = (account.children && account.children.length > 0)

      let rowClass = ''
      if (hasChildren) {
        if (account.level === 1) rowClass = 'parent-row level-1'
        else if (account.level === 2) rowClass = 'parent-row level-2'
        else rowClass = 'parent-row'
      }

      const indentStyle = `padding-right: ${(account.level - 1) * 20}px;`

      html += `
        <tr class="${rowClass}">
          <td class="account-code">${account.code}</td>
          <td class="account-name" style="${indentStyle}">${account.name_ar || account.name}</td>
          <td class="account-type">${account.category || '—'}</td>
          <td class="account-level">${account.level}</td>`

      // Dynamic amount columns
      if (mode === 'range') {
        if (showOpeningInRange) {
          html += `
          <td class="amount-cell">${formatArabicCurrency(account.rollup.opening_debit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
          <td class="amount-cell">${formatArabicCurrency(account.rollup.opening_credit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>`
        }
        html += `
          <td class="amount-cell">${formatArabicCurrency(account.rollup.period_debits, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
          <td class="amount-cell">${formatArabicCurrency(account.rollup.period_credits, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
          <td class="amount-cell">${formatArabicCurrency(account.rollup.closing_debit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
          <td class="amount-cell">${formatArabicCurrency(account.rollup.closing_credit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
          <td class="amount-cell">${formatArabicCurrency(periodNet, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
          <td class="amount-cell">${formatArabicCurrency(finalNet, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>`
      } else {
        html += `
          <td class="amount-cell">${formatArabicCurrency(account.rollup.closing_debit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
          <td class="amount-cell">${formatArabicCurrency(account.rollup.closing_credit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
          <td class="amount-cell">${formatArabicCurrency(finalNet, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>`
      }

      html += `
        </tr>`
    }

    html += `
        </tbody>
      </table>`

    // Grand Total Section - Calculate from root accounts only (same as UI)
    // Get root accounts (nodes without parent_id)
    const rootAccounts = nodes.filter(n => !n.parent_id)
    const totalClosingDebits = rootAccounts.reduce((sum, acc) => sum + Number(acc.rollup.closing_debit || 0), 0)
    const totalClosingCredits = rootAccounts.reduce((sum, acc) => sum + Number(acc.rollup.closing_credit || 0), 0)
    const totalPeriodDebits = rootAccounts.reduce((sum, acc) => sum + Number(acc.rollup.period_debits || 0), 0)
    const totalPeriodCredits = rootAccounts.reduce((sum, acc) => sum + Number(acc.rollup.period_credits || 0), 0)
    const totalNet = totalClosingDebits - totalClosingCredits
    const difference = Math.abs(totalClosingDebits - totalClosingCredits)
    const isBalanced = difference < 0.01

    html += `
      <div class="grand-total">
        <div class="grand-total-header">${uiLang === 'ar' ? 'المجاميع العامة' : 'Grand Totals'}</div>`

    if (mode === 'range') {
      html += `
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'إجمالي مدين الفترة' : 'Total Period Debits'}</div>
          <div class="total-amount">${formatArabicCurrency(totalPeriodDebits, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</div>
        </div>
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'إجمالي دائن الفترة' : 'Total Period Credits'}</div>
          <div class="total-amount">${formatArabicCurrency(totalPeriodCredits, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</div>
        </div>`
    }

    html += `
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'إجمالي المدين الختامي' : 'Total Closing Debits'}</div>
          <div class="total-amount">${formatArabicCurrency(totalClosingDebits, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</div>
        </div>
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'إجمالي الدائن الختامي' : 'Total Closing Credits'}</div>
          <div class="total-amount">${formatArabicCurrency(totalClosingCredits, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</div>
        </div>
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'الصافي الإجمالي' : 'Total Net'}</div>
          <div class="total-amount">${formatArabicCurrency(totalNet, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</div>
        </div>
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'حالة التوازن' : 'Balance Status'}</div>
          <div class="total-amount">${isBalanced ? (uiLang === 'ar' ? 'متوازن ✓' : 'Balanced ✓') : (uiLang === 'ar' ? 'غير متوازن' : 'Unbalanced')}</div>
        </div>
      </div>`

    return html
  }

  return (
    <div ref={rootRef} className={styles.container} dir={uiLang === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`${styles.professionalFilterBar} ${styles.noPrint}`}>
        {/* Left: scope status + dates */}
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{uiLang === 'ar' ? 'المؤسسة' : 'Organization'}</label>
            <div className={styles.filterValueText}>{currentOrg?.name || '—'}</div>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{uiLang === 'ar' ? 'المشروع' : 'Project'}</label>
            <div className={styles.filterValueText}>{currentProject?.name || (uiLang === 'ar' ? 'كل المشاريع' : 'All Projects')}</div>
          </div>

          {mode === 'range' && (
            <>
              <input className={styles.filterInput} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label={uiLang === 'ar' ? 'من' : 'From'} />
              <input className={styles.filterInput} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label={uiLang === 'ar' ? 'إلى' : 'To'} />
            </>
          )}
          {mode === 'asof' && (
            <input className={styles.filterInput} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label={uiLang === 'ar' ? 'حتى' : 'As of'} />
          )}
        </div>

        {/* Center: language + view toggles + expand/collapse */}
        <div className={styles.centerSection}>
          <div className={styles.languageDisplay}>
            {uiLang === 'ar' ? 'العربية' : 'English'}
          </div>

          <div className={styles.groupControls}>
            <button type="button" className={styles.groupControlButton} onClick={() => expandToLevel(1)} title={uiLang === 'ar' ? 'توسيع مستوى 1' : 'Expand L1'}>L1</button>
            <button type="button" className={styles.groupControlButton} onClick={() => expandToLevel(2)} title={uiLang === 'ar' ? 'توسيع مستوى 2' : 'Expand L2'}>L2</button>
            <button type="button" className={styles.groupControlButton} onClick={() => expandToLevel(3)} title={uiLang === 'ar' ? 'توسيع مستوى 3' : 'Expand L3'}>L3</button>
            <button type="button" className={styles.groupControlButton} onClick={() => expandToLevel(4)} title={uiLang === 'ar' ? 'توسيع مستوى 4' : 'Expand L4'}>L4</button>
            <button type="button" className={styles.groupControlButton} onClick={expandAll} title={uiLang === 'ar' ? 'توسيع الكل' : 'Expand All'}><UnfoldMore fontSize="small" /></button>
            <button type="button" className={styles.groupControlButton} onClick={collapseAll} title={uiLang === 'ar' ? 'طي الكل' : 'Collapse All'}><UnfoldLess fontSize="small" /></button>
          </div>

          <div className={styles.featureToggles}>
            <button type="button" className={`${styles.featureToggle} ${postedOnly ? 'active' : ''}`} onClick={() => setPostedOnly(v => !v)} title={uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted only'}>
              <Visibility fontSize="small" /><span className={styles.toggleText}>{uiLang === 'ar' ? 'المعتمد فقط' : 'Posted Only'}</span>
            </button>
            <button type="button" className={`${styles.featureToggle} ${includeZeros ? 'active' : ''}`} onClick={() => setIncludeZeros(v => !v)} title={uiLang === 'ar' ? 'إظهار الأرصدة الصفرية' : 'Show zero balances'}>
              {includeZeros ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}<span className={styles.toggleText}>{uiLang === 'ar' ? 'عرض الأصفار' : 'Show Zeros'}</span>
            </button>
            <button type="button" className={styles.featureToggle} onClick={() => setMode(m => m === 'range' ? 'asof' : 'range')} title={uiLang === 'ar' ? 'تبديل عرض الأعمدة' : 'Toggle columns'}>
              <span className={styles.toggleText}>{mode === 'range' ? (uiLang === 'ar' ? 'عرض ختامي' : 'Show Closing') : (uiLang === 'ar' ? 'عرض حركة الفترة' : 'Show Period')}</span>
            </button>
            {mode === 'range' && (
              <button type="button" className={`${styles.featureToggle} ${showOpeningInRange ? 'active' : ''}`} onClick={() => setShowOpeningInRange(v => !v)} title={uiLang === 'ar' ? 'إظهار الافتتاحي' : 'Show Opening'}>
                <span className={styles.toggleText}>{uiLang === 'ar' ? 'إظهار الافتتاحي' : 'Show Opening'}</span>
              </button>
            )}
            <button type="button" className={`${styles.featureToggle} ${numbersOnly ? 'active' : ''}`} onClick={() => setNumbersOnly(v => !v)} title={uiLang === 'ar' ? 'أرقام فقط' : 'Numbers only'}>
              {numbersOnly ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}<span className={styles.toggleText}>{uiLang === 'ar' ? 'أرقام فقط' : 'Numbers Only'}</span>
            </button>
            <div className={styles.viewSwitch}>
              <button type="button" className={`${styles.languageOption} ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')}>{uiLang === 'ar' ? 'شجرة' : 'Tree'}</button>
              <button type="button" className={`${styles.languageOption} ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>{uiLang === 'ar' ? 'جدول' : 'Table'}</button>
            </div>
          </div>
        </div>

        {/* Right: export/print/refresh */}
        <div className={styles.actionSection}>
          <div className={styles.exportGroup}>
            <button type="button" className={styles.exportButton} onClick={exportCSV} title={uiLang === 'ar' ? 'تصدير CSV' : 'Export CSV'}><TableView fontSize="small" /> CSV</button>
            <button
              type="button"
              className={`${styles.exportButton} ${styles.pdfButton}`}
              onClick={generatePDF}
              title={uiLang === 'ar' ? 'تصدير PDF رسمي' : 'Export Official PDF'}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.3)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)'
              }}
            >
              <PictureAsPdf fontSize="small" /> {uiLang === 'ar' ? 'تصدير PDF' : 'Export PDF'}
            </button>
            <button type="button" className={styles.exportButton} onClick={printReport} title={uiLang === 'ar' ? 'طباعة شاشة' : 'Print Screen'}><Print fontSize="small" /> {uiLang === 'ar' ? 'طباعة' : 'Print'}</button>
          </div>
          <button type="button" className={styles.actionButton} onClick={toggleFullscreen} title={uiLang === 'ar' ? (isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة') : (isFullscreen ? 'Exit Full Screen' : 'Full Screen')}>
            {isFullscreen ? (uiLang === 'ar' ? 'الخروج من ملء الشاشة' : 'Exit Full Screen') : (uiLang === 'ar' ? 'ملء الشاشة' : 'Full Screen')}
          </button>
          <button type="button" className={`${styles.actionButton} ${styles.primary}`} onClick={loadData} disabled={loading} title={uiLang === 'ar' ? 'تحديث' : 'Refresh'}>
            <Refresh fontSize="small" /> {loading ? (uiLang === 'ar' ? 'جاري التحميل...' : 'Loading...') : (uiLang === 'ar' ? 'تحديث' : 'Refresh')}
          </button>
        </div>
      </div>

      {/* Advanced Filters Row */}
      <div className={`${styles.professionalFilterBar} ${styles.noPrint}`} style={{ gap: 8, marginTop: 8 }}>
        <div className={styles.filterSection}>
          <input
            className={styles.filterInput}
            placeholder={uiLang === 'ar' ? 'بحث (كود/اسم)' : 'Search (code/name)'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ minWidth: 260 }}>
            <SearchableSelect
              id="ae.filter.debit"
              value={debitAccountId}
              options={accountsOptions}
              onChange={setDebitAccountId}
              placeholder={uiLang === 'ar' ? 'جميع الحسابات المدينة' : 'All debit accounts'}
              clearable
            />
          </div>
          <div style={{ minWidth: 260 }}>
            <SearchableSelect
              id="ae.filter.credit"
              value={creditAccountId}
              options={accountsOptions}
              onChange={setCreditAccountId}
              placeholder={uiLang === 'ar' ? 'جميع الحسابات الدائنة' : 'All credit accounts'}
              clearable
            />
          </div>
          <select className={styles.filterSelect} value={classificationId} onChange={e => setClassificationId(e.target.value)}>
            <option value="">{uiLang === 'ar' ? 'جميع التصنيفات' : 'All classifications'}</option>
            {classifications.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select className={styles.filterSelect} value={expensesCategoryId} onChange={e => setExpensesCategoryId(e.target.value)}>
            <option value="">{uiLang === 'ar' ? 'جميع فئات المصروف' : 'All expenses categories'}</option>
            {expensesCategories.map((c: any) => (<option key={c.id} value={c.id}>{`${c.code ?? ''} ${c.description ?? c.name ?? ''}`.trim()}</option>))}
          </select>
          <select className={styles.filterSelect} value={workItemId} onChange={e => setWorkItemId(e.target.value)}>
            <option value="">{uiLang === 'ar' ? 'جميع عناصر العمل' : 'All work items'}</option>
            {workItems.map((w: any) => (<option key={w.id} value={w.id}>{`${w.code ?? ''} ${w.name ?? ''}`.trim()}</option>))}
          </select>
          <select className={styles.filterSelect} value={costCenterId} onChange={e => setCostCenterId(e.target.value)}>
            <option value="">{uiLang === 'ar' ? 'جميع مراكز التكلفة' : 'All cost centers'}</option>
            {costCenters.map((cc) => (<option key={cc.id} value={cc.id}>{`${cc.code} - ${cc.name}`}</option>))}
          </select>
          <input className={styles.filterInput} type="number" placeholder={uiLang === 'ar' ? 'من مبلغ' : 'Min amount'} value={amountMin} onChange={e => setAmountMin(e.target.value)} />
          <input className={styles.filterInput} type="number" placeholder={uiLang === 'ar' ? 'إلى مبلغ' : 'Max amount'} value={amountMax} onChange={e => setAmountMax(e.target.value)} />
          <button className={styles.actionButton} onClick={loadData} disabled={loading}>{uiLang === 'ar' ? 'تطبيق' : 'Apply'}</button>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {viewMode === 'tree' ? (
        <div className={`standard-financial-statements ${styles.accountExplorerFullScreen}`}>
          <ReportTreeView
            data={flattenNodes(nodes).map(n => ({
              id: n.id,
              code: n.code,
              name_ar: n.name_ar || n.name,
              name_en: n.name,
              level: n.level,
              parent_id: n.parent_id,
              is_active: n.status === 'active',
              account_type: n.category || undefined,
              opening_debit: n.rollup.opening_debit,
              opening_credit: n.rollup.opening_credit,
              period_debits: n.rollup.period_debits,
              period_credits: n.rollup.period_credits,
              closing_debit: n.rollup.closing_debit,
              closing_credit: n.rollup.closing_credit,
              transaction_count: undefined,
            }))}
            selectedId={undefined}
            onSelect={undefined}
            onToggleExpand={async () => { }}
            canHaveChildren={(node) => nodes.some(n => n.parent_id === (node as any).id)}
            getChildrenCount={(node) => nodes.filter(n => n.parent_id === (node as any).id).length}
            mode={mode}
            showTxnCount={false}
            showOpeningColsInRange={mode === 'range' ? showOpeningInRange : false}
            numbersOnly={numbersOnly}
            currencySymbol={numbersOnly ? 'none' : currencySymbol}
            expandedIds={expanded}
            onExpandedChange={setExpanded}
            showSubtotals={false}
            onOpenGL={(node) => {
              openGL(node.id)
            }}
          />
        </div>
      ) : (
        <div className={`standard-financial-statements ${styles.accountExplorerFullScreen}`} style={{ padding: '0.5rem', width: '100%' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className={styles.accountsTable}>
              <colgroup>
                {tableColWidths(mode, { periodOnly: (mode === 'range' && !showOpeningInRange) }).map((w, idx) => (
                  <col key={idx} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>{uiLang === 'ar' ? 'الكود' : 'Code'}</th>
                  <th>{uiLang === 'ar' ? 'اسم الحساب' : 'Account'}</th>
                  <th>{uiLang === 'ar' ? 'نوع الحساب' : 'Type'}</th>
                  <th>{uiLang === 'ar' ? 'المستوى' : 'Level'}</th>
                  {mode === 'range' ? (
                    <>
                      {showOpeningInRange && (<>
                        <th>{uiLang === 'ar' ? 'افتتاحي مدين' : 'Opening Debit'}</th>
                        <th>{uiLang === 'ar' ? 'افتتاحي دائن' : 'Opening Credit'}</th>
                      </>)}
                      <th>{uiLang === 'ar' ? 'مدين الفترة' : 'Period Debits'}</th>
                      <th>{uiLang === 'ar' ? 'دائن الفترة' : 'Period Credits'}</th>
                      <th>{uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit'}</th>
                      <th>{uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit'}</th>
                      <th>{uiLang === 'ar' ? 'صافي الفترة' : 'Period Net'}</th>
                      <th>{uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net'}</th>
                    </>
                  ) : (
                    <>
                      <th>{uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit'}</th>
                      <th>{uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit'}</th>
                      <th>{uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net'}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleFlat.map((n) => {
                  const periodNet = Number(n.rollup.period_debits || 0) - Number(n.rollup.period_credits || 0)
                  const finalNet = Number(n.rollup.closing_debit || 0) - Number(n.rollup.closing_credit || 0)
                  const hasChildren = (n.children && n.children.length > 0)
                  const rowClass = [
                    styles.clickableRow,
                    hasChildren ? styles.aeParentRow : '',
                    hasChildren && n.level === 1 ? styles.aeLevel1Row : '',
                    hasChildren && n.level === 2 ? styles.aeLevel2Row : '',
                    hasChildren && n.level === 3 ? styles.aeLevel3Row : '',
                    hasChildren && n.level >= 4 ? styles.aeLevel4Row : '',
                  ].filter(Boolean).join(' ')
                  return (
                    <tr
                      key={n.id}
                      className={rowClass}
                      title={uiLang === 'ar' ? 'فتح دفتر الأستاذ' : 'Open General Ledger'}
                      tabIndex={0}
                      role="button"
                      onClick={() => openGL(n.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGL(n.id) } }}
                    >
                      <td className={`${styles.tableCodeCell} contrast-table-code-${document.documentElement.getAttribute('data-theme') || 'light'}`}>{n.code}</td>
                      <td style={{ paddingInlineStart: `${(n.level - 1) * 16}px` }}>{isAr ? (n.name_ar || n.name) : (n.name || n.name_ar)}</td>
                      <td className={styles.tableCenter}>{n.category || '—'}</td>
                      <td className={styles.tableCenter}>{n.level}</td>
                      {mode === 'range' ? (
                        <>
                          {showOpeningInRange && (<>
                            <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.opening_debit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                            <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.opening_credit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                          </>)}
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.period_debits, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.period_credits, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.closing_debit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.closing_credit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(periodNet, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(finalNet, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                        </>
                      ) : (
                        <>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.closing_debit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.closing_credit, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(finalNet, numbersOnly ? 'none' : currencySymbol, { useArabicNumerals: isAr })}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountExplorerReport

