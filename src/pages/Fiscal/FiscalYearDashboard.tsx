import React from 'react'
import { Box, Button, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import { tokens } from '@/theme/tokens'
import { supabase } from '@/utils/supabase'
import { getActiveOrgId } from '@/utils/org'
import { useNavigate } from 'react-router-dom'

export default function FiscalYearDashboardPage() {
  const navigate = useNavigate()
  const [orgId, setOrgId] = React.useState<string>(() => getActiveOrgId() || '')
  const [fiscalYearId] = React.useState<string>(() => {
    try { return localStorage.getItem('fiscal_year_id') || '' } catch { return '' }
  })
  const [counts, setCounts] = React.useState<{open:number;locked:number;closed:number;imports:number;warnings:number;errors:number}>({open:0,locked:0,closed:0,imports:0,warnings:0,errors:0})
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!orgId || !fiscalYearId) { setCounts({open:0,locked:0,closed:0,imports:0,warnings:0,errors:0}); return }
    setLoading(true)
    setError(null)
    try {
      const [{ data: periods, error: pErr }, { data: imports, error: iErr }] = await Promise.all([
        supabase.from('fiscal_periods').select('status').eq('org_id', orgId).eq('fiscal_year_id', fiscalYearId),
        supabase.from('opening_balance_imports').select('id').eq('org_id', orgId).eq('fiscal_year_id', fiscalYearId),
      ])
      if (pErr) throw pErr
      if (iErr) throw iErr
      const open = (periods||[]).filter(p=>p.status==='open').length
      const locked = (periods||[]).filter(p=>p.status==='locked').length
      const closed = (periods||[]).filter(p=>p.status==='closed').length
      const importsCount = (imports||[]).length

      // Quick validation snapshot
      let warnings=0, errors=0
      try {
        const { data: v } = await supabase.rpc('validate_opening_balances', { p_org_id: orgId, p_fiscal_year_id: fiscalYearId })
        warnings = v?.warnings?.length || 0
        errors = v?.errors?.length || 0
      } catch {}

      setCounts({open,locked,closed,imports:importsCount,warnings,errors})
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dashboard data')
      setCounts({open:0,locked:0,closed:0,imports:0,warnings:0,errors:0})
    } finally {
      setLoading(false)
    }
  }, [orgId, fiscalYearId])

  React.useEffect(()=>{ setOrgId(getActiveOrgId()||'') },[])
  React.useEffect(()=>{ load() },[load])

  const StatCard: React.FC<{title:string; value:number}> = ({ title, value }) => (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
      <Typography variant="h5" fontWeight={700}>{value}</Typography>
    </Paper>
  )

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: tokens.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>Fiscal Year Dashboard</Typography>

          {error && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2" color="error.main">{error}</Typography>
            </Paper>
          )}

          <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>Quick Links</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" onClick={()=> navigate('/fiscal/periods')}>Period Manager</Button>
              <Button size="small" variant="outlined" onClick={()=> navigate('/fiscal/opening-balance-import')}>Opening Balance Import</Button>
              <Button size="small" variant="outlined" onClick={()=> navigate('/fiscal/approval-workflow')}>Approval Workflow</Button>
              <Button size="small" variant="outlined" onClick={()=> navigate('/fiscal/approvals')}>Approvals Center</Button>
              <Button size="small" variant="outlined" onClick={()=> navigate('/fiscal/validation-rules')}>Validation Rules</Button>
              <Button size="small" variant="outlined" onClick={()=> navigate('/fiscal/reconciliation')}>Reconciliation</Button>
              <Button size="small" variant="outlined" onClick={()=> navigate('/fiscal/audit-trail')}>Audit Trail</Button>
              <Button size="small" variant="outlined" onClick={()=> navigate('/fiscal/construction')}>Construction Dashboard</Button>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            {loading ? (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Loading status…</Typography>
                </Paper>
              </Grid>
            ) : (
              <>
                <Grid item xs={6} md={2}><StatCard title="Open" value={counts.open} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Locked" value={counts.locked} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Closed" value={counts.closed} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Imports" value={counts.imports} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Warnings" value={counts.warnings} /></Grid>
                <Grid item xs={6} md={2}><StatCard title="Errors" value={counts.errors} /></Grid>
              </>
            )}
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}
