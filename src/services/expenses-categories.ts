import { supabase } from '../utils/supabase'
import type {
  ExpensesCategoryRow,
  ExpensesCategoryTreeNode,
  CreateExpensesCategoryPayload,
  UpdateExpensesCategoryPayload,
} from '../types/expenses-categories'

export interface AccountLite {
  id: string
  org_id: string
  code: string
  name: string
  level: number
  is_postable?: boolean
}

// Simple in-memory cache keyed by org_id
const cache = {
  tree: new Map<string, ExpensesCategoryTreeNode[]>(),
  list: new Map<string, ExpensesCategoryRow[]>(),
  accounts: new Map<string, AccountLite[]>(),
}

function buildTree(rows: ExpensesCategoryRow[]): ExpensesCategoryTreeNode[] {
  const map = new Map<string, ExpensesCategoryTreeNode>()
  const roots: ExpensesCategoryTreeNode[] = []

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
  const sortChildren = (nodes: ExpensesCategoryTreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code))
    nodes.forEach(n => n.children && sortChildren(n.children))
  }
  sortChildren(roots)
  return roots
}

export async function getExpensesCategoriesTree(orgId: string, force = false): Promise<ExpensesCategoryTreeNode[]> {
  if (!force && cache.tree.has(orgId)) return cache.tree.get(orgId)!

  const { data, error } = await supabase.rpc('get_expenses_categories_tree', { p_org_id: orgId })
  if (error) throw error
  const rows = (data as any[] | null)?.map(r => ({ ...r, path: String(r.path) })) as ExpensesCategoryRow[] || []
  const tree = buildTree(rows)
  cache.tree.set(orgId, tree)
  cache.list.set(orgId, rows)
  return tree
}

export async function getExpensesCategoriesList(orgId: string, force = false): Promise<ExpensesCategoryRow[]> {
  if (!force && cache.list.has(orgId)) return cache.list.get(orgId)!
  const { data, error } = await supabase
    .from('expenses_categories_full')
    .select('*')
    .eq('org_id', orgId)
    .order('path', { ascending: true })
  if (error) throw error
  const rows = (data as any[] | null)?.map(r => ({ ...r, path: String(r.path) })) as ExpensesCategoryRow[] || []
  cache.list.set(orgId, rows)
  return rows
}

export async function fetchNextExpensesCategoryCode(orgId: string, parentId: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('rpc_expenses_categories_next_code', {
    p_org_id: orgId,
    p_parent_id: parentId,
  })
  if (error) throw error
  return data as string
}

export async function createExpensesCategory(payload: CreateExpensesCategoryPayload): Promise<string> {
  const { data, error } = await supabase.rpc('create_expenses_category', {
    p_org_id: payload.org_id,
    p_code: payload.code,
    p_description: payload.description,
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

export async function updateExpensesCategory(payload: UpdateExpensesCategoryPayload & { org_id?: string }): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_expenses_category', {
    p_id: payload.id,
    p_code: payload.code ?? null,
    p_description: payload.description ?? null,
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
  const { data, error } = await supabase.rpc('delete_expenses_category', { p_id: id })
  if (error) throw error
  if (orgId) { cache.tree.delete(orgId); cache.list.delete(orgId) } else { cache.tree.clear(); cache.list.clear() }
  return data as boolean
}

export async function listAccountsForOrg(orgId: string): Promise<AccountLite[]> {
  if (cache.accounts.has(orgId)) return cache.accounts.get(orgId)!
  const { data, error } = await supabase
    .from('accounts')
    .select('id, org_id, code, name, level, is_postable')
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

