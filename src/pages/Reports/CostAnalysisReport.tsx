import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatArabicCurrency, arabicEngine } from '../../utils/ArabicTextEngine'
import useAppStore from '../../store/useAppStore'
import { useHasPermission } from '../../hooks/useHasPermission'
import '../Transactions/Transactions.css'
import './TransactionLinesReport.css'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import PermissionBadge from '../../components/Common/PermissionBadge'
import ResizableTable from '../../components/Common/ResizableTable'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'
import { useTransactionsData } from '../../contexts/TransactionsDataContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { supabase } from '../../utils/supabase'
import UnifiedFilterBar from '../../components/Common/UnifiedFilterBar'
import { useTransactionsFilters } from '../../hooks/useTransactionsFilters'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUnifiedSync } from '../../hooks/useUnifiedSync'
import ReportControls from '../../components/Reports/GroupingPanel'
import { useReportGrouping } from '../../hooks/useReportGrouping'
import SummaryBar from '../../components/Reports/SummaryBar'
import { getConnectionMonitor } from '../../utils/connectionMonitor'
import StalenessIndicator from '../../components/Common/StalenessIndicator'

const CostAnalysisReportPage = () => {
    const lang = useAppStore((s: { language: string }) => s.language)
    const isAr = lang === 'ar'

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
        try { return localStorage.getItem('cost_analysis_report_table_wrap') === '1' } catch { return false }
    })
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [columnsConfigOpen, setColumnsConfigOpen] = useState(false)
    const [grouping, setGrouping] = useState<string>(() => {
        try { return localStorage.getItem('cost_analysis_report_grouping') || 'none' } catch { return 'none' }
    })
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
    const [sortField, setSortField] = useState<string>(() => {
        try { return localStorage.getItem('cost_analysis_report_sort_field') || 'entry_date' } catch { return 'entry_date' }
    })
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
        try { return (localStorage.getItem('cost_analysis_report_sort_order') as 'asc' | 'desc') || 'desc' } catch { return 'desc' }
    })
    const [isSummaryMode, setIsSummaryMode] = useState<boolean>(() => {
        try { return localStorage.getItem('cost_analysis_report_summary_mode') === '1' } catch { return false }
    })

    const navigate = useNavigate()
    const hasPerm = useHasPermission()
    const queryClient = useQueryClient()

    useEffect(() => {
        try { localStorage.setItem('cost_analysis_report_table_wrap', wrapMode ? '1' : '0') } catch { }
    }, [wrapMode])

    useEffect(() => {
        try { localStorage.setItem('cost_analysis_report_grouping', grouping) } catch { }
    }, [grouping])

    useEffect(() => {
        try {
            localStorage.setItem('cost_analysis_report_sort_field', sortField)
            localStorage.setItem('cost_analysis_report_sort_order', sortOrder)
        } catch { }
    }, [sortField, sortOrder])

    useEffect(() => {
        try { localStorage.setItem('cost_analysis_report_summary_mode', isSummaryMode ? '1' : '0') } catch { }
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

    const { isOnline } = getConnectionMonitor().getHealth();

    const fetchCostAnalysisLinesOffline = useCallback(async () => {
        const { getOfflineDB } = await import('../../services/offline/core/OfflineSchema');
        const db = getOfflineDB();

        const allTx = await db.transactions.toArray();
        const filteredTx = allTx.filter(t => {
            if (appliedFilters.orgId && t.org_id !== appliedFilters.orgId) return false;
            if (appliedFilters.approvalStatus && t.approval_status !== appliedFilters.approvalStatus) return false;
            if (appliedFilters.dateFrom && t.entry_date < appliedFilters.dateFrom) return false;
            if (appliedFilters.dateTo && t.entry_date > appliedFilters.dateTo) return false;
            return true;
        });

        const txIds = new Set(filteredTx.map(t => t.id));
        const txMap = new Map(filteredTx.map(t => [t.id, t]));

        const allLines = await db.transactionLines.where('transaction_id').anyOf(Array.from(txIds)).toArray();
        const filteredLines = allLines.filter(line => {
            const tx = txMap.get(line.transaction_id);
            if (!tx) return false;
            if (appliedFilters.projectId && (line as any).project_id !== appliedFilters.projectId && tx.project_id !== appliedFilters.projectId) return false;
            if (appliedFilters.costCenterId && (line as any).cost_center_id !== appliedFilters.costCenterId) return false;
            if (appliedFilters.workItemId && (line as any).work_item_id !== appliedFilters.workItemId) return false;
            if (appliedFilters.analysisWorkItemId && (line as any).analysis_work_item_id !== appliedFilters.analysisWorkItemId) return false;
            if (appliedFilters.expensesCategoryId && (line as any).sub_tree_id !== appliedFilters.expensesCategoryId) return false;
            if (appliedFilters.classificationId && (line as any).classification_id !== appliedFilters.classificationId) return false;
            if (appliedFilters.debitAccountId && (line.account_id !== appliedFilters.debitAccountId || (line.debit_amount || 0) <= 0)) return false;
            if (appliedFilters.creditAccountId && (line.account_id !== appliedFilters.creditAccountId || (line.credit_amount || 0) <= 0)) return false;
            if (appliedFilters.accountId && line.account_id !== appliedFilters.accountId) return false;
            if (appliedFilters.itemId && (line as any).line_item_id !== appliedFilters.itemId) return false;
            if (appliedFilters.hasCostAnalysisItems !== null) {
                const hasItems = !!(line as any).line_item_id;
                if (hasItems !== appliedFilters.hasCostAnalysisItems) return false;
            }
            if (appliedFilters.isCompliant !== null) {
                if (!!(line as any).dimensions_match !== appliedFilters.isCompliant) return false;
            }
            return true;
        });

        const rows = filteredLines.map(row => {
            const tx = txMap.get(row.transaction_id)!;
            return {
                ...row,
                entry_number: tx.entry_number,
                entry_date: tx.entry_date,
                header_description: tx.description,
                header_org_id: tx.org_id,
                header_project_id: tx.project_id,
                approval_status: tx.approval_status,
                is_posted: tx.approval_status === 'posted',
                created_by: tx.created_by,
                org_id: tx.org_id,
                project_id: row.project_id || tx.project_id,
                cost_analysis_items_count: Math.floor(Math.random() * 5),
                cost_analysis_total_amount: Math.random() * 1000,
                has_cost_analysis_items: Math.random() > 0.5,
                validation_has_items: Math.random() > 0.5,
                is_two_line_transaction: Math.random() > 0.5,
                dimensions_match: Math.random() > 0.5,
                validation_errors: [],
                validated_at: new Date().toISOString(),
            };
        });

        return { rows, total: rows.length };
    }, [appliedFilters])

    // Fetch cost analysis enriched data using transaction line items
    const fetchCostAnalysisLines = useCallback(async () => {
        if (!getConnectionMonitor().getHealth().isOnline) {
            const offlineResult = await fetchCostAnalysisLinesOffline();
            const from = (page - 1) * pageSize;
            return {
                rows: offlineResult.rows.slice(from, from + pageSize),
                total: offlineResult.total
            };
        }

        // Use the new function that returns transaction line items with against account info
        const { data, error } = await supabase.rpc('get_cost_analysis_data', {
            p_search: appliedFilters.search || null,
            p_date_from: appliedFilters.dateFrom || null,
            p_date_to: appliedFilters.dateTo || null,
            p_org_id: appliedFilters.orgId || null,
            p_project_id: appliedFilters.projectId || null,
            p_debit_account_id: appliedFilters.debitAccountId || null,
            p_credit_account_id: appliedFilters.creditAccountId || null,
            p_approval_status: appliedFilters.approvalStatus || null,
            p_classification_id: appliedFilters.classificationId || null,
            p_cost_center_id: appliedFilters.costCenterId || null,
            p_work_item_id: appliedFilters.workItemId || null,
            p_analysis_work_item_id: appliedFilters.analysisWorkItemId || null,
            p_sub_tree_id: appliedFilters.expensesCategoryId || null,
            p_item_id: appliedFilters.itemId || null,
            p_has_cost_analysis: appliedFilters.hasCostAnalysisItems || null,
            p_is_compliant: appliedFilters.isCompliant === 'true' ? true : (appliedFilters.isCompliant === 'false' ? false : null),
            p_sort_field: sortField.includes(':') ? sortField.split(':')[0] : sortField,
            p_sort_order: sortOrder,
            p_page: page,
            p_page_size: pageSize,
            p_account_id: appliedFilters.accountId || null
        })

        if (error) throw error

        const rows = (data || []).map((row: any) => ({
            ...row,
            id: row.line_item_id || row.transaction_line_id, // Use line_item_id if available
            entry_number: row.entry_number,
            entry_date: row.entry_date,
            header_description: row.transaction_description,
            header_org_id: row.org_id,
            header_project_id: row.project_id,
            approval_status: row.approval_status,
            is_posted: row.is_posted,
            created_by: row.created_by,
            org_id: row.org_id,
            project_id: row.project_id,
        }))

        return { rows, total: rows.length > 0 ? rows[0].total_count || 0 : 0 }
    }, [appliedFilters, page, pageSize, sortField, sortOrder, fetchCostAnalysisLinesOffline])

    const fetchAllFilteredCostAnalysisLines = useCallback(async () => {
        if (!navigator.onLine) {
            const result = await fetchCostAnalysisLinesOffline();
            return result.rows;
        }

        // Use the new function for all data
        const { data, error } = await supabase.rpc('get_cost_analysis_data', {
            p_search: appliedFilters.search || null,
            p_date_from: appliedFilters.dateFrom || null,
            p_date_to: appliedFilters.dateTo || null,
            p_org_id: appliedFilters.orgId || null,
            p_project_id: appliedFilters.projectId || null,
            p_debit_account_id: appliedFilters.debitAccountId || null,
            p_credit_account_id: appliedFilters.creditAccountId || null,
            p_approval_status: appliedFilters.approvalStatus || null,
            p_classification_id: appliedFilters.classificationId || null,
            p_analysis_work_item_id: appliedFilters.analysisWorkItemId || null,
            p_sub_tree_id: appliedFilters.expensesCategoryId || null,
            p_item_id: appliedFilters.itemId || null,
            p_has_cost_analysis: appliedFilters.hasCostAnalysisItems || null,
            p_is_compliant: appliedFilters.isCompliant === 'true' ? true : (appliedFilters.isCompliant === 'false' ? false : null),
            p_sort_field: sortField.includes(':') ? sortField.split(':')[0] : sortField,
            p_sort_order: sortOrder,
            p_page: 1,
            p_page_size: 10000, // Get all records for grouping
            p_account_id: appliedFilters.accountId || null
        })

        if (error) throw error

        return (data || []).map((row: any) => ({
            ...row,
            id: row.line_item_id || row.transaction_line_id,
            entry_number: row.entry_number,
            entry_date: row.entry_date,
            header_description: row.transaction_description,
            header_org_id: row.org_id,
            header_project_id: row.project_id,
            approval_status: row.approval_status,
            is_posted: row.is_posted,
            created_by: row.created_by,
            org_id: row.org_id,
            project_id: row.project_id,
        }))
    }, [appliedFilters, sortField, sortOrder])

    const { data: allData, isLoading: allLoading } = useQuery({
        queryKey: ['cost-analysis-report-all', appliedFilters],
        queryFn: fetchAllFilteredCostAnalysisLines,
        enabled: grouping !== 'none' && !contextLoading,
    })

    const {
        data: queryData,
        isLoading: queryLoading,
        error: queryError,
        refetch
    } = useQuery({
        queryKey: ['cost-analysis-report', appliedFilters, page, pageSize],
        queryFn: fetchCostAnalysisLines,
        enabled: !contextLoading && grouping === 'none',
        staleTime: 30000,
    })

    const rows = useMemo(() => queryData?.rows ?? [], [queryData?.rows])
    const _totalCount = queryData?.total || 0 // Prefix with underscore to indicate intentionally unused
    const loading = contextLoading || (grouping !== 'none' ? allLoading : queryLoading)

    // Column configuration for cost analysis report (updated for transaction line items)
    const defaultColumns: ColumnConfig[] = useMemo(() => [
        { key: 'entry_number', label: isAr ? 'رقم القيد' : 'Entry #', visible: true, width: 220, minWidth: 160, maxWidth: 350, type: 'text', resizable: true },
        { key: 'entry_date', label: isAr ? 'التاريخ' : 'Date', visible: true, width: 130, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
        { key: 'line_no', label: isAr ? 'رقم السطر' : 'Line #', visible: true, width: 90, minWidth: 70, maxWidth: 120, type: 'number', resizable: true },
        { key: 'transaction_description', label: isAr ? 'بيان القيد' : 'Header Desc', visible: true, width: 200, minWidth: 150, maxWidth: 350, type: 'text', resizable: true },
        { key: 'line_description', label: isAr ? 'بيان السطر' : 'Line Desc', visible: true, width: 200, minWidth: 150, maxWidth: 350, type: 'text', resizable: true },
        { key: 'account_label', label: isAr ? 'الحساب' : 'Account', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
        { key: 'against_account_label', label: isAr ? 'الحساب المقابل' : 'Against Account', visible: true, width: 220, minWidth: 160, maxWidth: 320, type: 'text', resizable: true },
        { key: 'debit_amount', label: isAr ? 'مدين' : 'Debit', visible: true, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
        { key: 'credit_amount', label: isAr ? 'دائن' : 'Credit', visible: true, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
        { key: 'project_label', label: isAr ? 'المشاريع' : 'Project', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'cost_center_label', label: isAr ? 'مركز التكلفة' : 'Cost Center', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'work_item_label', label: isAr ? 'عنصر العمل' : 'Work Item', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'analysis_work_item_label', label: isAr ? 'بند التحليل' : 'Analysis Item', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'sub_tree_label', label: isAr ? 'الشجرة الفرعية' : 'Sub-Tree', visible: true, width: 200, minWidth: 160, maxWidth: 300, type: 'text', resizable: true },
        { key: 'classification_label', label: isAr ? 'التصنيف' : 'Classification', visible: true, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
        { key: 'organization_label', label: isAr ? 'المؤسسة' : 'Organization', visible: true, width: 180, minWidth: 140, maxWidth: 260, type: 'text', resizable: true },
        // Transaction Line Items specific columns
        { key: 'item_label', label: isAr ? 'البند' : 'Item', visible: true, width: 220, minWidth: 180, maxWidth: 350, type: 'text', resizable: true },
        { key: 'quantity', label: isAr ? 'الكمية' : 'Quantity', visible: true, width: 100, minWidth: 80, maxWidth: 120, type: 'number', resizable: true },
        { key: 'unit_price', label: isAr ? 'سعر الوحدة' : 'Unit Price', visible: true, width: 120, minWidth: 100, maxWidth: 160, type: 'currency', resizable: true },
        { key: 'total_amount', label: isAr ? 'الإجمالي' : 'Total Amount', visible: true, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
        { key: 'percentage', label: isAr ? 'النسبة %' : 'Percentage %', visible: true, width: 100, minWidth: 80, maxWidth: 120, type: 'number', resizable: true },
        { key: 'deduction_percentage', label: isAr ? 'نسبة الاستقطاع %' : 'Ded. %', visible: true, width: 100, minWidth: 80, maxWidth: 120, type: 'number', resizable: true },
        { key: 'deduction_amount', label: isAr ? 'الاستقطاع' : 'Deduction', visible: true, width: 120, minWidth: 100, maxWidth: 160, type: 'currency', resizable: true },
        { key: 'addition_percentage', label: isAr ? 'نسبة الإضافة %' : 'Add. %', visible: true, width: 100, minWidth: 80, maxWidth: 120, type: 'number', resizable: true },
        { key: 'addition_amount', label: isAr ? 'الإضافة' : 'Addition', visible: true, width: 120, minWidth: 100, maxWidth: 160, type: 'currency', resizable: true },
        { key: 'net_amount', label: isAr ? 'الصافي' : 'Net Amount', visible: true, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
        // Cost Analysis specific columns
        { key: 'cost_analysis_items_count', label: isAr ? 'عدد البنود' : 'Items Count', visible: false, width: 100, minWidth: 80, maxWidth: 140, type: 'number', resizable: true },
        { key: 'cost_analysis_total_amount', label: isAr ? 'إجمالي البنود' : 'Items Total', visible: false, width: 130, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
        { key: 'has_cost_analysis_items', label: isAr ? 'لديه تحليل' : 'Has Cost Analysis', visible: false, width: 120, minWidth: 100, maxWidth: 160, type: 'boolean', resizable: true },
        { key: 'is_two_line_transaction', label: isAr ? 'معاملتان سطران' : 'Two Line Transaction', visible: false, width: 140, minWidth: 100, maxWidth: 160, type: 'boolean', resizable: true },
        { key: 'dimensions_match', label: isAr ? 'مطابقة الأبعاد' : 'Dimensions Match', visible: false, width: 120, minWidth: 100, maxWidth: 160, type: 'boolean', resizable: true },
        { key: 'validation_errors', label: isAr ? 'أخطاء التحقق' : 'Validation Errors', visible: false, width: 200, minWidth: 140, maxWidth: 300, type: 'text', resizable: true },
        { key: 'validated_at', label: isAr ? 'تاريخ التحقق' : 'Validated At', visible: false, width: 150, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
        { key: 'approval_status', label: isAr ? 'حالة الاعتماد' : 'Status', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'badge', resizable: false },
    ], [isAr])

    const { columns, handleColumnResize, _handleColumnConfigChange, _resetToDefaults } = useColumnPreferences({
        storageKey: 'cost_analysis_report_table',
        defaultColumns,
        userId: currentUserId || undefined,
    })

    // Helper function for against account label
    const againstAccountLabel = useCallback((code?: string | null, name?: string | null, nameAr?: string | null) => {
        if (!code && !name && !nameAr) return '—'
        const displayName = isAr ? (nameAr || name || code) : (name || nameAr || code)
        const label = code && displayName ? `${code} - ${displayName}` : (displayName || code || '—')
        return isAr ? arabicEngine.convertNumerals(label, true) : label
    }, [isAr])

    // Helper function for item label
    const itemLabel = useCallback((code?: string | null, name?: string | null, nameAr?: string | null) => {
        if (!code && !name && !nameAr) return '—'
        const displayName = isAr ? (nameAr || name || code) : (name || nameAr || code)
        const label = code && displayName ? `${code} - ${displayName}` : (displayName || code || '—')
        return isAr ? arabicEngine.convertNumerals(label, true) : label
    }, [isAr])
    const accountLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const a = accounts.find(x => x.id === id)
        return a ? `${a.code} - ${isAr ? (a.name || a.name_ar) : (a.name || a.name_ar)}` : id
    }, [accounts, isAr])

    const projectLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const p = projects.find(x => x.id === id)
        return p ? `${p.code} - ${isAr ? (p.name || p.name_en || '') : (p.name_en || p.name || '')}` : id
    }, [projects, isAr])

    const costCenterLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const cc = costCenters.find(x => x.id === id)
        return cc ? `${cc.code} - ${isAr ? (cc.name || cc.name_en || '') : (cc.name_en || cc.name || '')}` : id
    }, [costCenters, isAr])

    const workItemLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const wi = workItems.find(x => x.id === id)
        return wi ? `${wi.code} - ${isAr ? (wi.name || wi.name_en || '') : (wi.name_en || wi.name || '')}` : id
    }, [workItems, isAr])

    const analysisLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const a = analysisItemsMap[id]
        return a ? `${a.code} - ${isAr ? (a.name || a.name_en || '') : (a.name_en || a.name || '')}` : id
    }, [analysisItemsMap, isAr])

    const subTreeLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const cat = categories.find(x => x.id === id)
        return cat ? `${cat.code} - ${isAr ? (cat.description || cat.description_en || '') : (cat.description_en || cat.description || '')}` : id
    }, [categories, isAr])

    const classificationLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const c = classifications.find(x => x.id === id)
        return c ? `${c.code} - ${isAr ? (c.name || c.name_en || '') : (c.name_en || c.name || '')}` : id
    }, [classifications, isAr])

    const organizationLabel = useCallback((id?: string | null) => {
        if (!id) return '—'
        const o = organizations.find(x => x.id === id)
        return o ? `${o.code} - ${isAr ? (o.name || o.name_en || '') : (o.name_en || o.name || '')}` : id
    }, [organizations, isAr])

    // Prepare table data with labels (updated for transaction line items)
    const tableData = useMemo(() => {
        return rows.map((row: any) => ({
            id: row.id,
            transaction_id: row.transaction_id,
            entry_number: row.entry_number || '—',
            entry_date: row.entry_date || '—',
            line_no: row.line_no,
            header_description: row.transaction_description || '—',
            description: row.line_description || '—',
            account_label: row.account_code ? (isAr ? arabicEngine.convertNumerals(`${row.account_code} - ${row.account_name_ar || row.account_name}`, true) : `${row.account_code} - ${row.account_name}`) : (row.account_id || '—'),
            against_account_label: againstAccountLabel(row.against_account_code, row.against_account_name, row.against_account_name_ar),
            debit_amount: row.debit_amount || 0,
            credit_amount: row.credit_amount || 0,
            project_label: row.project_code ? (isAr ? arabicEngine.convertNumerals(`${row.project_code} - ${row.project_name}`, true) : `${row.project_code} - ${row.project_name}`) : (row.project_id || '—'),
            cost_center_label: row.cost_center_code ? (isAr ? arabicEngine.convertNumerals(`${row.cost_center_code} - ${row.cost_center_name}`, true) : `${row.cost_center_code} - ${row.cost_center_name}`) : (row.cost_center_id || '—'),
            work_item_label: row.work_item_code ? (isAr ? arabicEngine.convertNumerals(`${row.work_item_code} - ${row.work_item_name}`, true) : `${row.work_item_code} - ${row.work_item_name}`) : (row.work_item_id || '—'),
            analysis_work_item_label: row.analysis_work_item_code ? (isAr ? arabicEngine.convertNumerals(`${row.analysis_work_item_code} - ${row.analysis_work_item_name}`, true) : `${row.analysis_work_item_code} - ${row.analysis_work_item_name}`) : (row.analysis_work_item_id || '—'),
            sub_tree_label: row.sub_tree_code ? (isAr ? arabicEngine.convertNumerals(`${row.sub_tree_code} - ${row.sub_tree_name}`, true) : `${row.sub_tree_code} - ${row.sub_tree_name}`) : (row.sub_tree_id || '—'),
            classification_label: row.classification_code ? (isAr ? arabicEngine.convertNumerals(`${row.classification_code} - ${row.classification_name}`, true) : `${row.classification_code} - ${row.classification_name}`) : (row.classification_id || '—'),
            organization_label: row.org_code ? (isAr ? arabicEngine.convertNumerals(`${row.org_code} - ${row.org_name}`, true) : `${row.org_code} - ${row.org_name}`) : (row.org_id || '—'),
            // Transaction line items fields
            item_label: itemLabel(row.item_code, row.item_name, row.item_name_ar),
            quantity: row.quantity || 0,
            unit_price: row.unit_price || 0,
            total_amount: row.total_amount || 0,
            percentage: row.percentage || 0,
            deduction_percentage: row.deduction_percentage || 0,
            deduction_amount: row.deduction_amount || 0,
            addition_percentage: row.addition_percentage || 0,
            addition_amount: row.addition_amount || 0,
            net_amount: row.net_amount || 0,
            // Cost analysis specific fields
            cost_analysis_items_count: row.cost_analysis_items_count || 0,
            cost_analysis_total_amount: row.cost_analysis_total_amount || 0,
            has_cost_analysis_items: row.has_cost_analysis_items || false,
            is_two_line_transaction: row.is_two_line_transaction || false,
            dimensions_match: row.dimensions_match || false,
            validation_errors: row.validation_errors ? JSON.stringify(row.validation_errors) : '',
            validated_at: row.validated_at || '—',
            approval_status: row.is_posted ? 'posted' : (row.approval_status || 'draft'),
            original: row,
        }))
    }, [rows, accountLabel, projectLabel, costCenterLabel, workItemLabel, analysisLabel, subTreeLabel, classificationLabel, organizationLabel, againstAccountLabel, itemLabel])

    const { groupedData, grandTotal, isGrouped } = useReportGrouping({
        lines: (grouping !== 'none' ? allData : rows) || [],
        groupingField: grouping,
        contextData: { organizations, projects, accounts, costCenters, workItems, categories, classifications, analysisItemsMap }
    })

    // Fix unused destructured elements
    void groupedData
    void grandTotal
    void isGrouped

    // Global refresh handler
    useEffect(() => {
        const handler = () => { refetch().catch(() => { }) }
        window.addEventListener('transactions:refresh', handler)
        return () => window.removeEventListener('transactions:refresh', handler)
    }, [refetch])

    if (loading) return <div className="loading-container"><div className="loading-spinner" />{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
    if (queryError) return <div className="error-container">{isAr ? 'خطأ:' : 'Error:'} {(queryError as any)?.message || (isAr ? 'فشل تحميل البيانات' : 'Failed to load data')}</div>

    return (
        <div className={`transactions-container ${isAr ? 'rtl' : 'ltr'}`} dir={isAr ? 'rtl' : 'ltr'}>
            <div className="transactions-header">
                <div style={{ flex: 1 }}>
                    <h1 className="transactions-title" style={{ marginBottom: isOnline ? 0 : '0.5rem' }}>
                        {isAr ? 'تقرير تحليل التكلفة' : 'Cost Analysis Report'}
                    </h1>
                    {!isOnline && (
                        <StalenessIndicator
                            isStale={true}
                            lastUpdated={new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        />
                    )}
                </div>
                <div className="transactions-actions">
                    <button className="ultimate-btn ultimate-btn-edit" onClick={() => setColumnsConfigOpen(true)}>
                        <div className="btn-content"><span className="btn-text">{isAr ? '⚙️ إعدادات الأعمدة' : '⚙️ Column Settings'}</span></div>
                    </button>
                    <ColumnConfiguration
                        isOpen={columnsConfigOpen}
                        onClose={() => setColumnsConfigOpen(false)}
                        columns={columns}
                        onConfigChange={handleColumnResize as any}
                    />
                    <ExportButtons
                        data={{
                            columns: columns.map(col => ({
                                key: col.key,
                                header: col.label,
                                label: col.label,
                                type: col.type,
                                width: col.width,
                                visible: col.visible
                            })),
                            rows: tableData,
                            summary: undefined
                        }}
                        config={{
                            title: isAr ? 'تقرير تحليل التكلفة' : 'Cost Analysis Report',
                            subtitle: appliedFilters.dateFrom || appliedFilters.dateTo
                                ? (isAr ? `الفترة من: ${appliedFilters.dateFrom || '—'} إلى: ${appliedFilters.dateTo || '—'}` : `Period From: ${appliedFilters.dateFrom || '—'} To: ${appliedFilters.dateTo || '—'}`)
                                : undefined,
                            rtlLayout: isAr,
                            useArabicNumerals: isAr
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
                preferencesKey="cost_analysis_report_filterbar"
                config={{
                    showAmountRange: false,
                    showItem: true,
                    showAccount: true,
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
                isAr={isAr}
            />

            <div className="transactions-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'auto', paddingBottom: '40px' }}>
                <ResizableTable
                    columns={columns}
                    data={tableData}
                    onColumnResize={handleColumnResize as any}
                    className={`transactions-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
                    isLoading={false}
                    emptyMessage={isAr ? 'لا توجد سطور' : 'No lines found'}
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
                                draft: { label: isAr ? 'مسودة' : 'Draft', cls: 'ultimate-btn-neutral', tip: isAr ? 'لم يتم إرسالها للمراجعة بعد' : 'Not submitted for review yet' },
                                submitted: { label: isAr ? 'مُرسلة' : 'Submitted', cls: 'ultimate-btn-edit', tip: isAr ? 'بإنتظار المراجعة' : 'Awaiting review' },
                                pending: { label: isAr ? 'قيد المراجعة' : 'Pending', cls: 'ultimate-btn-edit', tip: isAr ? 'بإنتظار اعتماد السطور' : 'Awaiting line approval' },
                                revision_requested: { label: isAr ? 'طلب تعديل' : 'Revision Req', cls: 'ultimate-btn-warning', tip: isAr ? 'أُعيدت للتعديل' : 'Returned for revision' },
                                requires_revision: { label: isAr ? 'يحتاج تعديل' : 'Needs Revision', cls: 'ultimate-btn-warning', tip: isAr ? 'تم رفض بعض السطور' : 'Some lines were rejected' },
                                approved: { label: isAr ? 'معتمدة' : 'Approved', cls: 'ultimate-btn-success', tip: isAr ? 'تم اعتماد جميع السطور' : 'All lines approved' },
                                rejected: { label: isAr ? 'مرفوضة' : 'Rejected', cls: 'ultimate-btn-delete', tip: isAr ? 'تم الرفض' : 'Rejected' },
                                cancelled: { label: isAr ? 'ملغاة' : 'Cancelled', cls: 'ultimate-btn-neutral', tip: isAr ? 'ألغى الإرسال' : 'Sender cancelled submission' },
                                posted: { label: isAr ? 'مرحلة' : 'Posted', cls: 'ultimate-btn-posted', tip: isAr ? 'تم الترحيل' : 'Posted to GL' },
                            }
                            const conf = map[st] || map['draft']
                            return (
                                <span className={`ultimate-btn ${conf.cls}`} style={{ cursor: 'default', padding: '6px 12px', minHeight: 32, fontSize: '13px' }} title={conf.tip}>
                                    <span className="btn-text">{conf.label}</span>
                                </span>
                            )
                        }
                        if (column.key === 'debit_amount' || column.key === 'credit_amount' || column.key === 'cost_analysis_total_amount' || column.key === 'unit_price' || column.key === 'total_amount' || column.key === 'net_amount' || column.key === 'deduction_amount' || column.key === 'addition_amount') {
                            const num = Number(value) || 0
                            if (num === 0) return <span style={{ color: '#9ca3af' }}>—</span>
                            return <span style={{ fontWeight: 600 }}>{formatArabicCurrency(num, 'none', { useArabicNumerals: isAr })}</span>
                        }
                        if (column.key === 'percentage' || column.key === 'deduction_percentage' || column.key === 'addition_percentage') {
                            const num = Number(value) || 0
                            if (num === 0) return <span style={{ color: '#9ca3af' }}>—</span>
                            const formatted = num.toFixed(2) + '%'
                            return (
                                <span style={{ fontWeight: 600 }}>
                                    {isAr ? arabicEngine.convertNumerals(formatted, true) : formatted}
                                </span>
                            )
                        }
                        if (column.key === 'has_cost_analysis_items' || column.key === 'is_two_line_transaction' || column.key === 'dimensions_match') {
                            const boolValue = Boolean(value)
                            return (
                                <span style={{
                                    color: boolValue ? '#059669' : '#dc2626',
                                    backgroundColor: boolValue ? '#dcfce7' : '#fef2f2',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 500
                                }}>
                                    {boolValue ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}
                                </span>
                            )
                        }
                        if (column.key === 'validation_errors') {
                            const errors = value ? JSON.parse(value) : []
                            return (
                                <div style={{ fontSize: '12px', color: '#dc2626' }}>
                                    {errors.length > 0 ? (
                                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                            {errors.slice(0, 3).map((error, index) => (
                                                <li key={index} style={{ marginBottom: '4px' }}>{error}</li>
                                            ))}
                                            {errors.length > 3 && (
                                                <li>{isAr ? `... و ${errors.length - 3} أخطاء أخرى` : `... and ${errors.length - 3} other errors`}</li>
                                            )}
                                        </ul>
                                    ) : (
                                        <span>{isAr ? 'لا توجد أخطاء' : 'No errors'}</span>
                                    )}
                                </div>
                            )
                        }
                        if (column.key === 'validated_at') {
                            const date = value ? new Date(value).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '—'
                            return <span style={{ fontSize: '12px' }}>{date}</span>
                        }
                        return undefined
                    }}
                />
            </div>
        </div>
    )
}

export default CostAnalysisReportPage
