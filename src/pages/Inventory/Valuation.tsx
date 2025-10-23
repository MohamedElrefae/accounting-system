import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Container, Paper, Stack, Typography, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, TextField, Select, InputLabel, FormControl } from '@mui/material'
import { FilterBar } from '@/components/Common/FilterBar'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { InventoryReportsService, type ValuationRow } from '@/services/inventory/reports'
import { getActiveOrgId } from '@/utils/org'
import { MaterialSelect } from '@/components/Inventory/MaterialSelect'
import { LocationSelect } from '@/components/Inventory/LocationSelect'
import { ProjectSelect } from '@/components/Inventory/ProjectSelect'
import { listMaterials, type MaterialRow } from '@/services/inventory/materials'
import { listInventoryLocations, type InventoryLocationRow } from '@/services/inventory/locations'
import { supabase } from '@/utils/supabase'

export default function InventoryValuationPage() {
  const orgId = getActiveOrgId?.() || null
  const navigate = useNavigate()
const [rows, setRows] = useState<ValuationRow[]>([])
  const [materialFilter, setMaterialFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  // const [saved, setSaved] = useSavedFilters('inventory:valuation', { materialFilter: '', locationFilter: '', projectFilter: '' })
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [locations, setLocations] = useState<InventoryLocationRow[]>([])
  const [lppMetaMap, setLppMetaMap] = useState<Record<string, { currency: string | null, vendor_id: string | null, at: string | null }>>({})

  // Policy dialog state
  const [policyOpen, setPolicyOpen] = useState(false)
  const [policyMethod, setPolicyMethod] = useState<'STANDARD' | 'MOVING_AVERAGE' | 'LAST_PURCHASE' | 'LAST_PURCHASE_PLUS_PERCENT' | 'MANUAL'>('STANDARD')
  const [policyMarkup, setPolicyMarkup] = useState<string>('')
  const [policyManualCost, setPolicyManualCost] = useState<string>('')
  const [policyNote, setPolicyNote] = useState<string>('')
  const [sel, setSel] = useState<{ org_id: string, material_id: string, location_id: string, project_id: string | null } | null>(null)

useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const [data, mats, locs] = await Promise.all([
          InventoryReportsService.getValuation({ org_id: orgId || undefined }),
          orgId ? listMaterials(orgId) : Promise.resolve([]),
          orgId ? listInventoryLocations(orgId) : Promise.resolve([])
        ])
        // Fetch detailed last purchase metadata
        let metaMap: Record<string, { currency: string | null, vendor_id: string | null, at: string | null }> = {}
        if (orgId) {
          const { data: detailed } = await (await import('@/utils/supabase')).supabase
            .from('inventory.v_material_costing_snapshot_detailed')
            .select('org_id,material_id,location_id,project_id,last_purchase_currency_code,last_purchase_vendor_id,last_purchase_at')
            .eq('org_id', orgId)
          ;(detailed || []).forEach((r: any) => {
            const key = `${r.org_id}-${r.material_id}-${r.location_id}-${r.project_id ?? 'none'}`
            metaMap[key] = { currency: r.last_purchase_currency_code ?? null, vendor_id: r.last_purchase_vendor_id ?? null, at: r.last_purchase_at ?? null }
          })
        }
        if (mounted) {
          setRows(data)
          setMaterials(mats as any)
          setLocations(locs as any)
          setLppMetaMap(metaMap)
        }
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

const openPolicy = (row: any) => {
    setSel({ org_id: row.org_id, material_id: row.material_id, location_id: row.location_id, project_id: row.project_id ?? null })
    setPolicyMethod('STANDARD')
    setPolicyMarkup('')
    setPolicyManualCost('')
    setPolicyNote('')
    setPolicyOpen(true)
  }

  const savePolicy = async () => {
    if (!sel) return
    const paramsBase = {
      p_org_id: sel.org_id,
      p_material_id: sel.material_id,
      p_location_id: sel.location_id,
      p_project_id: sel.project_id,
      p_user_id: null as string | null,
      p_note: policyNote || null
    }
    if (policyMethod === 'STANDARD') {
      await supabase.rpc('set_inventory_costing_policy_standard', paramsBase)
    } else if (policyMethod === 'MOVING_AVERAGE') {
      await supabase.rpc('set_inventory_costing_policy_moving_average', paramsBase)
    } else if (policyMethod === 'LAST_PURCHASE') {
      await supabase.rpc('set_inventory_costing_policy_last_purchase', paramsBase)
    } else if (policyMethod === 'LAST_PURCHASE_PLUS_PERCENT') {
      const pct = Number(policyMarkup)
      await supabase.rpc('set_inventory_costing_policy_last_purchase_plus_percent', {
        p_org_id: sel.org_id,
        p_material_id: sel.material_id,
        p_markup_percent: isFinite(pct) ? pct : 0,
        p_location_id: sel.location_id,
        p_project_id: sel.project_id,
        p_user_id: null,
        p_note: policyNote || null
      })
    } else if (policyMethod === 'MANUAL') {
      const price = Number(policyManualCost)
      await supabase.rpc('set_inventory_costing_policy_manual', {
        p_org_id: sel.org_id,
        p_material_id: sel.material_id,
        p_manual_unit_cost: isFinite(price) ? price : 0,
        p_location_id: sel.location_id,
        p_project_id: sel.project_id,
        p_user_id: null,
        p_note: policyNote || null
      })
    }
    // Refresh data after save
    const data = await InventoryReportsService.getValuation({ org_id: orgId || undefined, material_id: materialFilter || undefined, location_id: locationFilter || undefined, project_id: projectFilter || undefined })
    setRows(data)
    setPolicyOpen(false)
  }

  const columns = useMemo<GridColDef[]>(() => [
    {
      field: 'material_label', headerName: 'Material', width: 240, valueGetter: (params) => {
        const r: any = params.row
        const m = materials.find(mm => mm.id === r.material_id)
        return m ? `${m.material_code} - ${m.material_name}` : r.material_id
      }
    },
    {
      field: 'location_label', headerName: 'Location', width: 220, valueGetter: (params) => {
        const r: any = params.row
        const l = locations.find(ll => ll.id === r.location_id)
        return l ? `${l.location_code} - ${l.location_name}` : r.location_id
      }
    },
    { field: 'project_id', headerName: 'Project', width: 220 },
    { field: 'on_hand_qty', headerName: 'On Hand', width: 120, type: 'number' },
    { field: 'method_used', headerName: 'Method', width: 160 },
    { field: 'last_purchase_unit_cost', headerName: 'Last Purchase', width: 160, type: 'number', renderCell: (params) => {
      const r: any = params.row
      const key = `${r.org_id}-${r.material_id}-${r.location_id}-${r.project_id ?? 'none'}`
      const meta = lppMetaMap[key]
      const title = meta ? `Currency: ${meta.currency ?? '-'}\nVendor: ${meta.vendor_id ?? '-'}\nDate: ${meta.at ? new Date(meta.at).toLocaleString() : '-'}` : 'No metadata'
      return (
        <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{title}</span>}>
          <span>{params.value ?? ''}</span>
        </Tooltip>
      )
    } },
    { field: 'effective_unit_cost', headerName: 'Unit Cost (Effective)', width: 160, type: 'number' },
    { field: 'extended_value', headerName: 'Total Value', width: 160, type: 'number' },
    { field: 'actions', headerName: 'Actions', width: 240, sortable: false, renderCell: (params) => {
      const r = params.row as any
      return (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => navigate(`/inventory/movement-detail?materialId=${r.material_id}&locationId=${r.location_id}${r.project_id ? `&projectId=${r.project_id}` : ''}`)}>View Detail</Button>
          <Button size="small" variant="contained" onClick={() => openPolicy(r)}>Set Policy</Button>
        </Stack>
      )
    }}
  ], [navigate, materials, locations])

  return (
    <Box sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight={700}>Inventory Valuation</Typography>
            <Tooltip title="Export current rows to CSV">
              <span>
                <Button variant="outlined" onClick={() => {
const headers = ['org_id','material_id','material_label','location_id','location_label','project_id','on_hand_qty','method_used','last_purchase_unit_cost','effective_unit_cost','extended_value']
                  const csvRows = [headers.join(',')]
                  rows.forEach((r: any) => {
                    const m = materials.find(mm => mm.id === r.material_id)
                    const l = locations.find(ll => ll.id === r.location_id)
                    const materialLabel = m ? `${m.material_code} - ${m.material_name}` : ''
                    const locationLabel = l ? `${l.location_code} - ${l.location_name}` : ''
                    const arr = [r.org_id, r.material_id, materialLabel, r.location_id, locationLabel, r.project_id ?? '', r.on_hand_qty, r.method_used, r.last_purchase_unit_cost ?? '', r.effective_unit_cost, r.extended_value]
                      .map(v => v === null || v === undefined ? '' : String(v).replace(/\"/g,'\"\"'))
                      .map(v => /,|\"|\n/.test(v) ? `\"${v}` + '\"' : v)
                    csvRows.push(arr.join(','))
                  })
                  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'inventory_valuation.csv'
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
                const data = await InventoryReportsService.getValuation({
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

      {/* Costing Policy Dialog */}
      <Dialog open={policyOpen} onClose={() => setPolicyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Costing Policy</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="policy-method-label">Method</InputLabel>
              <Select labelId="policy-method-label" label="Method" value={policyMethod} onChange={(e) => setPolicyMethod(e.target.value as any)}>
                <MenuItem value="STANDARD">STANDARD</MenuItem>
                <MenuItem value="MOVING_AVERAGE">MOVING_AVERAGE</MenuItem>
                <MenuItem value="LAST_PURCHASE">LAST_PURCHASE</MenuItem>
                <MenuItem value="LAST_PURCHASE_PLUS_PERCENT">LAST_PURCHASE_PLUS_PERCENT</MenuItem>
                <MenuItem value="MANUAL">MANUAL</MenuItem>
              </Select>
            </FormControl>
            {policyMethod === 'LAST_PURCHASE_PLUS_PERCENT' && (
              <TextField label="Markup %" size="small" type="number" value={policyMarkup} onChange={(e) => setPolicyMarkup(e.target.value)} />
            )}
            {policyMethod === 'MANUAL' && (
              <TextField label="Manual Unit Cost" size="small" type="number" value={policyManualCost} onChange={(e) => setPolicyManualCost(e.target.value)} />
            )}
            <TextField label="Note" size="small" value={policyNote} onChange={(e) => setPolicyNote(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={savePolicy}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
