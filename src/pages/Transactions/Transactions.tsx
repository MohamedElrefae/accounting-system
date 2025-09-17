import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAccounts, getTransactions, createTransaction, deleteTransaction, updateTransaction, getTransactionAudit, getCurrentUserId, getProjects, approveTransaction, requestRevision, rejectTransaction, submitTransaction, cancelSubmission, postTransaction, getUserDisplayMap, type Account, type TransactionRecord, type TransactionAudit, type Project } from '../../services/transactions'
import { listWorkItemsAll } from '../../services/work-items'
import type { WorkItemRow } from '../../types/work-items'
import { getOrganizations } from '../../services/organization'
import { getAllTransactionClassifications, type TransactionClassification } from '../../services/transaction-classification'
import { getExpensesCategoriesList } from '../../services/sub-tree'
import { listAnalysisWorkItems } from '../../services/analysis-work-items'
import type { Organization } from '../../types'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import { useHasPermission } from '../../hooks/useHasPermission'
import './Transactions.css'
import { useToast } from '../../contexts/ToastContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import UnifiedTransactionDetailsPanel from '../../components/Transactions/UnifiedTransactionDetailsPanel'
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
import { getCompanyConfig } from '../../services/company-config'

interface FilterState {
  dateFrom: string
  dateTo: string
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
  // Quick approval status filter (client-side)
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'draft' | 'submitted' | 'revision_requested' | 'approved' | 'rejected' | 'cancelled'>(() => {
    try {
      return (localStorage.getItem('transactions_approval_filter') as any) || 'all'
    } catch { return 'all' }
  })
  // Wrap mode preference (persisted per user locally)
  const [wrapMode, setWrapMode] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('transactions_table_wrap')
      return raw ? raw === '1' : false
    } catch { return false }
  })
  
  // Persist wrapMode to server when available
  useEffect(() => {
    if (!currentUserId) return
    ;(async () => {
      try {
        const mod = await import('../../services/column-preferences')
        if (mod.isColumnPreferencesRpcDisabled()) return
        await mod.upsertUserColumnPreferences({
          tableKey: 'transactions_table',
          columnConfig: { wrapMode },
          version: 1,
        })
      } catch {
        // best-effort
      }
    })()
  }, [wrapMode, currentUserId])

  // Persist approval filter selection
  useEffect(() => {
    try { localStorage.setItem('transactions_approval_filter', approvalFilter) } catch {}
  }, [approvalFilter])
  // Persist wrap mode selection
  useEffect(() => {
    try { localStorage.setItem('transactions_table_wrap', wrapMode ? '1' : '0') } catch {}
  }, [wrapMode])
  
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
  
  // Transactions config modal state
  const [transactionsConfigOpen, setTransactionsConfigOpen] = useState(false)
  
  // Configuration options state
  const [transactionsConfig, setTransactionsConfig] = useState<{
    showAuditInfo: boolean;
    showApprovalBadges: boolean;
    defaultAmountFilter: 'all' | 'positive' | 'negative';
    defaultDateRange: 'all' | 'month' | 'quarter' | 'year';
    defaultPageSize: number;
    autoRefresh: boolean;
    exportFormat: 'excel' | 'pdf' | 'csv';
    groupByOrganization: boolean;
    highlightPostedTransactions: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('transactionsConfig');
      return saved ? JSON.parse(saved) : {
        showAuditInfo: true,
        showApprovalBadges: true,
        defaultAmountFilter: 'all' as 'all' | 'positive' | 'negative',
        defaultDateRange: 'all' as 'all' | 'month' | 'quarter' | 'year',
        defaultPageSize: 20,
        autoRefresh: false,
        exportFormat: 'excel' as 'excel' | 'pdf' | 'csv',
        groupByOrganization: false,
        highlightPostedTransactions: true
      };
    } catch {
      return {
        showAuditInfo: true,
        showApprovalBadges: true,
        defaultAmountFilter: 'all' as 'all' | 'positive' | 'negative',
        defaultDateRange: 'all' as 'all' | 'month' | 'quarter' | 'year',
        defaultPageSize: 20,
        autoRefresh: false,
        exportFormat: 'excel' as 'excel' | 'pdf' | 'csv',
        groupByOrganization: false,
        highlightPostedTransactions: true
      };
    }
  })
  
  // Persist transactions config
  useEffect(() => {
    try {
      localStorage.setItem('transactionsConfig', JSON.stringify(transactionsConfig));
    } catch {}
  }, [transactionsConfig])

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
  const [autoPostOnApprove, setAutoPostOnApprove] = useState<boolean>(false)

  // Notify user if server-backed preferences are unavailable (local-only fallback)
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('../../services/column-preferences')
        if (mod.isColumnPreferencesRpcDisabled()) {
          const warned = (() => { try { return sessionStorage.getItem('column_prefs_rpc_warned') === '1' } catch { return false } })()
          if (!warned) {
            showToast('سيتم حفظ إعدادات الأعمدة محلياً فقط مؤقتاً — سيتم المزامنة تلقائياً عند توفر الخادم.', { severity: 'warning' })
            try { sessionStorage.setItem('column_prefs_rpc_warned', '1') } catch {}
          }
        }
      } catch {/* silent */}
    })()
  }, [])

  // Helper: unify Supabase error text for user-facing toasts
  const formatSupabaseError = (e: any): string => {
    try {
      const { message, details, hint, code } = e || {}
      const parts = [message, details, hint, code ? `code: ${code}` : ''].filter(Boolean)
      return parts.join(' — ')
    } catch {
      return (e?.message || 'خطأ غير متوقع') as string
    }
  }

  // Helper: small retry wrapper for flaky RPCs (e.g., 400 from transient state)
  const withRetry = async <T,>(fn: () => Promise<T>, attempts = 2, delayMs = 400): Promise<T> => {
    let lastErr: any
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn()
      } catch (e: any) {
        lastErr = e
        if (i < attempts - 1) {
          await new Promise(res => setTimeout(res, delayMs))
        }
      }
    }
    throw lastErr
  }

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

  // Load company config to know if auto-post-on-approve is enabled
  useEffect(() => {
    (async () => {
      try {
        const cfg = await getCompanyConfig()
        setAutoPostOnApprove(Boolean((cfg as any)?.auto_post_on_approve))
      } catch {}
    })()
  }, [])

  // Default column configuration for transactions table
  const defaultColumns: ColumnConfig[] = useMemo(() => [
    { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, minWidth: 100, maxWidth: 200, type: 'text', resizable: true },
    { key: 'entry_date', label: 'التاريخ', visible: true, width: 130, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
    { key: 'description', label: 'البيان', visible: true, width: 250, minWidth: 200, maxWidth: 400, type: 'text', resizable: true },
    { key: 'debit_account_label', label: 'الحساب المدين', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'credit_account_label', label: 'الحساب الدائن', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'amount', label: 'المبلغ', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'currency', resizable: true },
    { key: 'classification_name', label: 'التصنيف', visible: true, width: 160, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'sub_tree_label', label: 'الشجرة الفرعية', visible: true, width: 200, minWidth: 140, maxWidth: 280, type: 'text', resizable: true },
    { key: 'work_item_label', label: 'عنصر العمل', visible: true, width: 200, minWidth: 140, maxWidth: 280, type: 'text', resizable: true },
    { key: 'analysis_work_item_label', label: 'بند التحليل', visible: true, width: 200, minWidth: 140, maxWidth: 280, type: 'text', resizable: true },
    { key: 'organization_name', label: 'المؤسسة', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'project_name', label: 'المشروع', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'cost_center_label', label: 'مركز التكلفة', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'reference_number', label: 'المرجع', visible: false, width: 120, minWidth: 100, maxWidth: 180, type: 'text', resizable: true },
    { key: 'notes', label: 'الملاحظات', visible: false, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'created_by_name', label: 'أنشئت بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'posted_by_name', label: 'مرحلة بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'approval_status', label: 'حالة الاعتماد', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'badge', resizable: false },
    { key: 'actions', label: 'الإجراءات', visible: true, width: 220, minWidth: 180, maxWidth: 400, type: 'actions', resizable: true }
  ], [])

  // Column preferences hook
  const {
    columns,
    handleColumnResize,
    handleColumnConfigChange,
    resetToDefaults
  } = useColumnPreferences({
    storageKey: 'transactions_table',
    defaultColumns,
    userId: currentUserId || undefined
  })

  // Refetch transactions whenever filters/scope/pagination change
  useEffect(() => {
    // Note: reload() uses current state (including mode and filters)
    reload().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchTerm,
    filters.dateFrom,
    filters.dateTo,
    filters.amountFrom,
    filters.amountTo,
    (filters as any).analysis_work_item_id,
    debitFilterId,
    creditFilterId,
    orgFilterId,
    projectFilterId,
    classificationFilterId,
    expensesCategoryFilterId,
    workItemFilterId,
    costCenterFilterId,
    page,
    pageSize,
    mode,
    approvalFilter, // now server-side filtered
  ])

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

        // Load server preferences (wrapMode + columns + frozenCount) when user is known
        try {
          if (uid) {
            const mod = await import('../../services/column-preferences')
            if (!mod.isColumnPreferencesRpcDisabled()) {
              const res = await mod.getUserColumnPreferences('transactions_table')
              if (res && res.column_config) {
              // Apply wrapMode if provided
              if (typeof res.column_config.wrapMode === 'boolean') {
                setWrapMode(!!res.column_config.wrapMode)
                try { localStorage.setItem('transactions_table_wrap', res.column_config.wrapMode ? '1' : '0') } catch {}
              }
              // Apply columns if present by updating via hook handler
              if (Array.isArray(res.column_config.columns) && res.column_config.columns.length > 0) {
                try {
                  // useColumnPreferences hook will merge and persist locally when it loads server columns
                } catch {}
              }
            }
          }
        }
        } catch {}

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
    
    // Load categories for ALL organizations to ensure dropdown works for any selected org
    // This is more robust than loading just for one org
    if (organizations.length > 0) {
      console.log('🌳 Form opened - loading categories for all orgs:', organizations.length);
      Promise.all(organizations.map(org => 
        getExpensesCategoriesList(org.id).catch(err => {
          console.warn('Failed to load categories for org', org.id, err);
          return [];
        })
      )).then(orgCategoriesLists => {
        // Merge all categories from all organizations
        const merged: Record<string, ExpensesCategoryRow> = {}
        let totalCategories = 0;
        for (const catList of orgCategoriesLists) {
          for (const cat of catList) {
            merged[cat.id] = cat;
            totalCategories++;
          }
        }
        const allCategories = Object.values(merged);
        console.log('🌳 Categories loaded for form - total:', totalCategories, 'unique:', allCategories.length);
        setCategories(allCategories);
      }).catch(err => {
        console.error('🌳 Failed to load categories for form:', err);
        setCategories([]);
      });
      
      // Load cost centers for the form's organization
      const orgIdForForm = editingTx?.org_id || organizations.find(org => org.code === 'MAIN')?.id || organizations[0]?.id || ''
      if (orgIdForForm) {
        getCostCentersForSelector(orgIdForForm).then(setCostCenters).catch(() => setCostCenters([]))
      }
    } else {
      console.log('🌳 No organizations available, clearing categories');
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
        approvalStatus: approvalFilter !== 'all' ? (approvalFilter as string) : undefined,
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

  // Client-side status filter (other filters are server-side)
  // Server-side approval filter now applied; no extra client filtering
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
      sub_tree_label: t.sub_tree_id ? (catMap[t.sub_tree_id] || '—') : '—',
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
      approval_status: t.is_posted ? 'posted' : ((t as any).approval_status || 'draft'),
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
      { key: 'sub_tree', header: 'الشجرة الفرعية', type: 'text' },
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
      { key: 'approval_status', header: 'حالة الاعتماد', type: 'text' },
    ])
    const accLabel = (id?: string | null) => {
      if (!id) return ''
      const a = accounts.find(x => x.id === id)
      return a ? `${a.code} - ${a.name}` : id
    }
    const catMap: Record<string, string> = {}
    for (const c of categories) { catMap[c.id] = `${c.code} - ${c.description}` }
    const rows = paged.map((t: any) => ({
      entry_number: t.entry_number,
      entry_date: t.entry_date,
      description: t.description,
      debit_account: accLabel(t.debit_account_id),
      credit_account: accLabel(t.credit_account_id),
      amount: t.amount,
      sub_tree: t.sub_tree_id ? (catMap[t.sub_tree_id] || '') : '',
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
      approval_status: t.is_posted
        ? 'مرحلة'
        : (({ draft: 'مسودة', submitted: 'مُرسلة', revision_requested: 'طلب تعديل', approved: 'معتمدة', rejected: 'مرفوضة', cancelled: 'ملغاة' } as any)[(t as any).approval_status || 'draft'] || 'مسودة'),
    }))
    return prepareTableData(columns, rows)
  }, [paged, userNames, accounts, categories, workItems, analysisItemsMap, organizations, projects])

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
    sub_tree_id: (tx as any).sub_tree_id || '',
    work_item_id: (tx as any).work_item_id || '',
    analysis_work_item_id: (tx as any).analysis_work_item_id || '',
    cost_center_id: tx.cost_center_id || '',
    organization_id: tx.org_id || '',
    project_id: tx.project_id || ''
  })

  const buildInitialFormDataForCreate = () => {
    // Default organization (MAIN) and project (GENERAL)
    const defaultOrg = organizations.find(org => org.code === 'MAIN');
    const defaultProject = projects.find(project => project.code === 'GENERAL');
    
    console.log('🌳 buildInitialFormDataForCreate - organizations available:', organizations.length);
    console.log('🌳 Default org found:', defaultOrg ? { id: defaultOrg.id, code: defaultOrg.code, name: defaultOrg.name } : null);
    
    // Restore last selected debit/credit if available
    let lastDebit = ''
    let lastCredit = ''
    try {
      lastDebit = localStorage.getItem('tx_last_debit_account_id') || ''
      lastCredit = localStorage.getItem('tx_last_credit_account_id') || ''
    } catch {}
    
    const initialData = {
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
    
    console.log('🌳 Initial form data created with org_id:', initialData.organization_id);
    return initialData;
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
        if (!transactionValidationAPI || typeof transactionValidationAPI.validateTransactionBeforeSave !== 'function') {
          console.warn('Transaction validation API not available, skipping backend validation')
          throw new Error('Validation API not available')
        }
        
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
          sub_tree_id: data.sub_tree_id || null,
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
          sub_tree_id: data.sub_tree_id || undefined,
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
          sub_tree_id: data.sub_tree_id || null,
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
        await withRetry(() => approveTransaction(reviewTargetId, reviewReason || null as any))
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
        if (!posted && autoPostOnApprove) {
          // Client-side fallback auto-post (best-effort)
          try {
            await postTransaction(reviewTargetId)
            posted = true
          } catch {}
        }
        if (posted) {
          showToast('تم اعتماد المعاملة (وتم ترحيلها)', { severity: 'success' })
        } else {
          showToast(autoPostOnApprove ? 'تم الاعتماد — جارٍ انتظار الترحيل (تحقق من الصلاحيات)' : 'تم اعتماد المعاملة (لم تُرحَّل — صلاحية الترحيل مطلوبة)', { severity: 'warning' as any })
        }
      } else if (reviewAction === 'revise') {
        if (!reviewReason.trim()) {
          showToast('يرجى إدخال سبب الإرجاع للتعديل', { severity: 'error' })
          setReviewBusy(false)
          return
        }
        await withRetry(() => requestRevision(reviewTargetId, reviewReason))
        showToast('تم إرجاع المعاملة للتعديل', { severity: 'success' })
      } else if (reviewAction === 'reject') {
        if (!reviewReason.trim()) {
          showToast('يرجى إدخال سبب الرفض', { severity: 'error' })
          setReviewBusy(false)
          return
        }
        await withRetry(() => rejectTransaction(reviewTargetId, reviewReason))
        showToast('تم رفض المعاملة', { severity: 'success' })
      }
      setReviewOpen(false)
      setReviewTargetId(null)
      setReviewAction(null)
      setReviewReason('')
      await reload()
    } catch (e: any) {
      const msg = formatSupabaseError(e) || 'فشل إجراء المراجعة'
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
        

        {/* Quick approval status chips */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {/* Indicator for auto-post policy */}
          <span className={`ultimate-btn ${autoPostOnApprove ? 'ultimate-btn-success' : 'ultimate-btn-neutral'}`} title={autoPostOnApprove ? 'اعتماد = ترحيل تلقائي مفعّل' : 'اعتماد = ترحيل تلقائي غير مفعّل'} style={{ minHeight: 28, padding: '4px 8px' }}>
            <span className="btn-text">{autoPostOnApprove ? 'Auto-post: On' : 'Auto-post: Off'}</span>
          </span>
          <select
            value={approvalFilter === 'all' ? '' : approvalFilter}
            onChange={e => { const v = e.target.value || 'all'; setApprovalFilter(v as any); setPage(1) }}
            className="filter-select filter-select--approval"
            title="تصفية حسب حالة الاعتماد"
          >
            <option value="">حالة الاعتماد</option>
            {/* Priority group */}
            <option value="approved">معتمدة</option>
            <option value="posted">مرحلة</option>
            {/* Other statuses */}
            <option value="submitted">مُرسلة</option>
            <option value="revision_requested">طلب تعديل</option>
            <option value="draft">مسودة</option>
            <option value="rejected">مرفوضة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
        
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
          <option value="">جميع الشجرة الفرعية</option>
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
            setFilters({ dateFrom: '', dateTo: '', amountFrom: '', amountTo: '' })
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
            <label className="wrap-toggle">
              <input
                type="checkbox"
                checked={wrapMode}
                onChange={(e) => setWrapMode(e.target.checked)}
              />
              <span>التفاف النص</span>
            </label>
            <button className="ultimate-btn" onClick={() => reload().catch(() => {})}>
              <div className="btn-content"><span className="btn-text">تحديث</span></div>
            </button>
            <button
              className="ultimate-btn ultimate-btn-warning"
              onClick={async () => {
                try {
                  // reset local
                  setWrapMode(false)
                  try { localStorage.setItem('transactions_table_wrap', '0') } catch {}
                  handleColumnConfigChange(defaultColumns)
                  // reset server (best effort)
                  if (currentUserId) {
                    const mod = await import('../../services/column-preferences')
                    await mod.upsertUserColumnPreferences({
                      tableKey: 'transactions_table',
                      columnConfig: { columns: defaultColumns, wrapMode: false },
                      version: 1,
                    })
                  }
                  showToast('تمت استعادة الإعدادات الافتراضية للجدول', { severity: 'success' })
                } catch (e: any) {
                  showToast('فشل استعادة الإعدادات الافتراضية — تمت إعادة تحميل الإعدادات المحلية فقط', { severity: 'error' })
                }
              }}
              title="استعادة الإعدادات الافتراضية"
            >
              <div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div>
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
          className={`transactions-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
          isLoading={loading}
          emptyMessage="لا توجد معاملات"
          renderCell={(_value, column, row, _rowIndex) => {
            if (column.key === 'approval_status') {
              const st = row.original.is_posted ? 'posted' : String((row.original as any).approval_status || 'draft')
              const map: Record<string, { label: string; cls: string; tip: string }> = {
                draft: { label: 'مسودة', cls: 'ultimate-btn-neutral', tip: 'لم يتم إرسالها للمراجعة بعد' },
                submitted: { label: 'مُرسلة', cls: 'ultimate-btn-edit', tip: 'بإنتظار المراجعة' },
                revision_requested: { label: 'طلب تعديل', cls: 'ultimate-btn-warning', tip: 'أُعيدت للتعديل — أعد الإرسال بعد التصحيح' },
                approved: { label: 'معتمدة', cls: 'ultimate-btn-success', tip: autoPostOnApprove ? 'تم الاعتماد — قد يتم الترحيل تلقائياً بحسب الإعداد' : 'تم الاعتماد (الترحيل يتطلب صلاحية)' },
                rejected: { label: 'مرفوضة', cls: 'ultimate-btn-delete', tip: 'تم الرفض' },
                cancelled: { label: 'ملغاة', cls: 'ultimate-btn-neutral', tip: 'ألغى المُرسل الإرسال' },
                posted: { label: 'مرحلة', cls: 'ultimate-btn-posted', tip: 'تم الترحيل (مُثبت في الدفاتر)' },
              }
              const conf = map[st] || map['draft']
              return (
                <span className={`ultimate-btn ${conf.cls}`} style={{ cursor: 'default', padding: '4px 8px', minHeight: 28 }} title={conf.tip}>
                  <span className="btn-text">{conf.label}</span>
                </span>
              )
            }
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
                  {/* Review actions in pending mode if permitted */}
                  {mode === 'pending' && !row.original.is_posted && (
                    <>
                      {/* Resubmit if revision requested (owner or manager) */}
                      {((row.original as any).approval_status === 'revision_requested') && (
                        ((row.original.created_by === currentUserId) || hasPerm('transactions.manage')) && (
                          <button className="ultimate-btn ultimate-btn-success" onClick={() => { setSubmitTargetId(row.original.id); setSubmitNote(''); setSubmitOpen(true) }}>
                            <div className="btn-content"><span className="btn-text">إرسال مجددًا</span></div>
                          </button>
                        )
                      )}
                      {/* Show approve only if not already approved */}
                      {(row.original as any).approval_status !== 'approved' && (
                        <WithPermission perm="transactions.review">
                          <button className="ultimate-btn ultimate-btn-success" title="اعتماد المعاملة" onClick={() => openReview('approve', row.original.id)}>
                            <div className="btn-content"><span className="btn-text">اعتماد</span></div>
                          </button>
                        </WithPermission>
                      )}
                      {/* If user has post permission and tx is approved but not posted, show Post button */}
                      {hasPerm('transactions.post') && (row.original as any).approval_status === 'approved' && !row.original.is_posted && (
                        <button className="ultimate-btn ultimate-btn-warning" title="ترحيل المعاملة (يتطلب صلاحية)" onClick={async () => { try { await withRetry(() => postTransaction(row.original.id)); showToast('تم الترحيل', { severity: 'success' }); await reload(); } catch (e: any) { showToast(formatSupabaseError(e) || 'فشل ترحيل المعاملة', { severity: 'error' }); } }}>
                          <div className="btn-content"><span className="btn-text">ترحيل</span></div>
                        </button>
                      )}
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
                  {/* Submit for review (my) */}
                  {(!row.original.is_posted &&
                    (((mode === 'my' && row.original.created_by === currentUserId) ||
                      (mode === 'all' && hasPerm('transactions.manage')))) &&
                    !['submitted','approved','rejected'].includes(((row.original as any).approval_status || 'draft'))
                  ) && (
                    <button className="ultimate-btn ultimate-btn-success" onClick={() => {
                      setSubmitTargetId(row.original.id)
                      setSubmitNote('')
                      setSubmitOpen(true)
                    }}>
                      <div className="btn-content"><span className="btn-text">إرسال للمراجعة</span></div>
                    </button>
                  )}
                  {/* Cancel submission for own submitted tx (before review) or managers in All view */}
                  {(!row.original.is_posted &&
                    ((row.original as any).approval_status === 'submitted') &&
                    (((mode === 'my' && row.original.created_by === currentUserId) ||
                      (mode === 'all' && hasPerm('transactions.manage'))))
                  ) && (
                    <button className="ultimate-btn ultimate-btn-warning" onClick={async () => {
                      try {
                        await withRetry(() => cancelSubmission(row.original.id))
                        showToast('تم إلغاء الإرسال', { severity: 'success' })
                        await reload()
                      } catch (e: any) {
                        const msg = formatSupabaseError(e)
                        showToast(msg || 'تعذر إلغاء الإرسال', { severity: 'error' })
                        logClientError({ context: 'transactions.cancelSubmission', message: msg || (e?.message || ''), extra: { id: row.original.id } })
                      }
                    }}>
                      <div className="btn-content"><span className="btn-text">إلغاء الإرسال</span></div>
                    </button>
                  )}
                  {/* If approved and not posted, allow posting in All/My when user has permission */}
                  {hasPerm('transactions.post') && (row.original as any).approval_status === 'approved' && !row.original.is_posted && (
                    <button className="ultimate-btn ultimate-btn-warning" title="ترحيل المعاملة (يتطلب صلاحية)" onClick={async () => { try { await withRetry(() => postTransaction(row.original.id)); showToast('تم الترحيل', { severity: 'success' }); await reload(); } catch (e: any) { showToast(formatSupabaseError(e) || 'فشل ترحيل المعاملة', { severity: 'error' }); } }}>
                      <div className="btn-content"><span className="btn-text">ترحيل</span></div>
                    </button>
                  )}
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
      
      {/* Details Panel */}
      {detailsOpen && detailsFor && (
        <UnifiedTransactionDetailsPanel
          transaction={detailsFor}
          audit={audit}
          approvalHistory={approvalHistory}
          userNames={userNames}
          categoryLabel={(detailsFor as any).sub_tree_id ? (() => {
            const m: Record<string,string> = {}
            for (const c of categories) { m[c.id] = `${c.code} - ${c.description}` }
            return m[(detailsFor as any).sub_tree_id] || '—'
          })() : '—'}
          
          // Data for editing
          accounts={accounts}
          projects={projects}
          organizations={organizations}
          classifications={classifications}
          categories={categories}
          workItems={workItems}
          costCenters={costCenters}
          analysisItemsMap={analysisItemsMap}
          
          // Callbacks
          onClose={() => setDetailsOpen(false)}
          onUpdate={async (updatedTransaction) => {
            try {
              const updateData = {
                entry_date: updatedTransaction.entry_date,
                description: updatedTransaction.description,
                reference_number: updatedTransaction.reference_number || null,
                debit_account_id: updatedTransaction.debit_account_id,
                credit_account_id: updatedTransaction.credit_account_id,
                amount: updatedTransaction.amount,
                notes: updatedTransaction.notes || null,
                classification_id: updatedTransaction.classification_id || null,
                sub_tree_id: (updatedTransaction as any).sub_tree_id || null,
                work_item_id: (updatedTransaction as any).work_item_id || null,
                analysis_work_item_id: (updatedTransaction as any).analysis_work_item_id || null,
                cost_center_id: updatedTransaction.cost_center_id || null,
                org_id: updatedTransaction.org_id || null,
                project_id: updatedTransaction.project_id || null,
              }
              const updated = await updateTransaction(updatedTransaction.id, updateData as any)
              const enrichedUpdated = enrichTx(updated)
              setTransactions(prev => prev.map(t => t.id === updated.id ? enrichedUpdated : t))
              showToast('تم تحديث المعاملة', { severity: 'success' })
              await reload()
            } catch (e: any) {
              throw new Error(e?.message || 'فشل في تحديث المعاملة')
            }
          }}
          onDelete={async (transactionId) => {
            await handleDelete(transactionId)
          }}
          onSubmitForReview={async (transactionId, note) => {
            await withRetry(() => submitTransaction(transactionId, note))
            showToast('تم إرسال المعاملة للمراجعة بنجاح', { severity: 'success' })
            await reload()
          }}
          onApprove={async (transactionId, reason) => {
            await withRetry(() => approveTransaction(transactionId, reason || null as any))
            showToast('تم اعتماد المعاملة', { severity: 'success' })
            await reload()
          }}
          onReject={async (transactionId, reason) => {
            await withRetry(() => rejectTransaction(transactionId, reason))
            showToast('تم رفض المعاملة', { severity: 'success' })
            await reload()
          }}
          onRequestRevision={async (transactionId, reason) => {
            await withRetry(() => requestRevision(transactionId, reason))
            showToast('تم إرجاع المعاملة للتعديل', { severity: 'success' })
            await reload()
          }}
          onPost={async (transactionId) => {
            await withRetry(() => postTransaction(transactionId))
            showToast('تم ترحيل المعاملة', { severity: 'success' })
            await reload()
          }}
          
          // Permissions
          canEdit={hasPerm('transactions.update')}
          canDelete={hasPerm('transactions.delete')}
          canReview={hasPerm('transactions.review')}
          canPost={hasPerm('transactions.post')}
          canManage={hasPerm('transactions.manage')}
          
          // UI state
          currentUserId={currentUserId}
          mode={mode}
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
              <label className="modal-title modal-label">ملاحظات الإرسال (اختياري)</label>
              <textarea
                className="textarea-field"
                placeholder={'أدخل سبب/ملاحظات الإرسال'}
                value={submitNote}
                onChange={e => setSubmitNote(e.target.value)}
              />
              <div className="button-container">
                <button className="ultimate-btn ultimate-btn-success" onClick={async () => {
                  if (!submitTargetId) return
                  setSubmitBusy(true)
                  try {
                    await submitTransaction(submitTargetId, submitNote)
                    showToast('تم إرسال المعاملة للمراجعة بنجاح', { severity: 'success' })
                    setSubmitOpen(false)
                    setSubmitTargetId(null)
                    setSubmitNote('')
                    await reload()
                    try { window.location.href = '/transactions/pending' } catch { /* ignore navigation error */ }
                  } catch (e: any) {
                    showToast(e?.message || 'فشل إرسال المعاملة للمراجعة', { severity: 'error' })
                    logClientError({ context: 'transactions.submit', message: e?.message || '', extra: { id: submitTargetId, note: submitNote } })
                  } finally {
                    setSubmitBusy(false)
                  }
                }} disabled={submitBusy}>
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

      {/* Transactions Configuration Modal */}
      {transactionsConfigOpen && (
        <div className="transaction-modal" onClick={() => setTransactionsConfigOpen(false)}>
          <div className="config-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title">تخطيط عرض المعاملات</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => setTransactionsConfigOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            
            <div className="config-modal-body">
              <div className="config-section">
                <h4>إعدادات العرض</h4>
                
                <div className="config-field">
                  <label className="config-label">
                    <input 
                      type="checkbox" 
                      checked={transactionsConfig.showAuditInfo}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, showAuditInfo: e.target.checked }))}
                    />
                    عرض معلومات التدقيق
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label">
                    <input 
                      type="checkbox" 
                      checked={transactionsConfig.showApprovalBadges}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, showApprovalBadges: e.target.checked }))}
                    />
                    عرض رموز حالة الاعتماد
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label">
                    <input 
                      type="checkbox" 
                      checked={transactionsConfig.highlightPostedTransactions}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, highlightPostedTransactions: e.target.checked }))}
                    />
                    تمييز المعاملات المرحلة
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label">
                    <input 
                      type="checkbox" 
                      checked={transactionsConfig.groupByOrganization}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, groupByOrganization: e.target.checked }))}
                    />
                    تجميع حسب المؤسسة
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label">
                    <input 
                      type="checkbox" 
                      checked={transactionsConfig.autoRefresh}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                    />
                    تحديث تلقائي
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label-block">
                    حجم الصفحة الافتراضي:
                    <select 
                      value={transactionsConfig.defaultPageSize}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, defaultPageSize: parseInt(e.target.value) }))}
                      className="config-select"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label-block">
                    فلتر المبلغ الافتراضي:
                    <select 
                      value={transactionsConfig.defaultAmountFilter}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, defaultAmountFilter: e.target.value as 'all' | 'positive' | 'negative' }))}
                      className="config-select"
                    >
                      <option value="all">جميع المبالغ</option>
                      <option value="positive">مبالغ موجبة</option>
                      <option value="negative">مبالغ سالبة</option>
                    </select>
                  </label>
                </div>
                
                <div className="config-field">
                  <label className="config-label-block">
                    نطاق التاريخ الافتراضي:
                    <select 
                      value={transactionsConfig.defaultDateRange}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, defaultDateRange: e.target.value as 'all' | 'month' | 'quarter' | 'year' }))}
                      className="config-select"
                    >
                      <option value="all">جميع التواريخ</option>
                      <option value="month">الشهر الحالي</option>
                      <option value="quarter">الربع الحالي</option>
                      <option value="year">العام الحالي</option>
                    </select>
                  </label>
                </div>
              </div>
              
              <div className="config-section">
                <h4>إعدادات التصدير</h4>
                
                <div className="config-field">
                  <label className="config-label-block">
                    تنسيق التصدير الافتراضي:
                    <select 
                      value={transactionsConfig.exportFormat}
                      onChange={(e) => setTransactionsConfig(prev => ({ ...prev, exportFormat: e.target.value as 'excel' | 'pdf' | 'csv' }))}
                      className="config-select"
                    >
                      <option value="excel">Excel (.xlsx)</option>
                      <option value="pdf">PDF (.pdf)</option>
                      <option value="csv">CSV (.csv)</option>
                    </select>
                  </label>
                </div>
              </div>
              
              <div className="config-section">
                <h4>عرض تحكم التخطيط</h4>
                <div className="layout-control-section">
                  <button 
                    className="ultimate-btn ultimate-btn-primary"
                    onClick={() => {
                      setTransactionsConfigOpen(false);
                      setColumnConfigOpen(true);
                    }}
                  >
                    <div className="btn-content"><span className="btn-text">فتح تعديل الأعمدة</span></div>
                  </button>
                  <p className="config-help-text">يمكنك تخصيص عرض وترتيب وعرض الأعمدة</p>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="ultimate-btn ultimate-btn-success"
                onClick={() => setTransactionsConfigOpen(false)}
              >
                <div className="btn-content"><span className="btn-text">حفظ الإعدادات</span></div>
              </button>
              
              <button 
                className="ultimate-btn ultimate-btn-warning"
                onClick={() => {
                  setTransactionsConfig({
                    showAuditInfo: true,
                    showApprovalBadges: true,
                    defaultAmountFilter: 'all',
                    defaultDateRange: 'all',
                    defaultPageSize: 20,
                    autoRefresh: false,
                    exportFormat: 'excel',
                    groupByOrganization: false,
                    highlightPostedTransactions: true
                  });
                }}
              >
                <div className="btn-content"><span className="btn-text">إعادة تعيين</span></div>
              </button>
              
              <button 
                className="ultimate-btn ultimate-btn-delete"
                onClick={() => setTransactionsConfigOpen(false)}
              >
                <div className="btn-content"><span className="btn-text">إلغاء</span></div>
              </button>
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



