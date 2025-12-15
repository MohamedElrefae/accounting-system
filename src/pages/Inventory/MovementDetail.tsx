import React, { useEffect, useState, useMemo } from 'react'
import { Box, Button, Container, Paper, Stack, Typography, Tooltip, Select, MenuItem, Checkbox, ListItemText } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { InventoryMovementService, type MovementDetailRow } from '@/services/inventory/reports'
import { getActiveOrgId } from '@/utils/org'
import { useLocation } from 'react-router-dom'
import { MaterialSelect } from '@/components/Inventory/MaterialSelect'
import { LocationSelect } from '@/components/Inventory/LocationSelect'
import { supabase } from '@/utils/supabase'

export default function InventoryMovementDetailPage() {
  const orgId = getActiveOrgId?.() || null
  const [rows, setRows] = useState<MovementDetailRow[]>([])
  const [loading, setLoading] = useState(false)
  const [materialId, setMaterialId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // Saved filters example (local only): key per page
  // const [saved, setSaved] = useSavedFilters('inventory:movement-detail', { materialId: '', locationId: '', from: '', to: '' })
const [movementTypes, setMovementTypes] = useState<string[]>([])
  const [costingMap, setCostingMap] = useState<Record<string, { method_used: string | null, last_purchase_unit_cost: number | null, effective_unit_cost: number | null }>>({})
  const [lppMetaMap, setLppMetaMap] = useState<Record<string, { currency: string | null, vendor_id: string | null, at: string | null }>>({})

  const fetchData = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const data = await InventoryMovementService.getDetail({ org_id: orgId, material_id: materialId || undefined, location_id: locationId || undefined, from: from || undefined, to: to || undefined, movement_types: movementTypes.length ? movementTypes : undefined })
      setRows(data)
      
      // Try to fetch costing snapshot - this view may not exist in all environments
      try {
        const { data: snap, error: snapErr } = await supabase
          .from('v_material_costing_snapshot_detailed')
          .select('org_id,material_id,location_id,project_id,method_used,last_purchase_unit_cost,effective_unit_cost,last_purchase_currency_code,last_purchase_vendor_id,last_purchase_at')
          .eq('org_id', orgId)
        
        if (!snapErr && snap) {
          const map: Record<string, { method_used: string | null, last_purchase_unit_cost: number | null, effective_unit_cost: number | null }> = {}
          const meta: Record<string, { currency: string | null, vendor_id: string | null, at: string | null }> = {}
          snap.forEach((r: any) => {
            const key = `${r.org_id}-${r.material_id}-${r.location_id}-${r.project_id ?? 'none'}`
            map[key] = { method_used: r.method_used ?? null, last_purchase_unit_cost: r.last_purchase_unit_cost ?? null, effective_unit_cost: r.effective_unit_cost ?? null }
            meta[key] = { currency: r.last_purchase_currency_code ?? null, vendor_id: r.last_purchase_vendor_id ?? null, at: r.last_purchase_at ?? null }
          })
          setCostingMap(map)
          setLppMetaMap(meta)
        }
      } catch {
        // Costing snapshot view not available - continue without costing data
        console.warn('Costing snapshot view not available')
      }
    } finally {
      setLoading(false)
    }
  }

  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const m = params.get('materialId')
    const l = params.get('locationId')
    const f = params.get('from')
    const t = params.get('to')
    if (m) setMaterialId(m)
    if (l) setLocationId(l)
    if (f) setFrom(f)
    if (t) setTo(t)
    // initial fetch
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'movement_date', headerName: 'Date', width: 180 },
    { field: 'movement_type', headerName: 'Type', width: 140 },
    { field: 'material_code', headerName: 'Material', width: 180 },
    { field: 'material_name', headerName: 'Name', width: 220 },
    { field: 'location_code', headerName: 'Location', width: 140 },
    { field: 'location_name', headerName: 'Location Name', width: 200 },
    { field: 'quantity', headerName: 'Qty', width: 120, type: 'number' },
    { field: 'unit_cost', headerName: 'Unit Cost', width: 120, type: 'number' },
    { field: 'total_cost', headerName: 'Total Cost', width: 140, type: 'number' },
    { field: 'method_used_ref', headerName: 'Cost Method', width: 140, valueGetter: (p) => p?.row ? (costingMap[`${p.row.org_id}-${p.row.material_id}-${p.row.location_id}-${p.row.project_id ?? 'none'}`]?.method_used || '') : '' },
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
    { field: 'document_id', headerName: 'Doc ID', width: 260 }
  ], [costingMap])

  const handleExport = () => {
    const headers = ['movement_date','movement_type','material_id','material_code','material_name','location_id','location_code','location_name','project_id','project_code','project_name','quantity','unit_cost','total_cost','document_id']
    const csvRows = [headers.join(',')]
    rows.forEach((r: any) => {
      const arr = [r.movement_date, r.movement_type, r.material_id, r.material_code ?? '', r.material_name ?? '', r.location_id, r.location_code ?? '', r.location_name ?? '', r.project_id ?? '', r.project_code ?? '', r.project_name ?? '', r.quantity, r.unit_cost ?? '', r.total_cost ?? '', r.document_id ?? '']
        .map(v => v === null || v === undefined ? '' : String(v).replace(/\"/g,'\"\"'))
        .map(v => /,|\"|\n/.test(v) ? `\"${v}` + '\"' : v)
      csvRows.push(arr.join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory_movement_detail.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Inventory Movement Detail</Typography>
            <Tooltip title="Export current rows to CSV">
              <span>
                <Button variant="outlined" onClick={handleExport}>Export CSV</Button>
              </span>
            </Tooltip>
          </Stack>

          <Paper variant="outlined" sx={{ p: 2, height: 680 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1 }}>
              <MaterialSelect orgId={orgId} value={materialId} onChange={setMaterialId} />
              <LocationSelect orgId={orgId} value={locationId} onChange={setLocationId} />
              <input placeholder="From (YYYY-MM-DD)" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 8, width: 200 }} />
              <input placeholder="To (YYYY-MM-DD)" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 8, width: 200 }} />
              <Select multiple size="small" displayEmpty value={movementTypes} onChange={(e) => setMovementTypes(e.target.value as string[])} renderValue={(sel) => (sel as string[]).length ? (sel as string[]).join(', ') : 'Movement Types'} sx={{ minWidth: 240 }}>
                {['receipt','issue','transfer_in','transfer_out','adjustment_in','adjustment_out','return_in','return_out','correction'].map(mt => (
                  <MenuItem key={mt} value={mt}>
                    <Checkbox checked={movementTypes.indexOf(mt) > -1} />
                    <ListItemText primary={mt} />
                  </MenuItem>
                ))}
              </Select>
              <Button variant="contained" onClick={fetchData} disabled={loading}>Apply</Button>
            </Stack>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => `${r.org_id}-${r.material_id}-${r.location_id}-${r.movement_date}-${r.document_id ?? 'none'}`}
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