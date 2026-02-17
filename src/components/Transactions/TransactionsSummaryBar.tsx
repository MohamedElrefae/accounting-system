import React from 'react'
import './TransactionsSummaryBar.css'

interface TransactionsSummaryBarProps {
  totalCount: number
  totalDebit: number
  totalCredit: number
  lineCount?: number
  transactionCount?: number
  activeFilters: string[]
  onClearFilters?: () => void
}

const TransactionsSummaryBar: React.FC<TransactionsSummaryBarProps> = ({
  totalCount,
  totalDebit,
  totalCredit,
  lineCount,
  transactionCount,
  activeFilters,
  onClearFilters,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="transactions-summary-bar compact-mode">
      <div className="summary-group">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">معاملات:</span>
            <span className="stat-value">{transactionCount || totalCount}</span>
          </div>
          {lineCount !== undefined && (
            <div className="stat-item">
              <span className="stat-label">سطور:</span>
              <span className="stat-value">{lineCount}</span>
            </div>
          )}
          <div className="stat-item stat-debit">
            <span className="stat-label">مدين:</span>
            <span className="stat-value">{formatCurrency(totalDebit)}</span>
          </div>
          <div className="stat-item stat-credit">
            <span className="stat-label">دائن:</span>
            <span className="stat-value">{formatCurrency(totalCredit)}</span>
          </div>
          <div className={`stat-item stat-balance ${isBalanced ? 'balanced' : 'unbalanced'}`}>
            <span className="stat-label">فرق:</span>
            <span className="stat-value">
              {isBalanced && <span className="balance-icon">✓</span>}
              {!isBalanced && <span className="balance-icon">⚠</span>}
              {formatCurrency(Math.abs(totalDebit - totalCredit))}
            </span>
          </div>
        </div>

        <div className="filter-actions">
          {onClearFilters && activeFilters.length > 0 && (
            <button
              className="clear-filters-btn compact"
              onClick={onClearFilters}
              title={`مسح ${activeFilters.length} فلاتر مطبقة`}
            >
              🗑️ مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="active-filter-names">
          {activeFilters.map((f, i) => (
            <span key={i} className="mini-badge">{f}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default TransactionsSummaryBar
