import { supabase } from '../utils/supabase'
import type { AnalysisWorkItemRow, AnalysisWorkItemFull } from '../types/analysis-work-items'

// Simple cache by org
const cache = {
  byOrg: new Map<string, AnalysisWorkItemFull[]>(),
}

export async function listAnalysisWorkItems(params: {
  orgId: string,
  projectId?: string | null,
  search?: string,
  onlyWithTx?: boolean,
  includeInactive?: boolean,
}): Promise<AnalysisWorkItemFull[]> {
  const key = JSON.stringify(params)
  if (cache.byOrg.has(key)) return cache.byOrg.get(key)!

  const { orgId, projectId = null, search = null, onlyWithTx = false, includeInactive = true } = params
  const { data, error } = await supabase.rpc('list_analysis_work_items', {
    p_org_id: orgId,
    p_only_with_tx: onlyWithTx,
    p_project_id: projectId,
    p_search: search,
    p_include_inactive: includeInactive,
  })
  if (error) throw error
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
