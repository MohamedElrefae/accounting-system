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
}

export async function getTransactionsEnrichedView(filters: EnrichedViewFilters, page = 1, pageSize = 20): Promise<PagedResult<any>> {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('transactions_enriched_v2')
    .select('*', { count: 'exact' })
    .order('entry_date', { ascending: false })

  const f = filters || {}
  if (f.search && f.search.trim()) {
    const s = f.search.trim()
    q = (q as any).or(`entry_number.ilike.%${s}%,description.ilike.%${s}%,reference_number.ilike.%${s}%,notes.ilike.%${s}%`)
  }
  if (f.dateFrom) q = q.gte('entry_date', f.dateFrom)
  if (f.dateTo) q = q.lte('entry_date', f.dateTo)
  if (f.amountFrom != null) q = q.gte('amount', f.amountFrom)
  if (f.amountTo != null) q = q.lte('amount', f.amountTo)
  if (f.debitAccountId) q = q.eq('debit_account_id', f.debitAccountId)
  if (f.creditAccountId) q = q.eq('credit_account_id', f.creditAccountId)
  if (f.projectId) q = q.eq('project_id', f.projectId)
  if (f.orgId) q = q.eq('org_id', f.orgId)
  if (f.classificationId) q = q.eq('classification_id', f.classificationId)
  if (f.expensesCategoryId) q = q.eq('sub_tree_id', f.expensesCategoryId)
  if (f.workItemId) q = q.eq('work_item_id', f.workItemId)
  if (f.analysisWorkItemId) q = q.eq('analysis_work_item_id', f.analysisWorkItemId)
  if (f.costCenterId) q = q.eq('cost_center_id', f.costCenterId)
  if (f.approvalStatus === 'posted') q = q.eq('is_posted', true)
  else if (f.approvalStatus) q = q.eq('approval_status', f.approvalStatus)

  const { data, error, count } = await q.range(from, to)
  if (error) throw error
  return { rows: (data || []) as any[], total: count ?? 0 }
}
