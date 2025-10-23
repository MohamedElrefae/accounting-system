import React from 'react'
import { Chip } from '@mui/material'

const colorMap: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  approved: 'info',
  posted: 'success',
  void: 'warning',
}

const StatusChip: React.FC<{ status?: string | null }> = ({ status }) => {
  const label = (status || '').toString()
  const color = colorMap[label] || 'default'
  return <Chip size="small" label={label || '—'} color={color} variant="outlined" />
}

export default StatusChip