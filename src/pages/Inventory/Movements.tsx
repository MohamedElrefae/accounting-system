import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Grid, TextField, Button } from '@mui/material'
import { listInventoryMovementsFiltered } from '@/services/inventory/documents'
import { supabase } from '@/utils/supabase'
import { listMaterials, type MaterialRow } from '@/services/inventory/materials'
import { listInventoryLocations, type InventoryLocationRow } from '@/services/inventory/locations'

function getActiveOrgIdSafe(): string | null { try { return localStorage.getItem('org_id') } catch { return null } }

const MovementsPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([])
  const [qFrom, setQFrom] = useState<string>('')
  const [qTo, setQTo] = useState<string>('')
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [locations, setLocations] = useState<InventoryLocationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [qMaterial, setQMaterial] = useState<string>('')
  const [qLocation, setQLocation] = useState<string>('')
  const [qType, setQType] = useState<string>('')
  const filtered = useMemo(() => rows.filter(r => {
    const byMat = qMaterial ? r.material_id === qMaterial : true
    const byLoc = qLocation ? r.location_id === qLocation : true
    const byType = qType ? r.movement_type === qType : true
    return byMat && byLoc && byType
  }), [rows, qMaterial, qLocation, qType])

  // Load saved filters on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('inventoryMovements:filters')
      if (raw) {
        const saved = JSON.parse(raw)
        if (typeof saved.qMaterial === 'string') setQMaterial(saved.qMaterial)
        if (typeof saved.qLocation === 'string') setQLocation(saved.qLocation)
        if (typeof saved.qType === 'string') setQType(saved.qType)
        if (typeof saved.qFrom === 'string') setQFrom(saved.qFrom)
        if (typeof saved.qTo === 'string') setQTo(saved.qTo)
      }
    } catch {}
  }, [])

  // Persist filters on change
  useEffect(() => {
    try {
      const toSave = { qMaterial, qLocation, qType, qFrom, qTo }
      localStorage.setItem('inventoryMovements:filters', JSON.stringify(toSave))
    } catch {}
  }, [qMaterial, qLocation, qType, qFrom, qTo])

  useEffect(() => {
    const orgId = getActiveOrgIdSafe()
    if (!orgId) return
    setLoading(true)
    Promise.all([
      listInventoryMovementsFiltered({ orgId, materialId: qMaterial || undefined, locationId: qLocation || undefined, movementType: qType || undefined, dateFrom: qFrom || undefined, dateTo: qTo || undefined }),
      listMaterials(orgId),
      listInventoryLocations(orgId)
    ])
      .then(([movs, mats, locs]) => { setRows(movs); setMaterials(mats); setLocations(locs) })
      .finally(() => setLoading(false))
  }, [qMaterial, qLocation, qType, qFrom, qTo])

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>Movements / حركة المخزون</Typography>
      <Card>
        <CardContent>
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="date" label="From" InputLabelProps={{ shrink: true }} value={qFrom} onChange={e=>setQFrom(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth type="date" label="To" InputLabelProps={{ shrink: true }} value={qTo} onChange={e=>setQTo(e.target.value)} />
        </Grid>
            <Grid item xs={12} md={3}>
              <TextField select fullWidth label="Filter by Material" value={qMaterial} onChange={e=>setQMaterial(e.target.value)}>
                <option value="">All</option>
                {materials.map(m => (<option key={m.id} value={m.id}>{m.material_code} - {m.material_name}</option>))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField select fullWidth label="Filter by Location" value={qLocation} onChange={e=>setQLocation(e.target.value)}>
                <option value="">All</option>
                {locations.map(l => (<option key={l.id} value={l.id}>{l.location_code} - {l.location_name}</option>))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField select fullWidth label="Movement Type" value={qType} onChange={e=>setQType(e.target.value)}>
                <option value="">All</option>
                <option value="receipt">receipt</option>
                <option value="issue">issue</option>
                <option value="transfer_out">transfer_out</option>
                <option value="transfer_in">transfer_in</option>
                <option value="adjust_increase">adjust_increase</option>
                <option value="adjust_decrease">adjust_decrease</option>
                <option value="return_to_vendor">return_to_vendor</option>
                <option value="return_from_project">return_from_project</option>
              </TextField>
            </Grid>
          </Grid>
          {loading ? 'Loading…' : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Material</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((r) => {
                  const mat = materials.find(m => m.id === r.material_id)
                  const loc = locations.find(l => l.id === r.location_id)
                  const onViewGL = async () => {
                    try {
                      const { data, error } = await supabase
                        .from('inventory_postings')
                        .select('transaction_id')
                        .eq('movement_id', r.id)
                        .limit(1)
                        .maybeSingle()
                      if (error) throw error
                      const txId = data?.transaction_id
                      if (txId) {
                        try { window.open(`/transactions/${txId}`, '_blank', 'noopener') } catch { /* fallback ignored */ }
                      }
                    } catch {}
                  }
                  return (
                    <TableRow key={r.id} onDoubleClick={onViewGL} style={{ cursor: 'pointer' }}>
                      <TableCell>{new Date(r.movement_date).toLocaleString()}</TableCell>
                      <TableCell>{r.movement_type}</TableCell>
                      <TableCell>{mat ? `${mat.material_code} - ${mat.material_name}` : r.material_id}</TableCell>
                      <TableCell>{loc ? `${loc.location_code} - ${loc.location_name}` : r.location_id}</TableCell>
                      <TableCell align="right">{Number(r.quantity || 0).toLocaleString()}</TableCell>
                      <TableCell align="right">{Number(r.unit_cost || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MovementsPage