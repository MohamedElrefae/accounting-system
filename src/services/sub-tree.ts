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
  
  const viewCandidates = ['sub_tree_full_v2', 'sub_tree_full'] as const
  let data: any[] | null = null
  let lastError: any = null

  for (const viewName of viewCandidates) {
    const result = await supabase
      .from(viewName)
      .select('*')
      .eq('org_id', orgId)
      .order('path', { ascending: true })

    if (result.error) {
      lastError = result.error
      continue
    }

    if (result.data && result.data.length > 0) {
      data = result.data
      lastError = null
      break
    }

    data = result.data
  }

  if (!data || data.length === 0) {
    if (lastError) {
      console.warn('sub_tree_full view failed, trying direct table query:', lastError)
    }

    const directResult = await supabase
      .from('sub_tree')
      .select(`
        id, org_id, parent_id, code, description, add_to_cost, is_active, level, path,
        linked_account_id, created_at, updated_at, created_by, updated_by
      `)
      .eq('org_id', orgId)
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
  // Use local generation - RPC may not be available or have permission issues
  console.log('📝 Generating next code locally for:', { orgId, parentId })
  return generateNextCodeLocally(orgId, parentId)
}

function generateNextCodeLocally(orgId: string, parentId: string | null): string {
  // Get cached list for this org
  const list = cache.list.get(orgId) || []
  
  let prefix = ''
  if (parentId) {
    const parent = list.find(r => r.id === parentId)
    if (parent) {
      prefix = parent.code + '.'
    }
  }
  
  // Find max numeric code at this level
  const regex = new RegExp(`^${prefix.replace(/\./g, '\\.')}(\\d+)$`)
  let maxNum = 0
  
  list.forEach(r => {
    const match = r.code.match(regex)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  })
  
  return prefix + String(maxNum + 1).padStart(3, '0')
}

export async function createExpensesCategory(payload: CreateSubTreePayload): Promise<string> {
  // Enforce DB constraint for description length (1..300)
  const desc = String(payload.description ?? '').trim().slice(0, 300)
  if (desc.length < 1) {
    throw new Error('الوصف مطلوب (1..300)')
  }
  
  try {
    console.log('📝 Creating sub_tree with payload:', payload)
    
    // Determine level and path
    let level = 1
    let path = payload.code
    
    if (payload.parent_id) {
      const parentList = cache.list.get(payload.org_id) || []
      const parent = parentList.find(r => r.id === payload.parent_id)
      if (parent) {
        level = parent.level + 1
        path = parent.path ? `${parent.path}.${payload.code}` : `${parent.code}.${payload.code}`
      }
    }
    
    // Insert directly into the table
    const { data, error } = await supabase
      .from('sub_tree')
      .insert({
        org_id: payload.org_id,
        code: String(payload.code ?? '').trim(),
        description: desc,
        add_to_cost: payload.add_to_cost ?? false,
        parent_id: payload.parent_id ?? null,
        linked_account_id: payload.linked_account_id ?? null,
        level,
        path,
        is_active: true,
      })
      .select('id')
      .single()
    
    if (error) {
      console.error('❌ Insert error:', error)
      throw error
    }
    
    console.log('✅ Sub_tree created with ID:', data?.id)
    // Invalidate cache
    cache.tree.delete(payload.org_id)
    cache.list.delete(payload.org_id)
    return data?.id as string
  } catch (err) {
    console.error('❌ createExpensesCategory failed:', err)
    throw err
  }
}

export async function updateExpensesCategory(payload: UpdateSubTreePayload & { org_id?: string }): Promise<boolean> {
  // Respect description constraint if provided
  const desc = payload.description === undefined ? undefined : String(payload.description ?? '').trim().slice(0, 300)
  if (desc !== undefined && desc.length < 1) {
    throw new Error('الوصف مطلوب (1..300)')
  }
  
  try {
    console.log('📝 Updating sub_tree:', payload)
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }
    
    if (payload.code !== undefined) updateData.code = String(payload.code).trim()
    if (desc !== undefined) updateData.description = desc
    if (payload.add_to_cost !== undefined) updateData.add_to_cost = payload.add_to_cost
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active
    if (payload.linked_account_id !== undefined) updateData.linked_account_id = payload.linked_account_id
    
    const { error } = await supabase
      .from('sub_tree')
      .update(updateData)
      .eq('id', payload.id)
    
    if (error) {
      console.error('❌ Update error:', error)
      throw error
    }
    
    console.log('✅ Sub_tree updated')
    if (payload.org_id) {
      console.log('🗑️ Clearing cache for org:', payload.org_id)
      cache.tree.delete(payload.org_id)
      cache.list.delete(payload.org_id)
      console.log('✅ Cache cleared')
    } else {
      console.log('⚠️ No org_id provided, clearing all caches')
      cache.tree.clear(); cache.list.clear()
    }
    return true
  } catch (err) {
    console.error('❌ updateExpensesCategory failed:', err)
    throw err
  }
}

export async function deleteExpensesCategory(id: string, orgId?: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting sub_tree:', id)
    const { error } = await supabase
      .from('sub_tree')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('❌ Delete error:', error)
      throw error
    }
    
    console.log('✅ Sub_tree deleted')
    if (orgId) { 
      cache.tree.delete(orgId)
      cache.list.delete(orgId)
    } else { 
      cache.tree.clear()
      cache.list.clear()
    }
    return true
  } catch (err) {
    console.error('❌ deleteExpensesCategory failed:', err)
    throw err
  }
}

export async function listAccountsForOrg(orgId: string): Promise<AccountLite[]> {
  // Debug: Log the orgId to see what type it is
  console.log('listAccountsForOrg called with orgId:', orgId, typeof orgId)
  
  // Defensive check: ensure orgId is a string, not an object
  if (orgId && typeof orgId !== 'string') {
    console.error('listAccountsForOrg: orgId is not a string:', orgId)
    return []
  }
  
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

