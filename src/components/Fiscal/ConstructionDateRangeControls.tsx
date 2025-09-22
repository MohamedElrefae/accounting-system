import React from 'react'
import { Stack, Typography, Button } from '@mui/material'

export interface ConstructionDateRangeControlsProps {
  fromDate: string
  toDate: string
  onChange: (fromDate: string, toDate: string) => void
  onRefresh?: () => void
}

export const ConstructionDateRangeControls: React.FC<ConstructionDateRangeControlsProps> = ({ fromDate, toDate, onChange, onRefresh }) => {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="caption">From</Typography>
        <input type="date" value={fromDate} onChange={(e)=> onChange(e.target.value, toDate)} />
        <Typography variant="caption">To</Typography>
        <input type="date" value={toDate} onChange={(e)=> onChange(fromDate, e.target.value)} />
      </Stack>
      {onRefresh && <Button size="small" onClick={onRefresh}>Refresh</Button>}
    </Stack>
  )
}