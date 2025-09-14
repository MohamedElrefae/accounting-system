import { supabase } from '../../utils/supabase'

export interface AnalysisWorkItemFilterOption {
  id: string
  code: string
  name: string
  name_ar?: string | null
  is_active: boolean
  has_transactions: boolean
}

/**
 * Fetch Analysis Work Items for use in report filters
 * Returns only active items by default, with option to include those with transactions
 */
export async function listAWIForFilter(
  orgId: string, 
  projectId?: string | null,
  onlyWithTransactions: boolean = false
): Promise<AnalysisWorkItemFilterOption[]> {
  const { data, error } = await supabase.rpc('list_analysis_work_items', {
    p_org_id: orgId,
    p_only_with_tx: onlyWithTransactions,
    p_project_id: projectId ?? null,
    p_search: null,
    p_include_inactive: false // Only active items for filters
  })
  
  if (error) throw error
  return (data as AnalysisWorkItemFilterOption[]) ?? []
}

/**
 * Format AWI options for select components
 */
export function formatAWIOptions(items: AnalysisWorkItemFilterOption[]): Array<{
  value: string
  label: string
  searchText: string
}> {
  return items.map(item => ({
    value: item.id,
    label: `${item.code} - ${item.name_ar || item.name}`,
    searchText: `${item.code} ${item.name} ${item.name_ar || ''}`.toLowerCase()
  })).sort((a, b) => a.label.localeCompare(b.label))
}