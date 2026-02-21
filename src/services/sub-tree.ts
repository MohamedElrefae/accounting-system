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
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  const isOnline = getConnectionMonitor().getHealth().isOnline;

  if (!isOnline) {
    // Offline fallback
    try {
      const { getOfflineDB } = await import('./offline/core/OfflineSchema')
      const db = getOfflineDB()
      const cacheData = await db.metadata.get('sub_tree_cache')
      if (cacheData && Array.isArray(cacheData.value)) {
        console.log('📦 Sub Tree loaded from offline cache:', (cacheData.value as any[]).length)
        const allItems = cacheData.value as any[]
        return allItems.filter(item => item.org_id === orgId)
      }
    } catch (err) {
      console.error('❌ Sub Tree offline fallback failed:', err)
    }
    return [];
  }

  if (!force && cache.list.has(orgId)) return cache.list.get(orgId)!
  
  const viewCandidates = ['sub_tree_full_v2', 'sub_tree_full'] as const
  let data: any[] | null = null
  let lastError: any = null

  try {
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
  } catch (error: any) {
      if (!isOnline || error.message?.includes('fetch')) {
          console.warn('Network error fetching sub_tree, returning empty.');
          // Try offline cache as last resort
          try {
              const { getOfflineDB } = await import('./offline/core/OfflineSchema')
              const db = getOfflineDB()
              const cacheData = await db.metadata.get('sub_tree_cache')
              if (cacheData && Array.isArray(cacheData.value)) {
                  return cacheData.value.filter((item: any) => item.org_id === orgId)
              }
          } catch {}
          return [];
      }
      throw error;
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
  console.log('📝 Generating next code via RPC for:', { orgId, parentId })
  
  try {
    // Use RPC function to get next code
    const { data, error } = await supabase.rpc('rpc_sub_tree_next_code', {
      p_org_id: orgId,
      p_parent_id: parentId
    })
    
    if (error) {
      console.error('❌ RPC call error for next code:', error)
      throw error
    }
    
    console.log('✅ Next code generated:', data)
    return data as string
  } catch (err) {
    console.error('❌ fetchNextExpensesCategoryCode failed, falling back to local generation:', err)
    // Fallback to local generation if RPC fails
    return generateNextCodeLocally(orgId, parentId)
  }
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
    
    // Use RPC function instead of direct table insert
    const { data, error } = await supabase.rpc('create_sub_tree', {
      p_org_id: payload.org_id,
      p_code: String(payload.code ?? '').trim(),
      p_description: desc,
      p_add_to_cost: payload.add_to_cost ?? false,
      p_parent_id: payload.parent_id ?? null,
      p_linked_account_id: payload.linked_account_id ?? null
    })
    
    if (error) {
      console.error('❌ RPC call error:', error)
      throw error
    }
    
    console.log('✅ Sub_tree created with ID:', data)
    // Invalidate cache
    cache.tree.delete(payload.org_id)
    cache.list.delete(payload.org_id)
    return data as string
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
    console.log('🔗 linked_account_id value:', payload.linked_account_id, 'type:', typeof payload.linked_account_id)
    console.log('🧹 p_clear_linked_account:', payload.linked_account_id === null)
    
    // Debug: Track the exact value being sent to RPC
    const rpcLinkedAccountId = payload.linked_account_id;
    console.log('🔍 RPC will send linked_account_id:', rpcLinkedAccountId, 'type:', typeof rpcLinkedAccountId)
    
    // Use RPC function instead of direct table update
    const { data, error } = await supabase.rpc('update_sub_tree', {
      p_id: payload.id,
      p_code: payload.code !== undefined ? String(payload.code).trim() : undefined,
      p_description: desc,
      p_add_to_cost: payload.add_to_cost,
      p_is_active: payload.is_active,
      p_linked_account_id: rpcLinkedAccountId,
      p_clear_linked_account: payload.linked_account_id === null
    })
    
    if (error) {
      console.error('❌ RPC call error:', error)
      throw error
    }
    
    console.log('✅ Sub_tree updated:', data)
    if (payload.org_id) {
      console.log('🗑️ Clearing cache for org:', payload.org_id)
      cache.tree.delete(payload.org_id)
      cache.list.delete(payload.org_id)
      console.log('✅ Cache cleared')
    } else {
      console.log('⚠️ No org_id provided, clearing all caches')
      cache.tree.clear(); cache.list.clear()
    }
    return data as boolean
  } catch (err) {
    console.error('❌ updateExpensesCategory failed:', err)
    throw err
  }
}

export async function deleteExpensesCategory(id: string, orgId?: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting sub_tree:', id)
    
    // Use RPC function instead of direct table delete
    const { data, error } = await supabase.rpc('delete_sub_tree', {
      p_id: id
    })
    
    if (error) {
      console.error('❌ RPC call error:', error)
      throw error
    }
    
    console.log('✅ Sub_tree deleted:', data)
    if (orgId) { 
      cache.tree.delete(orgId)
      cache.list.delete(orgId)
    } else { 
      cache.tree.clear()
      cache.list.clear()
    }
    return data as boolean
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

  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  if (!getConnectionMonitor().getHealth().isOnline) {
      return []; // Return empty if offline, components should handle empty lists gracefully
  }

  let rows: AccountLite[] = [];
  try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, org_id, code, name, name_ar, level, is_postable, allow_transactions')
        .eq('org_id', orgId)
        .order('code', { ascending: true })
      if (error) throw error
      rows = (data || []) as AccountLite[]
  } catch (error: any) {
      if (error.message?.includes('fetch')) return [];
      throw error;
  }
  cache.accounts.set(orgId, rows)
  return rows
}

export function clearExpensesCategoriesCache() {
  cache.tree.clear(); cache.list.clear(); cache.accounts.clear()
}

