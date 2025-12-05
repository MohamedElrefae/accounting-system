import React from 'react'
import './InfoField.css'

export interface InfoFieldProps {
  label: string
  value: React.ReactNode
  className?: string
  fullWidth?: boolean
}

export const InfoField: React.FC<InfoFieldProps> = ({
  label,
  value,
  className = '',
  fullWidth = false
}) => {
  return (
    <div className={`info-field ${fullWidth ? 'full-width' : ''} ${className}`}>
      <label className="info-field-label">{label}</label>
      <div className="info-field-value">{value || '—'}</div>
    </div>
  )
}
