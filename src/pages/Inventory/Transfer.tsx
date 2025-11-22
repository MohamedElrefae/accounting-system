import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Typography, Grid, TextField, MenuItem, Button, Divider } from '@mui/material'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { listMaterials, type MaterialRow } from '@/services/inventory/materials'
import { listInventoryLocations, type InventoryLocationRow } from '@/services/inventory/locations'
import { createInventoryDocument, addInventoryDocumentLine, approveInventoryDocument, postInventoryDocument, type DocType } from '@/services/inventory/documents'
import { listUOMs, type UomRow } from '@/services/inventory/uoms'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AsyncAutocomplete, { type AsyncOption } from '@/components/Common/AsyncAutocomplete'
import DocumentActionsBar from '@/components/Inventory/DocumentActionsBar'

function getActiveOrgIdSafe(): string | null { try { return localStorage.getItem('org_id') } catch { return null } }

const TransferMaterialsPage: React.FC = () => {
  const { showToast } = useToast()
  const { user } = useAuth()

  const [orgId, setOrgId] = useState<string>('')
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [locations, setLocations] = useState<InventoryLocationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [uoms, setUoms] = useState<UomRow[]>([])

  type Line = { materialId: string; uomId: string; quantity: number; priceSource: 'moving_average' | 'last_purchase' | 'manual'; unitCost?: number; notes: string }
  const [lines, setLines] = useState<Line[]>([])

  // RHF + Zod schema
  const lineSchema = z.object({
    materialId: z.string().uuid('Invalid material'),
    uomId: z.string().uuid('Invalid UOM'),
    quantity: z.coerce.number().positive('Quantity must be > 0'),
    priceSource: z.enum(['moving_average','last_purchase','manual']).default('moving_average'),
    unitCost: z.coerce.number().min(0, 'Unit cost must be >= 0').optional(),
    notes: z.string().optional().or(z.literal('')),
  })
  // Build base header without refinements; extend first, then apply refinement after
  const headerSchema = z.object({
    orgId: z.string().uuid('Invalid org'),
    locationFromId: z.string().uuid('Select source location'),
    locationToId: z.string().uuid('Select target location'),
  })
  const formSchema = headerSchema
    .extend({
      materialId: lineSchema.shape.materialId,
      uomId: lineSchema.shape.uomId,
      quantity: lineSchema.shape.quantity,
      priceSource: lineSchema.shape.priceSource,
      unitCost: lineSchema.shape.unitCost,
      notes: lineSchema.shape.notes,
    })
    .refine(v => v.locationFromId !== v.locationToId, { message: 'From/To cannot be the same location', path: ['locationToId'] })
  type FormValues = z.infer<typeof formSchema>

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orgId: '',
      locationFromId: '',
      locationToId: '',
      materialId: '',
      uomId: '',
      quantity: 1,
      priceSource: 'moving_average',
      unitCost: 0,
      notes: '',
    }
  })

  const locationFromId = watch('locationFromId')
  const locationToId = watch('locationToId')
  const materialId = watch('materialId')
  const uomId = watch('uomId')
  const quantity = watch('quantity')
  const priceSource = watch('priceSource')
  const unitCost = watch('unitCost')
  const notes = watch('notes')

  useEffect(() => { const v = getActiveOrgIdSafe(); if (v) setOrgId(v) }, [])

  useEffect(() => {
    (async () => {
      if (!orgId) return
      setLoading(true)
      try {
        const [mats, locs, uomsRes] = await Promise.all([
          listMaterials(orgId),
          listInventoryLocations(orgId),
          listUOMs(orgId),
        ])
        setMaterials(mats)
        setLocations(locs)
        setUoms(uomsRes)
      } catch (e: any) {
        showToast(e?.message || 'Failed to load lookups', { severity: 'error' })
      } finally { setLoading(false) }
    })()
  }, [orgId])

  const selectedMaterial = useMemo(() => materials.find(m => m.id === materialId), [materials, materialId])

  const materialLoader = async (q: string): Promise<AsyncOption<MaterialRow>[]> => {
    const ql = (q || '').toLowerCase()
    const src = materials || []
    const filtered = ql ? src.filter(m => `${m.material_code} ${m.material_name}`.toLowerCase().includes(ql)) : src
    return filtered.slice(0, 100).map(m => ({ id: m.id, label: `${m.material_code} - ${m.material_name}`, raw: m }))
  }
  const locationLoader = async (q: string): Promise<AsyncOption<InventoryLocationRow>[]> => {
    const ql = (q || '').toLowerCase()
    const src = locations || []
    const filtered = ql ? src.filter(l => `${l.location_code} ${l.location_name}`.toLowerCase().includes(ql)) : src
    return filtered.slice(0, 100).map(l => ({ id: l.id, label: `${l.location_code} - ${l.location_name}`, raw: l }))
  }

  const addLine = () => {
    if (!materialId || !uomId || !quantity) { showToast('Select material, UOM and quantity', { severity: 'warning' }); return }
    setLines(prev => [...prev, { materialId, uomId, quantity, priceSource, unitCost, notes }])
    setMaterialId(''); setUomId(''); setQuantity(1); setPriceSource('moving_average'); setUnitCost(0); setNotes('')
  }
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx))


  const onCreateAndPost = async (values: FormValues) => {
    if (!orgId) { showToast('Select organization first', { severity: 'warning' }); return }
    if (!user?.id) { showToast('User not identified', { severity: 'warning' }); return }
    try {
      // values already validated by RHF + Zod
      const payloads = (lines.length ? lines : [{
        materialId: values.materialId,
        uomId: values.uomId,
        quantity: values.quantity,
        priceSource: values.priceSource,
        unitCost: values.unitCost,
        notes: values.notes || '',
      }])
      setLoading(true)
      const doc = await createInventoryDocument({ org_id: orgId, doc_type: 'transfer' as DocType, document_date: new Date().toISOString().slice(0,10), location_from_id: values.locationFromId, location_to_id: values.locationToId, status: 'draft' })
      // Multi-line
      let lineNo = 1
      for (const ln of payloads) {
        await addInventoryDocumentLine({
          id: '' as any,
          org_id: orgId,
          document_id: doc.id,
          line_no: lineNo++,
          material_id: ln.materialId,
          uom_id: ln.uomId,
          quantity: Number(ln.quantity || 0),
          unit_cost: ln.priceSource === 'manual' ? Number(ln.unitCost || 0) : null as any,
          price_source: ln.priceSource,
          project_id: null,
          cost_center_id: null,
          analysis_work_item_id: null,
          work_item_id: null,
          location_id: null,
          lot_id: null,
          serial_id: null,
          notes: ln.notes,
          created_at: '' as any,
          updated_at: '' as any,
          line_value: 0 as any,
        })
      }
      await approveInventoryDocument(orgId, doc.id, user.id)
      await postInventoryDocument(orgId, doc.id, user.id)
      showToast('Transfer posted successfully', { severity: 'success' })
      reset({ orgId, locationFromId: '', locationToId: '', materialId: '', uomId: '', quantity: 1, priceSource: 'moving_average', unitCost: 0, notes: '' })
      setLines([])
    } catch (e: any) {
      showToast(e?.message || 'Operation failed', { severity: 'error' })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 16 }}>
<Typography variant="h6" gutterBottom>Transfer / نقل</Typography>
          <DocumentActionsBar />
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onCreateAndPost)}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <AsyncAutocomplete
                  label="From / من"
                  value={locationFromId}
                  onChange={(v) => { (document.activeElement as HTMLElement)?.blur?.(); (register('locationFromId').onChange as any)({ target: { value: v } }) }}
                  loader={locationLoader}
                  error={!!errors.locationFromId}
                  helperText={errors.locationFromId?.message}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <AsyncAutocomplete
                  label="To / إلى"
                  value={locationToId}
                  onChange={(v) => { (document.activeElement as HTMLElement)?.blur?.(); (register('locationToId').onChange as any)({ target: { value: v } }) }}
                  loader={locationLoader}
                  error={!!errors.locationToId}
                  helperText={errors.locationToId?.message}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <AsyncAutocomplete
                  label="Material / مادة"
                  value={materialId}
                  onChange={(v) => { (document.activeElement as HTMLElement)?.blur?.(); (register('materialId').onChange as any)({ target: { value: v } }) }}
                  loader={materialLoader}
                  error={!!errors.materialId}
                  helperText={errors.materialId?.message}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="UOM / وحدة" {...register('uomId')} error={!!errors.uomId} helperText={errors.uomId?.message} value={uomId} onChange={() => {}}>
                  {uoms.map(u => (<MenuItem key={u.id} value={u.id}>{u.code} - {u.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField type="number" fullWidth label="Quantity / الكمية" {...register('quantity', { valueAsNumber: true })} error={!!errors.quantity} helperText={errors.quantity?.message} value={quantity} onChange={() => {}} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Price Source / طريقة التسعير" {...register('priceSource')} error={!!errors.priceSource} helperText={errors.priceSource?.message} value={priceSource} onChange={() => {}}>
                  <MenuItem value="moving_average">Moving Average</MenuItem>
                  <MenuItem value="last_purchase">Last Purchase</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                </TextField>
              </Grid>
              {priceSource === 'manual' && (
                <Grid item xs={12} md={3}>
                  <TextField type="number" fullWidth label="Unit Cost / سعر الوحدة" {...register('unitCost', { valueAsNumber: true })} error={!!errors.unitCost} helperText={errors.unitCost?.message} value={unitCost} onChange={() => {}} />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField fullWidth label="Notes / ملاحظات" {...register('notes')} error={!!errors.notes} helperText={errors.notes?.message} value={notes || ''} onChange={() => {}} />
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={1} alignItems="center">
              <Grid item>
                <Button variant="outlined" onClick={addLine} disabled={loading || isSubmitting}>Add Line / إضافة سطر</Button>
              </Grid>
              <Grid item>
                <Button type="submit" variant="contained" color="primary" disabled={loading || isSubmitting}>Create, Approve & Post / إنشاء واعتماد وترحيل</Button>
              </Grid>
            </Grid>
          </form>
          {!!lines.length && (
            <div style={{ marginTop: 12 }}>
              <Typography variant="subtitle1">Pending Lines / الأسطر المضافة</Typography>
              {lines.map((ln, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0' }}>
                  <span>{idx+1}.</span>
                  <span>Mat: {materials.find(m=>m.id===ln.materialId)?.material_code}</span>
                  <span>UOM: {uoms.find(u=>u.id===ln.uomId)?.code}</span>
                  <span>Qty: {ln.quantity}</span>
                  <Button size="small" onClick={() => removeLine(idx)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TransferMaterialsPage