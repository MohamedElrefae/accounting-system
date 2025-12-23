/**
 * RunningBalanceEnriched - Enterprise Running Balance Page
 * 
 * Replicates the AllLinesEnriched pattern with:
 * - Unified Filter Bar
 * - Customizable Columns
 * - Export Functions (PDF/Excel/CSV)
 * - Real-time Sync
 * - Database-backed data via get_hierarchical_ledger_report RPC
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import '../Transactions/Transactions.css'
import { useTransactionsData } from '../../contexts/TransactionsDataContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import ResizableTable from '../../components/Common/ResizableTable'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'
import UnifiedFilterBar from '../../components/Common/UnifiedFilterBar'
import { useRunningBalanceFilters } from '../../hooks/useRunningBalanceFilters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUnifiedSync } from '../../hooks/useUnifiedSync'
import { fetchRunningBalance, type RunningBalanceSummary } from '../../services/reports/runningBalanceService'
import {
  exportRunningBalanceWithSummaryPDF,
  exportRunningBalanceWithSummaryExcel,
  exportRunningBalanceWithSummaryCSV
} from '../../services/reports/advancedExportService'

const RunningBalanceEnrichedPage = () => {
  const {
    accounts,
    projects,
    costCenters,
    workItems,
    classifications,
    analysisItemsMap,
    categories, // Now specifically requested for sub-tree labels
    currentUserId,
    isLoading: contextLoading,
  } = useTransactionsData()

  const {
    filters,
    appliedFilters,
    filtersDirty,
    updateFilter,
    applyFilters,
    resetFilters,
    hasValidFilter,
  } = useRunningBalanceFilters()

  const [wrapMode, setWrapMode] = useState<boolean>(() => {
    try { return localStorage.getItem('running_balance_table_wrap') === '1' } catch { return false }
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [columnsConfigOpen, setColumnsConfigOpen] = useState(false)
  const [enhancedExportOpen, setEnhancedExportOpen] = useState(false)

  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    try { localStorage.setItem('running_balance_table_wrap', wrapMode ? '1' : '0') } catch { }
  }, [wrapMode])

  const handleApplyFiltersWithPaging = useCallback(() => {
    applyFilters()
    setPage(1)
  }, [applyFilters])

  const handleResetFiltersWithPaging = useCallback(() => {
    resetFilters()
    setPage(1)
  }, [resetFilters])

  // Fetch running balance data
  const fetchData = useCallback(async () => {
    // Check if we have any valid filter
    const hasFilter = Boolean(
      appliedFilters.debitAccountId ||
      appliedFilters.expensesCategoryId ||
      appliedFilters.projectId ||
      appliedFilters.classificationId ||
      appliedFilters.costCenterId ||
      appliedFilters.workItemId ||
      appliedFilters.analysisWorkItemId ||
      appliedFilters.dateFrom ||
      appliedFilters.dateTo
    )

    if (!hasFilter) {
      return { rows: [], summary: null, total: 0 }
    }

    const response = await fetchRunningBalance(
      {
        accountId: appliedFilters.debitAccountId || null,
        subTreeId: appliedFilters.expensesCategoryId || null,
        dateFrom: appliedFilters.dateFrom || null,
        dateTo: appliedFilters.dateTo || null,
        orgId: appliedFilters.orgId || null,
        projectId: appliedFilters.projectId || null,
        classificationId: appliedFilters.classificationId || null,
        costCenterId: appliedFilters.costCenterId || null,
        workItemId: appliedFilters.workItemId || null,
        analysisWorkItemId: appliedFilters.analysisWorkItemId || null,
        expensesCategoryId: appliedFilters.expensesCategoryId || null,
        search: appliedFilters.search || null,
      },
      pageSize,
      (page - 1) * pageSize
    )

    return {
      rows: response.rows,
      summary: response.summary,
      total: response.totalCount
    }
  }, [appliedFilters, page, pageSize])

  const {
    data: queryData,
    isLoading: queryLoading,
    error: queryError,
    refetch
  } = useQuery<{ rows: any[]; summary: RunningBalanceSummary | null; total: number }, Error>({
    queryKey: ['running-balance-enriched', appliedFilters, page, pageSize],
    queryFn: fetchData,
    enabled: !contextLoading && hasValidFilter,
    staleTime: 30000,
  })

  // Real-time sync
  useUnifiedSync({
    channelId: 'running-balance-sync',
    tables: ['transactions', 'transaction_line_items'],
    onDataChange: () => {
      queryClient.invalidateQueries({ queryKey: ['running-balance-enriched'] })
    },
  })

  const rows = useMemo(() => queryData?.rows ?? [], [queryData?.rows])
  const summary: RunningBalanceSummary | null = queryData?.summary ?? null
  const totalCount = queryData?.total || 0
  const loading = queryLoading || contextLoading

  // Determine primary filter dimension for dynamic column labels
  type PrimaryDimension = 'account' | 'sub_tree' | 'project' | 'classification' | 'cost_center' | 'work_item' | 'analysis_item' | 'date_range' | 'none';

  const primaryDimension: PrimaryDimension = useMemo(() => {
    // Reverse priority: the more specific dimension selected "wins"
    // Usually, if a user filters by Project, they want to see Project balance.
    // If they filter by Account, they want to see Account balance.
    // If BOTH, we prioritize Account as the "main" ledger view.
    if (appliedFilters.debitAccountId) return 'account';
    if (appliedFilters.expensesCategoryId) return 'sub_tree';
    if (appliedFilters.projectId) return 'project';
    if (appliedFilters.costCenterId) return 'cost_center';
    if (appliedFilters.workItemId) return 'work_item';
    if (appliedFilters.classificationId) return 'classification';
    if (appliedFilters.analysisWorkItemId) return 'analysis_item';
    if (appliedFilters.dateFrom || appliedFilters.dateTo) return 'date_range';
    return 'none';
  }, [appliedFilters])

  // Get label for the primary dimension
  const primaryDimensionLabel = useMemo(() => {
    const dimensionLabels: Record<PrimaryDimension, string> = {
      account: 'الحساب',
      sub_tree: 'اسم الحساب',
      project: 'المشروع',
      classification: 'التصنيف',
      cost_center: 'مركز التكلفة',
      work_item: 'عنصر العمل',
      analysis_item: 'بند التحليل',
      date_range: 'جميع الحسابات',
      none: 'الحساب',
    };
    return dimensionLabels[primaryDimension];
  }, [primaryDimension])

  // Get the column key for the primary dimension
  const primaryDimensionKey = useMemo(() => {
    const keyMap: Record<PrimaryDimension, string> = {
      account: 'account_label',
      sub_tree: 'sub_tree_label',
      project: 'project_label',
      classification: 'classification_label',
      cost_center: 'cost_center_label',
      work_item: 'work_item_label',
      analysis_item: 'analysis_label',
      date_range: 'account_label', // Show account when filtering by date only
      none: 'account_label',
    };
    return keyMap[primaryDimension];
  }, [primaryDimension])

  // Dynamic column configuration based on active filter
  const defaultColumns: ColumnConfig[] = useMemo(() => {
    // Base columns that are always visible
    const baseColumns: ColumnConfig[] = [
      { key: 'entry_date', label: 'التاريخ', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'date', resizable: true },
      { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'text', resizable: true },
    ];

    // Primary dimension column - show with dynamic label
    const dimensionColumn: ColumnConfig = {
      key: primaryDimensionKey,
      label: primaryDimensionLabel,
      visible: true,
      width: 220,
      minWidth: 160,
      maxWidth: 320,
      type: 'text',
      resizable: true,
    };

    // If primary dimension is account/date_range/none, we just rely on the dynamic column derived above.
    // If it's something else (Project, Cost Center), the user might still want to see the Account column alongside properly labeled "Account".
    // So we add "Account" explicitly if the primary dimension is NOT account/date/none.

    // Core columns
    const coreColumns: ColumnConfig[] = [
      { key: 'description', label: 'البيان', visible: true, width: 250, minWidth: 150, maxWidth: 400, type: 'text', resizable: true },
      { key: 'debit', label: 'مدين', visible: true, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
      { key: 'credit', label: 'دائن', visible: true, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
      { key: 'running_balance', label: 'الرصيد الجاري', visible: true, width: 150, minWidth: 120, maxWidth: 200, type: 'currency', resizable: true },
    ];

    // Ensure account column is available if we are looking at dimensions other than account
    const extraAccountColumn: ColumnConfig[] = []
    if (primaryDimension !== 'account' && primaryDimension !== 'date_range' && primaryDimension !== 'none') {
      extraAccountColumn.push({ key: 'account_label', label: 'الحساب', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true })
    }

    // Hidden dimension columns (can be enabled via column config)
    // We filter out the one that is already shown as "dimensionColumn" (primaryDimensionKey)
    // AND we filter out 'account_label' if we just added it manually above
    const hiddenDimensionColumns: ColumnConfig[] = [
      { key: 'account_label', label: 'الحساب', visible: false, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
      { key: 'project_label', label: 'المشروع', visible: false, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
      { key: 'cost_center_label', label: 'مركز التكلفة', visible: false, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
      { key: 'classification_label', label: 'التصنيف', visible: false, width: 160, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
      { key: 'work_item_label', label: 'عنصر العمل', visible: false, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
      { key: 'analysis_label', label: 'بند التحليل', visible: false, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
      { key: 'sub_tree_label', label: 'اسم الحساب', visible: false, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
    ].filter(col => col.key !== primaryDimensionKey && !(primaryDimension !== 'account' && primaryDimension !== 'date_range' && primaryDimension !== 'none' && col.key === 'account_label'));

    return [...baseColumns, dimensionColumn, ...extraAccountColumn, ...coreColumns, ...hiddenDimensionColumns];
  }, [primaryDimensionKey, primaryDimensionLabel, primaryDimension])

  const { columns, handleColumnResize, handleColumnConfigChange, resetToDefaults } = useColumnPreferences({
    storageKey: 'running_balance_table',
    defaultColumns,
    userId: currentUserId || undefined,
  })

  // Helper functions for label mapping
  const accountLabel = useCallback((id?: string | null, code?: string, nameAr?: string) => {
    if (code && nameAr) return `${code} - ${nameAr}`
    if (!id) return '—'
    const a = accounts.find(x => x.id === id)
    return a ? `${a.code} - ${a.name_ar || a.name}` : id
  }, [accounts])

  const projectLabel = useCallback((id?: string | null) => {
    if (!id) return '—'
    const p = projects.find(x => x.id === id)
    return p ? `${p.code} - ${p.name}` : id
  }, [projects])

  const costCenterLabel = useCallback((id?: string | null) => {
    if (!id) return '—'
    const cc = costCenters.find(x => x.id === id)
    return cc ? `${cc.code} - ${cc.name}` : id
  }, [costCenters])

  const workItemLabel = useCallback((id?: string | null) => {
    if (!id) return '—'
    const wi = workItems.find(x => x.id === id)
    return wi ? `${wi.code} - ${wi.name}` : id
  }, [workItems])

  const analysisLabel = useCallback((id?: string | null) => {
    if (!id) return '—'
    const a = analysisItemsMap[id]
    return a ? `${a.code} - ${a.name}` : id
  }, [analysisItemsMap])

  const classificationLabel = useCallback((id?: string | null) => {
    if (!id) return '—'
    const c = classifications.find(x => x.id === id)
    return c ? `${c.code} - ${c.name}` : id
  }, [classifications])

  // Sub-tree / Category label
  const subTreeLabel = useCallback((id?: string | null) => {
    if (!id) return '—'
    const cat = categories.find(x => x.id === id)
    if (cat) {
      // SubTreeRow uses 'description', not 'name' or 'name_ar'
      const name = cat.description || (cat as any).name_ar || (cat as any).name || '—'
      return cat.code ? `${cat.code} - ${name}` : name
    }

    // Fallback: try to find in projects or cost centers if it's a cross-dimension ID
    const p = projects.find(x => x.id === id)
    if (p) return `${p.code} - ${p.name}`

    return id
  }, [categories, projects])

  // Get selected account label for display
  const selectedAccountLabel = useMemo(() => {
    if (!appliedFilters.debitAccountId) return ''
    return accountLabel(appliedFilters.debitAccountId)
  }, [appliedFilters.debitAccountId, accountLabel])

  // Prepare table data with labels
  const tableData = useMemo(() => {
    return rows.map((row: any) => ({
      id: row.transaction_id,
      transaction_id: row.transaction_id,
      entry_date: row.entry_date || '—',
      entry_number: row.entry_number || '—',
      account_label: accountLabel(row.account_id, row.account_code, row.account_name_ar),
      description: row.description || '—',
      debit: Number(row.debit) || 0,
      credit: Number(row.credit) || 0,
      running_balance: Number(row.running_balance) || 0,
      project_label: projectLabel(row.project_id),
      cost_center_label: costCenterLabel(row.cost_center_id),
      classification_label: classificationLabel(row.classification_id),
      work_item_label: workItemLabel(row.work_item_id),
      analysis_label: analysisLabel(row.analysis_work_item_id),
      sub_tree_label: subTreeLabel(row.sub_tree_id),
      original: row,
    }))
  }, [rows, accountLabel, projectLabel, costCenterLabel, classificationLabel, workItemLabel, analysisLabel, subTreeLabel])

  // Format currency for display
  const formatCurrency = useCallback((value: number) => {
    return value.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }, [])

  // Export data with summary information
  const exportData = useMemo(() => {
    const visibleCols = (columns || []).filter(c => c.visible)
    const defs = visibleCols.map(col => ({
      key: col.key,
      header: col.label,
      type: (col.type === 'currency' ? 'currency' : col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text') as any,
    }))
    const exportRows = (tableData || []).map((row: any) => {
      const out: any = {}
      for (const col of visibleCols) {
        out[col.key] = row[col.key]
      }
      return out
    })
    return prepareTableData(createStandardColumns(defs as any), exportRows)
  }, [columns, tableData])

  // Build export subtitle with filter info - dynamic based on primary dimension
  const exportSubtitle = useMemo(() => {
    const parts: string[] = []

    // Add primary dimension info
    switch (primaryDimension) {
      case 'account':
        if (selectedAccountLabel) parts.push(`الحساب: ${selectedAccountLabel}`)
        break
      case 'project': {
        const label = projectLabel(appliedFilters.projectId)
        if (label !== '—') parts.push(`المشروع: ${label}`)
        break
      }
      case 'cost_center': {
        const label = costCenterLabel(appliedFilters.costCenterId)
        if (label !== '—') parts.push(`مركز التكلفة: ${label}`)
        break
      }
      case 'classification': {
        const label = classificationLabel(appliedFilters.classificationId)
        if (label !== '—') parts.push(`التصنيف: ${label}`)
        break
      }
      case 'work_item': {
        const label = workItemLabel(appliedFilters.workItemId)
        if (label !== '—') parts.push(`عنصر العمل: ${label}`)
        break
      }
      case 'analysis_item': {
        const label = analysisLabel(appliedFilters.analysisWorkItemId)
        if (label !== '—') parts.push(`بند التحليل: ${label}`)
        break
      }
      case 'sub_tree': {
        const label = subTreeLabel(appliedFilters.expensesCategoryId)
        if (label !== '—') parts.push(`اسم الحساب: ${label}`)
        break
      }
      case 'date_range':
        parts.push('جميع الحسابات')
        break
    }

    // Add date range
    if (appliedFilters.dateFrom) parts.push(`من: ${appliedFilters.dateFrom}`)
    if (appliedFilters.dateTo) parts.push(`إلى: ${appliedFilters.dateTo}`)

    return parts.length > 0 ? parts.join(' | ') : undefined
  }, [primaryDimension, selectedAccountLabel, appliedFilters, projects, costCenters, classifications, workItems, analysisItemsMap,
    projectLabel, costCenterLabel, classificationLabel, workItemLabel, analysisLabel, subTreeLabel])

  // Get the human-readable name of the primary filtered dimension
  const selectedDimensionName = useMemo(() => {
    switch (primaryDimension) {
      case 'account':
        return selectedAccountLabel
      case 'project': {
        const label = projectLabel(appliedFilters.projectId)
        return label !== '—' ? label : ''
      }
      case 'cost_center': {
        const label = costCenterLabel(appliedFilters.costCenterId)
        return label !== '—' ? label : ''
      }
      case 'classification': {
        const label = classificationLabel(appliedFilters.classificationId)
        return label !== '—' ? label : ''
      }
      case 'work_item': {
        const label = workItemLabel(appliedFilters.workItemId)
        return label !== '—' ? label : ''
      }
      case 'analysis_item': {
        const label = analysisLabel(appliedFilters.analysisWorkItemId)
        return label !== '—' ? label : ''
      }
      case 'sub_tree': {
        const label = subTreeLabel(appliedFilters.expensesCategoryId)
        if (label && label !== '—' && label !== appliedFilters.expensesCategoryId && !label.includes('—')) {
          return label
        }
        return label && label.includes(' - ') ? label : (appliedFilters.expensesCategoryId ? `اسم الحساب ${appliedFilters.expensesCategoryId}` : '')
      }
      case 'date_range':
        return 'جميع الحسابات'
      default:
        return ''
    }
  }, [primaryDimension, selectedAccountLabel, appliedFilters, projectLabel, costCenterLabel, classificationLabel, workItemLabel, analysisLabel, subTreeLabel])

  // Dynamic report title based on primary dimension
  const reportTitle = useMemo(() => {
    const baseTitle = 'الرصيد الجاري'
    return selectedDimensionName ? `${baseTitle} - ${selectedDimensionName}` : baseTitle
  }, [selectedDimensionName])

  // Global refresh handler
  useEffect(() => {
    const handler = () => { refetch().catch(() => { }) }
    window.addEventListener('transactions:refresh', handler)
    return () => window.removeEventListener('transactions:refresh', handler)
  }, [refetch])

  if (contextLoading) {
    return <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
  }

  return (
    <div className="transactions-container" dir="rtl">
      <div className="transactions-header">
        <h1 className="transactions-title">{reportTitle}</h1>
        <div className="transactions-actions">
          <button className="ultimate-btn ultimate-btn-edit" onClick={() => setColumnsConfigOpen(true)}>
            <div className="btn-content"><span className="btn-text">⚙️ إعدادات الأعمدة</span></div>
          </button>
          {hasValidFilter && (
            <>
              {/* Standard Export - Basic Options Only */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted_text, #9ca3af)', marginRight: '0.5rem' }}>
                  تصدير عادي:
                </span>
                <ExportButtons
                  data={exportData}
                  config={{
                    title: reportTitle,
                    subtitle: exportSubtitle,
                    rtlLayout: true,
                    useArabicNumerals: true
                  }}
                  size="small"
                  layout="horizontal"
                  showCustomizedPDF={false}
                  showBatchExport={false}
                />
              </div>

              {/* Advanced Export with Summary - Separate Button */}
              <button
                className="ultimate-btn ultimate-btn-success"
                onClick={() => setEnhancedExportOpen(true)}
                title="تصدير مع ملخص البيانات"
              >
                <div className="btn-content"><span className="btn-text">📊 تصدير متقدم</span></div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Unified Filters */}
      <UnifiedFilterBar
        values={filters}
        onChange={(key, value) => { updateFilter(key, value) }}
        onReset={handleResetFiltersWithPaging}
        onApply={handleApplyFiltersWithPaging}
        applyDisabled={!filtersDirty}
        preferencesKey="running_balance_filterbar"
        config={{
          showSearch: true,
          showDateRange: true,
          showAmountRange: false,
          showOrg: false,
          showProject: true,
          showDebitAccount: true,
          showCreditAccount: false,
          showClassification: true,
          showExpensesCategory: true,
          showWorkItem: true,
          showAnalysisWorkItem: true,
          showCostCenter: true,
          showApprovalStatus: false,
        }}
      />

      {/* Summary Cards */}
      {hasValidFilter && summary && (
        <div className="summary-cards" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--surface, #111827)',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          border: '1px solid var(--border-color, #374151)',
        }}>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted_text, #9ca3af)', marginBottom: '0.25rem' }}>
              الرصيد الافتتاحي
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text, #f3f4f6)' }}>
              {formatCurrency(summary.openingBalance)}
            </div>
          </div>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted_text, #9ca3af)', marginBottom: '0.25rem' }}>
              إجمالي المدين
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
              {formatCurrency(summary.totalDebits)}
            </div>
          </div>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted_text, #9ca3af)', marginBottom: '0.25rem' }}>
              إجمالي الدائن
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
              {formatCurrency(summary.totalCredits)}
            </div>
          </div>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted_text, #9ca3af)', marginBottom: '0.25rem' }}>
              صافي التغيير
            </div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: summary.netChange >= 0 ? '#10b981' : '#ef4444'
            }}>
              {formatCurrency(summary.netChange)}
            </div>
          </div>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'var(--accent-muted, #1e3a5f)', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginBottom: '0.25rem' }}>
              الرصيد الختامي
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>
              {formatCurrency(summary.closingBalance)}
            </div>
          </div>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted_text, #9ca3af)', marginBottom: '0.25rem' }}>
              عدد الحركات
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text, #f3f4f6)' }}>
              {summary.transactionCount}
            </div>
          </div>
        </div>
      )}

      {/* No Filter Selected Message */}
      {!hasValidFilter && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: 'var(--surface, #111827)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color, #374151)',
          marginBottom: '1rem',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <div style={{ fontSize: '1.125rem', color: 'var(--text, #f3f4f6)', marginBottom: '0.5rem' }}>
            اختر فلتراً لعرض الرصيد الجاري
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--muted_text, #9ca3af)' }}>
            يمكنك الفلترة حسب: الحساب، الشجرة الفرعية، المشروع، التصنيف، مركز التكلفة، أو نطاق التاريخ
          </div>
        </div>
      )}

      {hasValidFilter && (
        <div className="transactions-content">
          <div className="transactions-tablebar">
            <div className="transactions-toolbar">
              <span className="transactions-count">عدد الحركات: {totalCount}</span>
              {selectedDimensionName && (
                <span style={{
                  backgroundColor: 'var(--accent-muted, #1e3a5f)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  color: '#60a5fa'
                }}>
                  {selectedDimensionName}
                </span>
              )}
              <label className="wrap-toggle">
                <input type="checkbox" checked={wrapMode} onChange={(e) => setWrapMode(e.target.checked)} />
                <span>التفاف النص</span>
              </label>
              <button className="ultimate-btn" onClick={() => refetch().catch(() => { })}>
                <div className="btn-content"><span className="btn-text">تحديث 🔁</span></div>
              </button>
              <button className="ultimate-btn ultimate-btn-warning" onClick={() => { setWrapMode(false); resetToDefaults() }} title="استعادة الإعدادات الافتراضية">
                <div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div>
              </button>
            </div>
            <div className="transactions-pagination">
              <button className="ultimate-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <div className="btn-content"><span className="btn-text">السابق</span></div>
              </button>
              <span>صفحة {page} من {Math.max(1, Math.ceil(totalCount / pageSize))}</span>
              <button className="ultimate-btn" onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize) || 1, p + 1))} disabled={page >= Math.ceil(totalCount / pageSize)}>
                <div className="btn-content"><span className="btn-text">التالي</span></div>
              </button>
              <select className="filter-select" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value) || 50); setPage(1) }}>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* Error State */}
          {queryError && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              border: '1px solid #fecaca',
            }}>
              خطأ: {String((queryError as Error)?.message || 'فشل تحميل البيانات')}
            </div>
          )}

          {/* Data Table */}
          <ResizableTable
            columns={columns}
            data={tableData as any}
            onColumnResize={handleColumnResize as any}
            className={`transactions-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
            isLoading={loading}
            emptyMessage="لا توجد حركات"
            getRowId={(row) => (row as any).id}
            onRowClick={(row: any) => {
              if (row.transaction_id) {
                navigate(`/transactions/${row.transaction_id}`)
              }
            }}
            renderCell={(value, column, _row: any) => {
              if (column.key === 'debit' || column.key === 'credit') {
                const num = Number(value) || 0
                if (num === 0) return <span style={{ color: '#9ca3af' }}>—</span>
                return <span style={{ fontWeight: 600 }}>{formatCurrency(num)}</span>
              }
              if (column.key === 'running_balance') {
                const num = Number(value) || 0
                const isNegative = num < 0
                return (
                  <span style={{
                    fontWeight: 700,
                    color: isNegative ? '#ef4444' : '#10b981',
                    backgroundColor: isNegative ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                  }}>
                    {formatCurrency(num)}
                  </span>
                )
              }
              return undefined
            }}
          />
        </div>
      )}

      {/* Enhanced Export Modal */}
      {enhancedExportOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          direction: 'rtl',
        }}>
          <div style={{
            backgroundColor: 'var(--surface, #111827)',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            border: '1px solid var(--border-color, #374151)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text, #f3f4f6)' }}>
              تصدير متقدم مع الملخص
            </h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--muted_text, #9ca3af)', marginBottom: '1rem' }}>
                اختر صيغة التصدير المطلوبة. سيتم تضمين ملخص البيانات التالية:
              </p>
              <ul style={{ color: 'var(--muted_text, #9ca3af)', paddingRight: '1.5rem' }}>
                <li>الرصيد الافتتاحي</li>
                <li>إجمالي المدين والدائن</li>
                <li>صافي التغيير</li>
                <li>الرصيد الختامي</li>
                <li>عدد الحركات</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                className="ultimate-btn ultimate-btn-edit"
                onClick={async () => {
                  try {
                    await exportRunningBalanceWithSummaryPDF(exportData, summary, {
                      title: reportTitle,
                      subtitle: exportSubtitle,
                      rtlLayout: true,
                      useArabicNumerals: true,
                      orientation: 'landscape'
                    })
                    setEnhancedExportOpen(false)
                  } catch (error) {
                    console.error('Export error:', error)
                  }
                }}
              >
                <div className="btn-content"><span className="btn-text">📄 PDF</span></div>
              </button>

              <button
                className="ultimate-btn ultimate-btn-edit"
                onClick={async () => {
                  try {
                    await exportRunningBalanceWithSummaryExcel(exportData, summary, {
                      title: reportTitle,
                      subtitle: exportSubtitle,
                      rtlLayout: true,
                      useArabicNumerals: true,
                      orientation: 'landscape'
                    })
                    setEnhancedExportOpen(false)
                  } catch (error) {
                    console.error('Export error:', error)
                  }
                }}
              >
                <div className="btn-content"><span className="btn-text">📊 Excel</span></div>
              </button>

              <button
                className="ultimate-btn ultimate-btn-edit"
                onClick={async () => {
                  try {
                    await exportRunningBalanceWithSummaryCSV(exportData, summary, {
                      title: reportTitle,
                      subtitle: exportSubtitle,
                      rtlLayout: true,
                      useArabicNumerals: true,
                      orientation: 'landscape'
                    })
                    setEnhancedExportOpen(false)
                  } catch (error) {
                    console.error('Export error:', error)
                  }
                }}
              >
                <div className="btn-content"><span className="btn-text">📋 CSV</span></div>
              </button>
            </div>

            <button
              className="ultimate-btn ultimate-btn-neutral"
              onClick={() => setEnhancedExportOpen(false)}
              style={{ width: '100%' }}
            >
              <div className="btn-content"><span className="btn-text">إغلاق</span></div>
            </button>
          </div>
        </div>
      )}

      {/* Column Configuration Modal */}
      <ColumnConfiguration
        columns={columns}
        onConfigChange={handleColumnConfigChange}
        isOpen={columnsConfigOpen}
        onClose={() => setColumnsConfigOpen(false)}
        onReset={resetToDefaults}
        sampleData={tableData as any}
      />
    </div>
  )
}

export default RunningBalanceEnrichedPage
