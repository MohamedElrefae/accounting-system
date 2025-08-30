import React from 'react'
import styles from './ReportFilterBar.module.css'

export type IconToggle = {
  id: string
  title: string
  active: boolean
  onToggle: () => void
  icon: React.ReactNode
}

export interface ReportFilterBarProps {
  className?: string
  left?: React.ReactNode
  center?: React.ReactNode
  right?: React.ReactNode
  iconToggles?: IconToggle[]
}

const ReportFilterBar: React.FC<ReportFilterBarProps> = ({ className, left, center, right, iconToggles }) => {
  return (
    <div className={`${styles.bar} ${className || ''}`.trim()} role="toolbar" aria-label="Report filters and actions">
      <div className={styles.left} role="group" aria-label="Filter controls">
        {left}
      </div>
      <div className={styles.center} role="group" aria-label="View options">
        {center}
      </div>
      <div className={styles.right} role="group" aria-label="Action buttons">
        {iconToggles && iconToggles.length > 0 && (
          <div className={styles.iconToggles} role="group" aria-label="Toggle options">
            {iconToggles.map(t => (
              <button
                key={t.id}
                type="button"
                className={`${styles.iconButton} ${t.active ? styles.active : ''}`}
                onClick={t.onToggle}
                title={t.title}
                aria-pressed={t.active}
                aria-describedby={`tooltip-${t.id}`}
              >
                {t.icon}
                <span className="sr-only">{t.title}</span>
              </button>
            ))}
          </div>
        )}
        {right}
      </div>
    </div>
  )
}

export default ReportFilterBar

