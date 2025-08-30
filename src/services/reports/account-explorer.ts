import { supabase } from '../../utils/supabase'

export type ExplorerMode = 'asof' | 'range'

export interface AccountExplorerFilters {
  orgId?: string | null
  parentId?: string | null
  dateFrom?: string | null
  dateTo: string
  postedOnly?: boolean
  projectId?: string | null
  mode?: ExplorerMode
}

export interface AccountExplorerRow {
  id: string
  code: string
  name: string
  name_ar: string | null
  level: number
  status: string
  parent_id: string | null
  category: string | null
  has_children: boolean
  has_active_children: boolean
  opening_debit: number | null
  opening_credit: number | null
  period_debits: number | null
  period_credits: number | null
  closing_debit: number | null
  closing_credit: number | null
  transaction_count: number | null
}

export interface VerifyAccountSummaryFilters {
  accountId: string
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  postedOnly?: boolean
}

export interface VerifyAccountSummaryRow {
  account_id: string
  account_code: string
  account_name_ar: string | null
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  closing_debit: number
  closing_credit: number
  transaction_count: number
}

export interface TxDateRangeFilters {
  orgId?: string | null
  projectId?: string | null
  postedOnly?: boolean
}

export interface TxDateRangeRow {
  min_date: string | null
  max_date: string | null
}

export async function fetchAccountExplorerNode(filters: AccountExplorerFilters): Promise<AccountExplorerRow[]> {
  const { data, error } = await supabase.rpc('get_account_children_with_balances', {
    p_org_id: filters.orgId ?? null,
    p_parent_id: filters.parentId ?? null,
    p_date_from: filters.mode === 'range' ? (filters.dateFrom ?? null) : null,
    p_date_to: filters.dateTo,
    p_posted_only: filters.postedOnly ?? true,
    p_project_id: filters.projectId ?? null,
    p_mode: filters.mode ?? 'asof',
  })
  if (error) throw error
  return (data as AccountExplorerRow[]) ?? []
}

export async function verifyAccountSummary(filters: VerifyAccountSummaryFilters): Promise<VerifyAccountSummaryRow | null> {
  const { data, error } = await supabase.rpc('verify_account_gl_summary', {
    p_account_id: filters.accountId,
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
    p_org_id: filters.orgId ?? null,
    p_project_id: filters.projectId ?? null,
    p_posted_only: filters.postedOnly ?? true,
  })
  if (error) throw error
  const rows = (data as VerifyAccountSummaryRow[]) ?? []
  return rows[0] ?? null
}

export async function fetchTransactionsDateRange(filters: TxDateRangeFilters): Promise<TxDateRangeRow> {
  const { data, error } = await supabase.rpc('get_transactions_date_range', {
    p_org_id: filters.orgId ?? null,
    p_project_id: filters.projectId ?? null,
    p_posted_only: filters.postedOnly ?? false,
  })
  if (error) throw error
  const rows = (data as TxDateRangeRow[]) ?? []
  return rows[0] || { min_date: null, max_date: null }
}
