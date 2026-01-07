interface ReportControlsProps {
    selectedGrouping: string
    onGroupingChange: (grouping: string) => void
    selectedSortField: string
    onSortFieldChange: (field: string) => void
    sortOrder: 'asc' | 'desc'
    onSortOrderChange: (order: 'asc' | 'desc') => void
    isSummaryMode?: boolean
    onSummaryModeChange?: (mode: boolean) => void
}

const groupingOptions = [
    { value: 'none', label: 'لا يوجد', labelEn: 'None' },
    { value: 'org_id', label: 'المؤسسة', labelEn: 'Organization' },
    { value: 'project_id', label: 'المشروع', labelEn: 'Project' },
    { value: 'account_id', label: 'الحساب', labelEn: 'Account' },
    { value: 'cost_center_id', label: 'مركز التكلفة', labelEn: 'Cost Center' },
    { value: 'work_item_id', label: 'عنصر العمل', labelEn: 'Work Item' },
    { value: 'analysis_work_item_id', label: 'بند التحليل', labelEn: 'Analysis Work Item' },
    { value: 'classification_id', label: 'التصنيف', labelEn: 'Classification' },
    { value: 'sub_tree_id', label: 'الشجرة الفرعية', labelEn: 'Sub Tree (Category)' },
    { value: 'approval_status', label: 'حالة الاعتماد', labelEn: 'Approval Status' },
    { value: 'is_posted', label: 'حالة الترحيل', labelEn: 'Posted Status' },
    { value: 'date_monthly', label: 'التاريخ (شهري)', labelEn: 'Date - Monthly' },
    { value: 'date_weekly', label: 'التاريخ (أسبوعي)', labelEn: 'Date - Weekly' },
    { value: 'date_daily', label: 'التاريخ (يومي)', labelEn: 'Date - Daily' },
]

const sortOptions = [
    { value: 'created_at', label: 'تاريخ الإنشاء', labelEn: 'Creation Date' },
    { value: 'entry_date:transactions', label: 'التاريخ', labelEn: 'Date' },
    { value: 'entry_number:transactions', label: 'رقم القيد', labelEn: 'Entry Number' },
    { value: 'debit_amount', label: 'المبلغ المدين', labelEn: 'Debit Amount' },
    { value: 'credit_amount', label: 'المبلغ الدائن', labelEn: 'Credit Amount' },
]

export function ReportControls({
    selectedGrouping,
    onGroupingChange,
    selectedSortField,
    onSortFieldChange,
    sortOrder,
    onSortOrderChange,
    isSummaryMode = false,
    onSummaryModeChange,
}: ReportControlsProps) {
    return (
        <div className="report-grouping-panel" style={{ flexWrap: 'wrap', gap: '24px' }}>
            {/* View Mode Toggle */}
            <div className="grouping-label-container" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                <span className="grouping-label">نمط العرض:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`ultimate-btn ${!isSummaryMode ? 'ultimate-btn-success' : 'ultimate-btn-neutral'}`}
                        onClick={() => onSummaryModeChange?.(false)}
                        style={{ padding: '4px 12px', height: '32px', minHeight: 'unset', fontSize: '12px' }}
                    >
                        تفصيلي
                    </button>
                    <button
                        className={`ultimate-btn ${isSummaryMode ? 'ultimate-btn-success' : 'ultimate-btn-neutral'}`}
                        onClick={() => onSummaryModeChange?.(true)}
                        style={{ padding: '4px 12px', height: '32px', minHeight: 'unset', fontSize: '12px' }}
                    >
                        ملخص
                    </button>
                </div>
            </div>
            <div className="grouping-label-container">
                <span className="grouping-label">تجميع حسب:</span>
                <select
                    className="grouping-select"
                    value={selectedGrouping}
                    onChange={(e) => onGroupingChange(e.target.value)}
                >
                    {groupingOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {selectedGrouping !== 'none' && (
                    <button
                        className="ultimate-btn ultimate-btn-warning"
                        onClick={() => onGroupingChange('none')}
                        style={{ padding: '4px 8px', height: '32px', minHeight: 'unset' }}
                    >
                        <div className="btn-content"><span className="btn-text" style={{ fontSize: '11px' }}>✖</span></div>
                    </button>
                )}
            </div>

            <div className="grouping-label-container">
                <span className="grouping-label">ترتيب حسب:</span>
                <select
                    className="grouping-select"
                    value={selectedSortField}
                    onChange={(e) => onSortFieldChange(e.target.value)}
                    style={{ minWidth: '160px' }}
                >
                    {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    className="grouping-select"
                    value={sortOrder}
                    onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc')}
                    style={{ minWidth: '100px' }}
                >
                    <option value="desc">تنازلي ↓</option>
                    <option value="asc">تصاعدي ↑</option>
                </select>
            </div>

            <span className="grouping-help">
                تحكم في طريقة عرض وترتيب سطور المعاملات
            </span>
        </div>
    )
}

export default ReportControls
