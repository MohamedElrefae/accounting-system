import { supabase } from '../../utils/supabase'

export interface WorkItemUsageRow {
  org_id: string
  project_id: string | null
  work_item_id: string
  code: string
  name: string
  name_ar: string | null
  tx_count: number
  total_amount: number
}

export interface WorkItemUsageFilters {
  orgId?: string
  projectId?: string
  search?: string
  onlyWithTx?: boolean
  dateFrom?: string
  dateTo?: string
  status?: 'all' | 'posted' | 'unposted'
}

export async function getWorkItemUsage(filters?: WorkItemUsageFilters): Promise<WorkItemUsageRow[]> {
  // Prefer RPC (date range + status supported)
  try {
    const { data, error } = await supabase.rpc('get_work_item_usage_ranged', {
      p_org_id: filters?.orgId || null,
      p_project_id: filters?.projectId || null,
      p_search: filters?.search || null,
      p_only_with_tx: !!filters?.onlyWithTx,
      p_date_from: filters?.dateFrom || null,
      p_date_to: filters?.dateTo || null,
      p_status: (filters?.status || 'all'),
    })
    if (error) throw error
    return (data as WorkItemUsageRow[]) || []
  } catch (err: any) {
    // Fallback for environments where RPC isn't deployed yet
    // Note: date range and status filters are not available in the view fallback
    console.warn('getWorkItemUsage: RPC unavailable, falling back to view. Reason:', err?.message || err)
    let query = supabase.from('v_work_item_usage').select('*')
    if (filters?.orgId) query = query.eq('org_id', filters.orgId)
    if (filters?.projectId) query = query.eq('project_id', filters.projectId)
    if (filters?.onlyWithTx) query = query.gt('tx_count', 0)
    const { data, error } = await query.order('code', { ascending: true })
    if (error) throw error
    const rows = (data as WorkItemUsageRow[]) || []
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      return rows.filter(r => r.code.toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q) || (r.name_ar || '').toLowerCase().includes(q))
    }
    return rows
  }
}

