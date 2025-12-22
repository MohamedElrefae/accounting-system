import { useEffect, useMemo, useState, useCallback } from 'react'

import { useLocation, useNavigate } from 'react-router-dom'
import { getUserDisplayMap } from '../../services/transactions'
import { useHasPermission } from '../../hooks/useHasPermission'
import './Transactions.css'
import { useTransactionsData } from '../../contexts/TransactionsDataContext'

import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'

import PermissionBadge from '../../components/Common/PermissionBadge'
import { WithPermission } from '../../components/Common/withPermission'
import ResizableTable from '../../components/Common/ResizableTable'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'
import { supabase } from '../../utils/supabase'
// import { getTransactionsEnrichedView } from '../../services/transactions-enriched' (Removed)
import UnifiedFilterBar from '../../components/Common/UnifiedFilterBar'
import { useTransactionsQuery } from '../../hooks/useTransactionsQuery'
import { useTransactionsFilters } from '../../hooks/useTransactionsFilters'

const TransactionsEnrichedPage = () => {

  // ========== DATA FROM CONTEXT (single source of truth) ==========
  const {
    organizations,
    projects,
    accounts,
    costCenters,
    workItems,
    categories,
    classifications,
    analysisItemsMap,
    currentUserId,
    isLoading: contextLoading,
  } = useTransactionsData()

  // REACT QUERY REFACTOR: Local state replaced by hooks
  // const [rows, setRows] = useState<any[]>([]) // Removed
  // const [loading, setLoading] = useState(true) // Derived
  // const [error, setError] = useState<string | null>(null) // Derived

  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [dimLists, setDimLists] = useState<Record<string, {
    projects?: string[]
    subTrees?: string[]
    workItems?: string[]
    analysis?: string[]
    costCenters?: string[]
  }>>({})

  const {
    headerFilters: unifiedFilters,
    headerAppliedFilters: appliedFilters,
    headerFiltersDirty: filtersDirty,
    updateHeaderFilter: updateFilter,
    applyHeaderFilters: handleApplyFilters,
    resetHeaderFilters: handleResetFilters,
  } = useTransactionsFilters()

  const [wrapMode, setWrapMode] = useState<boolean>(() => { try { return localStorage.getItem('transactions_enriched_table_wrap') === '1' } catch { return false } })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const location = useLocation()
  const navigate = useNavigate()
  const hasPerm = useHasPermission()

  useEffect(() => { try { localStorage.setItem('transactions_enriched_table_wrap', wrapMode ? '1' : '0') } catch { } }, [wrapMode])
  useEffect(() => { try { localStorage.setItem('transactions_enriched_approval_filter', unifiedFilters.approvalStatus || '') } catch { } }, [unifiedFilters.approvalStatus])

  const handleApplyFiltersWithPaging = useCallback(() => {
    handleApplyFilters()
    setPage(1)
  }, [handleApplyFilters])

  const handleResetFiltersWithPaging = useCallback(() => {
    handleResetFilters()
    setPage(1)
  }, [handleResetFilters])

  // REACT QUERY REFACTOR START
  // ---------------------------------------------------------------------------

  const mode: 'my' | 'all' = location.pathname.includes('/transactions/my-enriched') ? 'my' : 'all'

  const filtersToUse = useMemo(() => ({
    scope: mode,
    search: appliedFilters.search || undefined,
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined,
    amountFrom: appliedFilters.amountFrom ? parseFloat(appliedFilters.amountFrom) : undefined,
    amountTo: appliedFilters.amountTo ? parseFloat(appliedFilters.amountTo) : undefined,
    debitAccountId: appliedFilters.debitAccountId || undefined,
    creditAccountId: appliedFilters.creditAccountId || undefined,
    orgId: appliedFilters.orgId || undefined,
    projectId: appliedFilters.projectId || undefined,
    classificationId: appliedFilters.classificationId || undefined,
    expensesCategoryId: appliedFilters.expensesCategoryId || undefined,
    workItemId: appliedFilters.workItemId || undefined,
    analysisWorkItemId: appliedFilters.analysisWorkItemId || undefined,
    costCenterId: appliedFilters.costCenterId || undefined,
    approvalStatus: appliedFilters.approvalStatus || undefined,
    createdBy: mode === 'my' ? (currentUserId || undefined) : undefined,
  }), [mode, appliedFilters, currentUserId])

  // Use the new hook for fetching
  // It handles: data fetching, caching, and realtime invalidation automatically
  // We rename data to 'queryData' to avoid conflict if any, and access rows/total from it
  // We need to import useTransactionsQuery at top of file
  const {
    data: queryData,
    isLoading: queryLoading,
    error: queryError,
    refetch
  } = useTransactionsQuery({
    filters: filtersToUse as any,
    page,
    pageSize,
    enabled: !contextLoading, // Wait for context to be ready (user id etc)
  })

  const rows = useMemo(() => queryData?.rows ?? [], [queryData?.rows])
  const totalCount = queryData?.total || 0

  // Use query loading state + context
  // But wait, we used to have a local 'loading' state.
  // Now we derive it.
  const loading = queryLoading || contextLoading

  // Side-effect: Preload dimensions from transaction_lines (Legacy logic preserved)
  // Ideally this should be a hook or part of the view, but for now we keep it here.
  useEffect(() => {
    const currentRows = rows
    if (!currentRows.length) {
      setDimLists({})
      return
    }

    let cancelled = false;
    const loadDims = async () => {
      try {
        const ids: string[] = currentRows.map((r: any) => r.transaction_id || r.id).filter(Boolean)
        if (ids.length) {
          const { data: lineRows } = await supabase
            .from('transaction_lines')
            .select('transaction_id, project_id, cost_center_id, work_item_id, analysis_work_item_id, sub_tree_id')
            .in('transaction_id', ids as any)

          if (cancelled) return

          const map: Record<string, any> = {}
            ; (lineRows || []).forEach((lr: any) => {
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
        }
      } catch { }
    }

    loadDims()
    return () => { cancelled = true }
  }, [rows, page, pageSize])

  // Side-effect: resolve user names
  useEffect(() => {
    const currentRows = rows
    if (!currentRows.length) return
    const ids: string[] = []
    currentRows.forEach((t: any) => { if (t.created_by) ids.push(t.created_by); if (t.posted_by) ids.push(t.posted_by!) })
    if (ids.length) {
      getUserDisplayMap(ids).then(setUserNames).catch(() => { })
    }
  }, [rows, page, pageSize])

  // Global refresh via CustomEvent (from details panel)
  // NOW mapped to React Query refetch
  useEffect(() => {
    const handler = () => { refetch().catch(() => { }) }
    window.addEventListener('transactions:refresh', handler)
    return () => window.removeEventListener('transactions:refresh', handler)
  }, [refetch])

  // ---------------------------------------------------------------------------
  // REACT QUERY REFACTOR END

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

  // Column configuration modal state
  const [columnsConfigOpen, setColumnsConfigOpen] = useState(false)

  // Helpers for label mapping
  const accountLabel = useCallback((id?: string | null) => {
    if (!id) return ''
    const a = accounts.find(x => x.id === id)
    return a ? `${a.code} - ${a.name_ar || a.name}` : id || ''
  }, [accounts])

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

      // Accounts lists (for tooltip) - use Arabic names from accounts data
      const dCodes: string[] = Array.isArray(t.debit_accounts_codes) ? t.debit_accounts_codes : []
      const dNames: string[] = Array.isArray(t.debit_accounts_names) ? t.debit_accounts_names : []
      const cCodes: string[] = Array.isArray(t.credit_accounts_codes) ? t.credit_accounts_codes : []
      const cNames: string[] = Array.isArray(t.credit_accounts_names) ? t.credit_accounts_names : []

      // Transform names to use Arabic where available
      const debitList = dCodes.map((code, i) => {
        const account = accounts.find(a => a.code === code)
        const name = account ? (account.name_ar || account.name || dNames[i] || '') : (dNames[i] || '')
        return `${code} - ${name}`.trim()
      })

      const creditList = cCodes.map((code, i) => {
        const account = accounts.find(a => a.code === code)
        const name = account ? (account.name_ar || account.name || cNames[i] || '') : (cNames[i] || '')
        return `${code} - ${name}`.trim()
      })

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
        if (t.debit_account_code) return `${t.debit_account_code} - ${t.debit_account_name_ar || t.debit_account_name || ''}`.trim()
        if (debitList.length > 1) return 'متعدد'
        if (debitList.length === 1) return debitList[0]
        return accountLabel(t.debit_account_id) || '—'
      })()

      const creditLabel = (() => {
        if (t.credit_account_code) return `${t.credit_account_code} - ${t.credit_account_name_ar || t.credit_account_name || ''}`.trim()
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
        // Use computed approval status from line-level approval system
        approval_status: t.is_posted ? 'posted' : (t.approval_status || 'draft'),
        // Line-level approval counts (from RPC)
        lines_total_count: t.lines_total_count || 0,
        lines_approved_count: t.lines_approved_count || 0,
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
  }, [paged, accounts, userNames, categories, workItems, analysisItemsMap, organizations, projects, classifications, costCenters, dimLists, accountLabel])

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
  // Use queryError for error display
  if (queryError) return <div className="error-container">خطأ: {(queryError as any)?.message || 'فشل تحميل البيانات'}</div>

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

      {/* Unified Filters */}
      <UnifiedFilterBar
        values={unifiedFilters}
        onChange={(key, value) => { updateFilter(key, value) }}
        onReset={handleResetFiltersWithPaging}
        onApply={handleApplyFiltersWithPaging}
        applyDisabled={!filtersDirty}
        preferencesKey="transactions_enriched_filterbar"
        config={{
          showAmountRange: true,
        }}
      />

      <div className="transactions-content">
        <div className="transactions-tablebar">
          <div className="transactions-toolbar">
            <span className="transactions-count">عدد السجلات: {totalCount}</span>
            <label className="wrap-toggle"><input type="checkbox" checked={wrapMode} onChange={(e) => setWrapMode(e.target.checked)} /><span>التفاف النص</span></label>
            <button className="ultimate-btn" onClick={() => refetch().catch(() => { })}><div className="btn-content"><span className="btn-text">تحديث</span></div></button>
            <button className="ultimate-btn" onClick={() => refetch()} title="تحديث سريع"><div className="btn-content"><span className="btn-text">تحديث 🔁</span></div></button>
            <button className="ultimate-btn ultimate-btn-warning" onClick={() => { setWrapMode(false); try { localStorage.setItem('transactions_enriched_table_wrap', '0') } catch { }; resetToDefaults() }} title="استعادة الإعدادات الافتراضية"><div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div></button>
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
            if (column.key === 'approval_status') {
              // Use row-level data (already includes computed approval status and line counts)
              const st = row.original?.is_posted ? 'posted' : (row.approval_status || row.original?.approval_status || 'draft')
              const linesApproved = row.lines_approved_count || row.original?.lines_approved_count || 0
              const linesTotal = row.lines_total_count || row.original?.lines_total_count || 0

              const map: Record<string, { label: string; cls: string; tip: string }> = {
                draft: { label: 'مسودة', cls: 'ultimate-btn-neutral', tip: 'لم يتم إرسالها للمراجعة بعد' },
                submitted: { label: 'مُرسلة', cls: 'ultimate-btn-edit', tip: 'بإنتظار المراجعة' },
                pending: { label: 'قيد المراجعة', cls: 'ultimate-btn-edit', tip: 'بإنتظار اعتماد السطور' },
                revision_requested: { label: 'طلب تعديل', cls: 'ultimate-btn-warning', tip: 'أُعيدت للتعديل — أعد الإرسال بعد التصحيح' },
                requires_revision: { label: 'يحتاج تعديل', cls: 'ultimate-btn-warning', tip: 'تم رفض بعض السطور' },
                approved: { label: 'معتمدة', cls: 'ultimate-btn-success', tip: 'تم اعتماد جميع السطور' },
                rejected: { label: 'مرفوضة', cls: 'ultimate-btn-delete', tip: 'تم الرفض' },
                cancelled: { label: 'ملغاة', cls: 'ultimate-btn-neutral', tip: 'ألغى المُرسل الإرسال' },
                posted: { label: 'مرحلة', cls: 'ultimate-btn-posted', tip: 'تم الترحيل (مُثبت في الدفاتر)' },
              }
              const conf = map[st] || map['draft']

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                  <span className={`ultimate-btn ${conf.cls}`} style={{ cursor: 'default', padding: '6px 12px', minHeight: 32, fontSize: '13px' }} title={conf.tip}>
                    <span className="btn-text">{conf.label}</span>
                  </span>
                  {linesTotal > 0 && !row.original.is_posted && (
                    <span
                      dir="ltr"
                      style={{
                        fontSize: '12px',
                        color: linesApproved === linesTotal ? '#10b981' : '#f59e0b',
                        fontWeight: '800',
                        background: linesApproved === linesTotal ? '#ecfdf5' : '#fffbeb',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: `1px solid ${linesApproved === linesTotal ? '#10b981' : '#f59e0b'}`
                      }}
                      title={`${linesApproved} من ${linesTotal} سطور معتمدة`}
                    >
                      {linesApproved} / {linesTotal}
                    </span>
                  )}
                </div>
              )
            }
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
          {['transactions.create', 'transactions.update', 'transactions.delete', 'transactions.post', 'transactions.review', 'transactions.manage'].map(key => (
            <PermissionBadge key={key} allowed={hasPerm(key)} label={key} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TransactionsEnrichedPage