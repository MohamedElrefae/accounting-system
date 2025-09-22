import React from 'react'
import { Paper, Stack, Typography, Chip } from '@mui/material'

export interface ComplianceItem { name: string; status: 'ok' | 'warning' | 'error'; details?: string }

export const ConstructionComplianceMonitor: React.FC<{ items: ComplianceItem[] }> = ({ items }) => {
  const color = (s: ComplianceItem['status']) => s === 'ok' ? 'success' : s === 'warning' ? 'warning' : 'error'
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Compliance</Typography>
      <Stack spacing={1}>
        {items.map((it, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="center">
            <Chip size="small" color={color(it.status) as any} label={it.status.toUpperCase()} />
            <Typography variant="body2">{it.name}</Typography>
            {it.details && <Typography variant="caption" color="text.secondary">• {it.details}</Typography>}
          </Stack>
        ))}
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary">No compliance items</Typography>
        )}
      </Stack>
    </Paper>
  )
}