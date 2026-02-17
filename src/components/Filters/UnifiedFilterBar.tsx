import React from 'react'
import './UnifiedFilterBar.css'

interface UnifiedFilterBarProps {
  values?: any
  onChange?: (key: string, value: string) => void
  onReset?: () => void
  onApply?: () => void
  applyDisabled?: boolean
  preferencesKey?: string
  config?: any
  filters?: any
  className?: string
}

export const UnifiedFilterBar: React.FC<UnifiedFilterBarProps> = ({
  values,
  onChange,
  onReset,
  onApply,
  applyDisabled = false,
  className = '',
  filters
}) => {
  // If using old interface (values/onChange pattern)
  if (values && onChange) {
    return (
      <div className={`unified-filter-bar ${className}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          className="ultimate-btn ultimate-btn-success"
          onClick={onApply}
          disabled={applyDisabled}
          title={applyDisabled ? 'لا توجد تغييرات لتطبيقها' : 'تطبيق الفلاتر'}
        >
          <div className="btn-content"><span className="btn-text">✓ تطبيق</span></div>
        </button>
        
        <button 
          className="ultimate-btn ultimate-btn-neutral"
          onClick={onReset}
          title="إعادة تعيين جميع الفلاتر"
        >
          <div className="btn-content"><span className="btn-text">↻ إعادة تعيين</span></div>
        </button>
      </div>
    )
  }
  
  // If using new interface (enhanced filters)
  if (filters) {
    return (
      <div className={`unified-filter-bar ${className}`}>
        <div style={{ padding: '1rem', color: 'var(--muted_text)' }}>
          Enhanced filter bar (new interface)
        </div>
      </div>
    )
  }
  
  // Fallback
  return null
}

export default UnifiedFilterBar
