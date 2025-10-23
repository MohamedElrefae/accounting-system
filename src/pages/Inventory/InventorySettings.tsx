import React, { useEffect, useState } from 'react'
import { TextField, Button, MenuItem, FormControlLabel, Checkbox, Card, CardContent, Typography, Grid } from '@mui/material'
import { setGLMappingByCode, type MovementType } from '@/services/inventory/config'
import { useToast } from '@/contexts/ToastContext'
import { useHasPermission } from '@/hooks/useHasPermission'

const movementTypes: { value: MovementType; label: string }[] = [
  { value: 'receipt', label: 'Receipt / توريد' },
  { value: 'issue', label: 'Issue / صرف' },
  { value: 'transfer_in', label: 'Transfer In / نقل إلى' },
  { value: 'transfer_out', label: 'Transfer Out / نقل من' },
  { value: 'adjust_increase', label: 'Adjust Increase / تسوية زيادة' },
  { value: 'adjust_decrease', label: 'Adjust Decrease / تسوية نقص' },
  { value: 'return_to_vendor', label: 'Return To Vendor / مرتجع للمورد' },
  { value: 'return_from_project', label: 'Return From Project / مرتجع من المشروع' },
]

function getActiveOrgIdSafe(): string | null {
  try {
    const raw = localStorage.getItem('org_id')
    return raw || null
  } catch {
    return null
  }
}

const InventorySettingsPage: React.FC = () => {
  const { showToast } = useToast()
  const hasPerm = useHasPermission()
  const canManage = hasPerm('inventory.manage')

  const [orgId, setOrgId] = useState<string>('')
  const [movementType, setMovementType] = useState<MovementType>('receipt')
  const [debitCode, setDebitCode] = useState('1300')
  const [creditCode, setCreditCode] = useState('2111')
  const [priority, setPriority] = useState<number>(10)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    const current = getActiveOrgIdSafe()
    if (current) setOrgId(current)
  }, [])

  const onSave = async () => {
    if (!canManage) { showToast('Access denied', { severity: 'warning' }); return }
    if (!orgId) { showToast('Select organization first', { severity: 'warning' }); return }
    const { success, error } = await setGLMappingByCode({
      orgId,
      movementType,
      debitCode,
      creditCode,
      priority,
      isActive,
      notes: notes?.trim() || null,
    })
    if (!success) {
      showToast(error || 'Failed to update mapping', { severity: 'error' })
    } else {
      showToast('Mapping updated', { severity: 'success' })
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>Inventory Settings / إعدادات المخزون</Typography>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Movement Type / نوع الحركة" value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)}>
                {movementTypes.map(mt => (<MenuItem key={mt.value} value={mt.value}>{mt.label}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Debit Account Code / مدين" value={debitCode} onChange={(e) => setDebitCode(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Credit Account Code / دائن" value={creditCode} onChange={(e) => setCreditCode(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField type="number" fullWidth label="Priority / أولوية" value={priority} onChange={(e) => setPriority(Number(e.target.value || 10))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />} label="Active / نشط" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Notes / ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" color="primary" onClick={onSave} disabled={!canManage}>Save / حفظ</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  )
}

export default InventorySettingsPage