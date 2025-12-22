import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { Box, Button, Container, Paper, Stack, Typography, Tooltip } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { supabase } from '@/utils/supabase'
import { useScopeOptional } from '@/contexts/ScopeContext'
import { ProjectSelect } from '@/components/Inventory/ProjectSelect'
import '@/styles/print.css'

interface Row {
  org_id: string
  project_id: string | null
  project_code: string | null
  project_name: string | null
  total_quantity: number
  total_value: number
}

export default function ValuationByProjectPage() {
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || null
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [projectId, setProjectId] = useState('')

  const fetchData = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      let query = supabase
        .from('v_inv_valuation_by_project')
        .select('*')
        .eq('org_id', orgId)
      if (projectId) query = query.eq('project_id', projectId)
      const { data, error } = await query.order('project_code', { ascending: true })
      if (error) throw error
      setRows((data as Row[]) || [])
    } finally {
      setLoading(false)
    }
  }, [orgId, projectId])

  useEffect(() => { if (orgId) fetchData() }, [orgId, fetchData])

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'project_code', headerName: 'Project', width: 160 },
    { field: 'project_name', headerName: 'Project Name', flex: 1, minWidth: 220 },
    { field: 'total_quantity', headerName: 'Total Qty', width: 140, type: 'number' },
    { field: 'total_value', headerName: 'Total Value', width: 160, type: 'number' },
  ], [])

  const handlePrint = () => window.print()

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Valuation by Project</Typography>
            <Tooltip title="Print this report">
              <span>
                <Button className="print-hide" variant="outlined" onClick={handlePrint}>Print</Button>
              </span>
            </Tooltip>
          </Stack>

          <Paper variant="outlined" className="print-container" sx={{ p: 2, height: 660 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }} className="print-hide">
              <ProjectSelect orgId={orgId} value={projectId} onChange={setProjectId} />
              <Button variant="contained" onClick={fetchData} disabled={loading}>Apply</Button>
            </Stack>

            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => `${r.org_id}-${r.project_id ?? 'none'}`}
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