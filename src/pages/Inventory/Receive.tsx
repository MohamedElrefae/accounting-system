import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react'
import { Card, CardContent, Typography, Grid, TextField, MenuItem, Button, Divider } from '@mui/material'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { listMaterials, type MaterialRow } from '@/services/inventory/materials'
import { listInventoryLocations, type InventoryLocationRow } from '@/services/inventory/locations'
import { createInventoryDocument, addInventoryDocumentLine, approveInventoryDocument, postInventoryDocument, type DocType } from '@/services/inventory/documents'
import { listUOMs, type UomRow } from '@/services/inventory/uoms'
import { z } from 'zod'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AsyncAutocomplete, { type AsyncOption } from '@/components/Common/AsyncAutocomplete'

const DocumentActionsBar = lazy(() => import('@/components/Inventory/DocumentActionsBar'))

function getActiveOrgIdSafe(): string | null { try { return localStorage.getItem('org_id') } catch { return null } }

const ReceiveMaterialsPage: React.FC = () => {
  const { showToast } = useToast()
  const { user } = useAuth()

  const [orgId, setOrgId] = useState<string>('')
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [locations, setLocations] = useState<InventoryLocationRow[]>([])
  const [loading, setLoading] = useState(false)

  const [uoms, setUoms] = useState<UomRow[]>([])

  type Line = { materialId: string; uomId: string; quantity: number; unitCost: number; priceSource: 'moving_average' | 'last_purchase' | 'manual'; notes: string }
  const [lines, setLines] = useState<Line[]>([])

  // RHF + Zod form state
  const lineSchema = z.object({
    materialId: z.string().uuid('Invalid material'),
    uomId: z.string().uuid('Invalid UOM'),
    quantity: z.coerce.number().positive('Quantity must be > 0'),
    unitCost: z.coerce.number().min(0, 'Unit cost must be >= 0'),
    priceSource: z.enum(['moving_average','last_purchase','manual']).default('manual'),
    notes: z.string().optional().or(z.literal('')),
  })
  const headerSchema = z.object({
    orgId: z.string().uuid('Invalid org'),
    locationId: z.string().uuid('Select target location'),
  })
  const formSchema = headerSchema.extend({
    materialId: lineSchema.shape.materialId,
    uomId: lineSchema.shape.uomId,
    quantity: lineSchema.shape.quantity,
    unitCost: lineSchema.shape.unitCost,
    priceSource: lineSchema.shape.priceSource,
    notes: lineSchema.shape.notes,
  })
  type FormValues = z.infer<typeof formSchema>

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    defaultValues: {
      orgId: '',
      locationId: '',
      materialId: '',
      uomId: '',
      quantity: 1,
      unitCost: 0,
      priceSource: 'manual',
      notes: '',
    },
  })

  const locationId = watch('locationId')
  const materialId = watch('materialId')
  const uomId = watch('uomId')
  const quantity = watch('quantity')
  const unitCost = watch('unitCost')
  const priceSource = watch('priceSource')
  const notes = watch('notes')

  useEffect(() => {
    const v = getActiveOrgIdSafe()
    if (v) setOrgId(v)
  }, [])

  // Ensure orgId is present in the form before validation
  useEffect(() => {
    if (orgId) setValue('orgId', orgId, { shouldValidate: false, shouldDirty: false, shouldTouch: false })
  }, [orgId, setValue])

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
      } finally {
        setLoading(false)
      }
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
    setLines(prev => [...prev, { materialId, uomId, quantity, unitCost, priceSource, notes }])
    setMaterialId(''); setUomId(''); setQuantity(1); setUnitCost(0); setPriceSource('manual'); setNotes('')
  }
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx))


  const onCreateAndPost = async (values: FormValues) => {
    if (!orgId) { showToast('Select organization first', { severity: 'warning' }); return }
    if (!user?.id) { showToast('User not identified', { severity: 'warning' }); return }
    try {
      // values already validated by zodResolver
      const payloads = (lines.length ? lines : [{
        materialId: values.materialId,
        uomId: values.uomId,
        quantity: values.quantity,
        unitCost: values.unitCost,
        priceSource: values.priceSource,
        notes: values.notes || '',
      }])
      setLoading(true)
      // 1) Create receipt document (draft)
      const doc = await createInventoryDocument({ org_id: orgId, doc_type: 'receipt' as DocType, document_date: new Date().toISOString().slice(0,10), location_to_id: values.locationId, status: 'draft' })
      // 2) Add lines (multi-line support)
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
          unit_cost: Number(ln.unitCost || 0),
          price_source: ln.priceSource,
          project_id: null,
          cost_center_id: null,
          analysis_work_item_id: null,
          work_item_id: null,
          location_id: values.locationId,
          lot_id: null,
          serial_id: null,
          notes: ln.notes,
          created_at: '' as any,
          updated_at: '' as any,
          line_value: 0 as any,
        })
      }
      // 3) Approve
      await approveInventoryDocument(orgId, doc.id, user.id)
      // 4) Post
      await postInventoryDocument(orgId, doc.id, user.id)
      showToast('Receipt posted successfully', { severity: 'success' })
      // reset current form fields but keep lookups
      reset({ orgId, locationId: '', materialId: '', uomId: '', quantity: 1, unitCost: 0, priceSource: 'manual', notes: '' })
      setLines([])
    } catch (e: any) {
      showToast(e?.message || 'Operation failed', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 16 }}>
<Typography variant="h6" gutterBottom>Receive Materials / توريد مواد</Typography>
          {/* Actions bar for quick approve/post/void by ID */}
          <Suspense fallback={null}>
            <DocumentActionsBar />
          </Suspense>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onCreateAndPost)}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <AsyncAutocomplete
                  label="Location (to) / موقع"
                  value={locationId || ''}
onChange={(v) => { setValue('locationId', v || '', { shouldValidate: true, shouldDirty: true, shouldTouch: true }) }}
                  loader={locationLoader}
                  error={!!errors.locationId}
                  helperText={errors.locationId?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <AsyncAutocomplete
                  label="Material / مادة"
                  value={materialId || ''}
onChange={(v) => { setValue('materialId', v || '', { shouldValidate: true, shouldDirty: true, shouldTouch: true }) }}
                  loader={materialLoader}
                  error={!!errors.materialId}
                  helperText={errors.materialId?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="uomId"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      fullWidth
                      label="UOM / وحدة"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      error={!!errors.uomId}
                      helperText={errors.uomId?.message}
                      SelectProps={{ displayEmpty: true }}
                    >
                      <MenuItem value="" disabled>—</MenuItem>
                      {uoms.map(u => (<MenuItem key={u.id} value={u.id}>{u.code} - {u.name}</MenuItem>))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField type="number" fullWidth label="Quantity / الكمية" {...register('quantity', { valueAsNumber: true })} error={!!errors.quantity} helperText={errors.quantity?.message} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField type="number" fullWidth label="Unit Cost / سعر الوحدة" {...register('unitCost', { valueAsNumber: true })} error={!!errors.unitCost} helperText={errors.unitCost?.message} />
              </Grid>
              <Grid item xs={12} md={3}>
                <Controller
                  name="priceSource"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      fullWidth
                      label="Price Source / طريقة التسعير"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      error={!!errors.priceSource}
                      helperText={errors.priceSource?.message}
                      SelectProps={{ displayEmpty: true }}
                    >
                      <MenuItem value="" disabled>—</MenuItem>
                      <MenuItem value="moving_average">Moving Average</MenuItem>
                      <MenuItem value="last_purchase">Last Purchase</MenuItem>
                      <MenuItem value="manual">Manual</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Notes / ملاحظات" {...register('notes')} error={!!errors.notes} helperText={errors.notes?.message} />
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
                  <span>Cost: {ln.unitCost}</span>
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

export default ReceiveMaterialsPage