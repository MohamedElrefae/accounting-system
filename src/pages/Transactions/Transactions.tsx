import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAccounts, getTransactions, createTransaction, deleteTransaction, updateTransaction, getTransactionAudit, getCurrentUserId, getProjects, approveTransaction, requestRevision, rejectTransaction, submitTransaction, getUserDisplayMap, type Account, type TransactionRecord, type TransactionAudit, type Project } from '../../services/transactions'
import { listWorkItemsAll } from '../../services/work-items'
import type { WorkItemRow } from '../../types/work-items'
import { getOrganizations } from '../../services/organization'
import { getAllTransactionClassifications, type TransactionClassification } from '../../services/transaction-classification'
import { getExpensesCategoriesList } from '../../services/expenses-categories'
import { listAnalysisWorkItems } from '../../services/analysis-work-items'
import type { Organization } from '../../types'
import type { ExpensesCategoryRow } from '../../types/expenses-categories'
import { useHasPermission } from '../../hooks/useHasPermission'
import './Transactions.css'
import { useToast } from '../../contexts/ToastContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import TransactionView from './TransactionView'
import { getApprovalHistoryByTransactionId, type ApprovalHistoryRow } from '../../services/approvals'
import ClientErrorLogs from '../admin/ClientErrorLogs'
import PermissionBadge from '../../components/Common/PermissionBadge'
import { WithPermission } from '../../components/Common/withPermission'
import { logClientError } from '../../services/telemetry'
import UnifiedCRUDForm, { type UnifiedCRUDFormHandle } from '../../components/Common/UnifiedCRUDForm'
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel'
import { createTransactionFormConfig } from '../../components/Transactions/TransactionFormConfig'
import { getCostCentersForSelector } from '../../services/cost-centers'
import ResizableTable from '../../components/Common/ResizableTable'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'
import SearchableSelect, { type SearchableSelectOption } from '../../components/Common/SearchableSelect'
import { supabase } from '../../utils/supabase'
import { transactionValidationAPI } from '../../services/transaction-validation-api'

interface FilterState {
  dateFrom: string
  dateTo: string
  isPosted: string
  amountFrom: string
  amountTo: string
}

const TransactionsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [classifications, setClassifications] = useState<TransactionClassification[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ExpensesCategoryRow[]>([])
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([])
  const [analysisItemsMap, setAnalysisItemsMap] = useState<Record<string, { code: string; name: string }>>({})
  const [costCenters, setCostCenters] = useState<Array<{ id: string; code: string; name: string; name_ar?: string | null; project_id?: string | null; level: number }>>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [_formErrors, _setFormErrors] = useState<Record<string, string>>({})
  // const [postingId, setPostingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Unified form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsFor, setDetailsFor] = useState<TransactionRecord | null>(null)
  const [audit, setAudit] = useState<TransactionAudit[]>([])
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryRow[]>([])
  
  // Unified form panel state
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 })
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({ width: 800, height: 700 })
  const [panelMax, setPanelMax] = useState<boolean>(false)
  const [panelDocked, setPanelDocked] = useState<boolean>(false)
  const [panelDockPos, setPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>('right')
  
  const formRef = React.useRef<UnifiedCRUDFormHandle>(null)

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    isPosted: '',
    amountFrom: '',
    amountTo: '',
  })
  const [debitFilterId, setDebitFilterId] = useState<string>('')
  const [creditFilterId, setCreditFilterId] = useState<string>('')
  const [orgFilterId, setOrgFilterId] = useState<string>('')
  const [projectFilterId, setProjectFilterId] = useState<string>('')
  const [classificationFilterId, setClassificationFilterId] = useState<string>('')
  const [expensesCategoryFilterId, setExpensesCategoryFilterId] = useState<string>('')
  const [workItemFilterId, setWorkItemFilterId] = useState<string>('')
  const [costCenterFilterId, setCostCenterFilterId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  
  // Refresh Analysis Work Items label cache when org/project filter changes
  useEffect(() => {
    (async () => {
      try {
        const effectiveOrgId = orgFilterId || organizations[0]?.id || ''
        if (!effectiveOrgId) return
        const list = await listAnalysisWorkItems({
          orgId: effectiveOrgId,
          projectId: projectFilterId || null,
          onlyWithTx: false,
          includeInactive: true,
        })
        const map: Record<string, { code: string; name: string }> = {}
        for (const a of list) map[a.id] = { code: a.code, name: a.name }
        setAnalysisItemsMap(map)
      } catch {
        // no-op on failure; keep previous cache
      }
    })()
  }, [orgFilterId, projectFilterId, organizations])
  
  // Column configuration state
  const [columnConfigOpen, setColumnConfigOpen] = useState(false)

  const location = useLocation()
  // Apply workItemId from URL query (drill-through)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const wid = params.get('workItemId') || ''
      if (wid && wid !== workItemFilterId) {
        setWorkItemFilterId(wid)
        setPage(1)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])
  const hasPerm = useHasPermission()
  const { showToast } = useToast()
  const [showDiag, setShowDiag] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'revise' | 'reject' | null>(null)
  const [reviewReason, setReviewReason] = useState('')
  const [reviewTargetId, setReviewTargetId] = useState<string | null>(null)
  const [reviewBusy, setReviewBusy] = useState(false)

  // Submit modal state
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  const [submitTargetId, setSubmitTargetId] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)

  // determine mode: my | pending | all
  const mode: 'my' | 'pending' | 'all' = location.pathname.includes('/transactions/my')
    ? 'my'
    : location.pathname.includes('/transactions/pending')
    ? 'pending'
    : 'all'

  // Default column configuration for transactions table
  const defaultColumns: ColumnConfig[] = useMemo(() => [
    { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, minWidth: 100, maxWidth: 200, type: 'text', resizable: true },
    { key: 'entry_date', label: 'التاريخ', visible: true, width: 130, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
    { key: 'description', label: 'البيان', visible: true, width: 250, minWidth: 200, maxWidth: 400, type: 'text', resizable: true },
    { key: 'debit_account_label', label: 'الحساب المدين', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'credit_account_label', label: 'الحساب الدائن', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'amount', label: 'المبلغ', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'currency', resizable: true },
    { key: 'classification_name', label: 'التصنيف', visible: true, width: 160, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'expenses_category_label', label: 'فئة المصروف', visible: true, width: 200, minWidth: 140, maxWidth: 280, type: 'text', resizable: true },
    { key: 'work_item_label', label: 'عنصر العمل', visible: true, width: 200, minWidth: 140, maxWidth: 280, type: 'text', resizable: true },
    { key: 'analysis_work_item_label', label: 'بند التحليل', visible: true, width: 200, minWidth: 140, maxWidth: 280, type: 'text', resizable: true },
    { key: 'organization_name', label: 'المؤسسة', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'project_name', label: 'المشروع', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'cost_center_label', label: 'مركز التكلفة', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'reference_number', label: 'المرجع', visible: false, width: 120, minWidth: 100, maxWidth: 180, type: 'text', resizable: true },
    { key: 'notes', label: 'الملاحظات', visible: false, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'created_by_name', label: 'أنشئت بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'posted_by_name', label: 'مرحلة بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'status', label: 'الحالة', visible: true, width: 100, minWidth: 80, maxWidth: 150, type: 'text', resizable: true },
    { key: 'actions', label: 'الإجراءات', visible: true, width: 200, minWidth: 180, maxWidth: 250, type: 'actions', resizable: false }
  ], [])

  // Column preferences hook
  const {
    columns,
    handleColumnResize,
    handleColumnConfigChange,
    resetToDefaults
  } = useColumnPreferences({
    storageKey: 'transactions_table_columns',
    defaultColumns,
    userId: currentUserId || undefined
  })

  // Server-side load
  const [totalCount, setTotalCount] = useState(0)
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [accs, projectsList, orgsList, classificationsList, uid] = await Promise.all([
          getAccounts(),
          getProjects().catch(() => []), // Don't fail if projects service isn't available
          getOrganizations().catch(() => []), // Don't fail if organizations service isn't available
          getAllTransactionClassifications().catch(() => []), // Don't fail if classifications service isn't available
          getCurrentUserId(),
        ])
        // Prime analysis items map for all projects (shallow) — optional light cache
        try {
          const defaultOrgId = orgsList[0]?.id || ''
          if (defaultOrgId) {
            const list = await listAnalysisWorkItems({ orgId: defaultOrgId, projectId: null, onlyWithTx: false, includeInactive: true })
            const map: Record<string, { code: string; name: string }> = {}
            for (const a of list) map[a.id] = { code: a.code, name: a.name }
            setAnalysisItemsMap(map)
          }
        } catch {}
        setAccounts(accs)
        setProjects(projectsList)
        setOrganizations(orgsList)
        setClassifications(classificationsList)
        setCurrentUserId(uid)
        await reload()
      } catch (e: any) {
        setError(e.message || 'فشل تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [location.pathname])

  // When opening the CRUD form, refresh accounts to pick up newly added accounts from the tree
  useEffect(() => {
    if (!formOpen) return
    getAccounts().then(setAccounts).catch(() => {})
    // Load expenses categories for the org used in the form (editing's org or default MAIN or first org)
    const orgIdForForm = editingTx?.org_id || organizations.find(org => org.code === 'MAIN')?.id || organizations[0]?.id || ''
    if (orgIdForForm) {
      getExpensesCategoriesList(orgIdForForm).then(setCategories).catch(() => setCategories([]))
      // Load cost centers for the selected organization
      getCostCentersForSelector(orgIdForForm).then(setCostCenters).catch(() => setCostCenters([]))
    } else {
      setCategories([])
      setCostCenters([])
    }
  }, [formOpen, editingTx, organizations])

  async function reload() {
    const { rows, total } = await getTransactions({
      filters: {
        scope: mode === 'my' ? 'my' : 'all',
        pendingOnly: mode === 'pending',
        search: searchTerm,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        amountFrom: filters.amountFrom ? parseFloat(filters.amountFrom) : undefined,
        amountTo: filters.amountTo ? parseFloat(filters.amountTo) : undefined,
        debitAccountId: debitFilterId || undefined,
        creditAccountId: creditFilterId || undefined,
        orgId: orgFilterId || undefined,
        projectId: projectFilterId || undefined,
        classificationId: classificationFilterId || undefined,
        expensesCategoryId: expensesCategoryFilterId || undefined,
        workItemId: workItemFilterId || undefined,
        costCenterId: costCenterFilterId || undefined,
        analysisWorkItemId: (filters as any).analysis_work_item_id || undefined,
      },
      page,
      pageSize,
    })
    setTransactions(rows)
    setTotalCount(total)

    // Load expenses categories for all orgs present in the page results (union)
    try {
      const orgIds = Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      if (orgIds.length > 0) {
        const lists = await Promise.all(orgIds.map(id => getExpensesCategoriesList(id).catch(() => [])))
        const merged: Record<string, ExpensesCategoryRow> = {}
        for (const list of lists) {
          for (const r of list) merged[r.id] = r
        }
        setCategories(Object.values(merged))
      } else {
        setCategories([])
      }
    } catch {
      // non-fatal
    }

    // Load work items for all orgs present (all items incl. overrides) for id->label mapping
    try {
      const orgIds = Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      if (orgIds.length > 0) {
        const lists = await Promise.all(orgIds.map(id => listWorkItemsAll(id).catch(() => [])))
        const merged: Record<string, WorkItemRow> = {}
        for (const list of lists) {
          for (const r of list) merged[r.id] = r
        }
        setWorkItems(Object.values(merged))
      } else {
        setWorkItems([])
      }
    } catch {
      // non-fatal
    }

    // resolve creator/poster names
    const ids: string[] = []
    rows.forEach(t => { if (t.created_by) ids.push(t.created_by); if (t.posted_by) ids.push(t.posted_by!) })
    try {
      const map = await getUserDisplayMap(ids)
      setUserNames(map)
    } catch {}
  }

  // With server-side, filtered equals transactions
  const filtered = transactions

  // Pagination handled server-side; local page shows fetched rows
  const paged = transactions

  // Build account options for filters: all accounts (including non-postable) + drilldown tree
  const accountFlatAllOptions: SearchableSelectOption[] = useMemo(() => {
    return accounts
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
        searchText: `${a.code} ${a.name}`.toLowerCase(),
        disabled: false,
      }))
  }, [accounts])
  const accountTreeOptionsAll: SearchableSelectOption[] = useMemo(() => {
    // Build by parent map
    const byId: Record<string, Account> = {}
    const byParent: Record<string, Account[]> = {}
    const roots: Account[] = []
    for (const a of accounts) byId[a.id] = a
    for (const a of accounts) {
      if (a.parent_id && byId[a.parent_id]) {
        if (!byParent[a.parent_id]) byParent[a.parent_id] = []
        byParent[a.parent_id].push(a)
      } else {
        roots.push(a)
      }
    }
    const sortByCode = (list: Account[]) => list.sort((x, y) => x.code.localeCompare(y.code))
    sortByCode(roots)
    for (const k of Object.keys(byParent)) sortByCode(byParent[k])
    const makeNode = (acc: Account): SearchableSelectOption => {
      const children = (byParent[acc.id] || []).map(makeNode)
      return {
        value: acc.id,
        label: `${acc.code} - ${acc.name}`,
        searchText: `${acc.code} ${acc.name}`.toLowerCase(),
        disabled: false, // allow selecting all accounts in filters, incl. non-postable
        children: children.length ? children : undefined,
      }
    }
    return roots.map(makeNode)
  }, [accounts])

  // Prepare table data for ResizableTable
  const tableData = useMemo(() => {
    const accLabel = (id?: string | null) => {
      if (!id) return ''
      const a = accounts.find(x => x.id === id)
      return a ? `${a.code} - ${a.name}` : id
    }

    const catMap: Record<string, string> = {}
    for (const c of categories) { catMap[c.id] = `${c.code} - ${c.description}` }

    return paged.map((t: any) => ({
      entry_number: t.entry_number,
      entry_date: t.entry_date, // Keep raw date for DateFormatter
      description: t.description,
      debit_account_label: accLabel(t.debit_account_id),
      credit_account_label: accLabel(t.credit_account_id),
      amount: t.amount,
      expenses_category_label: t.expenses_category_id ? (catMap[t.expenses_category_id] || '—') : '—',
      work_item_label: (() => { const wi = workItems.find(w => w.id === (t.work_item_id || '')); return wi ? `${wi.code} - ${wi.name}` : '—' })(),
      analysis_work_item_label: (() => {
        const id = (t as any).analysis_work_item_id || ''
        if (!id) return '—'
        const a = analysisItemsMap[id]
        return a ? `${a.code} - ${a.name}` : id
      })(),
      classification_name: t.transaction_classification?.name || '—',
      organization_name: organizations.find(o => o.id === (t.org_id || ''))?.name || '—',
      project_name: projects.find(p => p.id === (t.project_id || ''))?.name || '—',
      cost_center_label: t.cost_center_code && t.cost_center_name ? `${t.cost_center_code} - ${t.cost_center_name}` : '—',
      reference_number: t.reference_number || '—',
      notes: t.notes || '—',
      created_by_name: t.created_by ? (userNames[t.created_by] || t.created_by.substring(0, 8)) : '—',
      posted_by_name: t.posted_by ? (userNames[t.posted_by] || t.posted_by.substring(0, 8)) : '—',
      status: t.is_posted ? 'مرحلة' : 'غير مرحلة',
      actions: null, // Will be handled by renderCell
      original: t // Keep reference to original transaction for actions
    }))
  }, [paged, accounts, userNames])

  // Export data
  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'entry_number', header: 'رقم القيد', type: 'text' },
      { key: 'entry_date', header: 'التاريخ', type: 'date' },
      { key: 'description', header: 'البيان', type: 'text' },
      { key: 'debit_account', header: 'الحساب المدين', type: 'text' },
      { key: 'credit_account', header: 'الحساب الدائن', type: 'text' },
      { key: 'amount', header: 'المبلغ', type: 'currency' },
      { key: 'classification_name', header: 'التصنيف', type: 'text' },
      { key: 'expenses_category', header: 'فئة المصروف', type: 'text' },
      { key: 'work_item', header: 'عنصر العمل', type: 'text' },
      { key: 'analysis_work_item', header: 'بند التحليل', type: 'text' },
      { key: 'organization_name', header: 'المؤسسة', type: 'text' },
      { key: 'project_name', header: 'المشروع', type: 'text' },
      { key: 'cost_center', header: 'مركز التكلفة', type: 'text' },
      { key: 'reference_number', header: 'المرجع', type: 'text' },
      { key: 'notes', header: 'الملاحظات', type: 'text' },
      { key: 'created_by', header: 'أنشئت بواسطة', type: 'text' },
      { key: 'posted_by', header: 'مرحلة بواسطة', type: 'text' },
      { key: 'posted_at', header: 'تاريخ الترحيل', type: 'date' },
      { key: 'status', header: 'الحالة', type: 'text' },
    ])
    const accLabel = (id?: string | null) => {
      if (!id) return ''
      const a = accounts.find(x => x.id === id)
      return a ? `${a.code} - ${a.name}` : id
    }
    const catMap: Record<string, string> = {}
    for (const c of categories) { catMap[c.id] = `${c.code} - ${c.description}` }
    const rows = filtered.map((t: any) => ({
      entry_number: t.entry_number,
      entry_date: t.entry_date,
      description: t.description,
      debit_account: accLabel(t.debit_account_id),
      credit_account: accLabel(t.credit_account_id),
      amount: t.amount,
      expenses_category: t.expenses_category_id ? (catMap[t.expenses_category_id] || '') : '',
      work_item: (() => { const wi = workItems.find(w => w.id === (t.work_item_id || '')); return wi ? `${wi.code} - ${wi.name}` : '' })(),
      analysis_work_item: (() => { const id = (t as any).analysis_work_item_id; const a = id ? analysisItemsMap[id] : null; return a ? `${a.code} - ${a.name}` : (id || '') })(),
      classification_name: t.transaction_classification?.name || '',
      organization_name: organizations.find(o => o.id === (t.org_id || ''))?.name || '',
      project_name: projects.find(p => p.id === (t.project_id || ''))?.name || '',
      cost_center: t.cost_center_code && t.cost_center_name ? `${t.cost_center_code} - ${t.cost_center_name}` : '',
      reference_number: t.reference_number || '',
      notes: t.notes || '',
      created_by: t.created_by ? (userNames[t.created_by] || t.created_by) : '',
      posted_by: t.posted_by ? (userNames[t.posted_by] || t.posted_by) : '',
      posted_at: t.posted_at || null,
      status: t.is_posted ? 'مرحلة' : 'غير مرحلة',
    }))
    return prepareTableData(columns, rows)
  }, [transactions, userNames, accounts])

  // Create unified form configuration
  const transactionFormConfig = useMemo(() => {
    return createTransactionFormConfig(
      editingTx !== null,
      accounts,
      projects,
      organizations,
      classifications,
      editingTx || undefined,
      categories,
      // Prefer work items for current org (MAIN or edit org)
      workItems,
      costCenters
    )
  }, [editingTx, accounts, projects, organizations, classifications, categories, workItems, costCenters])
  
  // Snapshot initial form data at open time to prevent clearing user selections
  const initialFormDataRef = React.useRef<any | null>(null)
  
  const buildInitialFormDataForEdit = (tx: TransactionRecord) => ({
    entry_number: tx.entry_number,
    entry_date: tx.entry_date,
    description: tx.description,
    debit_account_id: tx.debit_account_id,
    credit_account_id: tx.credit_account_id,
    amount: tx.amount,
    reference_number: tx.reference_number || '',
    notes: tx.notes || '',
    classification_id: tx.classification_id || '',
    expenses_category_id: (tx as any).expenses_category_id || '',
    work_item_id: (tx as any).work_item_id || '',
    cost_center_id: tx.cost_center_id || '',
    organization_id: tx.org_id || '',
    project_id: tx.project_id || ''
  })

  const buildInitialFormDataForCreate = () => {
    // Default organization (MAIN) and project (GENERAL)
    const defaultOrg = organizations.find(org => org.code === 'MAIN');
    const defaultProject = projects.find(project => project.code === 'GENERAL');
    // Restore last selected debit/credit if available
    let lastDebit = ''
    let lastCredit = ''
    try {
      lastDebit = localStorage.getItem('tx_last_debit_account_id') || ''
      lastCredit = localStorage.getItem('tx_last_credit_account_id') || ''
    } catch {}
    return {
      entry_number: 'سيتم توليده تلقائياً',
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      debit_account_id: lastDebit,
      credit_account_id: lastCredit,
      amount: 0,
      reference_number: '',
      notes: '',
      organization_id: defaultOrg?.id || '',
      project_id: defaultProject?.id || ''
    }
  }

  // Helper to enrich a transaction with display fields so UI reflects org/project immediately
  const enrichTx = (tx: TransactionRecord) => {
    const orgName = organizations.find(o => o.id === (tx.org_id || ''))?.name || null
    const projectName = projects.find(p => p.id === (tx.project_id || ''))?.name || null
    return { ...(tx as any), organization_name: orgName, project_name: projectName } as any
  }

  // Unified form handlers
  const handleFormSubmit = async (data: any) => {
    _setFormErrors({})
    try {
      setIsSaving(true)

      // Perform backend validation before saving
      try {
        const validationResult = await transactionValidationAPI.validateTransactionBeforeSave({
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          description: data.description,
          entry_date: data.entry_date,
          transaction_id: editingTx?.id
        })

        // Show validation warnings (but allow proceeding)
        if (validationResult.warnings.length > 0) {
          const warningMessage = validationResult.warnings.map(w => w.message).join('\n')
          const proceed = window.confirm(`تحذيرات التحقق:\n${warningMessage}\n\nهل تريد المتابعة؟`)
          if (!proceed) {
            setIsSaving(false)
            return
          }
        }

        // Block submission if there are errors
        if (!validationResult.is_valid) {
          const errorMessage = validationResult.errors.map(e => e.message).join('\n')
          showToast(`أخطاء في التحقق من صحة المعاملة:\n${errorMessage}`, { severity: 'error' })
          setIsSaving(false)
          return
        }
      } catch (validationError) {
        console.warn('Backend validation failed, proceeding with client validation only:', validationError)
        // Continue with normal processing if backend validation fails
      }

      if (editingTx) {
        // Update existing transaction
        const attemptedUpdate = {
          entry_date: data.entry_date,
          description: data.description,
          reference_number: data.reference_number || null,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          notes: data.notes || null,
          classification_id: data.classification_id || null,
          expenses_category_id: data.expenses_category_id || null,
          work_item_id: data.work_item_id || null,
          analysis_work_item_id: data.analysis_work_item_id || null,
          cost_center_id: data.cost_center_id || null,
          org_id: data.organization_id || null,
          project_id: data.project_id || null,
        } as const
        const updated = await updateTransaction(editingTx.id, attemptedUpdate as any)
        // Ensure display fields (organization_name/project_name) are updated locally
        const updatedEnriched = enrichTx(updated)
        setTransactions(prev => prev.map(t => t.id === updated.id ? updatedEnriched : t))
        showToast('تم تحديث المعاملة', { severity: 'success' })
        // Ensure server truth is reflected (joins, computed fields)
        await reload()
      } else {
        // Persist last selected debit/credit for convenience in next entries
        try {
          localStorage.setItem('tx_last_debit_account_id', String(data.debit_account_id || ''))
          localStorage.setItem('tx_last_credit_account_id', String(data.credit_account_id || ''))
        } catch {}
        // Create new transaction with optimistic update
        const tempId = `temp-${Date.now()}`
        const temp: TransactionRecord = {
          id: tempId,
          entry_number: data.entry_number,
          entry_date: data.entry_date,
          description: data.description,
          reference_number: data.reference_number || null,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          notes: data.notes || null,
          org_id: data.organization_id || null,
          project_id: data.project_id || null,
          is_posted: false,
          posted_at: null,
          posted_by: null,
          created_by: currentUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        // Enrich optimistic row for immediate display
        const tempEnriched = enrichTx(temp)
        setTransactions(prev => [tempEnriched as any, ...prev])

    const rec = await createTransaction({
          entry_number: data.entry_number,
          entry_date: data.entry_date,
          description: data.description,
          reference_number: data.reference_number || undefined,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          notes: data.notes || undefined,
          classification_id: data.classification_id || undefined,
          expenses_category_id: data.expenses_category_id || undefined,
          work_item_id: data.work_item_id || undefined,
          analysis_work_item_id: data.analysis_work_item_id || undefined,
          cost_center_id: data.cost_center_id || undefined,
          org_id: data.organization_id || undefined,
          project_id: data.project_id || undefined,
        })
        // Replace temp with real and enrich for display
        const recEnriched = enrichTx(rec)
        setTransactions(prev => prev.map(t => t.id === tempId ? (recEnriched as any) : t))
        showToast('تم إنشاء المعاملة', { severity: 'success' })
        // Refresh to load full server-side record
        await reload()
      }

      setEditingTx(null)
      setFormOpen(false)
    } catch (e: any) {
      // Rollback optimistic update if it was a create
      if (!editingTx) {
        setTransactions(prev => prev.filter(t => !(typeof t.id === 'string' && t.id.startsWith('temp-'))))
      }
      const msg = e?.message || 'خطأ في حفظ المعاملة'
      _setFormErrors({ general: msg })
      const operation = editingTx ? 'تحديث' : 'إنشاء'
      const detail = editingTx ? ` (رقم القيد ${editingTx.entry_number})` : ''
      showToast(`فشل ${operation} المعاملة${detail}. تم التراجع عن العملية. السبب: ${msg}`.trim(), { severity: 'error' })
      logClientError({
        context: editingTx ? 'transactions.update' : 'transactions.create',
        message: msg,
        extra: editingTx ? { id: editingTx.id, attempted: {
          entry_date: data.entry_date,
          description: data.description,
          reference_number: data.reference_number || null,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          notes: data.notes || null,
          classification_id: data.classification_id || null,
          expenses_category_id: data.expenses_category_id || null,
          work_item_id: data.work_item_id || null,
          cost_center_id: data.cost_center_id || null,
          org_id: data.organization_id || null,
          project_id: data.project_id || null,
        }} : data
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleFormCancel = () => {
    setEditingTx(null)
    setFormOpen(false)
    _setFormErrors({})
  }

  const openNewTransactionForm = () => {
    setEditingTx(null)
    // Snapshot initial data for a new record, including last selected debit/credit
    initialFormDataRef.current = buildInitialFormDataForCreate()
    setFormOpen(true)
  }


  const handleDelete = async (id: string) => {
    const ok = window.confirm('هل أنت متأكد من حذف هذه المعاملة غير المرحلة؟')
    if (!ok) return
    setDeletingId(id)
    // optimistic remove
    const prev = transactions
    const rec = transactions.find(t => t.id === id)
    const next = transactions.filter(t => t.id !== id)
    setTransactions(next)
    try {
      await deleteTransaction(id)
      showToast('تم حذف المعاملة', { severity: 'success' })
    } catch (e: any) {
      // rollback
      setTransactions(prev)
      const detail = rec ? ` (رقم القيد ${rec.entry_number})` : ''
      const msg = e?.message || ''
      showToast(`فشل حذف المعاملة${detail}. تم التراجع عن العملية. السبب: ${msg}`.trim(), { severity: 'error' })
      logClientError({ context: 'transactions.delete', message: msg, extra: { id } })
    } finally {
      setDeletingId(null)
    }
  }

  const openReview = (action: 'approve' | 'revise' | 'reject', id: string) => {
    setReviewAction(action)
    setReviewReason('')
    setReviewTargetId(id)
    setReviewOpen(true)
  }

  const submitReview = async () => {
    if (!reviewAction || !reviewTargetId) return
    setReviewBusy(true)
    try {
      if (reviewAction === 'approve') {
        await approveTransaction(reviewTargetId, reviewReason || null as any)
        // After approval, check whether posting actually happened. If posting permissions
        // are missing, the RPC succeeds (approved) but posting is skipped gracefully.
        let posted = false
        try {
          const { data } = await supabase
            .from('transactions')
            .select('is_posted')
            .eq('id', reviewTargetId)
            .single()
          posted = Boolean(data?.is_posted)
        } catch {}
        if (posted) {
          showToast('تم اعتماد المعاملة (وتم ترحيلها)', { severity: 'success' })
        } else {
          showToast('تم اعتماد المعاملة (لم تُرحَّل — صلاحية الترحيل مطلوبة)', { severity: 'warning' as any })
        }
      } else if (reviewAction === 'revise') {
        if (!reviewReason.trim()) {
          showToast('يرجى إدخال سبب الإرجاع للتعديل', { severity: 'error' })
          setReviewBusy(false)
          return
        }
        await requestRevision(reviewTargetId, reviewReason)
        showToast('تم إرجاع المعاملة للتعديل', { severity: 'success' })
      } else if (reviewAction === 'reject') {
        if (!reviewReason.trim()) {
          showToast('يرجى إدخال سبب الرفض', { severity: 'error' })
          setReviewBusy(false)
          return
        }
        await rejectTransaction(reviewTargetId, reviewReason)
        showToast('تم رفض المعاملة', { severity: 'success' })
      }
      setReviewOpen(false)
      setReviewTargetId(null)
      setReviewAction(null)
      setReviewReason('')
      await reload()
    } catch (e: any) {
      const msg = e?.message || 'فشل إجراء المراجعة'
      showToast(msg, { severity: 'error' })
      logClientError({ context: `transactions.review.${reviewAction}`, message: msg, extra: { id: reviewTargetId, reason: reviewReason } })
    } finally {
      setReviewBusy(false)
    }
  }

  useEffect(() => { reload().catch(() => {}) }, [searchTerm, filters.dateFrom, filters.dateTo, filters.amountFrom, filters.amountTo, (filters as any).analysis_work_item_id, debitFilterId, creditFilterId, orgFilterId, projectFilterId, classificationFilterId, expensesCategoryFilterId, workItemFilterId, costCenterFilterId, page, pageSize, mode])

  if (loading) return <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
  if (error) return <div className="error-container">خطأ: {error}</div>

  return (
    <div className="transactions-container" dir="rtl">
      <div className="transactions-header">
        <h1 className="transactions-title">المعاملات</h1>
        <div className="transactions-actions">
          {mode === 'my' && (
            <WithPermission perm="transactions.create">
              <button className="ultimate-btn ultimate-btn-add" onClick={openNewTransactionForm}>
                <div className="btn-content"><span className="btn-text">+ معاملة جديدة</span></div>
              </button>
            </WithPermission>
          )}
          <button className="ultimate-btn ultimate-btn-edit" onClick={() => setColumnConfigOpen(true)}>
            <div className="btn-content"><span className="btn-text">⚙️ إعدادات الأعمدة</span></div>
          </button>
          <ExportButtons
            data={exportData}
            config={{ title: 'تقرير المعاملات', rtlLayout: true, useArabicNumerals: true }}
            size="small"
            layout="horizontal"
          />
          <button className="ultimate-btn ultimate-btn-add" onClick={() => { try { window.open('/main-data/analysis-work-items', '_blank', 'noopener'); } catch {} }}>
            <div className="btn-content"><span className="btn-text">+ بند تحليل جديد</span></div>
          </button>
          <WithPermission perm="transactions.manage">
            <button className="ultimate-btn ultimate-btn-warning" onClick={() => setShowLogs(true)}>
              <div className="btn-content"><span className="btn-text">سجل الأخطاء</span></div>
            </button>
          </WithPermission>
          <button className="ultimate-btn ultimate-btn-warning" onClick={() => setShowDiag(v => !v)}>
            <div className="btn-content"><span className="btn-text">{showDiag ? 'إخفاء الصلاحيات' : 'عرض الصلاحيات'}</span></div>
          </button>
        </div>
      </div>

      {showDiag && (
        <div className="diag-panel">
          <div className="diag-perms-box">
            {['transactions.create','transactions.update','transactions.delete','transactions.post','transactions.review','transactions.manage'].map(key => (
              <PermissionBadge key={key} allowed={hasPerm(key)} label={key} />
            ))}
          </div>
        </div>
      )}

      {/* Compact unified filters row - inspired by General Ledger */}
      <div className="transactions-filters-row">
        {/* Search */}
        <input
          placeholder="بحث..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
          className="filter-input filter-input--search"
        />
        
        {/* Date range */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1) }}
          className="filter-input filter-input--date"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1) }}
          className="filter-input filter-input--date"
        />
        
        {/* Status filter */}
        <select
          value={filters.isPosted}
          onChange={e => { setFilters({ ...filters, isPosted: e.target.value }); setPage(1) }}
          className="filter-select filter-select--status"
        >
          <option value="">الحالة</option>
          <option value="posted">مرحلة</option>
          <option value="unposted">غير مرحلة</option>
        </select>
        
        {/* Organization filter */}
        <select
          value={orgFilterId}
          onChange={e => { setOrgFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--org"
        >
          <option value="">جميع المؤسسات</option>
          {organizations.map(o => (
            <option key={o.id} value={o.id}>
              {`${o.code} - ${o.name}`.substring(0, 40)}
            </option>
          ))}
        </select>
        
        {/* Project filter */}
        <select
          value={projectFilterId}
          onChange={e => { setProjectFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--project"
        >
          <option value="">جميع المشاريع</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {`${p.code} - ${p.name}`.substring(0, 40)}
            </option>
          ))}
        </select>
        
        {/* Debit account filter (all accounts, searchable, with drilldown) */}
        <div style={{ minWidth: 280 }}>
          <SearchableSelect
            id="transactions.filter.debit"
            value={debitFilterId}
            options={[{ value: '', label: 'جميع الحسابات المدينة', searchText: '' }, ...accountFlatAllOptions]}
            onChange={(v) => { setDebitFilterId(v); setPage(1) }}
            placeholder="جميع الحسابات المدينة"
            clearable={true}
            showDrilldownModal={true}
            treeOptions={accountTreeOptionsAll}
          />
        </div>
        
        {/* Credit account filter (all accounts, searchable, with drilldown) */}
        <div style={{ minWidth: 280 }}>
          <SearchableSelect
            id="transactions.filter.credit"
            value={creditFilterId}
            options={[{ value: '', label: 'جميع الحسابات الدائنة', searchText: '' }, ...accountFlatAllOptions]}
            onChange={(v) => { setCreditFilterId(v); setPage(1) }}
            placeholder="جميع الحسابات الدائنة"
            clearable={true}
            showDrilldownModal={true}
            treeOptions={accountTreeOptionsAll}
          />
        </div>
        
        {/* Classification filter */}
        <select
          value={classificationFilterId}
          onChange={e => { setClassificationFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--classification"
        >
          <option value="">جميع التصنيفات</option>
          {classifications.map(c => (
            <option key={c.id} value={c.id}>
              {`${c.code} - ${c.name}`.substring(0, 40)}
            </option>
          ))}
        </select>

        {/* Expenses category filter */}
        <select
          value={expensesCategoryFilterId}
          onChange={e => { setExpensesCategoryFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--expenses"
        >
          <option value="">جميع فئات المصروف</option>
          {categories
            .slice()
            .sort((a, b) => `${a.code} - ${a.description}`.localeCompare(`${b.code} - ${b.description}`))
            .map(cat => (
              <option key={cat.id} value={cat.id}>
                {`${cat.code} - ${cat.description}`.substring(0, 52)}
              </option>
            ))}
        </select>

        {/* Work Item filter */}
        <select
          value={workItemFilterId}
          onChange={e => { setWorkItemFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--workitem"
        >
          <option value="">جميع عناصر العمل</option>
          {workItems
            .slice()
            .sort((a, b) => `${a.code} - ${a.name}`.localeCompare(`${b.code} - ${b.name}`))
            .map(w => (
              <option key={w.id} value={w.id}>
                {`${w.code} - ${w.name}`.substring(0, 52)}
              </option>
            ))}
        </select>

        {/* Analysis Work Item filter */}
        <select
          value={(filters as any).analysis_work_item_id || ''}
          onChange={e => { (setFilters as any)({ ...filters, analysis_work_item_id: e.target.value }); setPage(1) }}
          className="filter-select filter-select--analysisworkitem"
        >
          <option value="">جميع بنود التحليل</option>
          {Object.entries(analysisItemsMap)
            .sort((a, b) => `${a[1].code} - ${a[1].name}`.localeCompare(`${b[1].code} - ${b[1].name}`))
            .map(([id, a]) => (
              <option key={id} value={id}>
                {`${a.code} - ${a.name}`.substring(0, 52)}
              </option>
            ))}
        </select>
        
        {/* Cost Center filter */}
        <select
          value={costCenterFilterId}
          onChange={e => { setCostCenterFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--costcenter"
        >
          <option value="">جميع مراكز التكلفة</option>
          {costCenters
            .slice()
            .sort((a, b) => `${a.code} - ${a.name}`.localeCompare(`${b.code} - ${b.name}`))
            .map(cc => (
              <option key={cc.id} value={cc.id}>
                {`${cc.code} - ${cc.name}`.substring(0, 52)}
              </option>
            ))}
        </select>
        
        {/* Amount range filters */}
        <input
          type="number"
          placeholder="من مبلغ"
          value={filters.amountFrom}
          onChange={e => { setFilters({ ...filters, amountFrom: e.target.value }); setPage(1) }}
          className="filter-input filter-input--amount"
        />
        <input
          type="number"
          placeholder="إلى مبلغ"
          value={filters.amountTo}
          onChange={e => { setFilters({ ...filters, amountTo: e.target.value }); setPage(1) }}
          className="filter-input filter-input--amount"
        />
        
        {/* Clear filters button */}
        <button
          onClick={() => {
            setSearchTerm('')
            setFilters({ dateFrom: '', dateTo: '', isPosted: '', amountFrom: '', amountTo: '' })
            setDebitFilterId('')
            setCreditFilterId('')
            setOrgFilterId('')
            setProjectFilterId('')
            setClassificationFilterId('')
            setExpensesCategoryFilterId('')
            setCostCenterFilterId('')
            setPage(1)
          }}
          className="ultimate-btn ultimate-btn-warning filter-clear-btn"
          title="مسح جميع الفلاتر"
        >
          🔄
        </button>
      </div>

      {/* Table */}
      <div className="transactions-content">
        <div className="transactions-tablebar">
          <div className="transactions-toolbar">
            <span className="transactions-count">عدد السجلات: {totalCount}</span>
            <button className="ultimate-btn" onClick={() => reload().catch(() => {})}>
              <div className="btn-content"><span className="btn-text">تحديث</span></div>
            </button>
          </div>
          <div className="transactions-pagination">
            <button className="ultimate-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><div className="btn-content"><span className="btn-text">السابق</span></div></button>
            <span>صفحة {page} من {Math.max(1, Math.ceil(totalCount / pageSize))}</span>
            <button className="ultimate-btn" onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize) || 1, p + 1))} disabled={page >= Math.ceil(totalCount / pageSize)}><div className="btn-content"><span className="btn-text">التالي</span></div></button>
            <select className="filter-select" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value) || 20); setPage(1) }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        <ResizableTable
          columns={columns}
          data={tableData}
          onColumnResize={handleColumnResize}
          className="transactions-resizable-table"
          isLoading={loading}
          emptyMessage="لا توجد معاملات"
          renderCell={(_value, column, row, _rowIndex) => {
            if (column.key === 'actions') {
              return (
                <div className="tree-node-actions">
                  {/* View details (audit) */}
                  <button className="ultimate-btn ultimate-btn-edit" onClick={async () => {
                    setDetailsFor(row.original)
                    try {
                      const rows = await getTransactionAudit(row.original.id)
                      setAudit(rows)
                    } catch {}
                    try {
                      const hist = await getApprovalHistoryByTransactionId(row.original.id)
                      setApprovalHistory(hist)
                    } catch {}
                    setDetailsOpen(true)
                  }}><div className="btn-content"><span className="btn-text">تفاصيل</span></div></button>
                  {/* Test workflow shortcut */}
                  <WithPermission perm="transactions.manage">
                    <button className="ultimate-btn" title="اختبار المسار" onClick={() => {
                      try { window.open(`/approvals/test?txId=${row.original.id}`, '_blank', 'noopener') } catch {}
                    }}>
                      <div className="btn-content"><span className="btn-text">اختبار</span></div>
                    </button>
                  </WithPermission>
                  {/* Review actions in pending mode if permitted */}
                  {mode === 'pending' && !row.original.is_posted && (
                    <>
                      <WithPermission perm="transactions.review">
                        <button className="ultimate-btn ultimate-btn-success" onClick={() => openReview('approve', row.original.id)}>
                          <div className="btn-content"><span className="btn-text">اعتماد</span></div>
                        </button>
                      </WithPermission>
                      <WithPermission perm="transactions.review">
                        <button className="ultimate-btn ultimate-btn-edit" onClick={() => openReview('revise', row.original.id)}>
                          <div className="btn-content"><span className="btn-text">إرجاع للتعديل</span></div>
                        </button>
                      </WithPermission>
                      <WithPermission perm="transactions.review">
                        <button className="ultimate-btn ultimate-btn-delete" onClick={() => openReview('reject', row.original.id)}>
                          <div className="btn-content"><span className="btn-text">رفض</span></div>
                        </button>
                      </WithPermission>
                    </>
                  )}
                  {/* Submit for review (my) - Temporarily disabled */}
                  {/*mode === 'my' && !row.original.is_posted && row.original.created_by === currentUserId && !['submitted','approved','rejected'].includes((row.original as any).approval_status || 'draft') && (
                    <button className="ultimate-btn ultimate-btn-success" onClick={() => {
                      setSubmitTargetId(row.original.id)
                      setSubmitNote('')
                      setSubmitOpen(true)
                    }}>
                      <div className="btn-content"><span className="btn-text">إرسال للمراجعة</span></div>
                    </button>
                  )*/}
                  {/* Edit (my) */}
                  {mode === 'my' && !row.original.is_posted && hasPerm('transactions.update') && row.original.created_by === currentUserId && (
                    <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                      setEditingTx(row.original)
                      // Snapshot initial data for edit
                      initialFormDataRef.current = buildInitialFormDataForEdit(row.original)
                      setFormOpen(true)
                    }}><div className="btn-content"><span className="btn-text">تعديل</span></div></button>
                  )}
                  {/* Edit (all) via manage */}
                  {mode === 'all' && !row.original.is_posted && hasPerm('transactions.manage') && (
                    <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                      setEditingTx(row.original)
                      // Snapshot initial data for edit
                      initialFormDataRef.current = buildInitialFormDataForEdit(row.original)
                      setFormOpen(true)
                    }}><div className="btn-content"><span className="btn-text">تعديل</span></div></button>
                  )}
                  {/* Delete only in my mode, unposted, with permission */}
                  {mode === 'my' && !row.original.is_posted && hasPerm('transactions.delete') && row.original.created_by === currentUserId && (
                    <button className="ultimate-btn ultimate-btn-delete" onClick={() => handleDelete(row.original.id)} disabled={deletingId === row.original.id}><div className="btn-content"><span className="btn-text">{deletingId === row.original.id ? 'جارٍ الحذف...' : 'حذف'}</span></div></button>
                  )}
                  {/* Manage delete in all view if privileged (still only unposted) */}
                  {mode === 'all' && !row.original.is_posted && hasPerm('transactions.manage') && (
                    <button className="ultimate-btn ultimate-btn-delete" onClick={() => handleDelete(row.original.id)}><div className="btn-content"><span className="btn-text">حذف</span></div></button>
                  )}
                </div>
              )
            }
            return undefined // Let default formatting handle other columns
          }}
        />
      </div>

      
      {/* Unified Transaction Form Panel */}
      <DraggableResizablePanel
        title={editingTx ? 'تعديل المعاملة' : 'معاملة جديدة'}
        isOpen={formOpen}
        onClose={handleFormCancel}
        position={panelPosition}
        size={panelSize}
        onMove={setPanelPosition}
        onResize={setPanelSize}
        isMaximized={panelMax}
        onMaximize={() => setPanelMax(!panelMax)}
        isDocked={panelDocked}
        dockPosition={panelDockPos}
        onDock={(pos) => {
          setPanelDocked(true)
          setPanelDockPos(pos)
        }}
        onResetPosition={() => {
          setPanelPosition({ x: 100, y: 100 })
          setPanelSize({ width: 800, height: 700 })
          setPanelMax(false)
          setPanelDocked(false)
        }}
      >
          <div className="panel-actions">
            <button
              className="ultimate-btn"
              title="تحديث قائمة الحسابات"
              onClick={() => getAccounts().then(setAccounts).catch(() => {})}
            >
              <div className="btn-content"><span className="btn-text">تحديث الحسابات</span></div>
            </button>
            <button
              className="ultimate-btn ultimate-btn-add"
              title="فتح شجرة الحسابات في تبويب جديد"
              onClick={() => {
                try { window.open('/main-data/accounts-tree', '_blank', 'noopener'); } catch {}
              }}
            >
              <div className="btn-content"><span className="btn-text">+ شجرة الحسابات</span></div>
            </button>
          </div>
          <UnifiedCRUDForm
            ref={formRef}
            config={transactionFormConfig}
            initialData={initialFormDataRef.current || (editingTx ? buildInitialFormDataForEdit(editingTx) : buildInitialFormDataForCreate())}
            resetOnInitialDataChange={false}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isLoading={isSaving}
          />
      </DraggableResizablePanel>
      
      {/* Details Drawer */}
      {detailsOpen && detailsFor && (
        <TransactionView
          transaction={detailsFor}
          audit={audit}
          approvalHistory={approvalHistory}
          userNames={userNames}
          categoryLabel={(detailsFor as any).expenses_category_id ? (() => {
            const m: Record<string,string> = {}
            for (const c of categories) { m[c.id] = `${c.code} - ${c.description}` }
            return m[(detailsFor as any).expenses_category_id] || '—'
          })() : '—'}
          onClose={() => setDetailsOpen(false)}
        />
      )}

      {/* Admin: Client Error Logs Viewer */}
      {showLogs && (
        <div className="transaction-modal" onClick={() => setShowLogs(false)}>
          <div className="transaction-modal-content transaction-modal-content--wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title">سجل أخطاء العميل</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => setShowLogs(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <ClientErrorLogs />
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewOpen && (
        <div className="transaction-modal" onClick={() => !reviewBusy && setReviewOpen(false)}>
          <div className="transaction-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title">{reviewAction === 'approve' ? 'اعتماد المعاملة' : reviewAction === 'revise' ? 'إرجاع للتعديل' : 'رفض المعاملة'}</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => !reviewBusy && setReviewOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <div>
              <label className="modal-title modal-label">سبب الإجراء</label>
              <textarea
                className="textarea-field"
                placeholder={reviewAction === 'approve' ? 'ملاحظات (اختياري)' : 'السبب (إلزامي)'}
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
              />
              <div className="button-container">
                <button className="ultimate-btn ultimate-btn-success" onClick={submitReview} disabled={reviewBusy}>
                  <div className="btn-content"><span className="btn-text">تأكيد</span></div>
                </button>
                <button className="ultimate-btn ultimate-btn-warning" onClick={() => !reviewBusy && setReviewOpen(false)} disabled={reviewBusy}>
                  <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Note Modal */}
      {submitOpen && (
        <div className="transaction-modal" onClick={() => !submitBusy && setSubmitOpen(false)}>
          <div className="transaction-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title">إرسال للمراجعة</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => !submitBusy && setSubmitOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <div>
              <label className="modal-title modal-label">ملاحظات الإرسال (إلزامي)</label>
              <textarea
                className="textarea-field"
                placeholder={'أدخل سبب/ملاحظات الإرسال'}
                value={submitNote}
                onChange={e => setSubmitNote(e.target.value)}
              />
              <div className="button-container">
                <button className="ultimate-btn ultimate-btn-success" onClick={async () => {
                  if (!submitTargetId) return
                  if (!submitNote.trim()) {
                    showToast('يرجى إدخال ملاحظات الإرسال', { severity: 'error' })
                    return
                  }
                  setSubmitBusy(true)
                  try {
                    await submitTransaction(submitTargetId, submitNote)
                    showToast('تم إرسال المعاملة للمراجعة بنجاح', { severity: 'success' })
                    setSubmitOpen(false)
                    setSubmitTargetId(null)
                    setSubmitNote('')
                    await reload()
                  } catch (e: any) {
                    showToast(e?.message || 'فشل إرسال المعاملة للمراجعة', { severity: 'error' })
                    logClientError({ context: 'transactions.submit', message: e?.message || '', extra: { id: submitTargetId, note: submitNote } })
                  }
                    setSubmitBusy(false)
                  }
                } disabled={submitBusy}>
                  <div className="btn-content"><span className="btn-text">تأكيد الإرسال</span></div>
                </button>
                <button className="ultimate-btn ultimate-btn-warning" onClick={() => !submitBusy && setSubmitOpen(false)} disabled={submitBusy}>
                  <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Configuration Modal */}
      <ColumnConfiguration
        columns={columns}
        onConfigChange={handleColumnConfigChange}
        isOpen={columnConfigOpen}
        onClose={() => setColumnConfigOpen(false)}
        onReset={resetToDefaults}
      />
    </div>
  )
}

export default TransactionsPage



