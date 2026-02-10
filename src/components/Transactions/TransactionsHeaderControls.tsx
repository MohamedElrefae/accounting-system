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
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, whiteSpace: 'nowrap' }}>{title}</h2>
        <button
          className="ultimate-btn ultimate-btn-edit"
          onClick={onOpenColumns}
          title="إعدادات أعمدة جدول المعاملات"
        >
          <div className="btn-content">
            <span className="btn-text">⚙️ إعدادات الأعمدة</span>
          </div>
        </button>
      </div>

      <UnifiedFilterBar
        values={filters}
        onChange={onFilterChange}
        onApply={onApplyFilters}
        onReset={onResetFilters}
        isDirty={filtersDirty}
        storageKey={filterStorageKey}
        config={filterConfig}
      />

      <div className="transactions-pagination">
        <button
          className="ultimate-btn"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <div className="btn-content">
            <span className="btn-text">السابق</span>
          </div>
        </button>
        <span>
          صفحة {page} من {totalPages}
        </span>
        <button
          className="ultimate-btn"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
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
        >
          {[10, 20, 50, 100].map(size => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default TransactionsHeaderControls
