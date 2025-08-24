import React from 'react'

interface Props {
  allowed: boolean
  label: string
}

const PermissionBadge: React.FC<Props> = ({ allowed, label }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={label}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: allowed ? '#10b981' : '#ef4444',
        }}
      />
      <span style={{ opacity: allowed ? 1 : 0.7 }}>{label}</span>
    </div>
  )
}

export default PermissionBadge

