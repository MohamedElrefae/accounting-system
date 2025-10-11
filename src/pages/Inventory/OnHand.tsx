import React, { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Grid, TextField } from '@mui/material'
import { listInventoryOnHandFiltered } from '@/services/inventory/documents'
import { listMaterials, type MaterialRow } from '@/services/inventory/materials'
import { listInventoryLocations, type InventoryLocationRow } from '@/services/inventory/locations'

function getActiveOrgIdSafe(): string | null {
  try { return localStorage.getItem('org_id') } catch { return null }
}

const OnHandPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [locations, setLocations] = useState<InventoryLocationRow[]>([])
  const [materialId, setMaterialId] = useState<string>('')
  const [locationId, setLocationId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [qText, setQText] = useState<string>('')

  useEffect(() => {
    const orgId = getActiveOrgIdSafe()
    if (!orgId) return
    setLoading(true)
    Promise.all([
      listInventoryOnHandFiltered({ orgId, materialId: materialId || undefined, locationId: locationId || undefined }),
      listMaterials(orgId),
      listInventoryLocations(orgId)
    ]).then(([rowsRes, mats, locs]) => { setRows(rowsRes); setMaterials(mats); setLocations(locs) }).finally(() => setLoading(false))
  }, [materialId, locationId])

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>On Hand / الرصيد المتاح</Typography>
      <Card>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Search (material/location)" value={qText} onChange={e=>setQText(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Material" value={materialId} onChange={e=>setMaterialId(e.target.value)}>
                <option value="">All</option>
                {materials.map(m => (<option key={m.id} value={m.id}>{m.material_code} - {m.material_name}</option>))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="Location" value={locationId} onChange={e=>setLocationId(e.target.value)}>
                <option value="">All</option>
                {locations.map(l => (<option key={l.id} value={l.id}>{l.location_code} - {l.location_name}</option>))}
              </TextField>
            </Grid>
          </Grid>
          {loading ? 'Loading…' : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">On Hand</TableCell>
                  <TableCell align="right">Available</TableCell>
                  <TableCell align="right">Avg Cost</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.filter(r =>
                  !qText || `${r.material_code} ${r.material_name} ${r.location_code} ${r.location_name}`.toLowerCase().includes(qText.toLowerCase())
                ).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.material_code} - {r.material_name}</TableCell>
                    <TableCell>{r.location_code} - {r.location_name}</TableCell>
                    <TableCell align="right">{Number(r.quantity_on_hand || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{Number(r.quantity_available || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{Number(r.average_cost || 0).toLocaleString()}</TableCell>
                    <TableCell align="right">{Number(r.total_value || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default OnHandPage