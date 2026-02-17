import React from 'react'
import './FilterSection.css'

interface FilterSectionProps {
  title: string
  children: React.ReactNode
  className?: string
  scope?: 'global' | 'page' | 'session'
  collapsible?: boolean
  defaultCollapsed?: boolean
  inherited?: boolean
  source?: string
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  children,
  className = '',
  scope: _scope,
  collapsible: _collapsible,
  defaultCollapsed: _defaultCollapsed,
  inherited: _inherited,
  source: _source
}) => {
  return (
    <div className={`filter-section ${className}`}>
      <h3 className="section-title">{title}</h3>
      <div className="section-content">
        {children}
      </div>
    </div>
  )
}

export default FilterSection
