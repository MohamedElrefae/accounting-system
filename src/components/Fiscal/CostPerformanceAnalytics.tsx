import React from 'react'
import { Paper, Stack, Typography } from '@mui/material'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

export interface CostPoint { period: string; budget: number; actual: number }

export const CostPerformanceAnalytics: React.FC<{ data: CostPoint[] }> = ({ data }) => {
  const safe = Array.isArray(data) ? data : []
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Cost Performance</Typography>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={safe.length ? safe : [{ period: '—', budget: 0, actual: 0 }]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="budget" stroke="#1565C0" name="Budget" strokeWidth={2} />
          <Line type="monotone" dataKey="actual" stroke="#ED6C02" name="Actual" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <Stack direction="row" spacing={2} mt={1}>
        <Typography variant="caption" color="text.secondary">Shows budget vs actual across periods</Typography>
      </Stack>
    </Paper>
  )
}