import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAccounts, getTransactionAudit, getCurrentUserId, getProjects, getUserDisplayMap, type Account, type TransactionRecord, type Project } from '../../services/transactions'
import { listWorkItemsAll } from '../../services/work-items'
import type { WorkItemRow } from '../../types/work-items'
import { listAnalysisWorkItems } from '../../services/analysis-work-items'
import { getOrganizations } from '../../services/organization'
import { getActiveProjectId } from '../../utils/org'
import { getAllTransactionClassifications, type TransactionClassification } from '../../services/transaction-classification'
import { getExpensesCategoriesList } from '../../services/sub-tree'
import type { Organization } from '../../types'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import { useHasPermission } from '../../hooks/useHasPermission'
import './Transactions.css'
import { useToast } from '../../contexts/ToastContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import { getApprovalHistoryByTransactionId, type ApprovalHistoryRow } from '../../services/approvals'
import PermissionBadge from '../../components/Common/PermissionBadge'
import { WithPermission } from '../../components/Common/withPermission'
import { getCostCentersForSelector } from '../../services/cost-centers'
import ResizableTable from '../../components/Common/ResizableTable'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'
import SearchableSelect, { type SearchableSelectOption } from '../../components/Common/SearchableSelect'
import { supabase } from '../../utils/supabase'
import { getTransactionsEnrichedView } from '../../services/transactions-enriched'

interface FilterState {
  dateFrom: string
  dateTo: string
  amountFrom: string
  amountTo: string
}

const TransactionsEnrichedPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [classifications, setClassifications] = useState<TransactionClassification[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ExpensesCategoryRow[]>([])
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([])
  const [costCenters, setCostCenters] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [analysisItemsMap, setAnalysisItemsMap] = useState<Record<string, { code: string; name: string }>>({})
  const [dimLists, setDimLists] = useState<Record<string, {
    projects?: string[]
    subTrees?: string[]
    workItems?: string[]
    analysis?: string[]
    costCenters?: string[]
  }>>({})

  const [filters, setFilters] = useState<FilterState>({ dateFrom: '', dateTo: '', amountFrom: '', amountTo: '' })
  const [debitFilterId, setDebitFilterId] = useState<string>('')
  const [creditFilterId, setCreditFilterId] = useState<string>('')
  const [orgFilterId, setOrgFilterId] = useState<string>('')
  const [projectFilterId, setProjectFilterId] = useState<string>(() => { try { return (localStorage.getItem('project_id') || '') as string } catch { return '' } })
  const [classificationFilterId, setClassificationFilterId] = useState<string>('')
  const [expensesCategoryFilterId, setExpensesCategoryFilterId] = useState<string>('')
  const [workItemFilterId, setWorkItemFilterId] = useState<string>('')
  const [analysisWorkItemFilterId, setAnalysisWorkItemFilterId] = useState<string>('')
  const [costCenterFilterId, setCostCenterFilterId] = useState<string>('')
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'draft' | 'submitted' | 'revision_requested' | 'approved' | 'rejected' | 'cancelled' | 'posted'>(() => { try { return (localStorage.getItem('transactions_enriched_approval_filter') as any) || 'all' } catch { return 'all' } })
  const [wrapMode, setWrapMode] = useState<boolean>(() => { try { return localStorage.getItem('transactions_enriched_table_wrap') === '1' } catch { return false } })
  const [lineWrapMode, setLineWrapMode] = useState<boolean>(() => { try { return localStorage.getItem('transactions_enriched_lines_table_wrap') === '1' } catch { return false } })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)


  const location = useLocation()
  const navigate = useNavigate()
  const hasPerm = useHasPermission()
  const { showToast } = useToast()

  // Sync project filter with global when enabled (reuse same helper)
  useEffect(() => {
    try { const pid = getActiveProjectId() || '' ; setProjectFilterId(pid) } catch {}
  }, [orgFilterId])

  // Persist preferences
  useEffect(() => { try { localStorage.setItem('transactions_enriched_table_wrap', wrapMode ? '1' : '0') } catch {} }, [wrapMode])
  useEffect(() => { try { localStorage.setItem('transactions_enriched_lines_table_wrap', lineWrapMode ? '1' : '0') } catch {} }, [lineWrapMode])
  useEffect(() => { try { localStorage.setItem('transactions_enriched_approval_filter', approvalFilter) } catch {} }, [approvalFilter])

  // Initial loads
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [accs, projectsList, orgsList, classificationsList, uid] = await Promise.all([
          getAccounts(),
          getProjects().catch(() => []),
          getOrganizations().catch(() => []),
          getAllTransactionClassifications().catch(() => []),
          getCurrentUserId(),
        ])
        setAccounts(accs)
        setProjects(projectsList)
        setOrganizations(orgsList)
        setClassifications(classificationsList)
        setCurrentUserId(uid)
        await reload()
      } catch (e: any) {
        setError(e?.message || 'فشل تحميل البيانات')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Refetch when filters/pagination change
  useEffect(() => { reload().catch(() => {}) }, [searchTerm, filters.dateFrom, filters.dateTo, filters.amountFrom, filters.amountTo, debitFilterId, creditFilterId, orgFilterId, projectFilterId, classificationFilterId, expensesCategoryFilterId, workItemFilterId, analysisWorkItemFilterId, costCenterFilterId, approvalFilter, page, pageSize])

  // Global refresh via CustomEvent (from details panel)
  useEffect(() => {
    const handler = (_e: Event) => { reload().catch(() => {}) }
    window.addEventListener('transactions:refresh', handler)
    return () => window.removeEventListener('transactions:refresh', handler)
  }, [])

  async function reload() {
    // Determine mode from route: /transactions/my-enriched vs /transactions/all-enriched
    const mode: 'my' | 'all' = location.pathname.includes('/transactions/my-enriched') ? 'my' : 'all'

    const filtersToUse = {
      scope: mode,
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
      analysisWorkItemId: analysisWorkItemFilterId || undefined,
      costCenterId: costCenterFilterId || undefined,
      approvalStatus: approvalFilter !== 'all' ? (approvalFilter as any) : undefined,
      createdBy: currentUserId || undefined,
    } as any

    const { rows, total } = await getTransactionsEnrichedView(filtersToUse, page, pageSize)
    setRows(rows)
    setTotalCount(total)

    // Preload dimension lists from transaction_lines for current page
    try {
      const ids: string[] = (rows || []).map((r: any) => r.transaction_id || r.id).filter(Boolean)
      if (ids.length) {
        const { data: lineRows } = await supabase
          .from('transaction_lines')
          .select('transaction_id, project_id, cost_center_id, work_item_id, analysis_work_item_id, sub_tree_id')
          .in('transaction_id', ids as any)
        const map: Record<string, any> = {}
        ;(lineRows || []).forEach((lr: any) => {
          const k = lr.transaction_id
          if (!map[k]) map[k] = { projects: new Set<string>(), subTrees: new Set<string>(), workItems: new Set<string>(), analysis: new Set<string>(), costCenters: new Set<string>() }
          if (lr.project_id) map[k].projects.add(lr.project_id)
          if (lr.sub_tree_id) map[k].subTrees.add(lr.sub_tree_id)
          if (lr.work_item_id) map[k].workItems.add(lr.work_item_id)
          if (lr.analysis_work_item_id) map[k].analysis.add(lr.analysis_work_item_id)
          if (lr.cost_center_id) map[k].costCenters.add(lr.cost_center_id)
        })
        const finalized: Record<string, any> = {}
        Object.entries(map).forEach(([k, v]: any) => {
          finalized[k] = {
            projects: Array.from(v.projects || []),
            subTrees: Array.from(v.subTrees || []),
            workItems: Array.from(v.workItems || []),
            analysis: Array.from(v.analysis || []),
            costCenters: Array.from(v.costCenters || []),
          }
        })
        setDimLists(finalized)
      } else {
        setDimLists({})
      }
    } catch {}

    // Load supporting maps (categories/work items) for relevant orgs
    try {
      const orgIds = (() => {
        if (orgFilterId) return [orgFilterId]
        if (organizations && organizations.length) return organizations.map(o => o.id)
        return Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      })()
      if (orgIds.length > 0) {
        const lists = await Promise.all(orgIds.map(id => getExpensesCategoriesList(id).catch(() => [])))
        const merged: Record<string, ExpensesCategoryRow> = {}
        for (const list of lists) for (const r of list) merged[r.id] = r
        if (Object.keys(merged).length) setCategories(Object.values(merged))
      }
    } catch {}

    try {
      const orgIds = (() => {
        if (orgFilterId) return [orgFilterId]
        if (organizations && organizations.length) return organizations.map(o => o.id)
        return Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      })()
      if (orgIds.length > 0) {
        const lists = await Promise.all(orgIds.map(id => listWorkItemsAll(id).catch(() => [])))
        const merged: Record<string, WorkItemRow> = {}
        for (const list of lists) for (const r of list) merged[r.id] = r as any
        if (Object.keys(merged).length) setWorkItems(Object.values(merged))
      }
    } catch {}

    // Load cost centers for orgs
    try {
      const orgIds = (() => {
        if (orgFilterId) return [orgFilterId]
        if (organizations && organizations.length) return organizations.map(o => o.id)
        return Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      })()
      const merged: Record<string, { id: string; code: string; name: string }> = {}
      for (const id of orgIds) {
        const list = await getCostCentersForSelector(id).catch(() => [])
        for (const cc of list as any[]) merged[cc.id] = { id: cc.id, code: cc.code, name: cc.name }
      }
      if (Object.keys(merged).length) setCostCenters(Object.values(merged))
    } catch {}

    // Analysis Work Items map for labels
    try {
      const orgIds = (() => {
        if (orgFilterId) return [orgFilterId]
        if (organizations && organizations.length) return organizations.map(o => o.id)
        return Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      })()
      const merged: Record<string, { code: string; name: string }> = {}
      for (const orgId of orgIds) {
        const list = await listAnalysisWorkItems({ orgId, projectId: projectFilterId || null, onlyWithTx: false, includeInactive: true }).catch(() => [])
        for (const a of list as any[]) merged[a.id] = { code: a.code, name: a.name }
      }
      if (Object.keys(merged).length) setAnalysisItemsMap(merged)
    } catch {}

    // resolve creator/poster names
    const ids: string[] = []
    rows.forEach(t => { if (t.created_by) ids.push(t.created_by); if (t.posted_by) ids.push(t.posted_by!) })
    try { setUserNames(await getUserDisplayMap(ids)) } catch {}
  }


  // Column configs (use separate storage keys for enriched page)
  const defaultColumns: ColumnConfig[] = useMemo(() => [
    { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, minWidth: 100, maxWidth: 200, type: 'text', resizable: true },
    { key: 'entry_date', label: 'التاريخ', visible: true, width: 130, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
    { key: 'description', label: 'البيان', visible: true, width: 250, minWidth: 200, maxWidth: 400, type: 'text', resizable: true },
    { key: 'debit_account_label', label: 'الحساب المدين', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
    { key: 'credit_account_label', label: 'الحساب الدائن', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
    { key: 'amount', label: 'المبلغ', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'currency', resizable: true },
    { key: 'classification_label', label: 'التصنيف', visible: true, width: 200, minWidth: 140, maxWidth: 280, type: 'text', resizable: true },
    { key: 'sub_tree_label', label: 'الشجرة الفرعية', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
    { key: 'work_item_label', label: 'عنصر العمل', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
    { key: 'analysis_work_item_label', label: 'بند التحليل', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
    { key: 'organization_label', label: 'المؤسسة', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
    { key: 'project_label', label: 'المشروع', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
    { key: 'cost_center_label', label: 'مركز التكلفة', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
    { key: 'reference_number', label: 'المرجع', visible: false, width: 120, minWidth: 100, maxWidth: 180, type: 'text', resizable: true },
    { key: 'notes', label: 'الملاحظات', visible: false, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'created_by_name', label: 'أنشئت بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'posted_by_name', label: 'مرحلة بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'approval_status', label: 'حالة الاعتماد', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'badge', resizable: false },
  ], [])

  const { columns, handleColumnResize, handleColumnConfigChange, resetToDefaults } = useColumnPreferences({
    storageKey: 'transactions_enriched_table',
    defaultColumns,
    userId: currentUserId || undefined,
  })

  const defaultLineColumns: ColumnConfig[] = useMemo(() => [
    { key: 'line_no', label: 'رقم السطر', visible: true, width: 80, minWidth: 60, maxWidth: 120, type: 'number', resizable: true },
    { key: 'account_id', label: 'الحساب', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'debit_amount', label: 'المبلغ المدين', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
    { key: 'credit_amount', label: 'المبلغ الدائن', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
    { key: 'description', label: 'البيان', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'project_id', label: 'المشروع', visible: true, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'cost_center_id', label: 'مركز التكلفة', visible: true, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'work_item_id', label: 'عنصر العمل', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'classification_id', label: 'التصنيف', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'sub_tree_id', label: 'الشجرة الفرعية', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
  ], [])

  const { columns: lineColumns, handleColumnResize: handleLineColumnResize } = useColumnPreferences({
    storageKey: 'transactions_enriched_lines_table',
    defaultColumns: defaultLineColumns,
    userId: currentUserId || undefined,
  })

  // Column configuration modal state
  const [columnsConfigOpen, setColumnsConfigOpen] = useState(false)

  // Helpers for label mapping
  const accountLabel = (id?: string | null) => {
    if (!id) return ''
    const a = accounts.find(x => x.id === id)
    return a ? `${a.code} - ${a.name}` : id || ''
  }

  // Prepare data for table renderers similar to original page
  const paged = rows
  const tableData = useMemo(() => {
    const catMap: Record<string, string> = {}
    for (const c of categories) { catMap[c.id] = `${c.code} - ${c.description}` }
    const classMap: Record<string, string> = {}
    for (const c of classifications) { classMap[c.id] = `${c.code} - ${c.name}` }
    return paged.map((t: any) => {
      // Resolve aggregated dimension sets for this tx (from transaction_lines)
      const txId = (t.transaction_id || t.id) as string | undefined
      const agg = (txId && dimLists[txId]) ? dimLists[txId]! : { projects: [], subTrees: [], workItems: [], analysis: [], costCenters: [] }

      // Accounts lists (for tooltip)
      const dCodes: string[] = Array.isArray(t.debit_accounts_codes) ? t.debit_accounts_codes : []
      const dNames: string[] = Array.isArray(t.debit_accounts_names) ? t.debit_accounts_names : []
      const cCodes: string[] = Array.isArray(t.credit_accounts_codes) ? t.credit_accounts_codes : []
      const cNames: string[] = Array.isArray(t.credit_accounts_names) ? t.credit_accounts_names : []
      const debitList = dCodes.map((code, i) => `${code} - ${dNames[i] || ''}`.trim())
      const creditList = cCodes.map((code, i) => `${code} - ${cNames[i] || ''}`.trim())

      // Project list (from aggregated lines if present, else from view array)
      const aggProjIds: string[] = Array.isArray(agg.projects) && agg.projects.length ? (agg.projects as string[]) : []
      const pids: string[] = aggProjIds.length ? aggProjIds : (Array.isArray(t.project_ids) ? t.project_ids : [])
      const projectList = pids
        .map((id: string) => {
          const p = projects.find(pp => pp.id === id)
          return p ? `${p.code} - ${p.name}` : id
        })
        .filter(Boolean)

      const debitLabel = (() => {
        if (t.debit_account_code) return `${t.debit_account_code} - ${t.debit_account_name || ''}`.trim()
        if (debitList.length > 1) return 'متعدد'
        if (debitList.length === 1) return debitList[0]
        return accountLabel(t.debit_account_id) || '—'
      })()

      const creditLabel = (() => {
        if (t.credit_account_code) return `${t.credit_account_code} - ${t.credit_account_name || ''}`.trim()
        if (creditList.length > 1) return 'متعدد'
        if (creditList.length === 1) return creditList[0]
        return accountLabel(t.credit_account_id) || '—'
      })()

      const projectLabel = (() => {
        if (projectList.length > 1) return 'متعدد'
        if (projectList.length === 1) return projectList[0]
        const p = projects.find(p => p.id === (t.project_id || ''))
        return p ? `${p.code} - ${p.name}` : '—'
      })()

      // Build lists from transaction_lines aggregation (preferred)

      // Sub-tree list (compute code-name from ids if present)
      const subTreeIds: string[] = Array.isArray(agg.subTrees) && agg.subTrees.length ? agg.subTrees : []
      const subTreeList = subTreeIds.map(id => catMap[id] || id)

      // Work items list
      const workItemIds: string[] = Array.isArray(agg.workItems) && agg.workItems.length ? agg.workItems : []
      const workItemList = workItemIds.map(id => {
        const wi = workItems.find(w => w.id === id)
        return wi ? `${wi.code} - ${wi.name}` : id
      })

      // Analysis items list
      const analysisIds: string[] = Array.isArray(agg.analysis) && agg.analysis.length ? agg.analysis : []
      const analysisItemList = analysisIds.map(id => {
        const a = analysisItemsMap[id]
        return a ? `${a.code} - ${a.name}` : id
      })

      // Cost centers list
      const ccIds: string[] = Array.isArray(agg.costCenters) && agg.costCenters.length ? agg.costCenters : []
      const costCenterList = ccIds.map(id => {
        const cc = costCenters.find(cc => cc.id === id)
        return cc ? `${cc.code} - ${cc.name}` : id
      })

      const subTreeLabel = (() => {
        if (subTreeList.length > 1) return 'متعدد'
        if (subTreeList.length === 1) return subTreeList[0]
        return t.expenses_category_id ? (catMap[t.expenses_category_id] || '—') : '—'
      })()

      const workItemLabel = (() => {
        if (workItemList.length > 1) return 'متعدد'
        if (workItemList.length === 1) return workItemList[0]
        const wi = workItems.find(w => w.id === (t.work_item_id || ''))
        return wi ? `${wi.code} - ${wi.name}` : '—'
      })()

      const analysisLabel = (() => {
        if (analysisItemList.length > 1) return 'متعدد'
        if (analysisItemList.length === 1) return analysisItemList[0]
        const id = t.analysis_work_item_id || ''
        const a = id ? analysisItemsMap[id] : undefined
        return a ? `${a.code} - ${a.name}` : (t.analysis_work_item_code ? `${t.analysis_work_item_code} - ${t.analysis_work_item_name || ''}` : '—')
      })()

      const costCenterLabel = (() => {
        if (costCenterList.length > 1) return 'متعدد'
        if (costCenterList.length === 1) return costCenterList[0]
        const cc = costCenters.find(cc => cc.id === (t.cost_center_id || ''))
        return cc ? `${cc.code} - ${cc.name}` : '—'
      })()

      return {
        entry_number: t.entry_number,
        entry_date: t.entry_date,
        description: t.description,
        debit_account_label: debitLabel,
        credit_account_label: creditLabel,
        amount: t.amount,
        sub_tree_label: subTreeLabel,
        work_item_label: workItemLabel,
        analysis_work_item_label: analysisLabel,
        classification_label: t.classification_name ? `${t.classification_name}` : (classMap[t.classification_id || ''] || '—'),
        organization_label: (() => { const o = organizations.find(o => o.id === (t.org_id || '')); return o ? `${o.code} - ${o.name}` : '—' })(),
        project_label: projectLabel,
        cost_center_label: costCenterLabel,
        reference_number: t.reference_number || '—',
        notes: t.notes || '—',
        created_by_name: t.created_by ? (userNames[t.created_by] || t.created_by.substring(0, 8)) : '—',
        posted_by_name: t.posted_by ? (userNames[t.posted_by] || t.posted_by.substring(0, 8)) : '—',
        approval_status: t.is_posted ? 'posted' : (t.approval_status || 'draft'),
        // Tooltips lists
        _debit_list: debitList,
        _credit_list: creditList,
        _project_list: projectList,
        _sub_tree_list: subTreeList,
        _work_item_list: workItemList,
        _analysis_item_list: analysisItemList,
        _cost_center_list: costCenterList,
        original: t,
      }
    })
  }, [paged, accounts, userNames, categories, workItems, analysisItemsMap, organizations, projects, classifications])

  // Build export data from current columns and table rows (include all configured columns)
  const exportData = useMemo(() => {
    const visibleCols = (columns || []).filter(c => c.visible)
    const defs = visibleCols.map(col => ({
      key: col.key,
      header: col.label,
      type: (col.type === 'currency' ? 'currency' : col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : col.type === 'boolean' ? 'boolean' : 'text') as any,
    }))
    const rows = (tableData || []).map((row: any) => {
      const out: any = {}
      for (const col of visibleCols) {
        out[col.key] = row[col.key]
      }
      return out
    })
    return prepareTableData(createStandardColumns(defs as any), rows)
  }, [columns, tableData])

  if (loading) return <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
  if (error) return <div className="error-container">خطأ: {error}</div>

  return (
    <div className="transactions-container" dir="rtl">
      <div className="transactions-header">
        <h1 className="transactions-title">المعاملات (من العرض المحسّن)</h1>
        <div className="transactions-actions">
          <WithPermission perm="transactions.create">
<button className="ultimate-btn ultimate-btn-add" onClick={() => navigate('/transactions/my')}>
              <div className="btn-content"><span className="btn-text">+ معاملة جديدة</span></div>
            </button>
          </WithPermission>
<button className="ultimate-btn ultimate-btn-edit" onClick={() => setColumnsConfigOpen(true)}>
            <div className="btn-content"><span className="btn-text">⚙️ إعدادات الأعمدة</span></div>
          </button>
          <ExportButtons
            data={exportData}
            config={{ title: 'تقرير المعاملات (محسّن)', rtlLayout: true, useArabicNumerals: true }}
            size="small"
            layout="horizontal"
          />
        </div>
      </div>

      {/* Filters (complete set) */}
      <div className="transactions-filters-row">
        {/* Search */}
        <input placeholder="بحث..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1) }} className="filter-input filter-input--search" />
        {/* Date range */}
        <input type="date" value={filters.dateFrom} onChange={e => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1) }} className="filter-input filter-input--date" />
        <input type="date" value={filters.dateTo} onChange={e => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1) }} className="filter-input filter-input--date" />
        {/* Approval */}
        <select value={approvalFilter === 'all' ? '' : approvalFilter} onChange={e => { const v = (e.target.value || 'all') as any; setApprovalFilter(v); setPage(1) }} className="filter-select filter-select--approval"><option value="">حالة الاعتماد</option><option value="approved">معتمدة</option><option value="posted">مرحلة</option><option value="submitted">مُرسلة</option><option value="revision_requested">طلب تعديل</option><option value="draft">مسودة</option><option value="rejected">مرفوضة</option><option value="cancelled">ملغاة</option></select>
        {/* Org & Project */}
        <select value={orgFilterId} onChange={e => { setOrgFilterId(e.target.value); setPage(1) }} className="filter-select filter-select--org"><option value="">جميع المؤسسات</option>{organizations.map(o => (<option key={o.id} value={o.id}>{`${o.code} - ${o.name}`.substring(0, 40)}</option>))}</select>
        <select value={projectFilterId} onChange={e => { setProjectFilterId(e.target.value); setPage(1) }} className="filter-select filter-select--project"><option value="">جميع المشاريع</option>{projects.map(p => (<option key={p.id} value={p.id}>{`${p.code} - ${p.name}`.substring(0, 40)}</option>))}</select>
        {/* Debit/Credit account */}
        <div style={{ minWidth: 280 }}>
          <SearchableSelect id="enriched.filter.debit" value={debitFilterId} options={[{ value: '', label: 'جميع الحسابات المدينة', searchText: '' }, ...accounts.slice().sort((a,b)=>a.code.localeCompare(b.code)).map(a=>({value:a.id,label:`${a.code} - ${a.name}`,searchText:`${a.code} ${a.name}`.toLowerCase()}))]} onChange={(v) => { setDebitFilterId(v); setPage(1) }} placeholder="جميع الحسابات المدينة" clearable={true} />
        </div>
        <div style={{ minWidth: 280 }}>
          <SearchableSelect id="enriched.filter.credit" value={creditFilterId} options={[{ value: '', label: 'جميع الحسابات الدائنة', searchText: '' }, ...accounts.slice().sort((a,b)=>a.code.localeCompare(b.code)).map(a=>({value:a.id,label:`${a.code} - ${a.name}`,searchText:`${a.code} ${a.name}`.toLowerCase()}))]} onChange={(v) => { setCreditFilterId(v); setPage(1) }} placeholder="جميع الحسابات الدائنة" clearable={true} />
        </div>
        {/* Classification */}
        <select value={classificationFilterId} onChange={e => { setClassificationFilterId(e.target.value); setPage(1) }} className="filter-select filter-select--classification"><option value="">جميع التصنيفات</option>{classifications.map(c => (<option key={c.id} value={c.id}>{`${c.code} - ${c.name}`.substring(0, 40)}</option>))}</select>
        {/* Sub-tree */}
        <select value={expensesCategoryFilterId} onChange={e => { setExpensesCategoryFilterId(e.target.value); setPage(1) }} className="filter-select filter-select--expenses"><option value="">جميع الشجرة الفرعية</option>{categories.slice().sort((a,b)=>`${a.code} - ${a.description}`.localeCompare(`${b.code} - ${b.description}`)).map(cat => (<option key={cat.id} value={cat.id}>{`${cat.code} - ${cat.description}`.substring(0, 52)}</option>))}</select>
        {/* Work item */}
        <select value={workItemFilterId} onChange={e => { setWorkItemFilterId(e.target.value); setPage(1) }} className="filter-select filter-select--workitem"><option value="">جميع عناصر العمل</option>{workItems.slice().sort((a,b)=>`${a.code} - ${a.name}`.localeCompare(`${b.code} - ${b.name}`)).map(w => (<option key={w.id} value={w.id}>{`${w.code} - ${w.name}`.substring(0, 52)}</option>))}</select>
        {/* Analysis work item */}
        <select value={analysisWorkItemFilterId} onChange={e => { setAnalysisWorkItemFilterId(e.target.value); setPage(1) }} className="filter-select filter-select--analysisworkitem">
          <option value="">جميع بنود التحليل</option>
          {Object.entries(analysisItemsMap).sort((a,b)=>`${a[1].code} - ${a[1].name}`.localeCompare(`${b[1].code} - ${b[1].name}`)).map(([id, a]) => (
            <option key={id} value={id}>{`${a.code} - ${a.name}`.substring(0, 52)}</option>
          ))}
        </select>
        {/* Cost center */}
        <select value={costCenterFilterId} onChange={e => { setCostCenterFilterId(e.target.value); setPage(1) }} className="filter-select filter-select--costcenter">
          <option value="">جميع مراكز التكلفة</option>
          {costCenters.slice().sort((a,b)=>`${a.code} - ${a.name}`.localeCompare(`${b.code} - ${b.name}`)).map(cc => (
            <option key={cc.id} value={cc.id}>{`${cc.code} - ${cc.name}`.substring(0, 52)}</option>
          ))}
        </select>
        {/* Amount range */}
        <input type="number" placeholder="من مبلغ" value={filters.amountFrom} onChange={e => { setFilters({ ...filters, amountFrom: e.target.value }); setPage(1) }} className="filter-input filter-input--amount" />
        <input type="number" placeholder="إلى مبلغ" value={filters.amountTo} onChange={e => { setFilters({ ...filters, amountTo: e.target.value }); setPage(1) }} className="filter-input filter-input--amount" />
      </div>

      <div className="transactions-content">
        <div className="transactions-tablebar">
          <div className="transactions-toolbar">
            <span className="transactions-count">عدد السجلات: {totalCount}</span>
            <label className="wrap-toggle"><input type="checkbox" checked={wrapMode} onChange={(e) => setWrapMode(e.target.checked)} /><span>التفاف النص</span></label>
            <button className="ultimate-btn" onClick={() => reload().catch(() => {})}><div className="btn-content"><span className="btn-text">تحديث</span></div></button>
            <button className="ultimate-btn" onClick={() => window.dispatchEvent(new CustomEvent('transactions:refresh'))} title="تحديث سريع"><div className="btn-content"><span className="btn-text">تحديث 🔁</span></div></button>
<button className="ultimate-btn ultimate-btn-warning" onClick={() => { setWrapMode(false); try { localStorage.setItem('transactions_enriched_table_wrap', '0') } catch {}; resetToDefaults() }} title="استعادة الإعدادات الافتراضية"><div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div></button>
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

        {/* Single-table view from transactions_enriched_v2 */}
        <ResizableTable
          columns={columns}
          data={tableData as any}
          onColumnResize={handleColumnResize as any}
          className={`transactions-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
          isLoading={loading}
          emptyMessage="لا توجد معاملات"
          getRowId={(row) => (row as any).original?.id ?? (row as any).id}
          renderCell={(value, column, row: any) => {
            // Tooltips for multiple values
            if (column.key === 'debit_account_label' && Array.isArray(row._debit_list) && row._debit_list.length > 1) {
              return <span title={row._debit_list.join('\n')}>{String(value || 'متعدد')}</span>
            }
            if (column.key === 'credit_account_label' && Array.isArray(row._credit_list) && row._credit_list.length > 1) {
              return <span title={row._credit_list.join('\n')}>{String(value || 'متعدد')}</span>
            }
            if (column.key === 'project_label' && Array.isArray(row._project_list) && row._project_list.length > 1) {
              return <span title={row._project_list.join('\n')}>{String(value || 'متعدد')}</span>
            }
            if (column.key === 'sub_tree_label' && Array.isArray(row._sub_tree_list) && row._sub_tree_list.length > 1) {
              return <span title={row._sub_tree_list.join('\n')}>{String(value || 'متعدد')}</span>
            }
            if (column.key === 'work_item_label' && Array.isArray(row._work_item_list) && row._work_item_list.length > 1) {
              return <span title={row._work_item_list.join('\n')}>{String(value || 'متعدد')}</span>
            }
            if (column.key === 'analysis_work_item_label' && Array.isArray(row._analysis_item_list) && row._analysis_item_list.length > 1) {
              return <span title={row._analysis_item_list.join('\n')}>{String(value || 'متعدد')}</span>
            }
            if (column.key === 'cost_center_label' && Array.isArray(row._cost_center_list) && row._cost_center_list.length > 1) {
              return <span title={row._cost_center_list.join('\n')}>{String(value || 'متعدد')}</span>
            }
            return undefined
          }}
        />

        {/* Bottom lines table removed in single-table mode */}
      </div>



      {/* Column Configuration Modal - Enriched Headers Table */}
      <ColumnConfiguration
        columns={columns}
        onConfigChange={handleColumnConfigChange}
        isOpen={columnsConfigOpen}
        onClose={() => setColumnsConfigOpen(false)}
        onReset={resetToDefaults}
        sampleData={tableData as any}
      />

      {/* Permissions diagnostic (optional) */}
      <div className="diag-panel" style={{ display: 'none' }}>
        <div className="diag-perms-box">
          {['transactions.create','transactions.update','transactions.delete','transactions.post','transactions.review','transactions.manage'].map(key => (
            <PermissionBadge key={key} allowed={hasPerm(key)} label={key} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TransactionsEnrichedPage