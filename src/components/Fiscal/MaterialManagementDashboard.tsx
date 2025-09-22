import React from 'react'
import { Paper, Stack, Typography } from '@mui/material'

export interface MaterialItem { name: string; stock: number; usage: number; variance?: number }

export const MaterialManagementDashboard: React.FC<{ items: MaterialItem[] }> = ({ items }) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Materials</Typography>
      <Stack spacing={0.5}>
        {items.map((m, i) => (
          <Typography variant="body2" key={i}>
            {m.name}: Stock {m.stock}, Usage {m.usage}{typeof m.variance === 'number' ? `, Var ${m.variance}` : ''}
          </Typography>
        ))}
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary">No material records</Typography>
        )}
      </Stack>
    </Paper>
  )
}