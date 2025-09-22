import React from 'react'
import { Box, Button, Container, Grid, Paper, Stack, Typography } from '@mui/material'
import { tokens } from '@/theme/tokens'
import { ProjectPhaseProgressChart, type PhaseProgressDatum } from '@/components/Fiscal/ProjectPhaseProgressChart'
import { CostPerformanceAnalytics, type CostPoint } from '@/components/Fiscal/CostPerformanceAnalytics'
import { LoadingOverlay } from '@/components/Fiscal/LoadingOverlay'
import { ConstructionProgressIntegration } from '@/services/ConstructionProgressIntegration'
import { ConstructionCostAllocation } from '@/services/ConstructionCostAllocation'
import { ConstructionComplianceMonitor, type ComplianceItem } from '@/components/Fiscal/ConstructionComplianceMonitor'
import { SubcontractorManagementInterface, type SubcontractorItem } from '@/components/Fiscal/SubcontractorManagementInterface'
import { MaterialManagementDashboard, type MaterialItem } from '@/components/Fiscal/MaterialManagementDashboard'
import { getActiveOrgId, getActiveProjectId } from '@/utils/org'
import { ConstructionDateRangeControls } from '@/components/Fiscal/ConstructionDateRangeControls'

export default function ConstructionDashboardPage() {
  const [orgId, setOrgId] = React.useState<string>(() => getActiveOrgId() || '')
  const [projectId, setProjectId] = React.useState<string | null>(() => getActiveProjectId())
  const [phases, setPhases] = React.useState<PhaseProgressDatum[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [costs, setCosts] = React.useState<CostPoint[]>([])
  const [fromDate, setFromDate] = React.useState<string>(() => {
    try { const v = localStorage.getItem('construction:from'); if (v) return v } catch {}
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-01`
  })
  const [toDate, setToDate] = React.useState<string>(() => {
    try { const v = localStorage.getItem('construction:to'); if (v) return v } catch {}
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
  })
  const [compliance, setCompliance] = React.useState<ComplianceItem[]>([])
  const [subs, setSubs] = React.useState<SubcontractorItem[]>([])
  const [materials, setMaterials] = React.useState<MaterialItem[]>([])

  const load = React.useCallback(async () => {
    // Fetch from real tables via services
    setLoading(true)
    setError(null)
    try {
      const [pp, compList, scList, matList] = await Promise.all([
      ConstructionProgressIntegration.getPhaseProgress(orgId, projectId || undefined, undefined),
      ConstructionComplianceManager.listCompliance(orgId, projectId || undefined),
      ConstructionCostAllocation.listSubcontractors(orgId, projectId || undefined),
      ConstructionCostAllocation.listMaterials(orgId, projectId || undefined),
    ])
    setPhases(pp)
    setCompliance(compList)
    setSubs(scList)
    setMaterials(matList)

    // Derive monthly actuals for recent months
    const monthly = await ConstructionCostAllocation.listMonthlyActuals(orgId, projectId || undefined, fromDate, toDate)
    setCosts(monthly)
    } catch (e: any) {
      setError(e?.message || 'Failed to load construction data')
      setPhases([]); setCompliance([]); setSubs([]); setMaterials([]); setCosts([])
    } finally {
      setLoading(false)
    }
  }, [orgId, projectId, fromDate, toDate])

  React.useEffect(() => {
    const sync = () => {
      setOrgId(getActiveOrgId() || '')
      setProjectId(getActiveProjectId())
    }
    sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'org_id' || e.key === 'project_id') sync()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  React.useEffect(() => { load() }, [load, orgId, projectId, fromDate, toDate])

  // Persist date range
  React.useEffect(() => {
    try { localStorage.setItem('construction:from', fromDate); localStorage.setItem('construction:to', toDate) } catch {}
  }, [fromDate, toDate])

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: tokens.palette.background.default, py: 3 }}>
      <Container maxWidth="lg">
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Construction Dashboard</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }}>
              <Typography variant="caption" color="text.secondary">Org: {orgId || '—'} • Project: {projectId || 'All'}</Typography>
              <Stack direction="row" spacing={1}>
                <Typography variant="caption" color="text.secondary">Org: {orgId || '—'} • Project: {projectId || 'All'}</Typography>
              </Stack>
              <ConstructionDateRangeControls
                fromDate={fromDate}
                toDate={toDate}
                onChange={(f,t)=> { setFromDate(f); setToDate(t) }}
                onRefresh={load}
              />
            </Stack>
          </Stack>
          {error && (
            <Paper elevation={0} sx={{ p: 2 }}>
              <Typography variant="body2" color="error.main">{error}</Typography>
            </Paper>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <LoadingOverlay loading={loading} height={320} />
              <ProjectPhaseProgressChart data={phases} />
            </Grid>
            <Grid item xs={12} md={6}>
              <LoadingOverlay loading={loading} height={300} />
              <CostPerformanceAnalytics data={costs} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConstructionComplianceMonitor items={compliance} />
            </Grid>
            <Grid item xs={12} md={6}>
              <SubcontractorManagementInterface items={subs} />
            </Grid>
            <Grid item xs={12}>
              <MaterialManagementDashboard items={materials} />
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  )
}
