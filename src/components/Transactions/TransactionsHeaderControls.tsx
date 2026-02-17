import React from 'react'
import UnifiedFilterBar from '../Common/UnifiedFilterBar'
import type { FilterState } from '../../hooks/useFilterState'

interface TransactionsHeaderControlsProps {
  title: string
  onOpenColumns: () => void
  filters: FilterState
  onFilterChange: (key: keyof FilterState, value: string) => void
  onApplyFilters: () => void
  onResetFilters: () => void
  filtersDirty: boolean
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (nextPage: number) => void
  onPageSizeChange: (nextSize: number) => void
  filterStorageKey?: string
  filterConfig?: import('../Common/UnifiedFilterBar').FilterConfig
  summaryBar?: React.ReactNode
}

const TransactionsHeaderControls: React.FC<TransactionsHeaderControlsProps> = ({
  title,
  onOpenColumns,
  filters,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  filtersDirty,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  filterStorageKey = 'transactions_filters',
  filterConfig,
  summaryBar,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)

  return (
    <div className="transactions-header-controls-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
      {/* Top Row: Title and Filters */}
      <div
        className="controls-top-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          width: '100%'
        }}
      >
        <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>{title}</h2>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <UnifiedFilterBar
            values={filters}
            onChange={onFilterChange}
            onApply={onApplyFilters}
            onReset={onResetFilters}
            applyDisabled={!filtersDirty}
            preferencesKey={filterStorageKey}
            config={filterConfig}
          />
        </div>
      </div>

      {/* Bottom Row: Pagination, Summary Stats, and Settings Button */}
      <div
        className="controls-bottom-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          width: '100%',
          backgroundColor: 'var(--bg-secondary, rgba(0,0,0,0.02))',
          padding: '4px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, rgba(255,255,255,0.05))'
        }}
      >
        {/* Left: Pagination */}
        <div className="transactions-pagination" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="ultimate-btn"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{ padding: '4px 12px', minHeight: '32px' }}
          >
            <div className="btn-content">
              <span className="btn-text">السابق</span>
            </div>
          </button>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            صفحة {page} من {totalPages}
          </span>
          <button
            className="ultimate-btn"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{ padding: '4px 12px', minHeight: '32px' }}
          >
            <div className="btn-content">
              <span className="btn-text">التالي</span>
            </div>
          </button>
          <select
            className="filter-select"
            value={pageSize}
            onChange={e => {
              const nextSize = parseInt(e.target.value, 10) || 20
              onPageSizeChange(nextSize)
            }}
            style={{ padding: '2px 8px', height: '32px' }}
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Summary and Column Settings Button (Moved here to save space) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {summaryBar && <div className="header-summary-integration">{summaryBar}</div>}

          <button
            className="ultimate-btn ultimate-btn-edit"
            onClick={onOpenColumns}
            title="إعدادات أعمدة جدول المعاملات"
            style={{ padding: '4px 12px', minHeight: '32px' }}
          >
            <div className="btn-content">
              <span className="btn-text">⚙️ إعدادات الأعمدة</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransactionsHeaderControls
