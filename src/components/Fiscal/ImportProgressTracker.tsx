import React from 'react'
import { Box, LinearProgress, Typography, Paper } from '@mui/material'

export interface ImportProgressProps {
  status?: string
  totalRows?: number
  successRows?: number
  failedRows?: number
}

export const ImportProgressTracker: React.FC<ImportProgressProps> = ({ status, totalRows = 0, successRows = 0, failedRows = 0 }) => {
  const progress = totalRows > 0 ? Math.min(100, Math.round((successRows / totalRows) * 100)) : status === 'completed' ? 100 : 0

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
<Typography variant="subtitle1">{/** keep simple; caller provides labels if needed */}Import Status</Typography>
        <Typography variant="body2" color="text.secondary">{status ?? 'idle'}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={progress} />
      <Box display="flex" gap={2} mt={1}>
        <Typography variant="caption">Total: {totalRows}</Typography>
        <Typography variant="caption" color="success.main">Success: {successRows}</Typography>
        <Typography variant="caption" color="error.main">Failed: {failedRows}</Typography>
      </Box>
    </Paper>
  )
}