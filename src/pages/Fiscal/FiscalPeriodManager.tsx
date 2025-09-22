import React from 'react'
import { Box, Button, Chip, Container, IconButton, Paper, Stack, Tooltip, Typography, Drawer, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { tokens } from '@/theme/tokens'
import { supabase } from '@/utils/supabase'
import { getActiveOrgId } from '@/utils/org'
import { FiscalYearSelector } from '@/components/Fiscal/FiscalYearSelector'
import { PeriodClosingService } from '@/services/PeriodClosingService'
import { ClosingChecklistManager } from '@/components/Fiscal/ClosingChecklistManager'
import { BalanceReconciliationPanel } from '@/components/Fiscal/BalanceReconciliationPanel'
import { reconciliationToCsv } from '@/utils/csv'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { OpeningBalanceImportService } from '@/services/OpeningBalanceImportService'

interface FiscalPeriodRow {
  id: string
  org_id: string
  fiscal_year_id: string
  period_number: number
  period_code: string
  name_en: string
  name_ar?: string | null
  start_date: string
  end_date: string
  status: 'open' | 'locked' | 'closed'
  is_current: boolean
  closing_notes?: string | null
  closed_at?: string | null
}

export default function FiscalPeriodManagerPage() {
  const [orgId, setOrgId] = React.useState<string>(() => getActiveOrgId() || '')
  const [fiscalYearId, setFiscalYearId] = React.useState<string>(() => {
    try { return localStorage.getItem('fiscal_year_id') || '' } catch { return '' }
  })
  const [rows, setRows] = React.useState<FiscalPeriodRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<FiscalPeriodRow | null>(null)
  const [checklists, setChecklists] = React.useState<any[]>([])
  const [validationSummary, setValidationSummary] = React.useState<any | null>(null)
  const [recon, setRecon] = React.useState<{ glTotal: number; openingTotal: number; difference: number } | null>(null)

  const load = React.useCallback(async () => {
    if (!orgId || !fiscalYearId) { setRows([]); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fiscal_periods')
        .select('*')
        .eq('org_id', orgId)
        .eq('fiscal_year_id', fiscalYearId)
        .order('period_number', { ascending: true })
      if (error) throw error
      setRows((data || []) as unknown as FiscalPeriodRow[])
    } catch (e) {
      console.error('Failed to load periods', e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [orgId, fiscalYearId])

  React.useEffect(() => { setOrgId(getActiveOrgId() || '') }, [])
  React.useEffect(() => { load() }, [load])

  const onClose = async (periodId: string) => {
    if (!periodId) return
    const notes = prompt('Optional closing notes:') || undefined
    try {
      await PeriodClosingService.closePeriod(periodId, notes)
      await load()
    } catch (e: any) {
      alert(e?.message ?? String(e))
    }
  }

  const openDetails = async (row: FiscalPeriodRow) => {
    setSelected(row)
    try {
      const { data: cl } = await supabase
        .from('period_closing_checklists')
        .select('*')
        .eq('org_id', row.org_id)
        .eq('fiscal_period_id', row.id)
        .order('created_at', { ascending: true })
      setChecklists(cl || [])
      const summary = await PeriodClosingService.getValidation(row.org_id, row.fiscal_year_id)
      setValidationSummary(summary)
      const rec = await PeriodClosingService.getReconciliation(row.org_id, row.fiscal_year_id, row.id)
      setRecon(rec)
    } catch (e) {
      setChecklists([])
      setValidationSummary(null)
    }
    setDrawerOpen(true)
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: tokens.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, boxShadow: tokens.shadows.panel }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={2}>
            <Box>
              <Typography variant="h5" fontWeight={700}>Fiscal Period Manager</Typography>
              <Typography variant="body2" color="text.secondary">View and close periods for selected fiscal year</Typography>
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <FiscalYearSelector value={fiscalYearId} onChange={(id) => { setFiscalYearId(id); load(); }} />
              <Button variant="outlined" onClick={load}>Refresh</Button>
            </Stack>
          </Stack>

          <Stack spacing={2} mb={2}>
            {selected && (
              <>
                <ClosingChecklistManager orgId={orgId} fiscalPeriodId={selected.id} />
                <BalanceReconciliationPanel glTotal={recon?.glTotal || 0} openingTotal={recon?.openingTotal || 0} difference={recon?.difference || 0} />
                {recon && (
                  <Button size="small" onClick={() => {
                    const csv = reconciliationToCsv(recon)
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `reconciliation_${selected?.period_code || 'period'}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}>Export Reconciliation CSV</Button>
                )}
              </>
            )}
          </Stack>

          {loading && (
            <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Loading periods…</Typography>
            </Paper>
          )}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>No</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Current</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.period_number}</TableCell>
                    <TableCell>{row.period_code}</TableCell>
                    <TableCell>{row.name_en}</TableCell>
                    <TableCell>{row.start_date}</TableCell>
                    <TableCell>{row.end_date}</TableCell>
                    <TableCell>
                      <Chip size="small" color={row.status === 'open' ? 'success' : row.status === 'locked' ? 'warning' : 'default'} label={row.status} />
                    </TableCell>
                    <TableCell>{row.is_current ? <Chip size="small" color="info" label="Current" /> : null}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="Details">
                          <IconButton size="small" onClick={() => openDetails(row)}>
                            <InfoOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {row.status === 'open' ? (
                          <Tooltip title="Lock">
                            <IconButton size="small" onClick={async ()=>{ await PeriodClosingService.lockPeriod(row.id); await load(); }}>
                              <LockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : row.status === 'locked' ? (
                          <Tooltip title="Unlock">
                            <IconButton size="small" onClick={async ()=>{ await PeriodClosingService.unlockPeriod(row.id); await load(); }}>
                              <LockOpenIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                        <Tooltip title={row.status === 'closed' ? 'Already closed' : 'Close period'}>
                          <span>
                            <IconButton size="small" disabled={row.status === 'closed'} onClick={() => onClose(row.id)}>
                              <DoneAllIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>

      {/* Details Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 340, sm: 420 }, p: 2 }} role="presentation">
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="h6">Period Details</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
          </Stack>
          <Typography variant="subtitle2" color="text.secondary">
            {selected ? `${selected.period_code} • ${selected.name_en}` : ''}
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle1">Checklists</Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {checklists.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No checklist items</Typography>
            ) : (
              checklists.map((c: any) => (
                <Paper key={c.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2">{c.name_en || 'Checklist'}</Typography>
                  <Typography variant="caption" color="text.secondary">Status: {c.status}</Typography>
                </Paper>
              ))
            )}
          </Stack>
          <Stack direction="row" spacing={1} mb={1}>
            <Button size="small" onClick={async ()=>{ if(selected){ await PeriodClosingService.generateClosingChecklist(selected.id); await openDetails(selected) } }}>Generate Checklist</Button>
            <Button size="small" onClick={async ()=>{ if(selected){ await PeriodClosingService.escalateOverdueItems(selected.org_id, selected.id); await openDetails(selected) } }}>Escalate Overdue</Button>
          </Stack>

          <Typography variant="subtitle1">Validation Summary</Typography>
          {validationSummary ? (
            <>
              <Stack spacing={0.5}>
                <Typography variant="body2">OK: {String(validationSummary.ok)}</Typography>
                {validationSummary.totals && (
                  <Typography variant="body2">Rows: {validationSummary.totals.count} • Sum: {validationSummary.totals.sum}</Typography>
                )}
                <Typography variant="body2">Errors: {validationSummary.errors?.length || 0}</Typography>
                <Typography variant="body2">Warnings: {validationSummary.warnings?.length || 0}</Typography>
              </Stack>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Errors</Typography>
              <Stack spacing={0.5} sx={{ maxHeight: 160, overflowY: 'auto' }}>
                {(validationSummary.errors || []).slice(0, 50).map((e: any, i: number) => (
                  <Typography variant="caption" key={i} color="error.main">{e.code}: {e.message}</Typography>
                ))}
              </Stack>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Warnings</Typography>
              <Stack spacing={0.5} sx={{ maxHeight: 160, overflowY: 'auto' }}>
                {(validationSummary.warnings || []).slice(0, 50).map((w: any, i: number) => (
                  <Typography variant="caption" key={i} color="warning.main">{w.code}: {w.message}</Typography>
                ))}
              </Stack>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">No validation data</Typography>
          )}
        </Box>
      </Drawer>
    </Box>
  )
}
