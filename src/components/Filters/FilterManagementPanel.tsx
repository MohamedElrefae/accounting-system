import React, { useState } from 'react'
import { UseEnhancedTransactionsFiltersReturn } from '../../hooks/useEnhancedTransactionsFilters'
import './FilterManagementPanel.css'

interface FilterManagementPanelProps {
  filters: UseEnhancedTransactionsFiltersReturn
  className?: string
}

interface FilterSuggestion {
  type: 'temporal' | 'role' | 'usage' | 'performance'
  title: string
  description: string
  filters: Record<string, string>
  confidence: number
}

export const FilterManagementPanel: React.FC<FilterManagementPanelProps> = ({
  filters,
  className = ''
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showExplanation, setShowExplanation] = useState(true)

  const applySuggestion = (suggestion: FilterSuggestion) => {
    Object.entries(suggestion.filters).forEach(([key, value]) => {
      filters.updateHeaderFilter(key as any, value)
    })
    setShowSuggestions(false)
  }

  const saveAsDefault = () => {
    if (filters.saveUserPreferences) {
      filters.saveUserPreferences(filters.headerFilters)
      // Show success message (you might want to use a toast notification)
      alert('تم حفظ الفلاتر كافتراضية بنجاح')
    }
  }

  const resetToDefaults = () => {
    filters.resetHeaderFilters()
  }

  const clearPageFilters = () => {
    if (filters.resetScopeFilters) {
      filters.resetScopeFilters('page')
    }
  }

  const shareFilters = () => {
    // Generate shareable URL (this would be implemented with FilterURLService)
    const currentUrl = window.location.href
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert('تم نسخ رابط الفلاتر إلى الحافظة')
    })
  }

  // Generate filter explanation text
  const getFilterExplanation = () => {
    const { headerFilters, scope } = filters
    const parts = []

    if (headerFilters.dateFrom && headerFilters.dateTo) {
      parts.push(`للفترة من ${headerFilters.dateFrom} إلى ${headerFilters.dateTo}`)
    } else if (headerFilters.dateFrom) {
      parts.push(`من تاريخ ${headerFilters.dateFrom}`)
    } else if (headerFilters.dateTo) {
      parts.push(`حتى تاريخ ${headerFilters.dateTo}`)
    }

    if (scope?.currentOrg?.name) {
      parts.push(`في ${scope.currentOrg.name}`)
    }

    if (scope?.currentProject?.name) {
      parts.push(`- مشروع ${scope.currentProject.name}`)
    }

    if (headerFilters.approvalStatus) {
      const statusLabels: Record<string, string> = {
        draft: 'المسودات',
        submitted: 'المُرسلة',
        pending: 'قيد الانتظار',
        approved: 'المعتمدة',
        posted: 'المرحلة',
        rejected: 'المرفوضة'
      }
      parts.push(`- ${statusLabels[headerFilters.approvalStatus] || headerFilters.approvalStatus}`)
    }

    if (headerFilters.search) {
      parts.push(`- البحث: "${headerFilters.search}"`)
    }

    return parts.length > 0 
      ? `عرض المعاملات ${parts.join(' ')}`
      : 'عرض جميع المعاملات'
  }

  return (
    <div className={`filter-management-panel ${className}`}>
      {/* Filter Actions */}
      <div className="filter-actions">
        <div className="action-buttons">
          <button 
            className="filter-action-btn primary"
            onClick={saveAsDefault}
            title="حفظ الفلاتر الحالية كافتراضية لهذه الصفحة"
          >
            <span className="btn-icon">💾</span>
            <span className="btn-text">حفظ كافتراضي</span>
          </button>

          <button 
            className="filter-action-btn secondary"
            onClick={resetToDefaults}
            title="إعادة تعيين الفلاتر إلى القيم الافتراضية"
          >
            <span className="btn-icon">🔄</span>
            <span className="btn-text">إعادة تعيين</span>
          </button>

          <button 
            className="filter-action-btn secondary"
            onClick={clearPageFilters}
            title="مسح فلاتر الصفحة فقط (الاحتفاظ بالسياق العام)"
          >
            <span className="btn-icon">🧹</span>
            <span className="btn-text">مسح فلاتر الصفحة</span>
          </button>

          <button 
            className="filter-action-btn secondary"
            onClick={shareFilters}
            title="مشاركة الفلاتر الحالية عبر رابط"
          >
            <span className="btn-icon">🔗</span>
            <span className="btn-text">مشاركة</span>
          </button>

          {filters.suggestions && filters.suggestions.length > 0 && (
            <button 
              className="filter-action-btn suggestion"
              onClick={() => setShowSuggestions(!showSuggestions)}
              title="عرض اقتراحات الفلاتر الذكية"
            >
              <span className="btn-icon">💡</span>
              <span className="btn-text">اقتراحات ({filters.suggestions.length})</span>
            </button>
          )}
        </div>

        {/* Active Filter Count Summary */}
        <div className="filter-summary">
          <div className="summary-item">
            <span className="count">{filters.activeFilterCounts?.global || 0}</span>
          </div>
          <div className="summary-item">
            <span className="count">{filters.activeFilterCounts?.page || 0}</span>
          </div>
          <div className="summary-item">
            <span className="count">{filters.activeFilterCounts?.session || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter Explanation */}
      {showExplanation && (
        <div className="filter-explanation">
          <div className="explanation-header">
            <span className="explanation-icon">📊</span>
            <span className="explanation-text">{getFilterExplanation()}</span>
            <button 
              className="explanation-toggle"
              onClick={() => setShowExplanation(false)}
              title="إخفاء الشرح"
            >
              ✕
            </button>
          </div>
          
          {filters.hasSmartDefaults && (
            <div className="explanation-note">
              <span className="note-icon">🤖</span>
              <span className="note-text">تم تطبيق الإعدادات الذكية بناءً على استخدامك السابق</span>
            </div>
          )}
        </div>
      )}

      {/* Smart Suggestions */}
      {showSuggestions && filters.suggestions && filters.suggestions.length > 0 && (
        <div className="filter-suggestions">
          <div className="suggestions-header">
            <h4>اقتراحات الفلاتر الذكية</h4>
            <button 
              className="suggestions-close"
              onClick={() => setShowSuggestions(false)}
            >
              ✕
            </button>
          </div>
          
          <div className="suggestions-list">
            {filters.suggestions.map((suggestion, index) => (
              <div key={index} className={`suggestion-item ${suggestion.type}`}>
                <div className="suggestion-content">
                  <div className="suggestion-header">
                    <span className="suggestion-title">{suggestion.title}</span>
                    <span className="suggestion-confidence">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                  <p className="suggestion-description">{suggestion.description}</p>
                </div>
                <button 
                  className="suggestion-apply"
                  onClick={() => applySuggestion(suggestion)}
                >
                  تطبيق
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterManagementPanel