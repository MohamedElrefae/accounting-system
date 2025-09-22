import React from 'react'
import { Paper, Typography } from '@mui/material'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'

export interface PhaseProgressDatum {
  phase: string
  physical: number
  financial: number
}

export const ProjectPhaseProgressChart: React.FC<{ data: PhaseProgressDatum[] }> = ({ data }) => {
  const safe = Array.isArray(data) ? data : []
  return (
    <Paper variant="outlined" sx={{ p: 2, height: 320 }}>
      <Typography variant="subtitle1" gutterBottom>Project Phase Progress</Typography>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={safe.length ? safe : [{ phase: '—', physical: 0, financial: 0 }]}>
          <XAxis dataKey="phase" />
          <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
          <Tooltip formatter={(v: any)=> `${v}%`} />
          <Legend />
          <Bar dataKey="physical" name="Physical" fill="#6D4C41" radius={[4,4,0,0]} />
          <Bar dataKey="financial" name="Financial" fill="#2E7D32" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  )
}