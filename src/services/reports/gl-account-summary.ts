import { supabase } from '../../utils/supabase'

export interface GLAccountSummaryFilters {
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  postedOnly?: boolean
  limit?: number | null
  offset?: number | null
}

export interface GLAccountSummaryRow {
  account_id: string
  account_code: string
  account_name_ar: string | null
  account_name_en: string | null
  opening_balance: number
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  period_net: number
  closing_balance: number
  closing_debit: number
  closing_credit: number
  transaction_count: number
  total_rows?: number
}

export async function fetchGLAccountSummary(filters: GLAccountSummaryFilters): Promise<GLAccountSummaryRow[]> {
  const { data, error } = await supabase.rpc('get_gl_account_summary', {
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
    p_org_id: filters.orgId ?? null,
    p_project_id: filters.projectId ?? null,
    p_posted_only: filters.postedOnly ?? true,
    p_limit: filters.limit ?? null,
    p_offset: filters.offset ?? null,
  })
  if (error) throw error
  return (data as GLAccountSummaryRow[]) ?? []
}
