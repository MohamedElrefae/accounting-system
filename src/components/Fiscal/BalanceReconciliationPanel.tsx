import React from 'react'
import { Paper, Stack, Typography } from '@mui/material'

export interface BalanceReconciliationPanelProps {
  glTotal?: number
  openingTotal?: number
  difference?: number
}

export const BalanceReconciliationPanel: React.FC<BalanceReconciliationPanelProps> = ({ glTotal = 0, openingTotal = 0, difference = 0 }) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Balance Reconciliation</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Typography variant="body2">GL Total: {glTotal}</Typography>
        <Typography variant="body2">Opening Total: {openingTotal}</Typography>
        <Typography variant="body2">Difference: {difference}</Typography>
      </Stack>
    </Paper>
  )
}