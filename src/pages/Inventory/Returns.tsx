import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Typography, Grid, TextField, MenuItem, Button, Divider } from '@mui/material'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { listMaterials, type MaterialRow } from '@/services/inventory/materials'
import { listAnalysisWorkItems } from '@/services/analysis-work-items'
import { listWorkItemsAll } from '@/services/work-items'
import type { AnalysisWorkItemFull } from '@/types/analysis-work-items'
import type { WorkItemRow } from '@/types/work-items'
import { getCostCentersList, type CostCenterRow } from '@/services/cost-centers'
import { listInventoryLocations, type InventoryLocationRow } from '@/services/inventory/locations'
import { createInventoryDocument, addInventoryDocumentLine, approveInventoryDocument, type DocType } from '@/services/inventory/documents'
import { listUOMs, type UomRow } from '@/services/inventory/uoms'
import { useScopeOptional } from '@/contexts/ScopeContext'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AsyncAutocomplete, { type AsyncOption } from '@/components/Common/AsyncAutocomplete'
import DocumentActionsBar from '@/components/Inventory/DocumentActionsBar'

const ReturnsPage: React.FC = () => {
  const { showToast } = useToast()
  const { user } = useAuth()

  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''
  const scopeProjectId = scope?.currentProject?.id || ''

  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [locations, setLocations] = useState<InventoryLocationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [uoms, setUoms] = useState<UomRow[]>([])
  const projects = scope?.availableProjects || []
  const [projectId, setProjectId] = useState<string>('')
  const [costCenters, setCostCenters] = useState<CostCenterRow[]>([])
  const [costCenterId, _setCostCenterId] = useState<string>('')
  const [analysisItems, setAnalysisItems] = useState<AnalysisWorkItemFull[]>([])
  const [analysisItemId, _setAnalysisItemId] = useState<string>('')
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([])
  const [workItemId, _setWorkItemId] = useState<string>('')

  type Line = { materialId: string; uomId: string; quantity: number; returnType: 'from_project' | 'to_vendor'; priceSource: 'moving_average' | 'last_purchase' | 'manual'; unitCost?: number; notes: string }
  const [lines, setLines] = useState<Line[]>([])

  // RHF + Zod schemas
  const lineSchema = z.object({
    materialId: z.string().uuid('Invalid material'),
    uomId: z.string().uuid('Invalid UOM'),
    returnType: z.enum(['from_project', 'to_vendor']).default('from_project'),
    quantity: z.coerce.number().positive('Quantity must be > 0'),
    priceSource: z.enum(['moving_average', 'last_purchase', 'manual']).default('moving_average'),
    unitCost: z.coerce.number().min(0, 'Unit cost must be >= 0').optional(),
    notes: z.string().optional().or(z.literal('')),
  })
  const headerSchema = z.object({
    orgId: z.string().uuid('Invalid org'),
    locationId: z.string().uuid('Select location'),
    projectId: z.string().uuid().optional().or(z.literal('')),
    costCenterId: z.string().uuid().optional().or(z.literal('')),
    analysisItemId: z.string().uuid().optional().or(z.literal('')),
    workItemId: z.string().uuid().optional().or(z.literal('')),
  })
  const formSchema = headerSchema.extend({
    materialId: lineSchema.shape.materialId,
    uomId: lineSchema.shape.uomId,
    returnType: lineSchema.shape.returnType,
    quantity: lineSchema.shape.quantity,
    priceSource: lineSchema.shape.priceSource,
    unitCost: lineSchema.shape.unitCost,
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
      unitCost: 0,
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
  const returnType = watch('returnType')
  const priceSource = watch('priceSource')
  const unitCost = watch('unitCost')
  const notes = watch('notes')
  const wfProjectId = watch('projectId')

  useEffect(() => {
    if (scopeProjectId) setProjectId(prev => prev || scopeProjectId)
  }, [scopeProjectId])

  useEffect(() => {
    (async () => {
      if (!orgId) return
      setLoading(true)
      try {
        const [mats, locs, uomsRes, ccs, awi] = await Promise.all([
          listMaterials(orgId),
          listInventoryLocations(orgId),
          listUOMs(orgId),
          getCostCentersList(orgId).catch(() => [] as any),
          listAnalysisWorkItems({ orgId, projectId: wfProjectId || null, includeInactive: true }).catch(() => []),
        ])
        setMaterials(mats)
        setLocations(locs)
        setUoms(uomsRes)
        setCostCenters(ccs as any)
        setAnalysisItems(awi as any)
        try { const wis = await listWorkItemsAll(orgId, true); setWorkItems(wis as any) } catch { }
      } catch (e: any) {
        showToast(e?.message || 'Failed to load lookups', { severity: 'error' })
      } finally { setLoading(false) }
    })()
  }, [orgId, wfProjectId, showToast])

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
    setLines(prev => [...prev, { materialId, uomId, quantity, returnType: returnType || 'from_project', priceSource, unitCost, notes: notes || '' }])
    reset({ ...watch(), materialId: '', uomId: '', quantity: 1, unitCost: 0, priceSource, notes: '' })
  }
  const removeLine = (idx: number) => {
    if (window.confirm('Remove this line?')) {
      setLines(prev => prev.filter((_, i) => i !== idx))
    }
  }
  const duplicateLine = (idx: number) => {
    setLines(prev => {
      const copy = [...prev]
      const src = copy[idx]
      if (!src) return prev
      const dup = { ...src }
      copy.splice(idx + 1, 0, dup)
      return copy
    })
  }

  const hasLineErrors = useMemo(() => {
    if (!lines.length && (!materialId || !uomId || !(quantity > 0))) return true
    const arr = lines.length ? lines : [{ materialId, uomId, quantity, priceSource, unitCost, notes, returnType: returnType || 'from_project' } as any]
    for (const ln of arr) {
      if (!ln.materialId || !ln.uomId) return true
      if (!(Number(ln.quantity) > 0)) return true
      if (ln.priceSource === 'manual' && !(ln.unitCost == null || Number(ln.unitCost) >= 0)) return true
    }
    return false
  }, [lines, materialId, uomId, quantity, priceSource, unitCost, notes, returnType])

  const onCreateAndPost = async (values: FormValues) => {
    if (!orgId) { showToast('Select organization first', { severity: 'warning' }); return }
    if (!user?.id) { showToast('User not identified', { severity: 'warning' }); return }
    try {
      const payloads = (lines.length ? lines : [{
        materialId: values.materialId,
        uomId: values.uomId,
        quantity: values.quantity,
        priceSource: values.priceSource,
        unitCost: values.unitCost,
        notes: values.notes || '',
      }])
      setLoading(true)
      const doc = await createInventoryDocument({ org_id: orgId, doc_type: 'return' as DocType, document_date: new Date().toISOString().slice(0, 10), status: 'draft' })
      let lineNo = 1
      for (const ln of payloads) {
        await addInventoryDocumentLine({
          org_id: orgId,
          document_id: doc.id,
          line_no: lineNo++,
          material_id: ln.materialId,
          uom_id: ln.uomId,
          quantity: Number(ln.quantity || 0),
          unit_cost: ln.priceSource === 'manual' ? Number(ln.unitCost || 0) : null as any,
          price_source: ln.priceSource,
          project_id: values.projectId || null,
          cost_center_id: values.costCenterId || null,
          analysis_work_item_id: values.analysisItemId || null,
          work_item_id: values.workItemId || null,
          location_id: values.locationId,
          lot_id: null,
          serial_id: null,
          notes: ln.notes,
        })
      }
      await approveInventoryDocument(orgId, doc.id, user.id)
      // Post via inventory function to support explicit return type without negative line qty
      const postType = (lines[0]?.returnType || values.returnType || 'from_project') as 'from_project' | 'to_vendor'
      const { postReturnWithType } = await import('@/services/inventory/documents')
      await postReturnWithType({ orgId, documentId: doc.id, userId: user.id, returnType: postType })
      showToast('Return posted successfully', { severity: 'success' })
      reset({ ...values, materialId: '', uomId: '', quantity: 1, unitCost: 0, notes: '' })
      setLines([])
    } catch (e: any) {
      showToast(e?.message || 'Operation failed', { severity: 'error' })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>Returns / مرتجعات</Typography>
      <DocumentActionsBar />
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onCreateAndPost)}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <AsyncAutocomplete
                  label="Location / موقع"
                  value={locationId}
                  onChange={(v) => { (document.activeElement as HTMLElement)?.blur?.(); (register('locationId').onChange as any)({ target: { value: v } }) }}
                  loader={locationLoader}
                  error={!!errors.locationId}
                  helperText={errors.locationId?.message}
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
                <TextField select fullWidth label="UOM / وحدة" {...register('uomId')} error={!!errors.uomId} helperText={errors.uomId?.message} value={uomId} onChange={() => { }}>
                  {uoms.map(u => (<MenuItem key={u.id} value={u.id}>{u.code} - {u.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Return Type / نوع المرتجع" {...register('returnType')} error={!!errors.returnType} helperText={errors.returnType?.message} value={returnType || 'from_project'} onChange={() => { }}>
                  <MenuItem value="from_project">Return from Project / مرتجع من مشروع</MenuItem>
                  <MenuItem value="to_vendor">Return to Vendor / مرتجع إلى المورد</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField type="number" fullWidth label="Quantity / الكمية" {...register('quantity', { valueAsNumber: true })} error={!!errors.quantity} helperText={errors.quantity?.message} value={quantity} onChange={() => { }} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Price Source / طريقة التسعير" {...register('priceSource')} error={!!errors.priceSource} helperText={priceSource !== 'manual' ? 'Unit cost will be auto-computed on post' : (errors.priceSource?.message || '')} value={priceSource} onChange={() => { }}>
                  <MenuItem value="moving_average">Moving Average (auto)</MenuItem>
                  <MenuItem value="last_purchase">Last Purchase (auto)</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                </TextField>
              </Grid>
              {priceSource === 'manual' && (
                <Grid item xs={12} md={3}>
                  <TextField type="number" fullWidth label="Unit Cost / سعر الوحدة" {...register('unitCost', { valueAsNumber: true })} error={!!errors.unitCost} helperText={errors.unitCost?.message} value={unitCost} onChange={() => { }} />
                </Grid>
              )}
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Project / المشروع" {...register('projectId')} error={!!errors.projectId} helperText={errors.projectId?.message} value={projectId || ''} onChange={() => { }}>
                  <MenuItem value="">—</MenuItem>
                  {projects.map(p => (<MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Cost Center / مركز التكلفة" {...register('costCenterId')} error={!!errors.costCenterId} helperText={errors.costCenterId?.message} value={costCenterId || ''} onChange={() => { }}>
                  <MenuItem value="">—</MenuItem>
                  {costCenters.map(c => (<MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Analysis Work Item / بند تحليلي" {...register('analysisItemId')} error={!!errors.analysisItemId} helperText={errors.analysisItemId?.message} value={analysisItemId || ''} onChange={() => { }}>
                  <MenuItem value="">—</MenuItem>
                  {analysisItems.map(a => (<MenuItem key={a.id} value={a.id}>{a.code} - {a.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Work Item / بند أعمال" {...register('workItemId')} error={!!errors.workItemId} helperText={errors.workItemId?.message} value={workItemId || ''} onChange={() => { }}>
                  <MenuItem value="">—</MenuItem>
                  {workItems.map(w => (<MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Notes / ملاحظات" {...register('notes')} error={!!errors.notes} helperText={errors.notes?.message} value={notes || ''} onChange={() => { }} />
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={1} alignItems="center">
              <Grid item>
                <Button variant="outlined" onClick={addLine} disabled={loading || isSubmitting}>Add Line / إضافة سطر</Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={async () => {
                  try {
                    const txt = await navigator.clipboard.readText()
                    if (!txt || !txt.trim()) { showToast('Clipboard is empty', { severity: 'warning' }); return }
                    const rows = txt.split(/\r?\n/).map(r => r.trim()).filter(Boolean)
                    const newLines: Line[] = []
                    for (const r of rows) {
                      const cols = r.split('\t')
                      if (cols.length < 3) continue
                      const [matCode, uomCode, qtyStr, unitCostStr, returnTypeStr, notesStr] = cols
                      const mat = materials.find(m => m.material_code?.toLowerCase() === String(matCode).toLowerCase() || m.id === matCode)
                      const uom = uoms.find(u => u.code?.toLowerCase() === String(uomCode).toLowerCase() || u.id === uomCode)
                      const qty = Number(qtyStr)
                      const unitCostParsed = unitCostStr != null && unitCostStr !== '' ? Number(unitCostStr) : undefined
                      const rType = (String(returnTypeStr || '').toLowerCase() === 'to_vendor' || String(returnTypeStr || '').toLowerCase() === 'to vendor') ? 'to_vendor' : 'from_project'
                      if (!mat || !uom || !(qty > 0)) continue
                      newLines.push({ materialId: mat.id, uomId: uom.id, quantity: qty, returnType: rType as any, priceSource: unitCostParsed != null ? 'manual' : 'moving_average', unitCost: unitCostParsed, notes: notesStr || '' })
                    }
                    if (newLines.length === 0) { showToast('No valid rows found. Expected columns: material_code, uom_code, quantity, [unit_cost], [return_type], [notes]', { severity: 'info' }); return }
                    setLines(prev => [...prev, ...newLines])
                    showToast(`Added ${newLines.length} line(s) from clipboard`, { severity: 'success' })
                  } catch (e: any) {
                    showToast(e?.message || 'Failed to read clipboard', { severity: 'error' })
                  }
                }} disabled={loading || isSubmitting}>Paste from Excel</Button>
              </Grid>
              <Grid item>
                <Button type="submit" variant="contained" color="primary" disabled={loading || isSubmitting || hasLineErrors} title={hasLineErrors ? 'Fix line errors before posting' : ''}>Create, Approve & Post / إنشاء واعتماد وترحيل</Button>
              </Grid>
            </Grid>
          </form>
          {!!lines.length && (
            <div style={{ marginTop: 12 }}>
              <Typography variant="subtitle1" gutterBottom>Pending Lines / الأسطر المضافة</Typography>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>#</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Material</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>UOM</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Return Type</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Unit Cost</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Line Value</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Project / Cost Center</th>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Notes</th>
                      <th style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((ln, idx) => {
                      const qtyErr = !(ln.quantity > 0)
                      const costErr = !(ln.unitCost == null || ln.unitCost >= 0)
                      const lineValue = (ln.unitCost ?? 0) * (ln.quantity ?? 0)
                      return (
                        <tr key={idx}>
                          <td style={{ padding: 6 }}>{idx + 1}</td>
                          <td style={{ padding: 6 }}>
                            <TextField size="small" select value={ln.materialId} onChange={e => setLines(prev => prev.map((x, i) => i === idx ? { ...x, materialId: e.target.value } : x))} onKeyDown={e => { if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateLine(idx) } }} sx={{ minWidth: 200 }}>
                              {materials.map(m => (<MenuItem key={m.id} value={m.id}>{m.material_code} - {m.material_name}</MenuItem>))}
                            </TextField>
                          </td>
                          <td style={{ padding: 6 }}>
                            <TextField size="small" select value={ln.uomId} onChange={e => setLines(prev => prev.map((x, i) => i === idx ? { ...x, uomId: e.target.value } : x))} onKeyDown={e => { if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateLine(idx) } }} sx={{ minWidth: 120 }}>
                              {uoms.map(u => (<MenuItem key={u.id} value={u.id}>{u.code}</MenuItem>))}
                            </TextField>
                          </td>
                          <td style={{ padding: 6 }}>
                            <TextField size="small" select value={ln.returnType} onChange={e => setLines(prev => prev.map((x, i) => i === idx ? { ...x, returnType: e.target.value as any } : x))} onKeyDown={e => { if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateLine(idx) } }} sx={{ minWidth: 180 }}>
                              <MenuItem value="from_project">From Project</MenuItem>
                              <MenuItem value="to_vendor">To Vendor</MenuItem>
                            </TextField>
                          </td>
                          <td style={{ padding: 6, textAlign: 'right' }}>
                            <TextField size="small" type="number" value={ln.quantity} error={qtyErr} helperText={qtyErr ? '>' : ''} onChange={e => setLines(prev => prev.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} sx={{ maxWidth: 120 }} />
                          </td>
                          <td style={{ padding: 6, textAlign: 'right' }}>
                            <TextField size="small" type="number" value={ln.unitCost ?? ''} error={costErr} helperText={priceSource !== 'manual' ? 'Auto on post' : (costErr ? '>= 0' : '')} onChange={e => setLines(prev => prev.map((x, i) => i === idx ? { ...x, unitCost: e.target.value === '' ? undefined : Number(e.target.value) } : x))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }} sx={{ maxWidth: 140 }} />
                          </td>
                          <td style={{ padding: 6, textAlign: 'right' }}>{lineValue.toFixed(2)}</td>
                          <td style={{ padding: 6 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <TextField size="small" select value={(workItemId && idx === 0) ? workItemId : ''} onChange={() => { }} sx={{ minWidth: 140 }} disabled title="Work item is set at header for now" >
                                <MenuItem value="">—</MenuItem>
                                {workItems.map(w => (<MenuItem key={w.id} value={w.id}>{w.code}</MenuItem>))}
                              </TextField>
                              <TextField size="small" select value={(costCenterId && idx === 0) ? costCenterId : ''} onChange={() => { }} sx={{ minWidth: 140 }} disabled title="Cost center is set at header for now">
                                <MenuItem value="">—</MenuItem>
                                {costCenters.map(c => (<MenuItem key={c.id} value={c.id}>{c.code}</MenuItem>))}
                              </TextField>
                            </div>
                          </td>
                          <td style={{ padding: 6 }}>
                            <TextField size="small" value={ln.notes} onChange={e => setLines(prev => prev.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))} sx={{ minWidth: 200 }} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Button size="small" onClick={() => duplicateLine(idx)}>Duplicate</Button>
                              <Button size="small" onClick={() => removeLine(idx)}>Remove</Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>Totals:</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{lines.reduce((a, b) => a + (Number(b.quantity) || 0), 0)}</td>
                      <td></td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{lines.reduce((a, b) => a + ((b.unitCost ?? 0) * (Number(b.quantity) || 0)), 0).toFixed(2)}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ReturnsPage
