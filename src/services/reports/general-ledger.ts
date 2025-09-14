import { supabase } from '../../utils/supabase'

/**
 * General Ledger Report Service
 * 
 * Note: This service uses the get_general_ledger_report stored procedure which provides
 * detailed transaction-level data with running balances. The stored procedure should
 * implement the same natural balance logic as the canonical balance service for consistency.
 * 
 * For account-level aggregated balances, use the canonical balance service instead:
 * import { getAccountBalances } from '../account-balances'
 */

export interface GLFilters {
  accountId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  includeOpening?: boolean
  postedOnly?: boolean
  limit?: number | null
  offset?: number | null
  classificationId?: string | null
  analysisWorkItemId?: string | null
  expensesCategoryId?: string | null
}

export interface GLRow {
  transaction_id: string
  entry_date: string
  entry_number: string | null
  description: string | null
  reference_number: string | null
  account_id: string
  account_code: string
  account_name_ar: string | null
  account_name_en: string | null
  debit: number
  credit: number
  signed_amount: number
  opening_balance: number
  opening_debit: number
  opening_credit: number
  running_balance: number
  running_debit: number
  running_credit: number
  period_total: number
  closing_balance: number
  closing_debit: number
  closing_credit: number
  org_id: string | null
  project_id: string | null
  total_rows?: number
}

// Add a constant for the zero-UUID sentinel
const UNCLASSIFIED_UUID = '00000000-0000-0000-0000-000000000000';

export async function fetchGeneralLedgerReport(filters: GLFilters): Promise<GLRow[]> {
  const { data, error } = await supabase.rpc('get_general_ledger_report_filtered', {
    p_account_id: filters.accountId ?? null,
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
    p_org_id: filters.orgId ?? null,
    p_project_id: filters.projectId ?? null,
    p_include_opening: filters.includeOpening ?? true,
    p_posted_only: filters.postedOnly ?? true,
    p_limit: filters.limit ?? null,
    p_offset: filters.offset ?? null,
    // IMPORTANT: send zero-UUID sentinel for Unclassified
    p_classification_id: filters.classificationId === '__unclassified__'
      ? UNCLASSIFIED_UUID
      : (filters.classificationId ?? null),
    p_analysis_work_item_id: filters.analysisWorkItemId ?? null,
    p_expenses_category_id: filters.expensesCategoryId ?? null,
  })

  if (error) throw error
  return (data as GLRow[]) ?? []
}
