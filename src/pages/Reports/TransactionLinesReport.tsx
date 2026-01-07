import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHasPermission } from '../../hooks/useHasPermission'
import '../Transactions/Transactions.css'
import './TransactionLinesReport.css'
import { useTransactionsData } from '../../contexts/TransactionsDataContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import PermissionBadge from '../../components/Common/PermissionBadge'
import ResizableTable from '../../components/Common/ResizableTable'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'
import { supabase } from '../../utils/supabase'
import UnifiedFilterBar from '../../components/Common/UnifiedFilterBar'
import { useTransactionsFilters } from '../../hooks/useTransactionsFilters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUnifiedSync } from '../../hooks/useUnifiedSync'
import ReportControls from '../../components/Reports/GroupingPanel'
import { useReportGrouping } from '../../hooks/useReportGrouping'
import SummaryBar from '../../components/Reports/SummaryBar'

const TransactionLinesReportPage = () => {
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

    const {
        headerFilters: unifiedFilters,
        headerAppliedFilters: appliedFilters,
        headerFiltersDirty: filtersDirty,
        updateHeaderFilter: updateFilter,
        applyHeaderFilters: handleApplyFilters,
        resetHeaderFilters: handleResetFilters,
    } = useTransactionsFilters()

    const [wrapMode, setWrapMode] = useState<boolean>(() => {
        try { return localStorage.getItem('transaction_lines_report_table_wrap') === '1' } catch { return false }
    })
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [columnsConfigOpen, setColumnsConfigOpen] = useState(false)
    const [grouping, setGrouping] = useState<string>(() => {
        try { return localStorage.getItem('transaction_lines_report_grouping') || 'none' } catch { return 'none' }
    })
    const [sortField, setSortField] = useState<string>(() => {
        try { return localStorage.getItem('transaction_lines_report_sort_field') || 'created_at' } catch { return 'created_at' }
    })
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        try { return (localStorage.getItem('transaction_lines_report_sort_order') as 'asc' | 'desc') || 'desc' } catch { return 'desc' }
    })
    const [isSummaryMode, setIsSummaryMode] = useState<boolean>(() => {
        try { return localStorage.getItem('transaction_lines_report_summary_mode') === '1' } catch { return false }
    })
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

    const toggleGroup = useCallback((groupKey: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))
    }, [])

    const navigate = useNavigate()
    const hasPerm = useHasPermission()
    const queryClient = useQueryClient()

    useEffect(() => {
        try { localStorage.setItem('transaction_lines_report_table_wrap', wrapMode ? '1' : '0') } catch { }
    }, [wrapMode])

    useEffect(() => {
        try { localStorage.setItem('transaction_lines_report_grouping', grouping) } catch { }
    }, [grouping])

    useEffect(() => {
        try {
            localStorage.setItem('transaction_lines_report_sort_field', sortField)
            localStorage.setItem('transaction_lines_report_sort_order', sortOrder)
        } catch { }
    }, [sortField, sortOrder])

    useEffect(() => {
        try { localStorage.setItem('transaction_lines_report_summary_mode', isSummaryMode ? '1' : '0') } catch { }
        // Clear expanded state when switching modes to apply defaults
        setExpandedGroups({})
    }, [isSummaryMode])

    const handleApplyFiltersWithPaging = useCallback(() => {
        handleApplyFilters()
        setPage(1)
    }, [handleApplyFilters])

    const handleResetFiltersWithPaging = useCallback(() => {
        handleResetFilters()
        setPage(1)
    }, [handleResetFilters])


    // Fetch ALL lines with transaction header data (no user filter)
    const fetchAllLines = useCallback(async () => {
        // Build query for ALL transaction lines
        let query = supabase
            .from('transaction_lines')
            .select(`
        id,
        transaction_id,
        line_no,
        account_id,
        debit_amount,
        credit_amount,
        description,
        project_id,
        cost_center_id,
        work_item_id,
        analysis_work_item_id,
        classification_id,
        sub_tree_id,
        created_at,
        transactions!inner (
          id,
          entry_number,
          entry_date,
          description,
          org_id,
          project_id,
          approval_status,
          is_posted,
          created_by
        )
      `, { count: 'exact' })

        // Apply filters using the joined transactions table
        if (appliedFilters.search) {
            query = query.or(`description.ilike.%${appliedFilters.search}%,transactions.description.ilike.%${appliedFilters.search}%,transactions.entry_number.ilike.%${appliedFilters.search}%`)
        }
        if (appliedFilters.dateFrom) {
            query = query.gte('transactions.entry_date', appliedFilters.dateFrom)
        }
        if (appliedFilters.dateTo) {
            query = query.lte('transactions.entry_date', appliedFilters.dateTo)
        }
        if (appliedFilters.orgId) {
            query = query.eq('transactions.org_id', appliedFilters.orgId)
        }
        if (appliedFilters.projectId) {
            query = query.eq('project_id', appliedFilters.projectId)
        }
        if (appliedFilters.debitAccountId) {
            query = query.eq('account_id', appliedFilters.debitAccountId).gt('debit_amount', 0)
        }
        if (appliedFilters.creditAccountId) {
            query = query.eq('account_id', appliedFilters.creditAccountId).gt('credit_amount', 0)
        }
        if (appliedFilters.approvalStatus) {
            query = query.eq('transactions.approval_status', appliedFilters.approvalStatus)
        }

        const [realSortField, referencedTable] = sortField.includes(':')
            ? sortField.split(':')
            : [sortField, undefined]

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to).order(realSortField, {
            ascending: sortOrder === 'asc',
            referencedTable
        })

        const { data, error, count } = await query

        if (error) {
            console.error('Error fetching all lines:', error)
            throw error
        }

        // Flatten the joined data
        const rows = (data || []).map((row: any) => {
            const tx = row.transactions || {}
            return {
                ...row,
                entry_number: tx.entry_number,
                entry_date: tx.entry_date,
                header_description: tx.description,
                header_org_id: tx.org_id,
                header_project_id: tx.project_id,
                approval_status: tx.approval_status,
                is_posted: tx.is_posted,
                created_by: tx.created_by,
                org_id: tx.org_id,
                project_id: row.project_id || tx.project_id,
            }
        })

        return { rows, total: count || 0 }
    }, [appliedFilters, page, pageSize])

    // Fetch ALL lines for grouping (when not using pagination in grouped mode)
    // Actually, the spec says "Support ~200 transactions/month (no performance optimization needed)", 
    // so we can fetch all filtered lines if grouping is active to calculate correct subtotals.
    const fetchAllFilteredLines = useCallback(async () => {
        let query = supabase
            .from('transaction_lines')
            .select(`
        id, transaction_id, line_no, account_id, debit_amount, credit_amount, description,
        project_id, cost_center_id, work_item_id, analysis_work_item_id, classification_id, sub_tree_id, created_at,
        transactions!inner (id, entry_number, entry_date, description, org_id, project_id, approval_status, is_posted, created_by)
      `)

        if (appliedFilters.search) {
            query = query.or(`description.ilike.%${appliedFilters.search}%,transactions.description.ilike.%${appliedFilters.search}%,transactions.entry_number.ilike.%${appliedFilters.search}%`)
        }
        if (appliedFilters.dateFrom) query = query.gte('transactions.entry_date', appliedFilters.dateFrom)
        if (appliedFilters.dateTo) query = query.lte('transactions.entry_date', appliedFilters.dateTo)
        if (appliedFilters.orgId) query = query.eq('transactions.org_id', appliedFilters.orgId)
        if (appliedFilters.projectId) query = query.eq('project_id', appliedFilters.projectId)
        if (appliedFilters.debitAccountId) query = query.eq('account_id', appliedFilters.debitAccountId).gt('debit_amount', 0)
        if (appliedFilters.creditAccountId) query = query.eq('account_id', appliedFilters.creditAccountId).gt('credit_amount', 0)
        const [realSortField, referencedTable] = sortField.includes(':')
            ? sortField.split(':')
            : [sortField, undefined]

        if (appliedFilters.approvalStatus) query = query.eq('transactions.approval_status', appliedFilters.approvalStatus)

        const { data, error } = await query.order(realSortField, {
            ascending: sortOrder === 'asc',
            referencedTable
        })
        if (error) throw error

        return (data || []).map((row: any) => ({
            ...row,
            entry_number: row.transactions?.entry_number,
            entry_date: row.transactions?.entry_date,
            header_description: row.transactions?.description,
            header_org_id: row.transactions?.org_id,
            header_project_id: row.transactions?.project_id,
            approval_status: row.transactions?.approval_status,
            is_posted: row.transactions?.is_posted,
            created_by: row.transactions?.created_by,
            org_id: row.transactions?.org_id,
            project_id: row.project_id || row.transactions?.project_id,
        }))
    }, [appliedFilters])

    const { data: allData, isLoading: allLoading } = useQuery({
        queryKey: ['transaction-lines-report-all', appliedFilters],
        queryFn: fetchAllFilteredLines,
        enabled: grouping !== 'none' && !contextLoading,
    })

    const {
        data: queryData,
        isLoading: queryLoading,
        error: queryError,
        refetch
    } = useQuery({
        queryKey: ['transaction-lines-report', appliedFilters, page, pageSize],
        queryFn: fetchAllLines,
        enabled: !contextLoading && grouping === 'none', // Only fetch paginated data if not grouped
        staleTime: 30000,
    })

    // Real-time sync
    useUnifiedSync({
        channelId: 'transaction-lines-report-sync',
        tables: ['transactions', 'transaction_lines'],
        onDataChange: () => {
            queryClient.invalidateQueries({ queryKey: ['transaction-lines-report'] })
            queryClient.invalidateQueries({ queryKey: ['transaction-lines-report-all'] })
        },
    })

    const rows = useMemo(() => queryData?.rows ?? [], [queryData?.rows])
    const totalCount = queryData?.total || 0
    const loading = contextLoading || (grouping !== 'none' ? allLoading : queryLoading)


    // Column configuration
    const defaultColumns: ColumnConfig[] = useMemo(() => [
        { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, minWidth: 100, maxWidth: 200, type: 'text', resizable: true },
        { key: 'entry_date', label: 'التاريخ', visible: true, width: 130, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
        { key: 'line_no', label: 'رقم السطر', visible: true, width: 90, minWidth: 70, maxWidth: 120, type: 'number', resizable: true },
        { key: 'header_description', label: 'بيان القيد', visible: true, width: 200, minWidth: 150, maxWidth: 350, type: 'text', resizable: true },
        { key: 'description', label: 'بيان السطر', visible: true, width: 200, minWidth: 150, maxWidth: 350, type: 'text', resizable: true },
        { key: 'account_label', label: 'الحساب', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
        { key: 'debit_amount', label: 'مدين', visible: true, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
        { key: 'credit_amount', label: 'دائن', visible: true, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
        { key: 'project_label', label: 'المشروع', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'cost_center_label', label: 'مركز التكلفة', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'work_item_label', label: 'عنصر العمل', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'analysis_work_item_label', label: 'بند التحليل', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'sub_tree_label', label: 'الشجرة الفرعية', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'classification_label', label: 'التصنيف', visible: false, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
        { key: 'organization_label', label: 'المؤسسة', visible: true, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
        { key: 'line_items_count', label: 'عدد البنود', visible: false, width: 100, minWidth: 80, maxWidth: 140, type: 'number', resizable: true },
        { key: 'line_items_total', label: 'إجمالي البنود', visible: false, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
        { key: 'approval_status', label: 'حالة الاعتماد', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'badge', resizable: false },
    ], [])

    const { columns, handleColumnResize, handleColumnConfigChange, resetToDefaults } = useColumnPreferences({
        storageKey: 'transaction_lines_report_table',
        defaultColumns,
        userId: currentUserId || undefined,
    })

    // Helper functions for label mapping
    const accountLabel = useCallback((id?: string | null) => {
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

    const subTreeLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const cat = categories.find(x => x.id === id)
        return cat ? `${cat.code} - ${cat.description}` : id
    }, [categories])

    const classificationLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const c = classifications.find(x => x.id === id)
        return c ? `${c.code} - ${c.name}` : id
    }, [classifications])

    const organizationLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const o = organizations.find(x => x.id === id)
        return o ? `${o.code} - ${o.name}` : id
    }, [organizations])


    // Prepare table data with labels
    const tableData = useMemo(() => {
        return rows.map((row: any) => ({
            id: row.id,
            transaction_id: row.transaction_id,
            entry_number: row.entry_number || '—',
            entry_date: row.entry_date || '—',
            line_no: row.line_no,
            header_description: row.header_description || '—',
            description: row.description || '—',
            account_label: accountLabel(row.account_id),
            debit_amount: row.debit_amount || 0,
            credit_amount: row.credit_amount || 0,
            project_label: projectLabel(row.project_id),
            cost_center_label: costCenterLabel(row.cost_center_id),
            work_item_label: workItemLabel(row.work_item_id),
            analysis_work_item_label: analysisLabel(row.analysis_work_item_id),
            sub_tree_label: subTreeLabel(row.sub_tree_id),
            classification_label: classificationLabel(row.classification_id),
            organization_label: organizationLabel(row.header_org_id),
            line_items_count: row.line_items_count || 0,
            line_items_total: row.line_items_total || 0,
            approval_status: row.is_posted ? 'posted' : (row.approval_status || 'draft'),
            original: row,
        }))
    }, [rows, accountLabel, projectLabel, costCenterLabel, workItemLabel, analysisLabel, subTreeLabel, classificationLabel, organizationLabel])

    const { groupedData, grandTotal, isGrouped } = useReportGrouping({
        lines: (grouping !== 'none' ? allData : rows) || [],
        groupingField: grouping,
        contextData: { organizations, projects, accounts, costCenters, workItems, categories, classifications, analysisItemsMap }
    })

    // Prepare table data with labels for grouped view
    const getTableDataForLines = useCallback((lines: any[]) => {
        return lines.map((row: any) => ({
            id: row.id,
            transaction_id: row.transaction_id,
            entry_number: row.entry_number || '—',
            entry_date: row.entry_date || '—',
            line_no: row.line_no,
            header_description: row.header_description || '—',
            description: row.description || '—',
            account_label: accountLabel(row.account_id),
            debit_amount: row.debit_amount || 0,
            credit_amount: row.credit_amount || 0,
            project_label: projectLabel(row.project_id),
            cost_center_label: costCenterLabel(row.cost_center_id),
            work_item_label: workItemLabel(row.work_item_id),
            analysis_work_item_label: analysisLabel(row.analysis_work_item_id),
            sub_tree_label: subTreeLabel(row.sub_tree_id),
            classification_label: classificationLabel(row.classification_id),
            organization_label: organizationLabel(row.header_org_id),
            line_items_count: row.line_items_count || 0,
            line_items_total: row.line_items_total || 0,
            approval_status: row.is_posted ? 'posted' : (row.approval_status || 'draft'),
            original: row,
        }))
    }, [accountLabel, projectLabel, costCenterLabel, workItemLabel, analysisLabel, subTreeLabel, classificationLabel, organizationLabel])

    // Export data
    const exportData = useMemo(() => {
        let visibleCols = (columns || []).filter(c => c.visible)

        if (isSummaryMode && isGrouped) {
            // In summary mode, we only want: Dimension Name, Debit, Credit, Balance
            const mapping: Record<string, string> = {
                org_id: 'organization_label',
                project_id: 'project_label',
                account_id: 'account_label',
                cost_center_id: 'cost_center_label',
                work_item_id: 'work_item_label',
                analysis_work_item_id: 'analysis_work_item_label',
                sub_tree_id: 'sub_tree_label',
                classification_id: 'classification_label',
            }
            const labelKey = mapping[grouping] || (grouping.includes('_id') ? grouping.replace('_id', '_label') : grouping)
            const primaryCol = columns.find(c => c.key === labelKey) || visibleCols[0]

            visibleCols = [
                { ...primaryCol, label: primaryCol.label },
                columns.find(c => c.key === 'debit_amount')!,
                columns.find(c => c.key === 'credit_amount')!,
            ].filter(Boolean)
        }

        const defs = visibleCols.map(col => ({
            key: col.key,
            header: col.label,
            type: (col.type === 'currency' ? 'currency' : col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text') as any,
        }))

        // Add calculated Balance column in Summary Mode
        if (isSummaryMode && isGrouped) {
            defs.push({ key: 'balance', header: 'الرصيد', type: 'currency' as any })
        }

        const finalExportRows: any[] = []

        if (isGrouped && groupedData) {
            groupedData.forEach(group => {
                if (isSummaryMode) {
                    // Professional Summary: One row per group
                    const summaryRow: any = {}
                    summaryRow[visibleCols[0].key] = group.groupName
                    summaryRow['debit_amount'] = group.subtotal.debit
                    summaryRow['credit_amount'] = group.subtotal.credit
                    summaryRow['balance'] = group.subtotal.balance
                    finalExportRows.push(summaryRow)
                } else {
                    // Standard Detailed Grouped Report
                    const headerRow: any = {}
                    visibleCols.forEach(col => {
                        if (col.key === visibleCols[0].key) headerRow[col.key] = `📂 ${group.groupName}`
                        else headerRow[col.key] = ''
                    })
                    headerRow._isGroupHeader = true
                    finalExportRows.push(headerRow)

                    const groupLines = getTableDataForLines(group.lines)
                    groupLines.forEach(line => {
                        const out: any = {}
                        visibleCols.forEach(col => { out[col.key] = (line as any)[col.key] })
                        finalExportRows.push(out)
                    })

                    const subtotalRow: any = {}
                    visibleCols.forEach(col => {
                        if (col.key === 'debit_amount') subtotalRow[col.key] = group.subtotal.debit
                        else if (col.key === 'credit_amount') subtotalRow[col.key] = group.subtotal.credit
                        else if (col.key === visibleCols[0].key) subtotalRow[col.key] = `إجمالي: ${group.groupName}`
                        else subtotalRow[col.key] = ''
                    })
                    subtotalRow._isSubtotal = true
                    finalExportRows.push(subtotalRow)
                    finalExportRows.push({}) // spacing
                }
            })

            // Add grand total
            const grandRow: any = {}
            if (isSummaryMode) {
                grandRow[visibleCols[0].key] = 'الإجمالي العام'
                grandRow['debit_amount'] = grandTotal.debit
                grandRow['credit_amount'] = grandTotal.credit
                grandRow['balance'] = grandTotal.balance
            } else {
                visibleCols.forEach(col => {
                    if (col.key === 'debit_amount') grandRow[col.key] = grandTotal.debit
                    else if (col.key === 'credit_amount') grandRow[col.key] = grandTotal.credit
                    else if (col.key === visibleCols[0].key) grandRow[col.key] = 'الإجمالي العام'
                    else grandRow[col.key] = ''
                })
            }
            grandRow._isGrandTotal = true
            finalExportRows.push(grandRow)
        } else {
            tableData.forEach((row: any) => {
                const out: any = {}
                visibleCols.forEach(col => { out[col.key] = row[col.key] })
                finalExportRows.push(out)
            })
        }

        return prepareTableData(createStandardColumns(defs as any), finalExportRows)
    }, [columns, isGrouped, groupedData, getTableDataForLines, isSummaryMode, grandTotal.debit, grandTotal.credit, grandTotal.balance, tableData, grouping])

    // Global refresh handler
    useEffect(() => {
        const handler = () => { refetch().catch(() => { }) }
        window.addEventListener('transactions:refresh', handler)
        return () => window.removeEventListener('transactions:refresh', handler)
    }, [refetch])

    if (loading) return <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
    if (queryError) return <div className="error-container">خطأ: {(queryError as any)?.message || 'فشل تحميل البيانات'}</div>

    return (
        <div className="transactions-container" dir="rtl">
            <div className="transactions-header">
                <h1 className="transactions-title">تقرير سطور المعاملات</h1>
                <div className="transactions-actions">
                    <button className="ultimate-btn ultimate-btn-edit" onClick={() => setColumnsConfigOpen(true)}>
                        <div className="btn-content"><span className="btn-text">⚙️ إعدادات الأعمدة</span></div>
                    </button>
                    <ExportButtons
                        data={exportData}
                        config={{
                            title: 'تقرير سطور المعاملات',
                            subtitle: appliedFilters.dateFrom || appliedFilters.dateTo
                                ? `الفترة من: ${appliedFilters.dateFrom || '—'} إلى: ${appliedFilters.dateTo || '—'}`
                                : undefined,
                            rtlLayout: true,
                            useArabicNumerals: true
                        }}
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
                preferencesKey="transaction_lines_report_filterbar"
                config={{
                    showAmountRange: false,
                }}
            />

            <ReportControls
                selectedGrouping={grouping}
                onGroupingChange={setGrouping}
                selectedSortField={sortField}
                onSortFieldChange={setSortField}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                isSummaryMode={isSummaryMode}
                onSummaryModeChange={setIsSummaryMode}
            />

            <div className="transactions-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'auto', paddingBottom: '40px' }}>
                {isGrouped && groupedData ? (
                    <div className="grouped-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {groupedData.map(group => {
                            const isExpanded = isSummaryMode
                                ? (expandedGroups[group.groupKey] === true)
                                : (expandedGroups[group.groupKey] !== false)
                            return (
                                <div key={group.groupKey} className="group-container" style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <div className="group-header"
                                        onClick={() => toggleGroup(group.groupKey)}
                                        style={{
                                            padding: '16px 20px',
                                            backgroundColor: '#f9fafb',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '18px' }}>{isExpanded ? '▼' : '▶'}</span>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>{group.groupName}</h3>
                                            <span style={{ fontSize: '13px', color: '#6b7280', backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '12px' }}>
                                                {group.lines.length} سطر
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px', fontWeight: 500 }}>
                                            <span style={{ color: '#374151' }}>مدين: {group.subtotal.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                                            <span style={{ color: '#374151' }}>دائن: {group.subtotal.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                                            <span style={{ color: group.subtotal.balance >= 0 ? '#059669' : '#dc2626' }}>
                                                الرصيد: {group.subtotal.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="group-content">
                                            <ResizableTable
                                                columns={columns}
                                                data={getTableDataForLines(group.lines) as any}
                                                onColumnResize={handleColumnResize as any}
                                                className={`transactions-resizable-table ${wrapMode ? 'wrap' : 'nowrap'} grouped-table`}
                                                isLoading={false}
                                                emptyMessage="لا توجد سطور"
                                                getRowId={(row) => (row as any).id}
                                                onRowClick={(row: any) => {
                                                    if (row.transaction_id) {
                                                        navigate(`/transactions/${row.transaction_id}`)
                                                    }
                                                }}
                                                renderCell={(value, column, row: any) => {
                                                    if (column.key === 'approval_status') {
                                                        const st = row.original?.is_posted ? 'posted' : (row.approval_status || 'draft')
                                                        const map: Record<string, { label: string; cls: string; tip: string }> = {
                                                            draft: { label: 'مسودة', cls: 'ultimate-btn-neutral', tip: 'لم يتم إرسالها للمراجعة بعد' },
                                                            submitted: { label: 'مُرسلة', cls: 'ultimate-btn-edit', tip: 'بإنتظار المراجعة' },
                                                            pending: { label: 'قيد المراجعة', cls: 'ultimate-btn-edit', tip: 'بإنتظار اعتماد السطور' },
                                                            revision_requested: { label: 'طلب تعديل', cls: 'ultimate-btn-warning', tip: 'أُعيدت للتعديل' },
                                                            requires_revision: { label: 'يحتاج تعديل', cls: 'ultimate-btn-warning', tip: 'تم رفض بعض السطور' },
                                                            approved: { label: 'معتمدة', cls: 'ultimate-btn-success', tip: 'تم اعتماد جميع السطور' },
                                                            rejected: { label: 'مرفوضة', cls: 'ultimate-btn-delete', tip: 'تم الرفض' },
                                                            cancelled: { label: 'ملغاة', cls: 'ultimate-btn-neutral', tip: 'ألغى المُرسل الإرسال' },
                                                            posted: { label: 'مرحلة', cls: 'ultimate-btn-posted', tip: 'تم الترحيل' },
                                                        }
                                                        const conf = map[st] || map['draft']
                                                        return (
                                                            <span className={`ultimate-btn ${conf.cls}`} style={{ cursor: 'default', padding: '6px 12px', minHeight: 32, fontSize: '13px' }} title={conf.tip}>
                                                                <span className="btn-text">{conf.label}</span>
                                                            </span>
                                                        )
                                                    }
                                                    if (column.key === 'debit_amount' || column.key === 'credit_amount' || column.key === 'line_items_total') {
                                                        const num = Number(value) || 0
                                                        if (num === 0) return <span style={{ color: '#9ca3af' }}>—</span>
                                                        return <span style={{ fontWeight: 600 }}>{num.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                                                    }
                                                    return undefined
                                                }}
                                            />
                                            <div className="group-footer" style={{
                                                padding: '12px 20px',
                                                backgroundColor: '#fdfdfd',
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                gap: '24px',
                                                borderTop: '1px solid #e5e7eb',
                                                fontSize: '14px',
                                                fontWeight: 600
                                            }}>
                                                <span>إجمالي {group.groupName}:</span>
                                                <span>مدين: {group.subtotal.debit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                                                <span>دائن: {group.subtotal.credit.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                                                <span style={{ color: group.subtotal.balance >= 0 ? '#059669' : '#dc2626' }}>
                                                    الرصيد: {group.subtotal.balance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <>
                        <div className="transactions-tablebar">
                            <div className="transactions-toolbar">
                                <span className="transactions-count">عدد السطور: {totalCount}</span>
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
                            data={tableData as any}
                            onColumnResize={handleColumnResize as any}
                            className={`transactions-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
                            isLoading={loading}
                            emptyMessage="لا توجد سطور"
                            getRowId={(row) => (row as any).id}
                            onRowClick={(row: any) => {
                                if (row.transaction_id) {
                                    navigate(`/transactions/${row.transaction_id}`)
                                }
                            }}
                            renderCell={(value, column, row: any) => {
                                if (column.key === 'approval_status') {
                                    const st = row.original?.is_posted ? 'posted' : (row.approval_status || 'draft')
                                    const map: Record<string, { label: string; cls: string; tip: string }> = {
                                        draft: { label: 'مسودة', cls: 'ultimate-btn-neutral', tip: 'لم يتم إرسالها للمراجعة بعد' },
                                        submitted: { label: 'مُرسلة', cls: 'ultimate-btn-edit', tip: 'بإنتظار المراجعة' },
                                        pending: { label: 'قيد المراجعة', cls: 'ultimate-btn-edit', tip: 'بإنتظار اعتماد السطور' },
                                        revision_requested: { label: 'طلب تعديل', cls: 'ultimate-btn-warning', tip: 'أُعيدت للتعديل' },
                                        requires_revision: { label: 'يحتاج تعديل', cls: 'ultimate-btn-warning', tip: 'تم رفض بعض السطور' },
                                        approved: { label: 'معتمدة', cls: 'ultimate-btn-success', tip: 'تم اعتماد جميع السطور' },
                                        rejected: { label: 'مرفوضة', cls: 'ultimate-btn-delete', tip: 'تم الرفض' },
                                        cancelled: { label: 'ملغاة', cls: 'ultimate-btn-neutral', tip: 'ألغى المُرسل الإرسال' },
                                        posted: { label: 'مرحلة', cls: 'ultimate-btn-posted', tip: 'تم الترحيل' },
                                    }
                                    const conf = map[st] || map['draft']
                                    return (
                                        <span className={`ultimate-btn ${conf.cls}`} style={{ cursor: 'default', padding: '6px 12px', minHeight: 32, fontSize: '13px' }} title={conf.tip}>
                                            <span className="btn-text">{conf.label}</span>
                                        </span>
                                    )
                                }
                                if (column.key === 'debit_amount' || column.key === 'credit_amount' || column.key === 'line_items_total') {
                                    const num = Number(value) || 0
                                    if (num === 0) return <span style={{ color: '#9ca3af' }}>—</span>
                                    return <span style={{ fontWeight: 600 }}>{num.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span>
                                }
                                return undefined
                            }}
                        />
                    </>
                )}

                <SummaryBar
                    debit={grandTotal.debit}
                    credit={grandTotal.credit}
                    balance={grandTotal.balance}
                    count={grandTotal.count}
                />
            </div>

            {/* Column Configuration Modal */}
            <ColumnConfiguration
                columns={columns}
                onConfigChange={handleColumnConfigChange}
                isOpen={columnsConfigOpen}
                onClose={() => setColumnsConfigOpen(false)}
                onReset={resetToDefaults}
                sampleData={tableData as any}
            />

            {/* Permissions diagnostic (hidden) */}
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

export default TransactionLinesReportPage
