import React from 'react'
import { Box, Button, Chip, List, ListItem, ListItemSecondaryAction, ListItemText, Paper, Stack, Typography, TextField } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { PeriodClosingService } from '@/services/PeriodClosingService'

export interface ClosingChecklistManagerProps {
  orgId: string
  fiscalPeriodId: string
}

export const ClosingChecklistManager: React.FC<ClosingChecklistManagerProps> = ({ orgId, fiscalPeriodId }) => {
  const [rows, setRows] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await (await fetch('/noop')).json().catch(()=>({})) // noop to satisfy TS in non-node
    } catch {}
    try {
      const { data, error } = await (window as any).supabase
        ? (window as any).supabase.from('period_closing_checklists').select('*').eq('org_id', orgId).eq('fiscal_period_id', fiscalPeriodId)
        : { data: null, error: null }
      if (error) throw error
      setRows(data || [])
    } catch {
      // fallback to service
      const cl = await PeriodClosingService.getChecklist(orgId, fiscalPeriodId)
      setRows(cl as any[])
    } finally {
      setLoading(false)
    }
  }, [orgId, fiscalPeriodId])

  React.useEffect(() => { load() }, [load])

  const onComplete = async (checklistId: string, itemId: string) => {
    await PeriodClosingService.completeChecklistItem(checklistId, itemId)
    await load()
  }

  const onPatch = async (checklistId: string, itemId: string, patch: any) => {
    await PeriodClosingService.updateChecklistItem(checklistId, itemId, patch)
    await load()
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1">Closing Checklist</Typography>
        <Button size="small" onClick={load}>Refresh</Button>
      </Stack>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No checklist items</Typography>
      ) : (
        rows.map((row) => {
          const items = Array.isArray(row.items) ? row.items : []
          return (
            <Box key={row.id} sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2">{row.name_en || 'Checklist'}</Typography>
              <List dense>
                {items.map((it: any) => (
                  <ListItem key={it.id} alignItems="flex-start">
                    <ListItemText
                      primary={
                        <TextField
                          size="small"
                          value={it.title_en || ''}
                          onChange={(e)=> onPatch(row.id, it.id, { title_en: e.target.value })}
                          sx={{ minWidth: 220, mr: 1 }}
                        />
                      }
                      secondary={
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={1}>
                          <TextField
                            size="small"
                            label="Assigned To"
                            value={it.assigned_to || ''}
                            onChange={(e)=> onPatch(row.id, it.id, { assigned_to: e.target.value })}
                          />
                          <TextField
                            size="small"
                            type="date"
                            label="Due"
                            InputLabelProps={{ shrink: true }}
                            value={it.due_date ? String(it.due_date).substring(0,10) : ''}
                            onChange={(e)=> onPatch(row.id, it.id, { due_date: e.target.value })}
                          />
                          <TextField
                            size="small"
                            label="Notes"
                            value={it.notes || ''}
                            onChange={(e)=> onPatch(row.id, it.id, { notes: e.target.value })}
                            sx={{ minWidth: 220 }}
                          />
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      {it.status === 'completed' ? (
                        <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Completed" />
                      ) : it.needs_attention ? (
                        <Chip size="small" color="warning" icon={<WarningAmberIcon />} label="Overdue" />
                      ) : (
                        <Button size="small" onClick={() => onComplete(row.id, it.id)}>Complete</Button>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )
        })
      )}
    </Paper>
  )
}