import { supabase } from '../utils/supabase'
import type { AnalysisWorkItemRow, AnalysisWorkItemFull } from '../types/analysis-work-items'

// Simple cache by org
const cache = {
  byOrg: new Map<string, AnalysisWorkItemFull[]>(),
}

export async function listAnalysisWorkItems(params: {
  orgId: string,
  // projectId intentionally ignored for listing; AWIs are org-level
  projectId?: string | null,
  search?: string,
  onlyWithTx?: boolean,
  includeInactive?: boolean,
}): Promise<AnalysisWorkItemFull[]> {
  // Normalize cache key to exclude projectId from affecting list results
  const { orgId, search = null, onlyWithTx = false, includeInactive = true } = params
  if (!orgId) return []
  const key = JSON.stringify({ orgId, search, onlyWithTx, includeInactive })
  if (cache.byOrg.has(key)) return cache.byOrg.get(key)!

  // 0. If offline, use local metadata cache
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  if (!getConnectionMonitor().getHealth().isOnline) {
    try {
      const { getOfflineDB } = await import('./offline/core/OfflineSchema')
      const db = getOfflineDB()
      const cacheData = await db.metadata.get('analysis_work_items_cache')
      if (cacheData && Array.isArray(cacheData.value)) {
        console.log('📦 Analysis items loaded from offline cache:', (cacheData.value as any[]).length)
        const allItems = cacheData.value as any[]
        // Filter by org and activity in memory
        const filtered = allItems.filter(item => 
          item.org_id === orgId && 
          (params.includeInactive ? true : item.is_active)
        )
        // Match Search if provided
        const finalRows = params.search 
          ? filtered.filter(f => f.name?.toLowerCase().includes(params.search!.toLowerCase()) || f.code?.toLowerCase().includes(params.search!.toLowerCase()))
          : filtered

        return finalRows.map(item => ({ 
          ...item, 
          transaction_count: 0, 
          total_debit_amount: 0, 
          total_credit_amount: 0, 
          net_amount: 0, 
          has_transactions: false 
        })) as AnalysisWorkItemFull[]
      }
    } catch (err) {
      console.error('❌ Analysis items offline fallback failed:', err)
    }
  }


  // First try the main RPC function without project filter so we never hide org items

  let data, error
  
  try {
    const result = await supabase.rpc('list_analysis_work_items', {
      p_org_id: orgId,
      p_only_with_tx: onlyWithTx,
      p_project_id: null, // do not scope listing by project
      p_search: search,
      p_include_inactive: includeInactive,
    })
    data = result.data
    error = result.error
  } catch (rpcError) {
    console.warn('RPC list_analysis_work_items failed, trying fallback:', rpcError)
    
    // Fallback: try the simple function
    try {
      const fallbackResult = await supabase.rpc('list_analysis_work_items_simple', {
        p_org_id: orgId
      })
      data = fallbackResult.data
      error = fallbackResult.error
    } catch (fallbackError) {
      console.warn('Fallback RPC also failed, trying direct table access:', fallbackError)
      
      // Last resort: direct table access
      const directResult = await supabase
        .from('analysis_work_items')
        .select('*')
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('code')
      
      data = directResult.data?.map(item => ({ ...item, transaction_count: 0, total_debit_amount: 0, total_credit_amount: 0, net_amount: 0, has_transactions: false })) || []
      error = directResult.error
    }
  }
  
  if (error) {
    if (navigator.onLine) {
        console.error('All attempts to load analysis work items failed:', error)
    }
    // Return empty array instead of throwing to prevent UI crashes
    return []
  }
  
  const rows = (data as AnalysisWorkItemFull[]) || []
  cache.byOrg.set(key, rows)
  return rows
}

export async function suggestAnalysisWorkItemCode(orgId: string, name: string): Promise<string> {
  const { data, error } = await supabase.rpc('analysis_work_items_suggest_code', { p_org_id: orgId, p_name: name })
  if (error) throw error
  return String(data || '')
}

export async function createAnalysisWorkItem(payload: {
  org_id: string,
  code: string,
  name: string,
  name_ar?: string | null,
  description?: string | null,
  is_active?: boolean,
  position?: number,
}): Promise<AnalysisWorkItemRow> {
  const { data, error } = await supabase
    .from('analysis_work_items')
    .insert({
      org_id: payload.org_id,
      code: payload.code,
      name: payload.name,
      name_ar: payload.name_ar ?? null,
      description: payload.description ?? null,
      is_active: payload.is_active ?? true,
      position: payload.position ?? 0,
    })
    .select('*')
    .maybeSingle()
  if (error) throw error
  cache.byOrg.clear()
  // When RLS prevents returning rows, data can be null; do a lightweight fetch if needed
  if (!data) {
    // Best-effort: re-query the created row by unique (org_id, code)
    const { data: fetched, error: fetchErr } = await supabase
      .from('analysis_work_items')
      .select('*')
      .eq('org_id', payload.org_id)
      .eq('code', payload.code)
      .limit(1)
      .maybeSingle()
    if (fetchErr) throw fetchErr
    return fetched as AnalysisWorkItemRow
  }
  return data as AnalysisWorkItemRow
}

export async function updateAnalysisWorkItem(id: string, updates: Partial<Omit<AnalysisWorkItemRow, 'id' | 'created_at' | 'updated_at'>>): Promise<AnalysisWorkItemRow> {
  const { data, error } = await supabase
    .from('analysis_work_items')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) throw error
  cache.byOrg.clear()
  if (!data) {
    const { data: fetched, error: fetchErr } = await supabase
      .from('analysis_work_items')
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle()
    if (fetchErr) throw fetchErr
    return fetched as AnalysisWorkItemRow
  }
  return data as AnalysisWorkItemRow
}

export async function deleteAnalysisWorkItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('analysis_work_items')
    .delete()
    .eq('id', id)
  if (error) throw error
  cache.byOrg.clear()
}

export async function toggleAnalysisWorkItemActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('analysis_work_items')
    .update({ is_active: active })
    .eq('id', id)
  if (error) throw error
  cache.byOrg.clear()
}

export function clearAnalysisWorkItemsCache() {
  cache.byOrg.clear()
}
