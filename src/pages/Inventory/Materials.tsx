import React, { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material'
import { listMaterials, type MaterialRow, createMaterial, updateMaterial } from '@/services/inventory/materials'
import { listUOMs, type UomRow } from '@/services/inventory/uoms'
import { useToast } from '@/contexts/ToastContext'

function getActiveOrgIdSafe(): string | null {
  try { return localStorage.getItem('org_id') } catch { return null }
}

const MaterialsPage: React.FC = () => {
  const { showToast } = useToast()
  const [rows, setRows] = useState<MaterialRow[]>([])
  const [loading, setLoading] = useState(false)
  const [uoms, setUoms] = useState<UomRow[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ code: string; name: string; nameAr: string; baseUomId: string }>({ code: '', name: '', nameAr: '', baseUomId: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ code: string; name: string; nameAr: string; baseUomId: string; isActive: boolean; isTrackable: boolean }>({ code: '', name: '', nameAr: '', baseUomId: '', isActive: true, isTrackable: true })

  useEffect(() => {
    const orgId = getActiveOrgIdSafe()
    if (!orgId) return
    setLoading(true)
    Promise.all([listMaterials(orgId), listUOMs(orgId)])
      .then(([materials, uomsList]) => { setRows(materials); setUoms(uomsList) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>Materials / المواد</Typography>
      <div style={{ marginBottom: 8 }}>
        <Button variant="contained" onClick={() => setOpen(true)}>Add Material / إضافة مادة</Button>
      </div>
      <Card>
        <CardContent>
          {loading ? 'Loading…' : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Arabic</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Trackable</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.material_code}</TableCell>
                    <TableCell>{r.material_name}</TableCell>
                    <TableCell>{r.material_name_ar || ''}</TableCell>
                    <TableCell>{r.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{r.is_trackable ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => { setEditId(r.id); setEditForm({ code: r.material_code, name: r.material_name, nameAr: r.material_name_ar || '', baseUomId: r.base_uom_id, isActive: !!r.is_active, isTrackable: !!r.is_trackable }) }}>Edit</Button>
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
        <DialogTitle>Edit Material / تعديل مادة</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Code / الكود" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
          <TextField fullWidth margin="dense" label="Name / الاسم" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <TextField fullWidth margin="dense" label="Arabic Name / الاسم العربي" value={editForm.nameAr} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })} />
          <TextField select fullWidth margin="dense" label="Base UOM / وحدة القياس" value={editForm.baseUomId} onChange={(e) => setEditForm({ ...editForm, baseUomId: String(e.target.value) })}>
            {uoms.map(u => (<MenuItem key={u.id} value={u.id}>{u.code} - {u.name}</MenuItem>))}
          </TextField>
        </DialogContent>
        <DialogContent>
          <label style={{ display: 'block', marginTop: 8 }}>
            <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} /> Active / نشط
          </label>
          <label style={{ display: 'block', marginTop: 8 }}>
            <input type="checkbox" checked={editForm.isTrackable} onChange={(e) => setEditForm({ ...editForm, isTrackable: e.target.checked })} /> Trackable / يتطلب تتبع
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditId(null)}>Close</Button>
          <Button onClick={async () => {
            try {
              const id = editId; if (!id) return
              if (!editForm.code || !editForm.name || !editForm.baseUomId) { showToast('Code, Name, Base UOM required', { severity: 'warning' }); return }
              await updateMaterial(id, { material_code: editForm.code, material_name: editForm.name, material_name_ar: editForm.nameAr || null, base_uom_id: editForm.baseUomId, is_active: editForm.isActive, is_trackable: editForm.isTrackable })
              showToast('Material updated', { severity: 'success' })
              setEditId(null)
              const orgId = getActiveOrgIdSafe(); if (orgId) { setLoading(true); const list = await listMaterials(orgId); setRows(list); setLoading(false) }
            } catch (e: any) { showToast(e?.message || 'Update failed', { severity: 'error' }) }
          }} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Material / مادة جديدة</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Code / الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField fullWidth margin="dense" label="Name / الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField fullWidth margin="dense" label="Arabic Name / الاسم العربي" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          <TextField select fullWidth margin="dense" label="Base UOM / وحدة القياس" value={form.baseUomId} onChange={(e) => setForm({ ...form, baseUomId: String(e.target.value) })}>
            {uoms.map(u => (<MenuItem key={u.id} value={u.id}>{u.code} - {u.name}</MenuItem>))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={async () => {
            try {
              const orgId = getActiveOrgIdSafe(); if (!orgId) { showToast('Select org first', { severity: 'warning' }); return }
              if (!form.code || !form.name || !form.baseUomId) { showToast('Code, Name, Base UOM required', { severity: 'warning' }); return }
              await createMaterial({ org_id: orgId, material_code: form.code, material_name: form.name, material_name_ar: form.nameAr || null, base_uom_id: form.baseUomId, is_active: true, is_trackable: true, material_type: 'material', is_material_for_analysis: false, valuation_method: 'moving_average' })
              showToast('Material created', { severity: 'success' })
              setOpen(false); setForm({ code: '', name: '', nameAr: '', baseUomId: '' })
              setLoading(true); const list = await listMaterials(orgId); setRows(list); setLoading(false)
            } catch (e: any) { showToast(e?.message || 'Create failed', { severity: 'error' }) }
          }} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default MaterialsPage