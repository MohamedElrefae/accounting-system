import { supabase } from '../../utils/supabase'

/**
 * General Ledger Report Service
 * 
 * Note: This service uses the get_general_ledger_report stored procedure which provides
 * detailed transaction-level data with running balances.
 * 
 * For account-level aggregated balances, use the unified financial query service:
 * import { fetchGLSummary } from './unified-financial-query'
 */

export interface GLFilters {
  accountId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  costCenterId?: string | null
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
  // Normalize empty strings to null for date and project filters
  const dateFrom = filters.dateFrom && filters.dateFrom.trim() !== '' ? filters.dateFrom : null;
  const dateTo = filters.dateTo && filters.dateTo.trim() !== '' ? filters.dateTo : null;
  const projectId = filters.projectId && filters.projectId.trim() !== '' ? filters.projectId : null;
  const costCenterId = filters.costCenterId && filters.costCenterId.trim() !== '' ? filters.costCenterId : null;

  const callRpc = async (args: Record<string, any>) => {
    const { data, error } = await supabase.rpc('get_general_ledger_report_filtered', args)
    if (error) throw error
    return (data as GLRow[]) ?? []
  }

  const baseArgs: Record<string, any> = {
    p_account_id: filters.accountId ?? null,
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_org_id: filters.orgId ?? null,
    p_project_id: projectId,
    p_include_opening: filters.includeOpening ?? true,
    p_posted_only: filters.postedOnly ?? false,
    p_limit: filters.limit ?? null,
    p_offset: filters.offset ?? null,
    // IMPORTANT: send zero-UUID sentinel for Unclassified
    p_classification_id: filters.classificationId === '__unclassified__'
      ? UNCLASSIFIED_UUID
      : (filters.classificationId ?? null),
    p_analysis_work_item_id: filters.analysisWorkItemId ?? null,
    p_expenses_category_id: filters.expensesCategoryId ?? null,
  }

  // Backward-compatible: if DB function doesn't accept p_cost_center_id yet, retry without it.
  if (!costCenterId) {
    return await callRpc(baseArgs)
  }

  try {
    return await callRpc({
      ...baseArgs,
      p_cost_center_id: costCenterId,
    })
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('p_cost_center_id') || msg.toLowerCase().includes('function') || msg.toLowerCase().includes('candidate')) {
      return await callRpc(baseArgs)
    }
    throw e
  }
}
