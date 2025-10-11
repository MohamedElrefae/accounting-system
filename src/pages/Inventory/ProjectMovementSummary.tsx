import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Container, Paper, Stack, Typography, Tooltip } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { supabase } from '@/utils/supabase'
import { getActiveOrgId } from '@/utils/org'
import { ProjectSelect } from '@/components/Inventory/ProjectSelect'
import '@/styles/print.css'

interface Row {
  org_id: string
  project_id: string | null
  project_code: string | null
  project_name: string | null
  period_month: string
  qty_in: number
  qty_out: number
}

export default function ProjectMovementSummaryPage() {
  const orgId = getActiveOrgId?.() || null
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('v_inv_movement_summary_project_month')
        .select('*')
        .eq('org_id', orgId)
      if (projectId) query = query.eq('project_id', projectId)
      if (from) query = query.gte('period_month', from)
      if (to) query = query.lte('period_month', to)
      const { data, error } = await query.order('period_month', { ascending: true })
      if (error) throw error
      setRows((data as Row[]) || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (orgId) fetchData() }, [orgId])

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'project_code', headerName: 'Project', width: 160 },
    { field: 'project_name', headerName: 'Project Name', flex: 1, minWidth: 220 },
    { field: 'period_month', headerName: 'Month', width: 160 },
    { field: 'qty_in', headerName: 'Qty In', width: 120, type: 'number' },
    { field: 'qty_out', headerName: 'Qty Out', width: 120, type: 'number' },
  ], [])

  const totals = useMemo(() => rows.reduce((a, r) => ({ qty_in: a.qty_in + (r.qty_in||0), qty_out: a.qty_out + (r.qty_out||0) }), { qty_in: 0, qty_out: 0 }), [rows])

  const handlePrint = () => window.print()

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Project Movement Summary</Typography>
            <Tooltip title="Print this report">
              <span>
                <Button className="print-hide" variant="outlined" onClick={handlePrint}>Print</Button>
              </span>
            </Tooltip>
          </Stack>

          <Paper variant="outlined" className="print-container" sx={{ p: 2, height: 660 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }} className="print-hide">
              <ProjectSelect orgId={orgId} value={projectId} onChange={setProjectId} />
              <input type="month" placeholder="From (YYYY-MM)" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 8, width: 160 }} />
              <input type="month" placeholder="To (YYYY-MM)" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 8, width: 160 }} />
              <Button variant="contained" onClick={fetchData} disabled={loading}>Apply</Button>
            </Stack>

            <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
              <Typography variant="body2">Total In: {totals.qty_in} | Total Out: {totals.qty_out}</Typography>
            </Paper>

            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => `${r.org_id}-${r.project_id ?? 'none'}-${r.period_month}`}
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