import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Container, Paper, Stack, Typography, Tooltip, Select, MenuItem, Checkbox, ListItemText } from '@mui/material'
import { FilterBar } from '@/components/Common/FilterBar'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { InventoryReportsService, type MovementSummaryRow } from '@/services/inventory/reports'
import { getActiveOrgId } from '@/utils/org'
import { MaterialSelect } from '@/components/Inventory/MaterialSelect'
import { LocationSelect } from '@/components/Inventory/LocationSelect'
import { ProjectSelect } from '@/components/Inventory/ProjectSelect'
import { supabase } from '@/utils/supabase'

export default function InventoryMovementSummaryPage() {
  const orgId = getActiveOrgId?.() || null
  const navigate = useNavigate()
const [rows, setRows] = useState<MovementSummaryRow[]>([])
  const [costingMap, setCostingMap] = useState<Record<string, { method_used: string | null, last_purchase_unit_cost: number | null, effective_unit_cost: number | null }>>({})
  const [lppMetaMap, setLppMetaMap] = useState<Record<string, { currency: string | null, vendor_id: string | null, at: string | null }>>({})
  const totals = useMemo(() => {
    return rows.reduce((acc, r) => {
      acc.qty_in += (r as any).qty_in || 0
      acc.qty_out += (r as any).qty_out || 0
      return acc
    }, { qty_in: 0, qty_out: 0 })
  }, [rows])
  const [materialId, setMaterialId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [projectId, setProjectId] = useState('')
  const [movementTypes, setMovementTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await InventoryReportsService.getMovementSummary({ org_id: orgId || undefined })
        if (mounted) setRows(data)
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
}, [])

useEffect(() => {
  let mounted = true
  ;(async () => {
    if (!orgId) return
    const { data, error } = await supabase
      .from('inventory.v_material_costing_snapshot_detailed')
      .select('org_id,material_id,location_id,project_id,method_used,last_purchase_unit_cost,effective_unit_cost,last_purchase_currency_code,last_purchase_vendor_id,last_purchase_at')
      .eq('org_id', orgId)
    if (!mounted) return
    if (!error) {
      const map: Record<string, { method_used: string | null, last_purchase_unit_cost: number | null, effective_unit_cost: number | null }> = {}
      const meta: Record<string, { currency: string | null, vendor_id: string | null, at: string | null }> = {}
      ;(data || []).forEach((r: any) => {
        const key = `${r.org_id}-${r.material_id}-${r.location_id}-${r.project_id ?? 'none'}`
        map[key] = { method_used: r.method_used ?? null, last_purchase_unit_cost: r.last_purchase_unit_cost ?? null, effective_unit_cost: r.effective_unit_cost ?? null }
        meta[key] = { currency: r.last_purchase_currency_code ?? null, vendor_id: r.last_purchase_vendor_id ?? null, at: r.last_purchase_at ?? null }
      })
      setCostingMap(map)
      setLppMetaMap(meta)
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
    { field: 'period_month', headerName: 'Month', width: 160 },
    { field: 'qty_in', headerName: 'Qty In', width: 120, type: 'number' },
  { field: 'qty_out', headerName: 'Qty Out', width: 120, type: 'number' },
    { field: 'method_used_ref', headerName: 'Cost Method', width: 160, valueGetter: (p) => costingMap[`${p.row.org_id}-${p.row.material_id}-${p.row.location_id}-${p.row.project_id ?? 'none'}`]?.method_used || '' },
    { field: 'last_purchase_unit_cost_ref', headerName: 'Last Purchase', width: 160, type: 'number', renderCell: (params) => {
      const r: any = params.row
      const key = `${r.org_id}-${r.material_id}-${r.location_id}-${r.project_id ?? 'none'}`
      const meta = lppMetaMap[key]
      const title = meta ? `Currency: ${meta.currency ?? '-'}\nVendor: ${meta.vendor_id ?? '-'}\nDate: ${meta.at ? new Date(meta.at).toLocaleString() : '-'}` : 'No metadata'
      const val = costingMap[key]?.last_purchase_unit_cost ?? null
      return (
        <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{title}</span>}>
          <span>{val ?? ''}</span>
        </Tooltip>
      )
    } },
    { field: 'effective_unit_cost_ref', headerName: 'Unit Cost (Eff.)', width: 160, type: 'number', valueGetter: (p) => costingMap[`${p.row.org_id}-${p.row.material_id}-${p.row.location_id}-${p.row.project_id ?? 'none'}`]?.effective_unit_cost ?? null },
  {
      field: 'actions', headerName: 'Actions', width: 160, sortable: false, renderCell: (params) => {
        const r = params.row as any
        const month = r.period_month?.slice(0, 7) // YYYY-MM
        const fromQ = month ? `${month}-01` : ''
        // naive end-of-month, safe enough for drill-down (user can refine in detail)
        const toQ = month ? `${month}-31` : ''
        return (
          <Button size="small" variant="outlined" onClick={() => navigate(`/inventory/movement-detail?materialId=${r.material_id}&locationId=${r.location_id}${r.project_id ? `&projectId=${r.project_id}` : ''}&from=${fromQ}&to=${toQ}`)}>View Detail</Button>
        )
      }
    },
  ], [])

  const handleExport = () => {
    const headers = ['org_id','material_id','material_code','material_name','location_id','location_code','location_name','project_id','project_code','project_name','period_month','qty_in','qty_out']
    const csvRows = [headers.join(',')]
    rows.forEach((r: any) => {
      const arr = [r.org_id, r.material_id, r.material_code ?? '', r.material_name ?? '', r.location_id, r.location_code ?? '', r.location_name ?? '', r.project_id ?? '', r.project_code ?? '', r.project_name ?? '', r.period_month, r.qty_in, r.qty_out]
        .map(v => v === null || v === undefined ? '' : String(v).replace(/\"/g,'\"\"'))
        .map(v => /,|\"|\n/.test(v) ? `\"${v}` + '\"' : v)
      csvRows.push(arr.join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory_movement_summary.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Inventory Movement Summary</Typography>
            <Tooltip title="Export current rows to CSV">
              <span>
                <Button variant="outlined" onClick={handleExport}>Export CSV</Button>
              </span>
            </Tooltip>
          </Stack>

          <Paper variant="outlined" sx={{ p: 2, height: 660 }}>
            <FilterBar>
              <MaterialSelect orgId={orgId} value={materialId} onChange={setMaterialId} />
              <LocationSelect orgId={orgId} value={locationId} onChange={setLocationId} />
              <ProjectSelect orgId={orgId} value={projectId} onChange={setProjectId} />
              <input type="month" placeholder="From (YYYY-MM)" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 8, width: 160 }} />
              <input type="month" placeholder="To (YYYY-MM)" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 8, width: 160 }} />
              <Select multiple size="small" displayEmpty value={movementTypes} onChange={(e) => setMovementTypes(e.target.value as string[])} renderValue={(sel) => (sel as string[]).length ? (sel as string[]).join(', ') : 'Movement Types'} sx={{ minWidth: 240 }}>
                {['receipt','issue','transfer_in','transfer_out','adjustment_in','adjustment_out','return_in','return_out','correction'].map(mt => (
                  <MenuItem key={mt} value={mt}>
                    <Checkbox checked={movementTypes.indexOf(mt) > -1} />
                    <ListItemText primary={mt} />
                  </MenuItem>
                ))}
              </Select>
              <Button variant="contained" onClick={async () => {
                const data = await InventoryReportsService.getMovementSummary({
                  org_id: orgId || undefined,
                  material_id: materialId || undefined,
                  location_id: locationId || undefined,
                  project_id: projectId || undefined,
                  from: from || undefined,
                  to: to || undefined
                })
                setRows(data)
              }}>Apply</Button>
            </FilterBar>
            <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
              <Typography variant="body2">Total In: {totals.qty_in} | Total Out: {totals.qty_out}</Typography>
            </Paper>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => `${r.org_id}-${r.material_id}-${r.location_id}-${r.project_id ?? 'none'}-${r.period_month}`}
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