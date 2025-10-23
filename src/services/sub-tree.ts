import { supabase } from '../utils/supabase'
import type {
  SubTreeRow,
  SubTreeNode,
  CreateSubTreePayload,
  UpdateSubTreePayload,
} from '../types/sub-tree'

export interface AccountLite {
  id: string
  org_id: string
  code: string
  name: string
  name_ar?: string | null
  level: number
  is_postable?: boolean
  allow_transactions?: boolean
}

// Simple in-memory cache keyed by org_id
const cache = {
  tree: new Map<string, SubTreeNode[]>(),
  list: new Map<string, SubTreeRow[]>(),
  accounts: new Map<string, AccountLite[]>(),
}

function buildTree(rows: SubTreeRow[]): SubTreeNode[] {
  const map = new Map<string, SubTreeNode>()
  const roots: SubTreeNode[] = []

  rows.forEach(r => {
    map.set(r.id, { ...r, children: [] })
  })

  rows.forEach(r => {
    const node = map.get(r.id)!
    if (r.parent_id) {
      const parent = map.get(r.parent_id)
      if (parent) parent.children!.push(node)
      else roots.push(node) // orphaned (should not happen)
    } else {
      roots.push(node)
    }
  })

  // Sort by code
  const sortChildren = (nodes: SubTreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code))
    nodes.forEach(n => n.children && sortChildren(n.children))
  }
  sortChildren(roots)
  return roots
}

export async function getExpensesCategoriesTree(orgId: string, force = false): Promise<SubTreeNode[]> {
  if (!force && cache.tree.has(orgId)) return cache.tree.get(orgId)!

  console.log('🌳 Loading sub tree for org:', orgId)
  // Use view/table directly to avoid RPC schema mismatches
  const list = await getExpensesCategoriesList(orgId, /*force*/ true)
  const tree = buildTree(list)
  cache.tree.set(orgId, tree)
  return tree
}

export async function getExpensesCategoriesList(orgId: string, force = false): Promise<SubTreeRow[]> {
  if (!force && cache.list.has(orgId)) return cache.list.get(orgId)!
  
  // Try the view first
  let { data, error } = await supabase
    .from('sub_tree_full')
    .select('*')
    .eq('org_id', orgId)
    .order('path', { ascending: true })
  
  // If view fails, try direct table query
  if (error || !data || data.length === 0) {
    console.warn('sub_tree_full view failed, trying direct table query:', error)
    const directResult = await supabase
      .from('sub_tree')
      .select(`
        id, org_id, parent_id, code, description, add_to_cost, is_active, level, path,
        linked_account_id, created_at, updated_at, created_by, updated_by
      `)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('code', { ascending: true })
    
    if (directResult.error) throw directResult.error
    data = directResult.data
  }
  
  const rows = (data as any[] | null)?.map(r => ({ 
    ...r, 
    path: String(r.path || r.code),
    // Add missing fields with defaults
    linked_account_code: r.linked_account_code || null,
    linked_account_name: r.linked_account_name || null,
    child_count: r.child_count || 0,
    has_transactions: r.has_transactions || false
  })) as SubTreeRow[] || []
  
  console.log('Loaded sub_tree records:', rows.length, 'for org:', orgId)
  cache.list.set(orgId, rows)
  return rows
}

export async function fetchNextExpensesCategoryCode(orgId: string, parentId: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_sub_tree_next_code', {
    p_org_id: orgId,
    p_parent_id: parentId,
  })
  if (error) throw error
  return data as string
}

export async function createExpensesCategory(payload: CreateSubTreePayload): Promise<string> {
  // Enforce DB constraint for description length (1..300)
  const desc = String(payload.description ?? '').trim().slice(0, 300)
  if (desc.length < 1) {
    throw new Error('الوصف مطلوب (1..300)')
  }
  const { data, error } = await supabase.rpc('create_sub_tree', {
    p_org_id: payload.org_id,
    p_code: String(payload.code ?? '').trim(),
    p_description: desc,
    p_add_to_cost: payload.add_to_cost ?? false,
    p_parent_id: payload.parent_id ?? null,
    p_linked_account_id: payload.linked_account_id ?? null,
  })
  if (error) throw error
  // Invalidate cache
  cache.tree.delete(payload.org_id)
  cache.list.delete(payload.org_id)
  return data as string
}

export async function updateExpensesCategory(payload: UpdateSubTreePayload & { org_id?: string }): Promise<boolean> {
  // Respect description constraint if provided
  const desc = payload.description === undefined ? undefined : String(payload.description ?? '').trim().slice(0, 300)
  if (desc !== undefined && desc.length < 1) {
    throw new Error('الوصف مطلوب (1..300)')
  }
  const { data, error } = await supabase.rpc('update_sub_tree', {
    p_id: payload.id,
    p_code: payload.code ? String(payload.code).trim() : null,
    p_description: desc ?? null,
    p_add_to_cost: payload.add_to_cost ?? null,
    p_is_active: payload.is_active ?? null,
    p_linked_account_id: payload.linked_account_id ?? null,
    p_clear_linked_account: (payload.linked_account_id === null ? true : null),
  })
  if (error) throw error
  if (payload.org_id) {
    cache.tree.delete(payload.org_id)
    cache.list.delete(payload.org_id)
  } else {
    // if org unknown, clear all
    cache.tree.clear(); cache.list.clear()
  }
  return data as boolean
}

export async function deleteExpensesCategory(id: string, orgId?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_sub_tree', { p_id: id })
  if (error) throw error
  if (orgId) { cache.tree.delete(orgId); cache.list.delete(orgId) } else { cache.tree.clear(); cache.list.clear() }
  return data as boolean
}

export async function listAccountsForOrg(orgId: string): Promise<AccountLite[]> {
  if (cache.accounts.has(orgId)) return cache.accounts.get(orgId)!
  const { data, error } = await supabase
    .from('accounts')
    .select('id, org_id, code, name, name_ar, level, is_postable, allow_transactions')
    .eq('org_id', orgId)
    .order('code', { ascending: true })
  if (error) throw error
  const rows = (data || []) as AccountLite[]
  cache.accounts.set(orgId, rows)
  return rows
}

export function clearExpensesCategoriesCache() {
  cache.tree.clear(); cache.list.clear(); cache.accounts.clear()
}

