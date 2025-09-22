import React from 'react'
import { Box, Chip, List, ListItem, ListItemText, Paper, Stack, Typography, Button, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { issuesToCsv } from '@/utils/csv'

export interface ValidationIssue { code: string; message: string; row?: Record<string, unknown> }
export interface ValidationReport {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  totals?: { count: number; sum: number }
}

const ValidationResultsBase: React.FC<{ report?: ValidationReport | null }> = ({ report }) => {
  const [view, setView] = React.useState<'all' | 'errors' | 'warnings'>('all')
  if (!report) return null

  const exportJson = (which: 'errors'|'warnings') => {
    const data = which === 'errors' ? report.errors : report.warnings
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation_${which}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const exportCsv = (which: 'errors'|'warnings') => {
    const data = which === 'errors' ? report.errors : report.warnings
    const csv = issuesToCsv(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `validation_${which}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const errorsList = (
    <List dense>
      {report.errors?.length ? report.errors.map((e, i) => (
        <ListItem key={i} disableGutters>
          <ListItemText primary={`${e.code}: ${e.message}`} secondary={e.row ? JSON.stringify(e.row) : undefined} />
        </ListItem>
      )) : <Typography variant="caption" color="text.secondary">No errors</Typography>}
    </List>
  )

  const warningsList = (
    <List dense>
      {report.warnings?.length ? report.warnings.map((w, i) => (
        <ListItem key={i} disableGutters>
          <ListItemText primary={`${w.code}: ${w.message}`} secondary={w.row ? JSON.stringify(w.row) : undefined} />
        </ListItem>
      )) : <Typography variant="caption" color="text.secondary">No warnings</Typography>}
    </List>
  )

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography variant="subtitle1">Validation</Typography>
        {report.ok ? (
          <Chip size="small" color="success" label="OK" />
        ) : (
          <Chip size="small" color="error" label="Issues" />
        )}
        <ToggleButtonGroup size="small" value={view} exclusive onChange={(_, v)=> v && setView(v)} sx={{ ml: 'auto' }}>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="errors">Errors</ToggleButton>
          <ToggleButton value="warnings">Warnings</ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" onClick={()=>exportJson('errors')}>Errors JSON</Button>
        <Button size="small" onClick={()=>exportCsv('errors')}>Errors CSV</Button>
        <Button size="small" onClick={()=>exportJson('warnings')}>Warnings JSON</Button>
        <Button size="small" onClick={()=>exportCsv('warnings')}>Warnings CSV</Button>
      </Stack>
      {report.totals && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          Rows: {report.totals.count} • Sum: {report.totals.sum}
        </Typography>
      )}
      {view === 'all' ? (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
          <Box>
            <Typography variant="subtitle2" color="error.main">Errors</Typography>
            {errorsList}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="warning.main">Warnings</Typography>
            {warningsList}
          </Box>
        </Box>
      ) : view === 'errors' ? (
        <Box>
          <Typography variant="subtitle2" color="error.main">Errors</Typography>
          {errorsList}
        </Box>
      ) : (
        <Box>
          <Typography variant="subtitle2" color="warning.main">Warnings</Typography>
          {warningsList}
        </Box>
      )}
    </Paper>
  )
}

export const ValidationResults = React.memo(ValidationResultsBase)
