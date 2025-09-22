import React from 'react'
import { Paper, Stack, Typography, LinearProgress } from '@mui/material'

export interface SubcontractorItem { name: string; progress: number; retention?: number; issues?: number }

export const SubcontractorManagementInterface: React.FC<{ items: SubcontractorItem[] }> = ({ items }) => {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Subcontractors</Typography>
      <Stack spacing={1}>
        {items.map((sc, i) => (
          <Stack key={i} spacing={0.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">{sc.name}</Typography>
              <Typography variant="caption" color="text.secondary">{sc.progress}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, sc.progress))} />
            <Typography variant="caption" color="text.secondary">
              Retention: {sc.retention ?? 0}% • Issues: {sc.issues ?? 0}
            </Typography>
          </Stack>
        ))}
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary">No subcontractors</Typography>
        )}
      </Stack>
    </Paper>
  )
}