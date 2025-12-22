import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Container, Paper, Stack, Typography, Tooltip } from '@mui/material'
import { FilterBar } from '@/components/Common/FilterBar'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { InventoryReportsService, type AgeingRow } from '@/services/inventory/reports'
import { useScopeOptional } from '@/contexts/ScopeContext'
import { MaterialSelect } from '@/components/Inventory/MaterialSelect'
import { LocationSelect } from '@/components/Inventory/LocationSelect'
import { ProjectSelect } from '@/components/Inventory/ProjectSelect'

export default function InventoryAgeingPage() {
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || null
  const navigate = useNavigate()
  const [rows, setRows] = useState<AgeingRow[]>([])
  const [projectFilter, setProjectFilter] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [loading, setLoading] = useState(false)
  // const [saved, setSaved] = useSavedFilters('inventory:ageing', { materialFilter: '', locationFilter: '', projectFilter: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await InventoryReportsService.getAgeing({ org_id: orgId || undefined })
        if (mounted) setRows(data)
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [orgId])

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'material_code', headerName: 'Material', width: 180 },
    { field: 'material_name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'location_code', headerName: 'Location', width: 140 },
    { field: 'location_name', headerName: 'Location Name', width: 200 },
    { field: 'project_code', headerName: 'Project', width: 140 },
    { field: 'project_name', headerName: 'Project Name', width: 220 },
    { field: 'on_hand_qty', headerName: 'On Hand', width: 120, type: 'number' },
    { field: 'last_inbound_at', headerName: 'Last Inbound', width: 200 },
    { field: 'days_since_inbound', headerName: 'Days', width: 100, type: 'number' },
    { field: 'ageing_bucket', headerName: 'Bucket', width: 120 },
    { field: 'actions', headerName: 'Actions', width: 160, sortable: false, renderCell: (params) => {
      const r = params.row as any
      return (
        <Button size="small" variant="outlined" onClick={() => navigate(`/inventory/movement-detail?materialId=${r.material_id}&locationId=${r.location_id}${r.project_id ? `&projectId=${r.project_id}` : ''}`)}>View Detail</Button>
      )
    }}
  ], [navigate])

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Inventory Ageing</Typography>
            <Tooltip title="Export current rows to CSV">
              <span>
                <Button variant="outlined" onClick={() => {
                  const headers = ['org_id','material_id','material_code','material_name','location_id','location_code','location_name','project_id','project_code','project_name','on_hand_qty','last_inbound_at','days_since_inbound','ageing_bucket']
                  const csvRows = [headers.join(',')]
                  rows.forEach((r: any) => {
                    const arr = [r.org_id, r.material_id, r.material_code ?? '', r.material_name ?? '', r.location_id, r.location_code ?? '', r.location_name ?? '', r.project_id ?? '', r.project_code ?? '', r.project_name ?? '', r.on_hand_qty, r.last_inbound_at ?? '', r.days_since_inbound, r.ageing_bucket]
                      .map(v => v === null || v === undefined ? '' : String(v).replace(/"/g, '""'))
                      .map(v => /,|"|\n/.test(v) ? `"${v}"` : v)
                    csvRows.push(arr.join(','))
                  })
                  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'inventory_ageing.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                }}>Export CSV</Button>
              </span>
            </Tooltip>
          </Stack>
          <Paper variant="outlined" sx={{ p: 2, height: 640 }}>
          <FilterBar>
              <MaterialSelect orgId={orgId} value={materialFilter} onChange={setMaterialFilter} />
              <LocationSelect orgId={orgId} value={locationFilter} onChange={setLocationFilter} />
              <ProjectSelect orgId={orgId} value={projectFilter} onChange={setProjectFilter} />
            </FilterBar>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={async () => {
                const data = await InventoryReportsService.getAgeing({
                  org_id: orgId || undefined,
                  material_id: materialFilter || undefined,
                  location_id: locationFilter || undefined,
                  project_id: projectFilter || undefined,
                })
                setRows(data)
              }}>Apply</Button>
            </Stack>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => `${r.org_id}-${r.material_id}-${r.location_id}-${r.project_id ?? 'none'}`}
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