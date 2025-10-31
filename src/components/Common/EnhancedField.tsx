import React, { useState, useRef, useEffect } from 'react'
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Search, 
  History, 
  X, 
  Loader2,
  Sparkles
} from 'lucide-react'

interface EnhancedFieldProps {
  label: string
  value: any
  onChange: (value: any) => void
  type: 'text' | 'date' | 'select' | 'textarea' | 'number'
  
  // Status & Validation
  required?: boolean
  isComplete?: boolean
  isCurrent?: boolean
  error?: string
  warning?: string
  hint?: string
  
  // Interactive Features
  hasSearch?: boolean
  onSearch?: () => void
  hasClear?: boolean
  hasHistory?: boolean
  suggestions?: string[]
  onSuggestionSelect?: (suggestion: string) => void
  
  // Visual Enhancements
  icon?: React.ReactNode
  prefix?: string
  suffix?: React.ReactNode
  loading?: boolean
  disabled?: boolean
  
  // Accessibility
  ariaLabel?: string
  helpText?: string
  placeholder?: string
  
  // Additional props
  id?: string
  maxLength?: number
  minLength?: number
  rows?: number
  options?: Array<{ value: any; label: string }>
  formatOption?: (option: any) => string
}

export const EnhancedField: React.FC<EnhancedFieldProps> = ({
  label,
  value,
  onChange,
  type,
  required = false,
  isComplete = false,
  isCurrent = false,
  error,
  warning,
  hint,
  hasSearch = false,
  onSearch,
  hasClear = false,
  hasHistory = false,
  suggestions = [],
  onSuggestionSelect,
  icon,
  prefix,
  suffix,
  loading = false,
  disabled = false,
  ariaLabel,
  helpText,
  placeholder,
  id = `field-${label.replace(/\s+/g, '-').toLowerCase()}`,
  maxLength,
  minLength,
  rows = 3,
  options = [],
  formatOption,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)
  const fieldId = `${id}-field`
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // Show suggestions if typing and suggestions are available
    if (type === 'text' && suggestions.length > 0 && newValue.length > 0) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }
  
  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setShowSuggestions(false)
    onSuggestionSelect?.(suggestion)
  }
  
  // Clear field
  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }
  
  // Get field classes based on state
  const getFieldClasses = () => {
    const classes = ['enhanced-field']
    
    if (isCurrent) classes.push('is-current')
    if (isComplete) classes.push('is-complete')
    if (error) classes.push('has-error')
    if (warning) classes.push('has-warning')
    if (isFocused) classes.push('is-focused')
    if (disabled) classes.push('is-disabled')
    if (loading) classes.push('is-loading')
    
    return classes.join(' ')
  }
  
  // Render input based on type
  const renderInput = () => {
    const inputProps = {
      id: fieldId,
      value,
      onChange: handleInputChange,
      onFocus: () => setIsFocused(true),
      onBlur: () => {
        setIsFocused(false)
        setShowSuggestions(false)
      },
      placeholder,
      disabled: disabled || loading,
      'aria-label': ariaLabel || label,
      'aria-describedby': `${id}-hint ${id}-error ${id}-warning`.trim(),
      maxLength,
      minLength,
      ref: inputRef,
      className: 'field-input',
    }
    
    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...inputProps}
            rows={rows}
          />
        )
      
      case 'select':
        return (
          <select
            {...inputProps}
            ref={inputRef as React.RefObject<HTMLSelectElement>}
          >
            <option value="">{placeholder || `اختر ${label}...`}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {formatOption ? formatOption(option) : option.label}
              </option>
            ))}
          </select>
        )
      
      case 'number':
        return (
          <input
            {...inputProps}
            type="number"
          />
        )
      
      case 'date':
        return (
          <input
            {...inputProps}
            type="date"
          />
        )
      
      default:
        return (
          <input
            {...inputProps}
            type="text"
          />
        )
    }
  }
  
  return (
    <div className={getFieldClasses()}>
      <style>{`
        .enhanced-field {
          position: relative;
          background: #ffffff;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 20px;
        }
        
        .enhanced-field.is-current {
          border-color: #3b82f6;
          background: #eff6ff;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        
        .enhanced-field.is-complete {
          border-color: #10b981;
          background: #ecfdf5;
        }
        
        .enhanced-field.has-error {
          border-color: #ef4444;
          background: #fef2f2;
          animation: shake 0.5s;
        }
        
        .enhanced-field.has-warning {
          border-color: #f59e0b;
          background: #fffbeb;
        }
        
        .enhanced-field.is-focused {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .enhanced-field.is-disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .enhanced-field.is-loading {
          opacity: 0.8;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        
        @keyframes pulse-success {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        }
        
        .field-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .field-label-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .field-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          color: #6b7280;
        }
        
        .field-label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .required-indicator {
          color: #ef4444;
          font-weight: 700;
        }
        
        .field-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-badge.current {
          background: #dbeafe;
          color: #1d4ed8;
        }
        
        .status-badge.complete {
          background: #d1fae5;
          color: #065f46;
        }
        
        .field-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          border-radius: 6px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .field-action-btn:hover {
          background: #f3f4f6;
          color: #374151;
          border-color: #9ca3af;
        }
        
        .field-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .input-prefix {
          padding: 10px 12px;
          background: #f9fafb;
          border: 1px solid #d1d5db;
          border-right: none;
          border-radius: 8px 0 0 8px;
          color: #6b7280;
          font-size: 14px;
        }
        
        .field-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
          background: #ffffff;
        }
        
        .field-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .field-input:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }
        
        .input-suffix {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: #f9fafb;
          border: 1px solid #d1d5db;
          border-left: none;
          border-radius: 0 8px 8px 0;
        }
        
        .input-loader {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .field-feedback {
          margin-top: 8px;
        }
        
        .field-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          font-size: 12px;
        }
        
        .field-error {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ef4444;
          font-size: 12px;
        }
        
        .field-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #f59e0b;
          font-size: 12px;
        }
        
        .field-success {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #10b981;
          font-size: 12px;
        }
        
        .field-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          z-index: 50;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .suggestions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        
        .suggestions-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 14px;
        }
        
        .suggestion-item:hover {
          background: #f3f4f6;
        }
        
        .char-counter {
          font-size: 12px;
          color: #6b7280;
        }
        
        .char-counter.warning {
          color: #f59e0b;
        }
        
        .ai-suggestions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 8px 12px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          font-size: 12px;
          color: #0369a1;
        }
        
        .ai-suggestions button {
          padding: 2px 8px;
          background: #ffffff;
          border: 1px solid #bae6fd;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .ai-suggestions button:hover {
          background: #f0f9ff;
        }
      `}</style>
      
      {/* Field Header */}
      <div className="field-header">
        {/* Left: Icon + Label */}
        <div className="field-label-group">
          {icon && <div className="field-icon">{icon}</div>}
          <label className="field-label" htmlFor={fieldId}>
            {label}
            {required && <span className="required-indicator">*</span>}
          </label>
        </div>
        
        {/* Right: Status Indicators & Actions */}
        <div className="field-actions">
          {/* Status Badges */}
          {isCurrent && (
            <span className="status-badge current">
              <CheckCircle size={16} />
              جاري
            </span>
          )}
          {isComplete && !isCurrent && (
            <span className="status-badge complete">
              <CheckCircle size={16} />
              كامل
            </span>
          )}
          
          {/* Action Buttons */}
          {hasSearch && (
            <button 
              className="field-action-btn" 
              onClick={onSearch}
              title="بحث"
            >
              <Search size={16} />
            </button>
          )}
          {hasHistory && (
            <button 
              className="field-action-btn" 
              onClick={() => {/* Handle history */}}
              title="السجل"
            >
              <History size={16} />
            </button>
          )}
          {hasClear && value && (
            <button 
              className="field-action-btn" 
              onClick={handleClear}
              title="مسح"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Field Input */}
      <div className="field-input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        
        {renderInput()}
        
        {suffix && <div className="input-suffix">{suffix}</div>}
        
        {loading && (
          <div className="input-loader">
            <Loader2 size={16} className="animate-spin" />
          </div>
        )}
      </div>
      
      {/* Feedback Messages */}
      <div className="field-feedback">
        {/* Hint (always visible) */}
        {hint && (
          <div className="field-hint" id={`${id}-hint`}>
            <Info size={14} />
            <span>{hint}</span>
          </div>
        )}
        
        {/* Error (high priority) */}
        {error && (
          <div className="field-error" id={`${id}-error`} role="alert">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        
        {/* Warning (medium priority) */}
        {!error && warning && (
          <div className="field-warning" id={`${id}-warning`}>
            <AlertTriangle size={14} />
            <span>{warning}</span>
          </div>
        )}
        
        {/* Success message (when validated) */}
        {isComplete && !error && !warning && (
          <div className="field-success">
            <CheckCircle size={14} />
            <span>تم التحقق بنجاح</span>
          </div>
        )}
      </div>
      
      {/* Auto-Complete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="field-suggestions">
          <div className="suggestions-header">
            <span>اقتراحات من السجلات السابقة:</span>
            <button onClick={() => setShowSuggestions(false)}>✕</button>
          </div>
          <ul className="suggestions-list">
            {suggestions.map((suggestion, idx) => (
              <li
                key={idx}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <History size={14} />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default EnhancedField
