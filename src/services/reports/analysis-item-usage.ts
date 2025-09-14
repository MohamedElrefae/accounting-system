import { supabase } from '../../utils/supabase'

export interface AnalysisUsageFilters {
  orgId?: string | null
  projectId?: string | null
  search?: string | null
  onlyWithTx?: boolean | null
  dateFrom?: string | null
  dateTo?: string | null
}

export interface AnalysisUsageRow {
  org_id: string
  analysis_work_item_id: string
  code: string
  name: string
  name_ar: string | null
  tx_count: number
  total_debit_amount: number
  total_credit_amount: number
  net_amount: number
}

export type TopAnalysisMetric = 'net' | 'debit' | 'credit' | 'count'

export interface TopAnalysisItemRow {
  analysis_work_item_id: string
  code: string
  name: string
  name_ar: string | null
  tx_count: number
  total_debit_amount: number
  total_credit_amount: number
  net_amount: number
}

export async function fetchAnalysisItemUsage(filters: AnalysisUsageFilters): Promise<AnalysisUsageRow[]> {
  const { data, error } = await supabase.rpc('get_analysis_item_usage', {
    p_org_id: filters.orgId ?? null,
    p_project_id: filters.projectId ?? null,
    p_search: filters.search ?? null,
    p_only_with_tx: filters.onlyWithTx ?? false,
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
  })
  if (error) throw error
  return (data as AnalysisUsageRow[]) || []
}

export async function fetchTopAnalysisItems(params: {
  orgId?: string | null,
  projectId?: string | null,
  dateFrom?: string | null,
  dateTo?: string | null,
  orderBy?: TopAnalysisMetric,
  desc?: boolean,
  limit?: number,
}): Promise<TopAnalysisItemRow[]> {
  const { data, error } = await supabase.rpc('get_top_analysis_items', {
    p_org_id: params.orgId ?? null,
    p_project_id: params.projectId ?? null,
    p_date_from: params.dateFrom ?? null,
    p_date_to: params.dateTo ?? null,
    p_order_by: params.orderBy ?? 'net',
    p_desc: params.desc ?? true,
    p_limit: params.limit ?? 10,
  })
  if (error) throw error
  return (data as TopAnalysisItemRow[]) || []
}
