import React from 'react'
import UnifiedFilterBar from '../Common/UnifiedFilterBar'
import type { FilterState } from '../../hooks/useFilterState'

interface TransactionsLinesFiltersProps {
  title?: string
  totalLines: number
  filteredLines: number
  filters: FilterState
  onFilterChange: (key: keyof FilterState, value: string) => void
  onResetFilters: () => void
  preferencesKey?: string
}

const TransactionsLinesFilters: React.FC<TransactionsLinesFiltersProps> = ({
  title = 'فلاتر السطور',
  totalLines,
  filteredLines,
  filters,
  onFilterChange,
  onResetFilters,
  preferencesKey = 'transactions_lines_filters',
}) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        <span style={{ fontSize: '12px', color: 'var(--muted_text)' }}>
          ({filteredLines} / {totalLines} سطر)
        </span>
      </div>
      <UnifiedFilterBar
        values={filters}
        onChange={onFilterChange}
        onReset={onResetFilters}
        preferencesKey={preferencesKey}
        config={{
          showSearch: true,
          showDateRange: false,
          showAmountRange: true,
          showOrg: false,
          showProject: true,
          showDebitAccount: true,
          showCreditAccount: true,
          showClassification: true,
          showExpensesCategory: true,
          showWorkItem: true,
          showAnalysisWorkItem: true,
          showCostCenter: true,
          showApprovalStatus: false,
        }}
      />
    </div>
  )
}

export default TransactionsLinesFilters
