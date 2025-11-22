import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Button, Container, Paper, Stack, Typography, Tooltip, MenuItem, Select, TextField } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { ReconciliationService, type ReconLine, type ReconSummary } from '@/services/inventory/reconciliation'
import { useAuth } from '@/hooks/useAuth'
import { getActiveOrgId } from '@/utils/org'

export default function ReconciliationSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [lines, setLines] = useState<ReconLine[]>([])
  const [summary, setSummary] = useState<ReconSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [lastDocId, setLastDocId] = useState<string | null>(null)
  const [lastDocInfo, setLastDocInfo] = useState<{ id: string, status: string, total_lines: number, total_quantity: number, total_value: number, posted_at: string | null } | null>(null)
  const { user } = useAuth() as any

  const orgId = getActiveOrgId?.() || null

  useEffect(() => {
    if (!sessionId) return
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [s, l] = await Promise.all([
          ReconciliationService.getSessionSummary(sessionId),
          ReconciliationService.getSessionLines(sessionId)
        ])
        if (mounted) {
          setSummary(s)
          setLines(l)
        }
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [sessionId])

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'material_code', headerName: 'Material', minWidth: 140 },
    { field: 'material_name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'location_code', headerName: 'Location', minWidth: 120 },
    { field: 'system_qty', headerName: 'System Qty', width: 120, type: 'number' },
    { field: 'external_qty', headerName: 'External Qty', width: 120, type: 'number' },
    { field: 'delta_qty', headerName: 'Delta', width: 120, type: 'number' },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'resolution_action', headerName: 'Resolution', width: 220, renderCell: (params) => {
      const current = params.row.resolution_action as ReconLine['resolution_action']
      const [value, setValue] = React.useState<ReconLine['resolution_action'] | ''>(current || '')
      const disabled = posting || loading
      const handleChange = async (newVal: ReconLine['resolution_action'] | '') => {
        setValue(newVal)
        if (!newVal) return
        await ReconciliationService.setLineResolution(params.row.id, newVal, undefined, user?.id)
      }
      return (
        <Select size="small" value={value} disabled={disabled} onChange={(e) => handleChange(e.target.value as any)} displayEmpty sx={{ minWidth: 200 }}>
          <MenuItem value=""><em>None</em></MenuItem>
          <MenuItem value="adjust_system">Adjust System</MenuItem>
          <MenuItem value="adjust_external">Adjust External</MenuItem>
          <MenuItem value="ignore">Ignore</MenuItem>
          <MenuItem value="defer">Defer</MenuItem>
        </Select>
      )
    }},
    { field: 'resolution_notes', headerName: 'Notes', minWidth: 240, flex: 1, renderCell: (params) => {
      const [value, setValue] = React.useState<string>(params.row.resolution_notes || '')
      const disabled = posting || loading
      const onBlur = async () => {
        const action = (params.row.resolution_action as ReconLine['resolution_action']) || 'adjust_system'
        await ReconciliationService.setLineResolution(params.row.id, action, value, user?.id)
      }
      return (
        <TextField size="small" fullWidth disabled={disabled} value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} placeholder="Add notes" />
      )
    }},
  ], [])

  const handleBulkAutoResolve = async () => {
    if (!sessionId) return
    await ReconciliationService.bulkSetResolution(sessionId, user?.id)
    // refresh
    const [s, l] = await Promise.all([
      ReconciliationService.getSessionSummary(sessionId),
      ReconciliationService.getSessionLines(sessionId)
    ])
    setSummary(s)
    setLines(l)
  }

  const handlePost = async () => {
    if (!sessionId || !orgId) return
    setPosting(true)
    try {
      const docId = await ReconciliationService.postSession(orgId, sessionId, user?.id, true)
      const latestId = docId || (await ReconciliationService.findLatestReconDocumentId(sessionId))
      setLastDocId(latestId)
      if (latestId) setLastDocInfo(await ReconciliationService.getDocumentHeader(latestId))
      // refresh lines/summary after posting
      const [s, l] = await Promise.all([
        ReconciliationService.getSessionSummary(sessionId),
        ReconciliationService.getSessionLines(sessionId)
      ])
      setSummary(s)
      setLines(l)
      const docId2 = await ReconciliationService.findLatestReconDocumentId(sessionId)
      setLastDocId(docId2)
      if (docId2) setLastDocInfo(await ReconciliationService.getDocumentHeader(docId2))
    } finally {
      setPosting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Reconciliation Session</Typography>
            <Stack direction="row" spacing={1}>
              {lastDocId && (
                <Tooltip title="Void the last posted adjustment document">
                  <span>
                    <Button color="warning" variant="outlined" disabled={posting || loading} onClick={async () => {
                      if (!orgId || !lastDocId) return
                      await ReconciliationService.voidInventoryDocument(orgId, lastDocId, user?.id, 'Void via Reconciliation UI')
                      // After void, refresh session lines/summary
                      const [s, l] = await Promise.all([
                        ReconciliationService.getSessionSummary(sessionId!),
                        ReconciliationService.getSessionLines(sessionId!)
                      ])
                      setSummary(s)
                      setLines(l)
                    }}>Void Last Doc</Button>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Export current lines to CSV">
                <span>
                  <Button variant="outlined" onClick={() => {
                    const headers = ['material_code','material_name','location_code','system_qty','external_qty','delta_qty','status','resolution_action']
                    const csvRows = [headers.join(',')]
                    lines.forEach(r => {
                      const row = [r.material_code, r.material_name, r.location_code, r.system_qty, r.external_qty, r.delta_qty, r.status, r.resolution_action]
                        .map(v => v === null || v === undefined ? '' : String(v).replace(/"/g,'""'))
                        .map(v => /,|"|\n/.test(v) ? `"${v}` + '"' : v)
                      csvRows.push(row.join(','))
                    })
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `reconciliation_${sessionId}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}>Export CSV</Button>
                </span>
              </Tooltip>
              <Tooltip title="Auto-set resolution: positive => adjust_system, negative => adjust_system">
                <span>
                  <Button variant="outlined" onClick={handleBulkAutoResolve} disabled={loading}>Auto-Resolve</Button>
                </span>
              </Tooltip>
              <Tooltip title="Post adjustments for lines resolved to adjust_system">
                <span>
                  <Button variant="contained" onClick={handlePost} disabled={!orgId || posting}>Post Adjustments</Button>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {lastDocInfo && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Typography variant="body2">Last Doc: {lastDocInfo.id}</Typography>
                <Typography variant="body2">Status: {lastDocInfo.status}</Typography>
                <Typography variant="body2">Lines: {lastDocInfo.total_lines}</Typography>
                <Typography variant="body2">Qty: {lastDocInfo.total_quantity}</Typography>
                <Typography variant="body2">Value: {lastDocInfo.total_value}</Typography>
                {lastDocInfo.posted_at && <Typography variant="body2">Posted At: {new Date(lastDocInfo.posted_at).toLocaleString()}</Typography>}
              </Stack>
            </Paper>
          )}

          {summary && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Typography variant="body2">Lines: {summary.line_count}</Typography>
                <Typography variant="body2">+Δ: {summary.positive_delta_lines}</Typography>
                <Typography variant="body2">-Δ: {summary.negative_delta_lines}</Typography>
                <Typography variant="body2">Δ Qty: {summary.total_delta_qty}</Typography>
                <Typography variant="body2">Δ Value: {summary.total_delta_value}</Typography>
              </Stack>
            </Paper>
          )}

          <Paper variant="outlined" sx={{ height: 600 }}>
            <DataGrid
              rows={lines}
              columns={columns}
              getRowId={(r) => r.id}
              loading={loading}
              disableRowSelectionOnClick
              sx={{ border: 0 }}
            />
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}