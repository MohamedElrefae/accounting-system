import React, { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControlLabel, Checkbox } from '@mui/material'
import { listInventoryLocations, type InventoryLocationRow, createInventoryLocation, updateInventoryLocation } from '@/services/inventory/locations'
import { getActiveProjectId } from '@/utils/org'
import { getActiveOrgId } from '@/utils/org'
import { getActiveProjectsByOrg, type Project } from '@/services/projects'
import { getCostCentersList, type CostCenterRow } from '@/services/cost-centers'
import { useToast } from '@/contexts/ToastContext'

function getActiveOrgIdSafe(): string | null {
  try { return localStorage.getItem('org_id') } catch { return null }
}

const LocationsPage: React.FC = () => {
  const { showToast } = useToast()
  const [rows, setRows] = useState<InventoryLocationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ code: string; name: string; type: string; isMain: boolean; isActive: boolean; projectId?: string; costCenterId?: string }>({ code: '', name: '', type: 'warehouse', isMain: false, isActive: true })
  const [projects, setProjects] = useState<Project[]>([])
  const [costCenters, setCostCenters] = useState<CostCenterRow[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ code: string; name: string; type: string; isMain: boolean; isActive: boolean }>({ code: '', name: '', type: 'warehouse', isMain: false, isActive: true })

  useEffect(() => {
    (async () => {
      try {
        const orgId = getActiveOrgId();
        if (orgId) {
          const [projs, ccs] = await Promise.all([
            getActiveProjectsByOrg(orgId).catch(() => [] as any),
            getCostCentersList(orgId).catch(() => [] as any),
          ])
          setProjects(projs as any)
          setCostCenters(ccs as any)
        }
      } catch {}
    })()
  
    const orgId = getActiveOrgIdSafe()
    if (!orgId) return
    setLoading(true)
    listInventoryLocations(orgId).then(setRows).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>Locations / المواقع</Typography>
      <div style={{ marginBottom: 8 }}>
        <Button variant="contained" onClick={() => setOpen(true)}>Add Location / إضافة موقع</Button>
      </div>
      <Card>
        <CardContent>
          {loading ? 'Loading…' : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Active</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.location_code}</TableCell>
                    <TableCell>{r.location_name}</TableCell>
                    <TableCell>{r.location_type}</TableCell>
                    <TableCell>{r.project_id ? r.project_id : ''}</TableCell>
                    <TableCell>{r.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => { setEditId(r.id); setEditForm({ code: r.location_code, name: r.location_name, type: r.location_type, isMain: !!r.is_main_location, isActive: !!r.is_active }) }}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onClose={() => setEditId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Location / تعديل موقع</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Code / الكود" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
          <TextField fullWidth margin="dense" label="Name / الاسم" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <TextField select fullWidth margin="dense" label="Type / النوع" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: String(e.target.value) })}>
            <MenuItem value="warehouse">Warehouse</MenuItem>
            <MenuItem value="site">Site</MenuItem>
            <MenuItem value="vehicle">Vehicle</MenuItem>
            <MenuItem value="yard">Yard</MenuItem>
          </TextField>
          <FormControlLabel control={<Checkbox checked={editForm.isMain} onChange={(e) => setEditForm({ ...editForm, isMain: e.target.checked })} />} label="Main Location / موقع رئيسي" />
          <FormControlLabel control={<Checkbox checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />} label="Active / نشط" />
        </DialogContent>
        <DialogContent>
          <TextField select fullWidth margin="dense" label="Project / المشروع (اختياري)" value={form.projectId || ''} onChange={(e) => setForm({ ...form, projectId: String(e.target.value) })}>
            <MenuItem value="">—</MenuItem>
            {projects.map(p => (<MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>))}
          </TextField>
          <TextField select fullWidth margin="dense" label="Cost Center / مركز تكلفة (اختياري)" value={form.costCenterId || ''} onChange={(e) => setForm({ ...form, costCenterId: String(e.target.value) })}>
            <MenuItem value="">—</MenuItem>
            {costCenters.map(c => (<MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Close</Button>
          <Button onClick={async () => {
            try {
              const id = editId; if (!id) return
              if (!editForm.code || !editForm.name) { showToast('Code, Name required', { severity: 'warning' }); return }
              await updateInventoryLocation(id, { location_code: editForm.code, location_name: editForm.name, location_type: editForm.type, is_main_location: editForm.isMain, is_active: editForm.isActive })
              showToast('Location updated', { severity: 'success' })
              setEditId(null)
              const orgId = getActiveOrgIdSafe(); if (orgId) { setLoading(true); const list = await listInventoryLocations(orgId); setRows(list); setLoading(false) }
            } catch (e: any) { showToast(e?.message || 'Update failed', { severity: 'error' }) }
          }} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Location / موقع جديد</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Code / الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField fullWidth margin="dense" label="Name / الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField select fullWidth margin="dense" label="Type / النوع" value={form.type} onChange={(e) => setForm({ ...form, type: String(e.target.value) })}>
            <MenuItem value="warehouse">Warehouse</MenuItem>
            <MenuItem value="site">Site</MenuItem>
            <MenuItem value="vehicle">Vehicle</MenuItem>
            <MenuItem value="yard">Yard</MenuItem>
          </TextField>
          <FormControlLabel control={<Checkbox checked={form.isMain} onChange={(e) => setForm({ ...form, isMain: e.target.checked })} />} label="Main Location / موقع رئيسي" />
          <FormControlLabel control={<Checkbox checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />} label="Active / نشط" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={async () => {
            try {
              const orgId = getActiveOrgIdSafe(); if (!orgId) { showToast('Select org first', { severity: 'warning' }); return }
              if (!form.code || !form.name) { showToast('Code, Name required', { severity: 'warning' }); return }
              await createInventoryLocation({ org_id: orgId, location_code: form.code, location_name: form.name, location_type: form.type, is_main_location: form.isMain, is_active: form.isActive, project_id: form.projectId || null as any, cost_center_id: form.costCenterId || null as any })
              showToast('Location created', { severity: 'success' })
              setOpen(false); setForm({ code: '', name: '', type: 'warehouse', isMain: false, isActive: true })
              setLoading(true); const list = await listInventoryLocations(orgId); setRows(list); setLoading(false)
            } catch (e: any) { showToast(e?.message || 'Create failed', { severity: 'error' }) }
          }} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default LocationsPage