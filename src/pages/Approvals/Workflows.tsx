import React, { useEffect, useState } from 'react'
import { listWorkflows, listSteps, createWorkflow, updateWorkflow, deleteWorkflow, addStep, updateStep, deleteStep, listRoles, type RoleRow, searchUsersByEmail, cloneWorkflow, normalizeWorkflowSteps, type ApprovalWorkflowRow, type ApprovalStepRow } from '../../services/approvals'
import { supabase } from '../../utils/supabase'
import { useToast } from '../../contexts/ToastContext'
import './Approvals.css'

const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<ApprovalWorkflowRow[]>([])
  const [selected, setSelected] = useState<ApprovalWorkflowRow | null>(null)
  const [steps, setSteps] = useState<ApprovalStepRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editStepForm, setEditStepForm] = useState<{ name: string; approver_type: 'role' | 'user' | 'org_manager'; approver_role_id: string; approver_user_id: string; step_order: number; required_approvals: number; is_final: boolean }>({ name: '', approver_type: 'role', approver_role_id: '', approver_user_id: '', step_order: 1, required_approvals: 1, is_final: false })
  const [userLabelMap, setUserLabelMap] = useState<Record<string,string>>({})
  const [form, setForm] = useState<{ name: string; org_id: string; is_active: boolean }>({ name: '', org_id: '', is_active: true })
  const [stepForm, setStepForm] = useState<{ name: string; approver_type: 'role' | 'user' | 'org_manager'; approver_role_id: string; approver_user_id: string; step_order: number; required_approvals: number; is_final: boolean }>({ name: '', approver_type: 'role', approver_role_id: '', approver_user_id: '', step_order: 1, required_approvals: 1, is_final: false })
  const [orgs, setOrgs] = useState<{ id: string; code: string; name: string }[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const { showToast } = useToast()
  const [userQuery, setUserQuery] = useState('')
  const [userMatches, setUserMatches] = useState<{ id: string; email: string | null }[]>([])
  
  const [wfErrors, setWfErrors] = useState<{ name?: string }>({})
  const [stepErrors, setStepErrors] = useState<{ name?: string; approver?: string; step_order?: string; is_final?: string }>({})

  async function moveStep(s: ApprovalStepRow, dir: 'up' | 'down') {
    if (!selected) return
    // Determine neighbor by step_order
    const sorted = steps.slice().sort((a,b) => a.step_order - b.step_order)
    const idx = sorted.findIndex(x => x.id === s.id)
    if (idx === -1) return
    const neighbor = dir === 'up' ? sorted[idx - 1] : sorted[idx + 1]
    if (!neighbor) return
    const maxOrder = sorted[sorted.length - 1]?.step_order || 0
    // Final-step guard: final must remain last
    if (s.is_final && (dir === 'up' || neighbor.step_order !== maxOrder)) {
      setStepErrors(prev => ({ ...prev, is_final: 'لا يمكن نقل الخطوة النهائية، يجب أن تبقى الأخيرة' }))
      return
    }
    if (neighbor.is_final && dir === 'down') {
      setStepErrors(prev => ({ ...prev, is_final: 'لا يمكن تجاوز الخطوة النهائية — يجب أن تبقى الأخيرة' }))
      return
    }
    // Swap orders
    const sNewOrder = neighbor.step_order
    const nNewOrder = s.step_order
    await updateStep(s.id, { step_order: sNewOrder } as any)
    await updateStep(neighbor.id, { step_order: nNewOrder } as any)
    await reload()
  }

  async function reload() {
    setLoading(true)
    try {
      setError(null)
      const [wf, orgsData, rolesList] = await Promise.all([
        listWorkflows(),
        supabase.from('organizations').select('id, code, name').order('code', { ascending: true }),
        listRoles()
      ])
      setWorkflows(wf)
      setOrgs((orgsData.data as any[]) || [])
      setRoles(rolesList)
      if (selected) {
        const st = await listSteps(selected.id)
        setSteps(st)
      }
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل بيانات الموافقات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])
  useEffect(() => {
    if (!selected) { setSteps([]); setUserLabelMap({}); return }
    listSteps(selected.id).then(async (st) => {
      setSteps(st)
      try {
        const userIds = Array.from(new Set(st.filter(s => s.approver_type==='user' && s.approver_user_id).map(s => String(s.approver_user_id))))
        if (userIds.length > 0) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('id, email, full_name_ar, first_name, last_name')
            .in('id', userIds)
          if (!error && data) {
            const map: Record<string,string> = {}
            for (const r of data as any[]) {
              map[r.id] = r.full_name_ar || [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || r.id
            }
            setUserLabelMap(map)
          } else { setUserLabelMap({}) }
        } else {
          setUserLabelMap({})
        }
      } catch { setUserLabelMap({}) }
    }).catch(() => { setSteps([]); setUserLabelMap({}) })
  }, [selected?.id])

  const clearForms = () => {
    setForm({ name: '', org_id: '', is_active: true })
    setStepForm({ name: '', approver_type: 'role', approver_role_id: '', approver_user_id: '', step_order: 1, required_approvals: 1, is_final: false })
    setWfErrors({})
    setStepErrors({})
  }

  if (loading) return <div className="approval-container">جاري التحميل...</div>
  if (error) return <div className="approval-container error">{error}</div>

  return (
    <div className="approval-container" dir="rtl">
      <div className="approval-header">
        <h1 className="approval-title">إدارة مسارات الموافقات</h1>
        <div className="approval-actions">
          <button className="ultimate-btn" onClick={() => reload()}>تحديث</button>
          {selected && (
            <>
              <button className="ultimate-btn ultimate-btn-edit" onClick={async () => {
                const name = window.prompt('اسم المسار الجديد للنسخ؟', `${selected.name} (نسخة)`)
                if (!name) return
                const orgId = window.confirm('نسخ إلى نفس المؤسسة؟ اختر إلغاء لتحديد مؤسسة أخرى') ? (selected.org_id || '') : (window.prompt('أدخل Org ID أو اتركه فارغاً', selected.org_id || '') || '')
                await cloneWorkflow(selected.id, name, orgId || null)
                await reload()
              }}>استنساخ المسار</button>
              <button className="ultimate-btn" title="تطبيع ترتيب الخطوات" onClick={async () => { await normalizeWorkflowSteps(selected.id); await reload(); showToast('تم تطبيع ترتيب الخطوات', { severity: 'success' }) }}>تطبيع الترتيب</button>
            </>
          )}
        </div>
      </div>

      <div className="approval-table-wrap" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Workflows list */}
          <div>
            <h3 className="modal-title">المسارات</h3>
            <table className="approval-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>المؤسسة</th>
                  <th>نشط</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(w => (
                  <tr key={w.id} className={selected?.id === w.id ? 'selected' : ''}>
                    <td>{w.name}</td>
                    <td>{orgs.find(o => o.id === (w.org_id || ''))?.code || '—'}</td>
                    <td>{w.is_active ? 'نعم' : 'لا'}</td>
                    <td>
                      <div className="actions">
                        <button className="ultimate-btn ultimate-btn-edit" onClick={() => setSelected(w)}>تحديد</button>
                        <button className="ultimate-btn ultimate-btn-delete" onClick={async () => { if (!confirm('حذف المسار؟')) return; await deleteWorkflow(w.id); if (selected?.id===w.id) setSelected(null); await reload() }}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {workflows.length === 0 && (
                  <tr><td colSpan={4} className="empty">لا توجد مسارات</td></tr>
                )}
              </tbody>
            </table>

            {/* Create / Update Workflow */}
            <div style={{ marginTop: 12 }}>
              <h4 className="modal-title">{selected ? 'تعديل المسار المحدد' : 'إضافة مسار'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <input className="filter-input" placeholder="اسم المسار" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setWfErrors(prev => ({ ...prev, name: '' })) }} />
                  {wfErrors.name && <div className="error" style={{ fontSize: 12 }}>{wfErrors.name}</div>}
                </div>
                <select className="filter-select" value={form.org_id} onChange={e => setForm({ ...form, org_id: e.target.value })}>
                  <option value="">بدون مؤسسة</option>
                  {orgs.map(o => (<option key={o.id} value={o.id}>{o.code} - {o.name}</option>))}
                </select>
                <select className="filter-select" value={form.is_active ? '1' : '0'} onChange={e => setForm({ ...form, is_active: e.target.value==='1' })}>
                  <option value="1">نشط</option>
                  <option value="0">غير نشط</option>
                </select>
              </div>
              <div className="actions" style={{ marginTop: 8 }}>
                {selected ? (
                  <>
                    <button className="ultimate-btn ultimate-btn-edit" onClick={async () => {
                      const errs: typeof wfErrors = {}
                      if (!form.name.trim()) errs.name = 'أدخل اسم المسار'
                      setWfErrors(errs)
                      if (Object.keys(errs).length > 0) return
                      await updateWorkflow(selected.id, { name: form.name || selected.name, org_id: form.org_id || selected.org_id || null, is_active: form.is_active }); await reload(); clearForms();
                    }}>حفظ</button>
                    <button className="ultimate-btn ultimate-btn-warning" onClick={() => { setSelected(null); clearForms() }}>إلغاء</button>
                  </>
                ) : (
                  <button className="ultimate-btn ultimate-btn-add" onClick={async () => {
                    const errs: typeof wfErrors = {}
                    if (!form.name.trim()) errs.name = 'أدخل اسم المسار'
                    setWfErrors(errs)
                    if (Object.keys(errs).length > 0) return
                    await createWorkflow({ name: form.name.trim(), org_id: form.org_id || null, is_active: form.is_active }); await reload(); clearForms();
                  }}>إضافة</button>
                )}
              </div>
            </div>
          </div>

          {/* Steps for selected workflow */}
          <div>
            <h3 className="modal-title">الخطوات {selected ? `(${selected.name})` : ''}</h3>
            {selected ? (
              <>
                <table className="approval-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الاسم</th>
                      <th>الموافق</th>
                      <th>نهائي</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map(s => {
                      const isEditing = editingStepId === s.id
                      const maxOrder = steps.length ? Math.max(...steps.map(x => x.step_order)) : 0
                      const roleName = s.approver_type==='role' ? (roles.find(r => String(r.id)===String(s.approver_role_id))?.name_ar || roles.find(r => String(r.id)===String(s.approver_role_id))?.name || s.approver_role_id) : null
                      const userLabel = s.approver_type==='user' ? (userLabelMap[String(s.approver_user_id)] || String(s.approver_user_id || '').slice(0,8)) : null
                      return (
                        <tr key={s.id}
                            draggable={!isEditing}
                            onDragStart={e => { try { e.dataTransfer.setData('text/plain', s.id) } catch {} }}
                            onDragOver={e => { e.preventDefault() }}
                            onDrop={async e => {
                              e.preventDefault()
                              const srcId = e.dataTransfer.getData('text/plain')
                              if (!srcId || srcId === s.id) return
                              const src = steps.find(x => x.id === srcId)
                              if (!src) return
                              // Guard final step cannot move
                              if (src.is_final) { setStepErrors(prev => ({ ...prev, is_final: 'لا يمكن نقل الخطوة النهائية' })); return }
                              // Swap orders with drop target
                              await updateStep(src.id, { step_order: s.step_order } as any)
                              await updateStep(s.id, { step_order: src.step_order } as any)
                              await normalizeWorkflowSteps(selected!.id)
                              await reload()
                            }}
                          >
                          <td>{isEditing ? (
                            <input className="filter-input" type="number" min={1} value={editStepForm.step_order} onChange={e => setEditStepForm(prev => ({ ...prev, step_order: parseInt(e.target.value||'1',10) }))} />
                          ) : s.step_order}</td>
                          <td>{isEditing ? (
                            <input className="filter-input" value={editStepForm.name} onChange={e => setEditStepForm(prev => ({ ...prev, name: e.target.value }))} />
                          ) : s.name}</td>
                          <td>{isEditing ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <select className="filter-select" value={editStepForm.approver_type} onChange={e => setEditStepForm(prev => ({ ...prev, approver_type: e.target.value as any, approver_role_id: '', approver_user_id: '' }))}>
                                <option value="role">دور</option>
                                <option value="user">مستخدم</option>
                                <option value="org_manager">مدير المؤسسة</option>
                              </select>
                              {editStepForm.approver_type==='role' ? (
                                <select className="filter-select" value={editStepForm.approver_role_id} onChange={e => setEditStepForm(prev => ({ ...prev, approver_role_id: e.target.value }))}>
                                  <option value="">اختر دوراً</option>
                                  {roles.map(r => (<option key={r.id} value={r.id}>{r.id} - {r.name_ar || r.name}</option>))}
                                </select>
                              ) : editStepForm.approver_type==='user' ? (
                                <>
                                  <input className="filter-input" placeholder="بحث بريد المستخدم" value={userQuery} onChange={async e => {
                                    const v = e.target.value; setUserQuery(v)
                                    if (v.trim().length >= 2) {
                                      try { const matches = await searchUsersByEmail(v.trim()); setUserMatches(matches) } catch { setUserMatches([]) }
                                    } else { setUserMatches([]) }
                                  }} />
                                  <select className="filter-select" value={editStepForm.approver_user_id} onChange={e => setEditStepForm(prev => ({ ...prev, approver_user_id: e.target.value }))}>
                                    <option value="">اختر مستخدماً</option>
                                    {userMatches.map(u => (
                                      <option key={u.id} value={u.id}>{(u.email || '').substring(0, 40)} ({u.id.slice(0,8)})</option>
                                    ))}
                                  </select>
                                </>
                              ) : (<span />)}
                            </div>
                          ) : (
                            s.approver_type === 'role' ? `دور: ${roleName}` : s.approver_type === 'user' ? `مستخدم: ${userLabel}` : 'مدير المؤسسة'
                          )}</td>
                          <td>{isEditing ? (
                            <select className="filter-select" value={editStepForm.is_final ? '1' : '0'} onChange={e => setEditStepForm(prev => ({ ...prev, is_final: e.target.value==='1' }))} disabled={editStepForm.step_order !== maxOrder}>
                              <option value="0">غير نهائي</option>
                              <option value="1">نهائي</option>
                            </select>
                          ) : (s.is_final ? 'نعم' : 'لا')}</td>
                          <td>
                            <div className="actions">
                              {isEditing ? (
                                <>
                                  <button className="ultimate-btn ultimate-btn-success" onClick={async () => {
                                    // validations similar to add
                                    const errs: typeof stepErrors = {}
                                    if (!editStepForm.name.trim()) errs.name = 'أدخل اسم الخطوة'
                                    if (editStepForm.step_order < 1) errs.step_order = 'رقم الخطوة غير صالح'
                                    if (editStepForm.approver_type === 'role' && !String(editStepForm.approver_role_id || '').trim()) errs.approver = 'اختر دوراً'
                                    if (editStepForm.approver_type === 'user' && !String(editStepForm.approver_user_id || '').trim()) errs.approver = 'اختر مستخدماً'
                                    const currentMax = steps.filter(x => x.id !== s.id).reduce((m, x) => Math.max(m, x.step_order), 0)
                                    if (editStepForm.is_final && editStepForm.step_order !== currentMax + 1) {
                                      errs.is_final = `الخطوة النهائية يجب أن تكون الأخيرة (${currentMax + 1})`
                                    }
                                    setStepErrors(errs)
                                    if (Object.keys(errs).length > 0) return
                                    await updateStep(s.id, {
                                      name: editStepForm.name,
                                      approver_type: editStepForm.approver_type,
                                      approver_role_id: editStepForm.approver_type==='role' ? (editStepForm.approver_role_id ? Number(editStepForm.approver_role_id) : null) : null,
                                      approver_user_id: editStepForm.approver_type==='user' ? (editStepForm.approver_user_id || null) : null,
                                      step_order: editStepForm.step_order,
                                      required_approvals: Math.max(1, editStepForm.required_approvals),
                                      is_final: editStepForm.is_final,
                                    } as any)
                                    setEditingStepId(null)
                                    await reload()
                                  }}>حفظ</button>
                                  <button className="ultimate-btn ultimate-btn-warning" onClick={() => { setEditingStepId(null) }}>إلغاء</button>
                                </>
                              ) : (
                                <>
                                  <button className="ultimate-btn" title="تحريك لأعلى" onClick={() => moveStep(s, 'up')} disabled={s.step_order <= 1}>▲</button>
                                  <button className="ultimate-btn" title="تحريك لأسفل" onClick={() => moveStep(s, 'down')} disabled={s.step_order >= (steps.length ? Math.max(...steps.map(x => x.step_order)) : s.step_order)}>▼</button>
                                  {!s.is_final && (
                                    <button className="ultimate-btn" title="أعلى" onClick={async () => {
                                    // Move to top: set this step to 1, shift others accordingly; guard final
                                    if (s.is_final) { setStepErrors(prev => ({ ...prev, is_final: 'لا يمكن نقل الخطوة النهائية' })); return }
                                    const others = steps.filter(x => x.id !== s.id).sort((a,b) => a.step_order - b.step_order)
                                    await updateStep(s.id, { step_order: 1 } as any)
                                    let ord = 2
                                    for (const o of others) {
                                      await updateStep(o.id, { step_order: ord } as any)
                                      ord++
                                    }
                                    await reload()
                                  }}>⏫</button>
                                  )}
                                  <button className="ultimate-btn" title="أسفل" onClick={async () => {
                                    // Move to bottom: set to max+1 then normalize; final guard holds
                                    const maxOrder = steps.length ? Math.max(...steps.map(x => x.step_order)) : 0
                                    await updateStep(s.id, { step_order: maxOrder + 1 } as any)
                                    await normalizeWorkflowSteps(selected!.id)
                                    await reload()
                                  }}>⏬</button>
                                  {!s.is_final && (<>
                                  <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                                    setEditingStepId(s.id)
                                    setEditStepForm({
                                      name: s.name,
                                      approver_type: s.approver_type,
                                      approver_role_id: String(s.approver_role_id || ''),
                                      approver_user_id: String(s.approver_user_id || ''),
                                      step_order: s.step_order,
                                      required_approvals: s.required_approvals,
                                      is_final: s.is_final,
                                    })
                                  }}>تعديل</button>
                                  </>)}
                                  <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                                    setEditingStepId(s.id)
                                    setEditStepForm({
                                      name: s.name,
                                      approver_type: s.approver_type,
                                      approver_role_id: String(s.approver_role_id || ''),
                                      approver_user_id: String(s.approver_user_id || ''),
                                      step_order: s.step_order,
                                      required_approvals: s.required_approvals,
                                      is_final: s.is_final,
                                    })
                                  }}>تعديل</button>
                                  <button className="ultimate-btn ultimate-btn-delete" onClick={async () => { if (!confirm('حذف الخطوة؟')) return; await deleteStep(s.id); await reload() }}>حذف</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {steps.length === 0 && (
                      <tr><td colSpan={5} className="empty">لا توجد خطوات</td></tr>
                    )}
                  </tbody>
                </table>

                {/* Add step */}
                <div style={{ marginTop: 12 }}>
                  <h4 className="modal-title">إضافة خطوة</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <input className="filter-input" type="number" min={1} value={stepForm.step_order} onChange={e => { setStepForm({ ...stepForm, step_order: parseInt(e.target.value||'1',10) }); setStepErrors(prev => ({ ...prev, step_order: '' })) }} />
                      {stepErrors.step_order && <div className="error" style={{ fontSize: 12 }}>{stepErrors.step_order}</div>}
                    </div>
                    <div>
                      <input className="filter-input" placeholder="اسم الخطوة" value={stepForm.name} onChange={e => { setStepForm({ ...stepForm, name: e.target.value }); setStepErrors(prev => ({ ...prev, name: '' })) }} />
                      {stepErrors.name && <div className="error" style={{ fontSize: 12 }}>{stepErrors.name}</div>}
                    </div>
                    <select className="filter-select" value={stepForm.approver_type} onChange={e => setStepForm({ ...stepForm, approver_type: e.target.value as any, approver_role_id: '', approver_user_id: '' })}>
                      <option value="role">دور</option>
                      <option value="user">مستخدم</option>
                      <option value="org_manager">مدير المؤسسة</option>
                    </select>
                    {/* Role selector */}
                    {stepForm.approver_type === 'role' ? (
                      <div>
                        <select className="filter-select" value={stepForm.approver_role_id} onChange={e => { setStepForm({ ...stepForm, approver_role_id: e.target.value }); setStepErrors(prev => ({ ...prev, approver: '' })) }}>
                          <option value="">اختر دوراً</option>
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.id} - {r.name_ar || r.name}</option>
                          ))}
                        </select>
                        {stepErrors.approver && <div className="error" style={{ fontSize: 12 }}>{stepErrors.approver}</div>}
                      </div>
                    ) : (
                      <input className="filter-input" placeholder="دور ID (للنوع دور)" value={stepForm.approver_role_id} onChange={e => setStepForm({ ...stepForm, approver_role_id: e.target.value })} />
                    )}
                    {/* User selector */}
                    {stepForm.approver_type === 'user' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="filter-input" placeholder="بحث بريد المستخدم" value={userQuery} onChange={async e => {
                          const v = e.target.value; setUserQuery(v)
                          if (v.trim().length >= 2) {
                            try { const matches = await searchUsersByEmail(v.trim()); setUserMatches(matches) } catch { setUserMatches([]) }
                          } else { setUserMatches([]) }
                        }} />
                        <div>
                          <select className="filter-select" value={stepForm.approver_user_id} onChange={e => { setStepForm({ ...stepForm, approver_user_id: e.target.value }); setStepErrors(prev => ({ ...prev, approver: '' })) }}>
                            <option value="">اختر مستخدماً</option>
                            {userMatches.map(u => (
                              <option key={u.id} value={u.id}>{(u.email || '').substring(0, 40)} ({u.id.slice(0,8)})</option>
                            ))}
                          </select>
                          {stepErrors.approver && <div className="error" style={{ fontSize: 12 }}>{stepErrors.approver}</div>}
                        </div>
                      </div>
                    ) : (
                      <input className="filter-input" placeholder="مستخدم ID (للنوع مستخدم)" value={stepForm.approver_user_id} onChange={e => setStepForm({ ...stepForm, approver_user_id: e.target.value })} />
                    )}
                    <div>
                      <select className="filter-select" value={stepForm.is_final ? '1' : '0'} onChange={e => { setStepForm({ ...stepForm, is_final: e.target.value==='1' }); setStepErrors(prev => ({ ...prev, is_final: '' })) }}>
                        <option value="0">غير نهائي</option>
                        <option value="1">نهائي</option>
                      </select>
                      {stepErrors.is_final && <div className="error" style={{ fontSize: 12 }}>{stepErrors.is_final}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <input className="filter-input" type="number" min={1} placeholder="عدد الموافقات المطلوبة" value={stepForm.required_approvals} onChange={e => setStepForm({ ...stepForm, required_approvals: parseInt(e.target.value||'1',10) })} />
                  <button className="ultimate-btn ultimate-btn-add" onClick={async () => {
                      // Inline validations
                      const errs: typeof stepErrors = {}
                      if (!stepForm.name.trim()) errs.name = 'أدخل اسم الخطوة'
                      if (stepForm.step_order < 1) errs.step_order = 'رقم الخطوة غير صالح'
                      if (stepForm.approver_type === 'role' && !String(stepForm.approver_role_id || '').trim()) errs.approver = 'اختر دوراً'
                      if (stepForm.approver_type === 'user' && !String(stepForm.approver_user_id || '').trim()) errs.approver = 'اختر مستخدماً'
                      // Guard: final step must be last
                      const maxOrder = (steps[steps.length-1]?.step_order || 0)
                      if (stepForm.is_final && stepForm.step_order !== maxOrder + 1) {
                        errs.is_final = `يجب أن تكون الخطوة النهائية آخر خطوة (الترتيب يجب أن يكون ${maxOrder + 1})`
                      }
                      setStepErrors(errs)
                      if (Object.keys(errs).length > 0) return
                      await addStep(selected.id, {
                        name: stepForm.name.trim(),
                        approver_type: stepForm.approver_type,
                        approver_role_id: stepForm.approver_type === 'role' ? (stepForm.approver_role_id ? Number(stepForm.approver_role_id) : null) : null,
                        approver_user_id: stepForm.approver_type === 'user' ? (stepForm.approver_user_id || null) : null,
                        step_order: stepForm.step_order,
                        required_approvals: Math.max(1, stepForm.required_approvals),
                        is_final: stepForm.is_final
                      } as any)
                      await reload()
                      setStepForm({ name: '', approver_type: 'role', approver_role_id: '', approver_user_id: '', step_order: (steps[steps.length-1]?.step_order||0)+1, required_approvals: 1, is_final: false })
                    }}>إضافة خطوة</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty">اختر مساراً لعرض الخطوات</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowsPage
