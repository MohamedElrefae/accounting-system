import React, { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { tokens } from '@/theme/tokens'
import { OpeningBalanceImportService, type ValidationReport } from '@/services/OpeningBalanceImportService'
import { ImportProgressTracker } from '@/components/Fiscal/ImportProgressTracker'
import { ValidationResults } from '@/components/Fiscal/ValidationResults'
import { FiscalYearSelector } from '@/components/Fiscal/FiscalYearSelector'
import { getActiveOrgId, getActiveProjectId } from '@/utils/org'
import { supabase } from '@/utils/supabase'

// Full-page enterprise layout using tokens
export default function OpeningBalanceImportPage() {
  const [orgId, setOrgId] = useState<string>(() => getActiveOrgId() || '')
  const [projectId, setProjectId] = useState<string | null>(() => getActiveProjectId())
  const [fiscalYearId, setFiscalYearId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ status?: string; totalRows?: number; successRows?: number; failedRows?: number; importId?: string, errorReport?: any[] }>()
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [report, setReport] = useState<ValidationReport | null>(null)

  const disabled = useMemo(() => busy || !orgId || !fiscalYearId || !file, [busy, orgId, fiscalYearId, file])

  // Sync with top bar filters via localStorage
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

  const onTemplate = async () => {
    const blob = await OpeningBalanceImportService.generateImportTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'opening_balance_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const subscribeToImport = (importId: string) => {
    // Clean previous channel
    channel?.unsubscribe()
    const ch = supabase
      .channel(`obi:${importId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'opening_balance_imports',
        filter: `id=eq.${importId}`,
      }, (payload: any) => {
        const row = payload.new || payload.old
        if (row && row.id === importId) {
          setStatus((prev) => ({
            importId,
            status: row.status,
            totalRows: row.total_rows,
            successRows: row.success_rows,
            failedRows: row.failed_rows,
            errorReport: row.error_report || prev?.errorReport,
          }))
        }
      })
      .subscribe()
    setChannel(ch)
  }

  const onImport = async () => {
    if (!file || !orgId || !fiscalYearId) return
    setBusy(true)
    setReport(null)
    try {
      const res = await OpeningBalanceImportService.importFromExcel(orgId, fiscalYearId, file)
      // Optional toast feedback if available
      try { (window as any)?.toast?.success?.('Import started') } catch {}
      setStatus({
        importId: res.importId,
        status: res.status,
        totalRows: res.totalRows,
        successRows: res.successRows,
        failedRows: res.failedRows,
      })
      // Realtime subscribe for this import
      if (res.importId) subscribeToImport(res.importId)

      // Run server-side validation summary
      const r = await OpeningBalanceImportService.validateOpeningBalances(orgId, fiscalYearId)
      setReport(r)
    } catch (e: any) {
      setStatus({ status: 'failed', totalRows: 0, successRows: 0, failedRows: 0 })
      alert(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  const onReset = () => {
    setFile(null)
    setReport(null)
    setStatus(undefined)
    channel?.unsubscribe()
    setChannel(null)
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: tokens.palette.background.default,
      py: tokens.spacing(4) as any,
    }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ p: 3, borderRadius: tokens.radius.lg, boxShadow: tokens.shadows.panel }}>
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2} mb={3}>
            <Box>
              <Typography variant="h5" fontWeight={700}>Opening Balance Import</Typography>
              <Typography variant="body2" color="text.secondary">Upload Excel, track import, and validate results</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onTemplate}>Template</Button>
              <Button variant="text" startIcon={<RestartAltIcon />} onClick={onReset}>Reset</Button>
            </Stack>
          </Stack>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <TextField
                  label="Organization ID"
                  value={orgId}
                  size="small"
                  InputProps={{ readOnly: true }}
                  helperText={orgId ? 'From top bar scope' : 'Select organization from top bar'}
                />
                <TextField
                  label="Project ID (scope)"
                  value={projectId || ''}
                  size="small"
                  InputProps={{ readOnly: true }}
                  helperText={projectId ? 'From top bar scope' : 'All projects'}
                />
                <FiscalYearSelector
                  value={fiscalYearId}
                  onChange={(id) => setFiscalYearId(id)}
                  helperText={!fiscalYearId ? 'Select fiscal year' : undefined}
                />
                <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed' }}>
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <CloudUploadIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">Drag & drop Excel here or choose file</Typography>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    {file && (
                      <Typography variant="caption" color="text.secondary">{file.name}</Typography>
                    )}
                  </Stack>
                </Paper>
                <Button variant="contained" disabled={!!disabled} onClick={onImport}>Import</Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                {status?.errorReport && status.errorReport.length > 0 && (
                  <Alert severity="error">
                    Some rows failed during import. You can download the error report below.
                  </Alert>
                )}
                <ImportProgressTracker
                  status={status?.status}
                  totalRows={status?.totalRows}
                  successRows={status?.successRows}
                  failedRows={status?.failedRows}
                />
                <ValidationResults report={report} />
                {status?.errorReport && status.errorReport.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(status.errorReport, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `import_errors_${status.importId}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    Download Error Report (JSON)
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  )
}