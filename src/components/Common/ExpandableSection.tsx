import React, { useState, useEffect } from 'react'
import './ExpandableSection.css'

export interface ExpandableSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: number | string
  defaultExpanded?: boolean
  children: React.ReactNode
  onToggle?: (expanded: boolean) => void
  persistKey?: string // Key for localStorage persistence
  className?: string
}

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  icon,
  badge,
  defaultExpanded = true,
  children,
  onToggle,
  persistKey,
  className = ''
}) => {
  // Initialize state from localStorage if persistKey is provided
  const [isExpanded, setIsExpanded] = useState(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`section:${persistKey}:expanded`)
      return saved !== null ? saved === 'true' : defaultExpanded
    }
    return defaultExpanded
  })
  
  // Persist state to localStorage
  useEffect(() => {
    if (persistKey) {
      localStorage.setItem(`section:${persistKey}:expanded`, String(isExpanded))
    }
  }, [isExpanded, persistKey])
  
  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onToggle?.(newState)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }
  
  return (
    <div className={`expandable-section ${isExpanded ? 'expanded' : 'collapsed'} ${className}`}>
      <div
        className="section-header"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`section-content-${persistKey || title}`}
        tabIndex={0}
      >
        <span className="expand-icon" aria-hidden="true">
          {isExpanded ? '▼' : '▶'}
        </span>
        {icon && <span className="section-icon" aria-hidden="true">{icon}</span>}
        <span className="section-title">{title}</span>
        {badge !== undefined && badge !== null && (
          <span className="section-badge" aria-label={`${badge} items`}>
            {badge}
          </span>
        )}
      </div>
      {isExpanded && (
        <div
          className="section-content"
          id={`section-content-${persistKey || title}`}
          role="region"
          aria-labelledby={`section-header-${persistKey || title}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}
