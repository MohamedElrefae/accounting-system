import React from 'react'
import './FilterScopeIndicator.css'

interface FilterScopeIndicatorProps {
  scope: 'global' | 'module' | 'page' | 'session'
  inherited?: boolean
  source?: string
  className?: string
}

const SCOPE_CONFIG = {
  global: {
    icon: '🌐',
    label: 'Global',
    description: 'Applies across all pages',
    color: '#2563eb'
  },
  module: {
    icon: '📁',
    label: 'Module',
    description: 'Shared within this module',
    color: '#7c3aed'
  },
  page: {
    icon: '📄',
    label: 'Page',
    description: 'Specific to this page',
    color: '#059669'
  },
  session: {
    icon: '⏱️',
    label: 'Session',
    description: 'Temporary for this session',
    color: '#dc2626'
  }
}

export const FilterScopeIndicator: React.FC<FilterScopeIndicatorProps> = ({
  scope,
  inherited = false,
  source,
  className = ''
}) => {
  const config = SCOPE_CONFIG[scope]
  
  return (
    <span 
      className={`scope-badge-compact ${scope} ${inherited ? 'inherited' : ''} ${className}`}
      title={`${config.description}${source ? ` (from ${source})` : ''}`}
    >
      {config.icon}
    </span>
  )
}

export default FilterScopeIndicator