import { supabase } from '../utils/supabase'
import type { WorkItemRow, WorkItemTreeNode } from '../types/work-items'

// Simple caches
const cache = {
  byOrgAll: new Map<string, WorkItemRow[]>(), // all (org + any project overrides)
  byOrgCatalog: new Map<string, WorkItemRow[]>(), // org-level only (project_id null)
  byOrgProject: new Map<string, Map<string, WorkItemRow[]>>(), // org -> project -> overrides
}

function uniqueByCodePreferProject(rows: WorkItemRow[], projectId?: string | null): WorkItemRow[] {
  if (!projectId) return rows.filter(r => r.project_id === null)
  const map = new Map<string, WorkItemRow>()
  // Prefer project overrides
  for (const r of rows) {
    if (r.project_id === projectId) {
      map.set(r.code, r)
    }
  }
  // Fill with org-level where no override exists
  for (const r of rows) {
    if (r.project_id === null && !map.has(r.code)) {
      map.set(r.code, r)
    }
  }
  return Array.from(map.values())
}

function buildTree(rows: WorkItemRow[]): WorkItemTreeNode[] {
  const map = new Map<string, WorkItemTreeNode>()
  const roots: WorkItemTreeNode[] = []

  for (const r of rows) map.set(r.id, { ...r, children: [] })

  for (const r of rows) {
    const node = map.get(r.id)!
    if (r.parent_id && map.has(r.parent_id)) {
      const parent = map.get(r.parent_id)!
      parent.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortChildren = (nodes: WorkItemTreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code))
    nodes.forEach(n => n.children && sortChildren(n.children))
  }
  sortChildren(roots)
  return roots
}

export async function listWorkItemsAll(orgId: string, includeInactive = true): Promise<WorkItemRow[]> {
  if (cache.byOrgAll.has(orgId)) return cache.byOrgAll.get(orgId)!

  // 0. If offline, use local metadata cache
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  if (!getConnectionMonitor().getHealth().isOnline) {
    try {
      const { getOfflineDB } = await import('./offline/core/OfflineSchema')
      const db = getOfflineDB()
      const cacheData = await db.metadata.get('work_items_cache')
      if (cacheData && Array.isArray(cacheData.value)) {
        console.log('📦 Work Items loaded from offline cache:', (cacheData.value as any[]).length)
        const allItems = cacheData.value as any[]
        // Filter by org
        const filtered = allItems.filter(item => 
          item.org_id === orgId && 
          (includeInactive ? true : item.is_active)
        )
        cache.byOrgAll.set(orgId, filtered)
        return filtered
      }
    } catch (err) {
      console.error('❌ Work Items offline fallback failed:', err)
    }
  }

  try {
    let q = supabase.from('work_items_full').select('*').eq('org_id', orgId)
    if (!includeInactive) q = q.eq('is_active', true)
    const { data, error } = await q.order('project_id', { ascending: true }).order('code', { ascending: true })
    if (error) throw error
    const rows = (data as WorkItemRow[]) || []
    cache.byOrgAll.set(orgId, rows)
    return rows
  } catch (error: any) {
    if (error.message?.includes('fetch') || !getConnectionMonitor().getHealth().isOnline) {
         return [];
    }
    
    // Fallback if view doesn't exist: query base table
    try {
        let q = supabase.from('work_items').select('*').eq('org_id', orgId)
        if (!includeInactive) q = q.eq('is_active', true)
        const { data, error } = await q.order('project_id', { ascending: true }).order('code', { ascending: true })
        if (error) throw error
        const rows = (data as WorkItemRow[]) || []
        cache.byOrgAll.set(orgId, rows)
        return rows
    } catch (fbError: any) {
        if (fbError.message?.includes('fetch')) return [];
        throw fbError;
    }
  }
}

export async function listWorkItemsUnion(orgId: string, projectId?: string | null, includeInactive = true): Promise<WorkItemRow[]> {
  const all = await listWorkItemsAll(orgId, includeInactive)
  return uniqueByCodePreferProject(all, projectId ?? null)
}

export async function listCatalog(orgId: string, includeInactive = true): Promise<WorkItemRow[]> {
  if (cache.byOrgCatalog.has(orgId)) return cache.byOrgCatalog.get(orgId)!
  
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  if (!getConnectionMonitor().getHealth().isOnline) return [];

  try {
    let q = supabase.from('work_items_full').select('*').eq('org_id', orgId).is('project_id', null)
    if (!includeInactive) q = q.eq('is_active', true)
    const { data, error } = await q.order('code', { ascending: true })
    if (error) throw error
    const rows = (data as WorkItemRow[]) || []
    cache.byOrgCatalog.set(orgId, rows)
    return rows
  } catch (error: any) {
    if (error.message?.includes('fetch')) return [];

    try {
        let q = supabase.from('work_items').select('*').eq('org_id', orgId).is('project_id', null)
        if (!includeInactive) q = q.eq('is_active', true)
        const { data, error } = await q.order('code', { ascending: true })
        if (error) throw error
        const rows = (data as WorkItemRow[]) || []
        cache.byOrgCatalog.set(orgId, rows)
        return rows
    } catch (fbError: any) {
        if (fbError.message?.includes('fetch')) return [];
        throw fbError;
    }
  }
}

export async function listProjectOverrides(orgId: string, projectId: string, includeInactive = true): Promise<WorkItemRow[]> {
  const pmap = cache.byOrgProject.get(orgId) || new Map<string, WorkItemRow[]>()
  if (pmap.has(projectId)) return pmap.get(projectId)!
  
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  if (!getConnectionMonitor().getHealth().isOnline) return [];

  try {
    let q = supabase.from('work_items_full').select('*').eq('org_id', orgId).eq('project_id', projectId)
    if (!includeInactive) q = q.eq('is_active', true)
    const { data, error } = await q.order('code', { ascending: true })
    if (error) throw error
    const rows = (data as WorkItemRow[]) || []
    pmap.set(projectId, rows)
    cache.byOrgProject.set(orgId, pmap)
    return rows
  } catch (error: any) {
    if (error.message?.includes('fetch')) return [];

    try {
        let q = supabase.from('work_items').select('*').eq('org_id', orgId).eq('project_id', projectId)
        if (!includeInactive) q = q.eq('is_active', true)
        const { data, error } = await q.order('code', { ascending: true })
        if (error) throw error
        const rows = (data as WorkItemRow[]) || []
        pmap.set(projectId, rows)
        cache.byOrgProject.set(orgId, pmap)
        return rows
    } catch (fbError: any) {
        if (fbError.message?.includes('fetch')) return [];
        throw fbError;
    }
  }
}

export function toWorkItemOptions(rows: WorkItemRow[]): { value: string; label: string; searchText: string }[] {
  const opts = rows.map(r => ({
    value: r.id,
    label: `${r.code} - ${r.name_ar || r.name}`,
    searchText: `${r.code} ${r.name} ${(r.name_ar || '')}`.toLowerCase(),
  }))
  opts.sort((a, b) => a.label.localeCompare(b.label))
  return opts
}

export function buildTreeFromUnion(rows: WorkItemRow[]): WorkItemTreeNode[] {
  return buildTree(rows)
}

export async function createWorkItem(payload: {
  org_id: string;
  project_id?: string | null;
  parent_id?: string | null;
  code: string;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  unit_of_measure?: string | null;
  is_active?: boolean;
  position?: number;
}): Promise<WorkItemRow> {
  const { data, error } = await supabase
    .from('work_items')
    .insert({
      org_id: payload.org_id,
      project_id: payload.project_id ?? null,
      parent_id: payload.parent_id ?? null,
      code: payload.code,
      name: payload.name,
      name_ar: payload.name_ar ?? null,
      description: payload.description ?? null,
      unit_of_measure: payload.unit_of_measure ?? null,
      is_active: payload.is_active ?? true,
      position: payload.position ?? 0,
    })
    .select('*')
    .single()
  if (error) throw error
  // Invalidate caches
  cache.byOrgAll.delete(payload.org_id)
  cache.byOrgCatalog.delete(payload.org_id)
  const pmap = cache.byOrgProject.get(payload.org_id)
  if (pmap && payload.project_id) pmap.delete(payload.project_id)
  return data as WorkItemRow
}

export async function updateWorkItem(id: string, updates: Partial<Omit<WorkItemRow, 'id' | 'created_at' | 'updated_at'>>): Promise<WorkItemRow> {
  const { data, error } = await supabase
    .from('work_items')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  // Invalidate caches
  if ((data as any)?.org_id) {
    const orgId = (data as any).org_id as string
    cache.byOrgAll.delete(orgId)
    cache.byOrgCatalog.delete(orgId)
    const pmap = cache.byOrgProject.get(orgId)
    if (pmap && (data as any)?.project_id) pmap.delete((data as any).project_id)
  } else {
    cache.byOrgAll.clear(); cache.byOrgCatalog.clear(); cache.byOrgProject.clear()
  }
  return data as WorkItemRow
}

export async function deleteWorkItem(id: string, orgId?: string, projectId?: string | null): Promise<void> {
  const { error } = await supabase.from('work_items').delete().eq('id', id)
  if (error) throw error
  // Invalidate caches
  if (orgId) {
    cache.byOrgAll.delete(orgId)
    cache.byOrgCatalog.delete(orgId)
    const pmap = cache.byOrgProject.get(orgId)
    if (pmap && projectId) pmap.delete(projectId)
  } else {
    cache.byOrgAll.clear(); cache.byOrgCatalog.clear(); cache.byOrgProject.clear()
  }
}

export async function toggleWorkItemActive(id: string, isActive: boolean, orgId?: string, projectId?: string | null): Promise<void> {
  const { error } = await supabase.from('work_items').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
  // Invalidate caches
  if (orgId) {
    cache.byOrgAll.delete(orgId)
    cache.byOrgCatalog.delete(orgId)
    const pmap = cache.byOrgProject.get(orgId)
    if (pmap && projectId) pmap.delete(projectId)
  } else {
    cache.byOrgAll.clear(); cache.byOrgCatalog.clear(); cache.byOrgProject.clear()
  }
}

export function clearWorkItemsCache() {
  cache.byOrgAll.clear(); cache.byOrgCatalog.clear(); cache.byOrgProject.clear()
}

export async function suggestWorkItemCode(orgId: string, parentId: string | null, name: string, projectId: string | null): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('work_items_suggest_code', {
      p_org_id: orgId,
      p_parent_id: parentId,
      p_name: name,
      p_project_id: projectId,
    })
    if (error) throw error
    if (!data) return ''
    return String(data)
  } catch {
    return ''
  }
}

