import React from 'react'
import './TransactionsSummaryBar.css'

interface TransactionsSummaryBarProps {
  totalCount: number
  totalDebit: number
  totalCredit: number
  lineCount?: number
  transactionCount?: number
  activeFilters: string[]
  onClearFilters: () => void
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
    <div className="transactions-summary-bar">
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

      <div className="filter-indicators">
        {activeFilters.length > 0 ? (
          <>
            <div className="filter-badge-container">
              <span className="filter-label">فلاتر ({activeFilters.length}):</span>
              {activeFilters.slice(0, 3).map((filter, idx) => (
                <span key={idx} className="filter-badge">
                  {filter}
                </span>
              ))}
              {activeFilters.length > 3 && (
                <span className="filter-badge">+{activeFilters.length - 3}</span>
              )}
            </div>
            <button
              className="clear-filters-btn"
              onClick={onClearFilters}
              title="مسح جميع الفلاتر"
            >
              🗑️ مسح
            </button>
          </>
        ) : (
          <div className="no-filters-indicator">
            <span className="info-icon">ℹ️</span>
            <span>كل البيانات</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionsSummaryBar
