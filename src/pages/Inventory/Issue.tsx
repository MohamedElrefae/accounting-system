import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Typography, Grid, TextField, MenuItem, Button, Divider } from '@mui/material'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { listMaterials, type MaterialRow } from '@/services/inventory/materials'
import { listAnalysisWorkItems, type AnalysisWorkItemFull } from '@/services/analysis-work-items'
import { listWorkItemsAll, type WorkItemRow } from '@/services/work-items'
import { getCostCentersList, type CostCenterRow } from '@/services/cost-centers'
import { getActiveProjectId } from '@/utils/org'
import { getActiveProjectsByOrg, type Project } from '@/services/projects'
import { listInventoryLocations, type InventoryLocationRow } from '@/services/inventory/locations'
import { createInventoryDocument, addInventoryDocumentLine, approveInventoryDocument, postInventoryDocument, type DocType } from '@/services/inventory/documents'
import { listUOMs, type UomRow } from '@/services/inventory/uoms'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AsyncAutocomplete, { type AsyncOption } from '@/components/Common/AsyncAutocomplete'
import DocumentActionsBar from '@/components/Inventory/DocumentActionsBar'

function getActiveOrgIdSafe(): string | null { try { return localStorage.getItem('org_id') } catch { return null } }

const IssueMaterialsPage: React.FC = () => {
  const { showToast } = useToast()
  const { user } = useAuth()

  const [orgId, setOrgId] = useState<string>('')
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [locations, setLocations] = useState<InventoryLocationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [uoms, setUoms] = useState<UomRow[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [defaultProjectId, setDefaultProjectId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [costCenters, setCostCenters] = useState<CostCenterRow[]>([])
  const [costCenterId, setCostCenterId] = useState<string>('')
  const [analysisItems, setAnalysisItems] = useState<AnalysisWorkItemFull[]>([])
  const [analysisItemId, setAnalysisItemId] = useState<string>('')
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([])
  const [workItemId, setWorkItemId] = useState<string>('')

  type Line = { materialId: string; uomId: string; quantity: number; priceSource: 'moving_average' | 'last_purchase' | 'manual'; notes: string }
  const [lines, setLines] = useState<Line[]>([])

  // RHF + Zod schema
  const lineSchema = z.object({
    materialId: z.string().uuid('Invalid material'),
    uomId: z.string().uuid('Invalid UOM'),
    quantity: z.coerce.number().positive('Quantity must be > 0'),
    priceSource: z.enum(['moving_average','last_purchase','manual']).default('moving_average'),
    notes: z.string().optional().or(z.literal('')),
  })
  const headerSchema = z.object({
    orgId: z.string().uuid('Invalid org'),
    locationId: z.string().uuid('Select source location'),
    projectId: z.string().uuid().optional().or(z.literal('')),
    costCenterId: z.string().uuid().optional().or(z.literal('')),
    analysisItemId: z.string().uuid().optional().or(z.literal('')),
    workItemId: z.string().uuid().optional().or(z.literal('')),
  })
  const formSchema = headerSchema.extend({
    materialId: lineSchema.shape.materialId,
    uomId: lineSchema.shape.uomId,
    quantity: lineSchema.shape.quantity,
    priceSource: lineSchema.shape.priceSource,
    notes: lineSchema.shape.notes,
  })
  type FormValues = z.infer<typeof formSchema>

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orgId: '',
      locationId: '',
      materialId: '',
      uomId: '',
      quantity: 1,
      priceSource: 'moving_average',
      notes: '',
      projectId: '',
      costCenterId: '',
      analysisItemId: '',
      workItemId: '',
    }
  })

  const locationId = watch('locationId')
  const materialId = watch('materialId')
  const uomId = watch('uomId')
  const quantity = watch('quantity')
  const priceSource = watch('priceSource')
  const notes = watch('notes')
  const wfProjectId = watch('projectId')
  const wfCostCenterId = watch('costCenterId')
  const wfAnalysisItemId = watch('analysisItemId')
  const wfWorkItemId = watch('workItemId')

  useEffect(() => {
    const v = getActiveOrgIdSafe()
    if (v) setOrgId(v)
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const activeProj = getActiveProjectId?.() || ''
        if (activeProj) { setDefaultProjectId(activeProj); setProjectId(prev => prev || activeProj) }
      } catch {}
      if (!orgId) return
      setLoading(true)
      try {
        const [mats, locs, uomsRes, projs, ccs, awi] = await Promise.all([
          listMaterials(orgId),
          listInventoryLocations(orgId),
          listUOMs(orgId),
          getActiveProjectsByOrg(orgId).catch(() => [] as any),
          getCostCentersList(orgId).catch(() => [] as any),
          listAnalysisWorkItems({ orgId, projectId: projectId || null, includeInactive: true }).catch(() => []),
        ])
        setMaterials(mats)
        setLocations(locs)
        setUoms(uomsRes)
        setProjects(projs as any)
        setCostCenters(ccs as any)
        setAnalysisItems(awi as any)
        // Work items (org wide)
        try { const wis = await listWorkItemsAll(orgId, true); setWorkItems(wis as any) } catch {}
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
    setLines(prev => [...prev, { materialId, uomId, quantity, priceSource, notes }])
    setMaterialId(''); setUomId(''); setQuantity(1); setPriceSource('moving_average'); setNotes('')
  }
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx))


  const onCreateAndPost = async (values: FormValues) => {
    if (!orgId) { showToast('Select organization first', { severity: 'warning' }); return }
    if (!user?.id) { showToast('User not identified', { severity: 'warning' }); return }
    try {
      // values already validated
      const payloads = (lines.length ? lines : [{
        materialId: values.materialId,
        uomId: values.uomId,
        quantity: values.quantity,
        priceSource: values.priceSource,
        notes: values.notes || '',
      }])
      setLoading(true)
      // 1) Create issue document (draft)
      const doc = await createInventoryDocument({ org_id: orgId, doc_type: 'issue' as DocType, document_date: new Date().toISOString().slice(0,10), location_from_id: values.locationId, status: 'draft' })
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
          unit_cost: null as any,
          price_source: ln.priceSource,
          project_id: values.projectId || null,
          cost_center_id: values.costCenterId || null,
          analysis_work_item_id: values.analysisItemId || null,
          work_item_id: values.workItemId || null,
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
      showToast('Issue posted successfully', { severity: 'success' })
      // reset form but keep lookups
      reset({ orgId, locationId: '', materialId: '', uomId: '', quantity: 1, priceSource: 'moving_average', notes: '', projectId: wfProjectId || '', costCenterId: wfCostCenterId || '', analysisItemId: wfAnalysisItemId || '', workItemId: wfWorkItemId || '' })
      setLines([])
    } catch (e: any) {
      showToast(e?.message || 'Operation failed', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 16 }}>
<Typography variant="h6" gutterBottom>Issue to Project / صرف للمشروع</Typography>
          <DocumentActionsBar />
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onCreateAndPost)}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <AsyncAutocomplete
                  label="Location (from) / موقع"
                  value={locationId}
                  onChange={(v) => { (document.activeElement as HTMLElement)?.blur?.(); (register('locationId').onChange as any)({ target: { value: v } }) }}
                  loader={locationLoader}
                  error={!!errors.locationId}
                  helperText={errors.locationId?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <AsyncAutocomplete
                  label="Material / مادة"
                  value={materialId}
                  onChange={(v) => { (document.activeElement as HTMLElement)?.blur?.(); (register('materialId').onChange as any)({ target: { value: v } }) }}
                  loader={materialLoader}
                  error={!!errors.materialId}
                  helperText={errors.materialId?.message}
                />
              </Grid>
              <Grid item xs={12} md={4}>
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
                  <MenuItem value="manual">Manual (requires unit cost; disabled here)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Project / المشروع" {...register('projectId')} error={!!errors.projectId} helperText={errors.projectId?.message} value={projectId || ''} onChange={() => {}}>
                  <MenuItem value="">—</MenuItem>
                  {projects.map(p => (<MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Cost Center / مركز التكلفة" {...register('costCenterId')} error={!!errors.costCenterId} helperText={errors.costCenterId?.message} value={costCenterId || ''} onChange={() => {}}>
                  <MenuItem value="">—</MenuItem>
                  {costCenters.map(c => (<MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Analysis Work Item / بند تحليلي" {...register('analysisItemId')} error={!!errors.analysisItemId} helperText={errors.analysisItemId?.message} value={analysisItemId || ''} onChange={() => {}}>
                  <MenuItem value="">—</MenuItem>
                  {analysisItems.map(a => (<MenuItem key={a.id} value={a.id}>{a.code} - {a.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Work Item / بند أعمال" {...register('workItemId')} error={!!errors.workItemId} helperText={errors.workItemId?.message} value={workItemId || ''} onChange={() => {}}>
                  <MenuItem value="">—</MenuItem>
                  {workItems.map(w => (<MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>))}
                </TextField>
              </Grid>
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

export default IssueMaterialsPage