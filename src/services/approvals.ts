import { supabase } from '../utils/supabase'
import { getCurrentUserId } from './transactions'

export interface ApprovalInboxRow {
  request_id: string
  transaction_id: string
  entry_number: string
  entry_date: string
  amount: number
  description: string | null
  org_id: string | null
  workflow_id: string
  current_step_order: number
  step_name: string
  approver_type: 'role' | 'user' | 'org_manager'
  approver_role_id?: number | null
  approver_user_id?: string | null
  submitted_by?: string | null
  submitted_at: string
}

export async function getApprovalInbox(): Promise<ApprovalInboxRow[]> {
  const uid = await getCurrentUserId()
  if (!uid) return []
  const { data, error } = await supabase.rpc('list_approval_inbox', { p_user_id: uid })
  if (error) throw error
  return (data as any[]) as ApprovalInboxRow[]
}

export async function canApprove(requestId: string): Promise<boolean> {
  const uid = await getCurrentUserId()
  if (!uid) return false
  const { data, error } = await supabase.rpc('can_user_approve_request', { p_user_id: uid, p_request_id: requestId } as any)
  if (error) return false
  return Boolean(data)
}

export interface ApprovalHistoryRow {
  id: string
  request_id: string
  step_order: number
  action: 'approve' | 'reject' | 'request_changes' | 'comment'
  reason: string | null
  actor_user_id: string
  created_at: string
}

export async function getApprovalHistoryByTransactionId(transactionId: string): Promise<ApprovalHistoryRow[]> {
  // 1) find latest request for this transaction
  const { data: reqs, error: reqErr } = await supabase
    .from('approval_requests')
    .select('id')
    .eq('target_id', transactionId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (reqErr) throw reqErr
  const reqId = reqs?.[0]?.id
  if (!reqId) return []

  const { data, error } = await supabase
    .from('approval_actions')
    .select('id, request_id, step_order, action, reason, actor_user_id, created_at')
    .eq('request_id', reqId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as any[]) as ApprovalHistoryRow[]
}

// Admin: workflows and steps CRUD (basic)
export interface ApprovalWorkflowRow {
  id: string
  org_id: string | null
  name: string
  target_table: 'transactions'
  is_active: boolean
  created_at: string
}

export interface ApprovalStepRow {
  id: string
  workflow_id: string
  step_order: number
  name: string
  approver_type: 'role' | 'user' | 'org_manager'
  approver_role_id?: number | null
  approver_user_id?: string | null
  required_approvals: number
  is_final: boolean
  created_at: string
}

export async function listWorkflows(): Promise<ApprovalWorkflowRow[]> {
  const { data, error } = await supabase
    .from('approval_workflows')
    .select('id, org_id, name, target_table, is_active, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as any[]) as ApprovalWorkflowRow[]
}

export async function listSteps(workflowId: string): Promise<ApprovalStepRow[]> {
  const { data, error } = await supabase
    .from('approval_steps')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('step_order', { ascending: true })
  if (error) throw error
  return (data as any[]) as ApprovalStepRow[]
}

export async function createWorkflow(input: { name: string; org_id?: string | null; is_active?: boolean }): Promise<ApprovalWorkflowRow> {
  const payload = { name: input.name, org_id: input.org_id ?? null, target_table: 'transactions', is_active: input.is_active ?? true }
  const { data, error } = await supabase
    .from('approval_workflows')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data as ApprovalWorkflowRow
}

export async function updateWorkflow(id: string, updates: Partial<Pick<ApprovalWorkflowRow, 'name' | 'is_active' | 'org_id'>>): Promise<ApprovalWorkflowRow> {
  const { data, error } = await supabase
    .from('approval_workflows')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as ApprovalWorkflowRow
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await supabase
    .from('approval_workflows')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function addStep(workflowId: string, input: Omit<ApprovalStepRow, 'id' | 'workflow_id' | 'created_at'>): Promise<ApprovalStepRow> {
  const payload: any = { ...input, workflow_id: workflowId }
  const { data, error } = await supabase
    .from('approval_steps')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data as ApprovalStepRow
}

export async function updateStep(id: string, updates: Partial<Omit<ApprovalStepRow, 'id' | 'workflow_id' | 'created_at'>>): Promise<ApprovalStepRow> {
  const { data, error } = await supabase
    .from('approval_steps')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as ApprovalStepRow
}

export async function deleteStep(id: string): Promise<void> {
  const { error } = await supabase
    .from('approval_steps')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function normalizeWorkflowSteps(workflowId: string): Promise<void> {
  const sql = `
    with ranked as (
      select id, row_number() over (order by step_order, created_at) as new_order
      from public.approval_steps
      where workflow_id = $1
    )
    update public.approval_steps s
      set step_order = r.new_order
    from ranked r
    where s.id = r.id;
    with maxo as (
      select max(step_order) as max_order from public.approval_steps where workflow_id = $1
    )
    update public.approval_steps
      set is_final = case when step_order = (select max_order from maxo) then true else false end
    where workflow_id = $1;
  `
  const { error } = await supabase.rpc('exec_sql', { p_sql: sql, p_params: [workflowId] } as any)
  if (error) {
    // Fallback without exec_sql RPC: do it client-side best-effort
    const { data: steps, error: e1 } = await supabase
      .from('approval_steps')
      .select('id, step_order, created_at')
      .eq('workflow_id', workflowId)
    if (e1) throw e1
    const sorted = (steps as any[]).sort((a,b) => (a.step_order - b.step_order) || (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
    let order = 1
    for (const s of sorted) {
      await supabase.from('approval_steps').update({ step_order: order }).eq('id', s.id)
      order++
    }
    const lastId = sorted[sorted.length - 1]?.id
    for (const s of sorted) {
      await supabase.from('approval_steps').update({ is_final: s.id === lastId }).eq('id', s.id)
    }
  }
}

// Helpers for UI
export interface RoleRow { id: number; name: string; name_ar?: string | null }
export async function listRoles(): Promise<RoleRow[]> {
  const { data, error } = await supabase.from('roles').select('id, name, name_ar').order('id', { ascending: true })
  if (error) throw error
  return (data as any[]) as RoleRow[]
}

export interface UserLite { id: string; email: string | null }
export async function searchUsersByEmail(q: string): Promise<UserLite[]> {
  const { data, error } = await supabase
    .from('users') // auth schema is usually not exposed; fallback to user_profiles if needed
    .select('id, email')
    .ilike('email', `%${q}%`)
    .limit(20)
  if (error) {
    // fallback to profiles
    const { data: prof, error: pErr } = await supabase
      .from('user_profiles')
      .select('id, email')
      .ilike('email', `%${q}%`)
      .limit(20)
    if (pErr) throw pErr
    return (prof as any[]).map(r => ({ id: r.id, email: r.email }))
  }
  return (data as any[]) as UserLite[]
}

// Clone workflow (copy steps)
export async function cloneWorkflow(sourceWorkflowId: string, newName: string, newOrgId: string | null): Promise<ApprovalWorkflowRow> {
  // Read source workflow (we don't need the data, just validation)
  const { error: e1 } = await supabase
    .from('approval_workflows')
    .select('id')
    .eq('id', sourceWorkflowId)
    .single()
  if (e1) throw e1
  // Create new workflow
  const { data: created, error: e2 } = await supabase
    .from('approval_workflows')
    .insert({ name: newName, org_id: newOrgId, target_table: 'transactions', is_active: true })
    .select('*')
    .single()
  if (e2) throw e2
  const wf = created as ApprovalWorkflowRow
  // Copy steps
  const { data: steps, error: e3 } = await supabase
    .from('approval_steps')
    .select('*')
    .eq('workflow_id', sourceWorkflowId)
    .order('step_order', { ascending: true })
  if (e3) throw e3
  if (steps && steps.length) {
    const payload = (steps as any[]).map(s => ({
      workflow_id: wf.id,
      step_order: s.step_order,
      name: s.name,
      approver_type: s.approver_type,
      approver_role_id: s.approver_role_id,
      approver_user_id: s.approver_user_id,
      required_approvals: s.required_approvals,
      is_final: s.is_final,
    }))
    const { error: e4 } = await supabase.from('approval_steps').insert(payload)
    if (e4) throw e4
  }
  return wf
}

// Test utility: pick workflow for a transaction and fetch steps
export async function pickWorkflowForTransaction(txId: string): Promise<{ workflow: ApprovalWorkflowRow | null; steps: ApprovalStepRow[]; reason?: any }> {
  // Try explained RPC if available
  try {
    const { data, error } = await supabase.rpc('pick_workflow_for_transaction_explained', { p_transaction_id: txId })
    if (!error && data) {
      const wfId = (data as any).workflow_id as string | null
      const reason = (data as any).reason
      if (!wfId) return { workflow: null, steps: [], reason }
      const { data: wf, error: e1 } = await supabase.from('approval_workflows').select('*').eq('id', wfId).single()
      if (e1) throw e1
      const steps = await listSteps(wfId)
      return { workflow: wf as any, steps, reason }
    }
  } catch {}
  // Fallback to basic
  const { data: wfId, error } = await supabase.rpc('pick_workflow_for_transaction', { p_transaction_id: txId })
  if (error) throw error
  if (!wfId) return { workflow: null, steps: [] }
  const { data: wf, error: e1 } = await supabase
    .from('approval_workflows')
    .select('*')
    .eq('id', wfId as string)
    .single()
  if (e1) throw e1
  const steps = await listSteps(wfId as string)
  return { workflow: wf as any, steps }
}
