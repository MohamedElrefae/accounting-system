import { supabase } from '../utils/supabase'
import { getCurrentUserId, type TransactionRecord, type PagedResult, type ListTransactionsFilters, type ListTransactionsOptions } from './transactions'

export interface EnrichedHeaderListOptions extends ListTransactionsOptions {}

// Calls SQL RPC list_transactions_enriched_headers to get DISTINCT transaction headers
export async function getTransactionsEnrichedHeaders(options?: EnrichedHeaderListOptions): Promise<PagedResult<TransactionRecord>> {
  const scope = options?.filters?.scope ?? 'all'
  const pendingOnly = options?.filters?.pendingOnly ?? false
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 20

  const f: ListTransactionsFilters | undefined = options?.filters
  const createdBy = scope === 'my' ? (await getCurrentUserId()) : null

  const { data, error } = await supabase.rpc('list_transactions_enriched_headers', {
    p_scope: scope,
    p_pending_only: pendingOnly,
    p_search: f?.search || null,
    p_date_from: f?.dateFrom || null,
    p_date_to: f?.dateTo || null,
    p_amount_from: f?.amountFrom ?? null,
    p_amount_to: f?.amountTo ?? null,
    p_debit_account_id: f?.debitAccountId || null,
    p_credit_account_id: f?.creditAccountId || null,
    p_project_id: f?.projectId || null,
    p_org_id: f?.orgId || null,
    p_classification_id: f?.classificationId || null,
    p_sub_tree_id: f?.expensesCategoryId || null,
    p_work_item_id: f?.workItemId || null,
    p_analysis_work_item_id: f?.analysisWorkItemId || null,
    p_cost_center_id: f?.costCenterId || null,
    p_approval_status: f?.approvalStatus || null,
    p_created_by: createdBy || null,
    p_page: page,
    p_page_size: pageSize,
  } as any)

  if (error) throw error
  const rows = (data || []) as unknown as (TransactionRecord & { total_count?: number })[]
  const total = rows.length > 0 && typeof rows[0].total_count === 'number' ? Number(rows[0].total_count) : 0
  // Strip helper column if present
  const cleaned = rows.map(({ total_count, ...rest }) => rest as TransactionRecord)
  return { rows: cleaned, total }
}

// Fetch transaction lines from the enriched view for a given transaction id
export async function getEnrichedLinesByTransactionId(transactionId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('transactions_enriched_v2')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('line_no', { ascending: true })
  if (error) throw error
  return Array.isArray(data) ? data : []
}

export interface EnrichedViewFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
  amountFrom?: number
  amountTo?: number
  debitAccountId?: string
  creditAccountId?: string
  projectId?: string
  orgId?: string
  classificationId?: string
  expensesCategoryId?: string
  workItemId?: string
  analysisWorkItemId?: string
  costCenterId?: string
  approvalStatus?: 'draft' | 'submitted' | 'revision_requested' | 'approved' | 'rejected' | 'cancelled' | 'posted'
  scope?: 'my' | 'all'
  createdBy?: string | null
}

export async function getTransactionsEnrichedView(filters: EnrichedViewFilters, page = 1, pageSize = 20): Promise<PagedResult<any>> {
  const f = filters || {}

  // Ask server to compute eligible transaction ids with full filters and exact pagination
  const { data: idRows, error: idErr } = await supabase.rpc('list_transactions_enriched_rows', {
    p_scope: f.scope ?? 'all',
    p_pending_only: false,
    p_search: f.search || null,
    p_date_from: f.dateFrom || null,
    p_date_to: f.dateTo || null,
    p_amount_from: f.amountFrom ?? null,
    p_amount_to: f.amountTo ?? null,
    p_debit_account_id: f.debitAccountId || null,
    p_credit_account_id: f.creditAccountId || null,
    p_project_id: f.projectId || null,
    p_org_id: f.orgId || null,
    p_classification_id: f.classificationId || null,
    p_sub_tree_id: f.expensesCategoryId || null,
    p_work_item_id: f.workItemId || null,
    p_analysis_work_item_id: f.analysisWorkItemId || null,
    p_cost_center_id: f.costCenterId || null,
    p_approval_status: f.approvalStatus || null,
    p_created_by: f.createdBy || null,
    p_page: page,
    p_page_size: pageSize,
  } as any)
  if (idErr) throw idErr
  const ids = (idRows || []).map((r: any) => r.id)
  const total = (idRows && idRows.length > 0 && typeof (idRows[0] as any).total_count === 'number') ? Number((idRows[0] as any).total_count) : 0
  
  // Build a map of line approval data from the RPC result
  const lineApprovalMap: Record<string, { 
    lines_total_count: number; 
    lines_approved_count: number; 
    computed_approval_status: string 
  }> = {}
  for (const r of (idRows || []) as any[]) {
    if (r.id) {
      lineApprovalMap[r.id] = {
        lines_total_count: r.lines_total_count || 0,
        lines_approved_count: r.lines_approved_count || 0,
        computed_approval_status: r.computed_approval_status || 'draft'
      }
    }
  }
  
  if (ids.length === 0) return { rows: [], total }

  // Fetch the enriched rows by ids, ordered by entry_date desc for stable display
  const q = supabase
    .from('transactions_enriched_v2')
    .select('*')
    .in('transaction_id', ids)
    .order('entry_date', { ascending: false })

  const { data, error } = await q
  if (error) throw error
  
  // Merge line approval data into the rows
  const enrichedRows = (data || []).map((row: any) => {
    const txId = row.transaction_id || row.id
    const approvalData = lineApprovalMap[txId] || { lines_total_count: 0, lines_approved_count: 0, computed_approval_status: 'draft' }
    return {
      ...row,
      lines_total_count: approvalData.lines_total_count,
      lines_approved_count: approvalData.lines_approved_count,
      // Use computed status from line-level approval if available
      approval_status: approvalData.computed_approval_status || row.approval_status || 'draft'
    }
  })
  
  return { rows: enrichedRows, total }
}
