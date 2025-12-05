import React from 'react'
import './InfoGrid.css'

export interface InfoGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export const InfoGrid: React.FC<InfoGridProps> = ({
  children,
  columns = 2,
  className = ''
}) => {
  return (
    <div className={`info-grid columns-${columns} ${className}`}>
      {children}
    </div>
  )
}
