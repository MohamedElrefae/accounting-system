import { supabase } from '../../utils/supabase'

export interface GLAccountSummaryFilters {
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  postedOnly?: boolean
  limit?: number | null
  offset?: number | null
  classificationId?: string | null
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
    p_classification_id: filters.classificationId ?? null,
  })
  if (error) throw error
  return (data as GLAccountSummaryRow[]) ?? []
}

export interface GLTotals {
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  closing_debit: number
  closing_credit: number
  transaction_count: number
}

export async function fetchGLTotals(filters: Omit<GLAccountSummaryFilters, 'limit' | 'offset'>): Promise<GLTotals> {
  const { data, error } = await supabase.rpc('get_gl_totals', {
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
    p_org_id: filters.orgId ?? null,
    p_project_id: filters.projectId ?? null,
    p_posted_only: filters.postedOnly ?? true,
    p_classification_id: filters.classificationId ?? null,
  })
  if (error) throw error
  const rows = (data as GLTotals[]) ?? []
  return rows[0] || {
    opening_debit: 0,
    opening_credit: 0,
    period_debits: 0,
    period_credits: 0,
    closing_debit: 0,
    closing_credit: 0,
    transaction_count: 0,
  }
}
