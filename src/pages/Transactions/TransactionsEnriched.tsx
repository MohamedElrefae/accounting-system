import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [analysisItemsMap, setAnalysisItemsMap] = useState<Record<string, { code: string; name: string }>>({})

  const [filters, setFilters] = useState<FilterState>({ dateFrom: '', dateTo: '', amountFrom: '', amountTo: '' })
  const [debitFilterId, setDebitFilterId] = useState<string>('')
  const [creditFilterId, setCreditFilterId] = useState<string>('')
  const [orgFilterId, setOrgFilterId] = useState<string>('')
  const [projectFilterId, setProjectFilterId] = useState<string>(() => { try { return (localStorage.getItem('project_id') || '') as string } catch { return '' } })
  const [classificationFilterId, setClassificationFilterId] = useState<string>('')
  const [expensesCategoryFilterId, setExpensesCategoryFilterId] = useState<string>('')
  const [workItemFilterId, setWorkItemFilterId] = useState<string>('')
  const [costCenterFilterId, setCostCenterFilterId] = useState<string>('')
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'draft' | 'submitted' | 'revision_requested' | 'approved' | 'rejected' | 'cancelled' | 'posted'>(() => { try { return (localStorage.getItem('transactions_enriched_approval_filter') as any) || 'all' } catch { return 'all' } })
  const [wrapMode, setWrapMode] = useState<boolean>(() => { try { return localStorage.getItem('transactions_enriched_table_wrap') === '1' } catch { return false } })
  const [lineWrapMode, setLineWrapMode] = useState<boolean>(() => { try { return localStorage.getItem('transactions_enriched_lines_table_wrap') === '1' } catch { return false } })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)


  const location = useLocation()
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
  useEffect(() => { reload().catch(() => {}) }, [searchTerm, filters.dateFrom, filters.dateTo, filters.amountFrom, filters.amountTo, debitFilterId, creditFilterId, orgFilterId, projectFilterId, classificationFilterId, expensesCategoryFilterId, workItemFilterId, costCenterFilterId, approvalFilter, page, pageSize])

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
      costCenterId: costCenterFilterId || undefined,
      approvalStatus: approvalFilter !== 'all' ? (approvalFilter as any) : undefined,
      createdBy: currentUserId || undefined,
    } as any

    const { rows, total } = await getTransactionsEnrichedView(filtersToUse, page, pageSize)
    setRows(rows)
    setTotalCount(total)

    // Load supporting maps (categories/work items) for current orgs in page
    try {
      const orgIds = Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      if (orgIds.length > 0) {
        const lists = await Promise.all(orgIds.map(id => getExpensesCategoriesList(id).catch(() => [])))
        const merged: Record<string, ExpensesCategoryRow> = {}
        for (const list of lists) for (const r of list) merged[r.id] = r
        setCategories(Object.values(merged))
      } else setCategories([])
    } catch {}

    try {
      const orgIds = Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      if (orgIds.length > 0) {
        const lists = await Promise.all(orgIds.map(id => listWorkItemsAll(id).catch(() => [])))
        const merged: Record<string, WorkItemRow> = {}
        for (const list of lists) for (const r of list) merged[r.id] = r as any
        setWorkItems(Object.values(merged))
      } else setWorkItems([])
    } catch {}

    // Analysis Work Items map for labels
    try {
      const orgIds = Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      const merged: Record<string, { code: string; name: string }> = {}
      for (const orgId of orgIds) {
        const list = await listAnalysisWorkItems({ orgId, projectId: projectFilterId || null, onlyWithTx: false, includeInactive: true }).catch(() => [])
        for (const a of list as any[]) merged[a.id] = { code: a.code, name: a.name }
      }
      setAnalysisItemsMap(merged)
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
    { key: 'approval_status', label: 'حالة الاعتماد', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'badge', resizable: false },
  ], [])

  const { columns, handleColumnResize, handleColumnConfigChange } = useColumnPreferences({
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
    return paged.map((t: any) => ({
      entry_number: t.entry_number,
      entry_date: t.entry_date,
      description: t.description,
      debit_account_label: (t.debit_account_label || (t.debit_account_code ? `${t.debit_account_code} - ${t.debit_account_name || ''}`.trim() : accountLabel(t.debit_account_id))) || '—',
      credit_account_label: (t.credit_account_label || (t.credit_account_code ? `${t.credit_account_code} - ${t.credit_account_name || ''}`.trim() : accountLabel(t.credit_account_id))) || '—',
      amount: t.amount,
      sub_tree_label: t.sub_tree_id ? (catMap[t.sub_tree_id] || '—') : '—',
      work_item_label: (() => { const wi = workItems.find(w => w.id === (t.work_item_id || '')); return wi ? `${wi.code} - ${wi.name}` : '—' })(),
      analysis_work_item_label: (() => { const id = t.analysis_work_item_id || ''; const a = id ? analysisItemsMap[id] : undefined; return a ? `${a.code} - ${a.name}` : '—' })(),
      classification_label: t.classification_code ? `${t.classification_code} - ${t.classification_name || ''}` : (classMap[t.classification_id || ''] || '—'),
      organization_label: (() => { const o = organizations.find(o => o.id === (t.org_id || '')); return o ? `${o.code} - ${o.name}` : '—' })(),
      project_label: (() => { const p = projects.find(p => p.id === (t.project_id || '')); return p ? `${p.code} - ${p.name}` : (t.project_code ? `${t.project_code} - ${t.project_name || ''}` : '—') })(),
      cost_center_label: t.cost_center_code && t.cost_center_name ? `${t.cost_center_code} - ${t.cost_center_name}` : '—',
      reference_number: t.reference_number || '—',
      notes: t.notes || '—',
      created_by_name: t.created_by ? (userNames[t.created_by] || t.created_by.substring(0, 8)) : '—',
      posted_by_name: t.posted_by ? (userNames[t.posted_by] || t.posted_by.substring(0, 8)) : '—',
      approval_status: t.is_posted ? 'posted' : (t.approval_status || 'draft'),
      original: t,
    }))
  }, [paged, accounts, userNames, categories, workItems, analysisItemsMap, organizations, projects, classifications])

  if (loading) return <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
  if (error) return <div className="error-container">خطأ: {error}</div>

  return (
    <div className="transactions-container" dir="rtl">
      <div className="transactions-header">
        <h1 className="transactions-title">المعاملات (من العرض المحسّن)</h1>
        <div className="transactions-actions">
          <WithPermission perm="transactions.create">
            <button className="ultimate-btn ultimate-btn-add" onClick={() => {/* reuse standard create via forms if needed */}}>
              <div className="btn-content"><span className="btn-text">+ معاملة جديدة</span></div>
            </button>
          </WithPermission>
          <button className="ultimate-btn ultimate-btn-edit" onClick={() => {/* open column config handled on table */}}>
            <div className="btn-content"><span className="btn-text">⚙️ إعدادات الأعمدة</span></div>
          </button>
          <ExportButtons
            data={prepareTableData(createStandardColumns([
              { key: 'entry_number', header: 'رقم القيد', type: 'text' },
              { key: 'entry_date', header: 'التاريخ', type: 'date' },
              { key: 'description', header: 'البيان', type: 'text' },
              { key: 'debit_account', header: 'الحساب المدين', type: 'text' },
              { key: 'credit_account', header: 'الحساب الدائن', type: 'text' },
              { key: 'amount', header: 'المبلغ', type: 'currency' },
            ]), paged.map((t: any) => ({
              entry_number: t.entry_number,
              entry_date: t.entry_date,
              description: t.description,
              debit_account: accountLabel(t.debit_account_id),
              credit_account: accountLabel(t.credit_account_id),
              amount: t.amount,
            })))}
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
        <select value={(filters as any).analysis_work_item_id || ''} onChange={e => { (setFilters as any)({ ...filters, analysis_work_item_id: e.target.value }); setPage(1) }} className="filter-select filter-select--analysisworkitem"><option value="">جميع بنود التحليل</option>{Object.entries({}).map(([id,a]) => (<option key={id} value={id}>{id}</option>))}</select>
        {/* Cost center */}
        <select value={costCenterFilterId} onChange={e => { setCostCenterFilterId(e.target.value); setPage(1) }} className="filter-select filter-select--costcenter"><option value="">جميع مراكز التكلفة</option></select>
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
            <button className="ultimate-btn ultimate-btn-warning" onClick={() => { setWrapMode(false); try { localStorage.setItem('transactions_enriched_table_wrap', '0') } catch {}; handleColumnConfigChange(defaultColumns) }} title="استعادة الإعدادات الافتراضية"><div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div></button>
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
        />

        {/* Bottom lines table removed in single-table mode */}
      </div>



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