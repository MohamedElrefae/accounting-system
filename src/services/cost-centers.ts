import { supabase } from '../utils/supabase'

// Types
export type CostCenter = {
  id: string
  org_id: string
  project_id?: string | null
  parent_id?: string | null
  code: string
  name: string
  name_ar?: string | null
  description?: string | null
  is_active: boolean
  position: number
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export type CostCenterTreeNode = CostCenter & {
  level: number
  child_count: number
  has_children: boolean
  has_active_children: boolean
  children?: CostCenterTreeNode[]
  transactions_count?: number
  last_used_at?: string | null
}

export type CostCenterRow = CostCenter & {
  level: number
  child_count: number
  has_transactions: boolean
  transactions_count: number
  last_used_at?: string | null
}

export type CostCenterCreate = {
  org_id: string
  project_id?: string | null
  parent_id?: string | null
  code: string
  name: string
  name_ar?: string | null
  description?: string | null
  is_active?: boolean
  position?: number
}

export type CostCenterUpdate = {
  id: string
  code?: string
  name?: string
  name_ar?: string | null
  description?: string | null
  is_active?: boolean
  position?: number
  parent_id?: string | null
  project_id?: string | null
  org_id: string
}

// API Functions
export async function getCostCentersTree(orgId: string, includeInactive = false): Promise<CostCenterTreeNode[]> {
  try {
    const { data, error } = await supabase.rpc('get_cost_centers_tree', {
      p_org_id: orgId,
      p_include_inactive: includeInactive
    })
    if (error) throw error
    return (data as CostCenterTreeNode[]) || []
  } catch (e: any) {
    // Fallback: build tree from base table if RPC is missing/unavailable
    console.warn('get_cost_centers_tree RPC failed, using fallback from base table:', e?.message || e)
    const { data, error } = await supabase
      .from('cost_centers')
      .select('id, org_id, project_id, parent_id, code, name, name_ar, description, is_active, position, created_at, updated_at, created_by, updated_by')
      .eq('org_id', orgId)
      .order('code')
    if (error) throw new Error(`Failed to fetch cost centers (fallback): ${error.message}`)
    const base = (data as CostCenter[]) || []
    const rows: CostCenterRow[] = base
      .filter(r => includeInactive || r.is_active)
      .map(r => ({
        ...r,
        level: calculateLevel(r.code),
        child_count: 0,
        has_transactions: false,
        transactions_count: 0,
        last_used_at: null
      }))
    return buildCostCenterTree(rows)
  }
}

export async function getCostCentersList(orgId: string, includeInactive = false): Promise<CostCenterRow[]> {
  try {
    const { data: viewData, error } = await supabase
      .from('v_cost_centers')
      .select('*')
      .eq('org_id', orgId)
      .order('code')
    if (error) throw error
    return ((viewData as any[]) || [])
      .filter(row => includeInactive || row.is_active)
      .map(row => ({
        ...row,
        level: calculateLevel(row.code),
        child_count: row.transactions_count || 0,
        has_transactions: (row.transactions_count || 0) > 0,
        transactions_count: row.transactions_count || 0
      })) as CostCenterRow[]
  } catch (e: any) {
    // Fallback to base table if the view is missing
    console.warn('v_cost_centers view unavailable, using fallback from base table:', e?.message || e)
    const { data, error } = await supabase
      .from('cost_centers')
      .select('id, org_id, project_id, parent_id, code, name, name_ar, description, is_active, position, created_at, updated_at, created_by, updated_by')
      .eq('org_id', orgId)
      .order('code')
    if (error) throw new Error(`Failed to fetch cost centers (fallback): ${error.message}`)
    const base = (data as CostCenter[]) || []
    return base
      .filter(r => includeInactive || r.is_active)
      .map(r => ({
        ...r,
        level: calculateLevel(r.code),
        child_count: 0,
        has_transactions: false,
        transactions_count: 0,
        last_used_at: null
      }))
  }
}

export async function getCostCenter(id: string): Promise<CostCenter | null> {
  const { data, error } = await supabase
    .from('cost_centers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch cost center: ${error.message}`)
  }
  return data
}

export async function createCostCenter(input: CostCenterCreate): Promise<CostCenter> {
  const { data, error } = await supabase
    .from('cost_centers')
    .insert([{
      ...input,
      is_active: input.is_active ?? true,
      position: input.position ?? 0,
      created_by: (await supabase.auth.getUser()).data.user?.id || null
    }])
    .select()
    .single()

  if (error) throw new Error(`Failed to create cost center: ${error.message}`)
  return data
}

export async function updateCostCenter(input: CostCenterUpdate): Promise<CostCenter> {
  const { id, org_id, ...updates } = input
  
  const { data, error } = await supabase
    .from('cost_centers')
    .update({
      ...updates,
      updated_by: (await supabase.auth.getUser()).data.user?.id || null
    })
    .eq('id', id)
    .eq('org_id', org_id) // Ensure org boundary
    .select()
    .single()

  if (error) throw new Error(`Failed to update cost center: ${error.message}`)
  return data
}

export async function deleteCostCenter(id: string, orgId: string): Promise<void> {
  const { error } = await supabase
    .from('cost_centers')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId) // Ensure org boundary

  if (error) throw new Error(`Failed to delete cost center: ${error.message}`)
}

export async function fetchNextCostCenterCode(orgId: string, parentId?: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('get_next_cost_center_code', {
    p_org_id: orgId,
    p_parent_id: parentId
  })

  if (error) throw new Error(`Failed to fetch next code: ${error.message}`)
  return data || '1'
}

// Cost Centers for dropdown/selectors (filtered by org and optionally project)
// Uses RPC function with security definer to bypass RLS issues
export async function getCostCentersForSelector(orgId: string, projectId?: string | null): Promise<Array<{
  id: string
  code: string
  name: string
  name_ar?: string | null
  project_id?: string | null
  level: number
}>> {
  // Try RPC first (security definer bypasses RLS)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_cost_centers_for_selector', {
      p_org_id: orgId,
      p_project_id: projectId || null
    })
    
    if (!rpcError && rpcData) {
      console.log('✅ Cost centers loaded via RPC:', rpcData.length)
      return rpcData as Array<{
        id: string
        code: string
        name: string
        name_ar?: string | null
        project_id?: string | null
        level: number
      }>
    }
    
    console.warn('⚠️ RPC failed, falling back to direct query:', rpcError?.message)
  } catch (err) {
    console.warn('⚠️ RPC exception, falling back to direct query:', err)
  }
  
  // Fallback to direct query
  let query = supabase
    .from('cost_centers')
    .select('id, code, name, name_ar, project_id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('code')

  if (projectId) {
    // If project specified, get cost centers for that project OR global ones (project_id is null)
    query = query.or(`project_id.is.null,project_id.eq.${projectId}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('❌ Cost centers direct query failed:', error.message)
    return [] // Return empty array instead of throwing to prevent cascade failures
  }

  return ((data as any[]) || []).map((cc: any) => ({
    ...cc,
    level: calculateLevel(cc.code)
  }))
}

// Helper function to calculate level from code structure
function calculateLevel(code: string): number {
  const parts = code.split('.')
  return parts.length
}

// Build hierarchical tree from flat list
export function buildCostCenterTree(items: CostCenterRow[]): CostCenterTreeNode[] {
  const itemMap = new Map<string, CostCenterTreeNode>()
  const roots: CostCenterTreeNode[] = []

  // Create map
  for (const item of items) {
    itemMap.set(item.id, {
      ...item,
      children: [],
      has_children: false,
      has_active_children: false
    })
  }

  // Build tree
  for (const item of items) {
    const node = itemMap.get(item.id)!
    
    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parent = itemMap.get(item.parent_id)!
      parent.children = parent.children || []
      parent.children.push(node)
      parent.has_children = true
      if (item.is_active) {
        parent.has_active_children = true
      }
    } else {
      roots.push(node)
    }
  }

  return roots
}
