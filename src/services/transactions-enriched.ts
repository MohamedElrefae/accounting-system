import { supabase } from '../utils/supabase'
import { getCurrentUserId, type TransactionRecord, type PagedResult, type ListTransactionsFilters, type ListTransactionsOptions } from './transactions'

export interface EnrichedHeaderListOptions extends ListTransactionsOptions {}

// Calls SQL RPC list_transactions_enriched_headers to get DISTINCT transaction headers
// Calls SQL RPC list_transactions_enriched_headers to get DISTINCT transaction headers
export async function getTransactionsEnrichedHeaders(options?: EnrichedHeaderListOptions): Promise<PagedResult<TransactionRecord>> {
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  if (!getConnectionMonitor().getHealth().isOnline) return { rows: [], total: 0 };

  try {
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
  } catch (error: any) {
    console.warn('[getTransactionsEnrichedHeaders] Network error or offline:', error);
    return { rows: [], total: 0 };
  }
}

// Fetch transaction lines from the enriched view for a given transaction id
export async function getEnrichedLinesByTransactionId(transactionId: string): Promise<any[]> {
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  if (!getConnectionMonitor().getHealth().isOnline) return [];

  try {
    const { data, error } = await supabase
      .from('transactions_enriched_v2')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('line_no', { ascending: true })
    if (error) throw error
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.warn('[getEnrichedLinesByTransactionId] Network error or offline:', error);
    return [];
  }
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
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  const isOnline = getConnectionMonitor().getHealth().isOnline;
  
  if (!isOnline) {
    try {
      return await getTransactionsEnrichedViewOffline(filters, page, pageSize);
    } catch (err) {
      console.error('❌ Transactions Enriched - Offline fallback failed:', err);
      return { rows: [], total: 0 };
    }
  }

  const f = filters || {}

  try {
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

  } catch (error: any) {
      if (error.message?.includes('fetch') || error.code === 'PGRST000' || !isOnline) {
          console.warn('⚠️ Network error in main view - falling back to offline mode');
          return await getTransactionsEnrichedViewOffline(filters, page, pageSize);
      }
      throw error;
  }
}


/**
 * Offline implementation of enriched transactions browsing.
 */
export async function getTransactionsEnrichedViewOffline(filters: EnrichedViewFilters, page = 1, pageSize = 20): Promise<PagedResult<any>> {
  const { getOfflineDB } = await import('./offline/core/OfflineSchema');
  const db = getOfflineDB();

  console.log('🔍 Transactions Enriched - getTransactionsEnrichedViewOffline (Dexie)', { filters, page, pageSize });

  // 1. Get all transactions from Dexie
  const allTxs = await db.transactions.toArray();

  // 2. Apply filters in memory
  const filteredTxs = allTxs.filter(t => {
    const f = filters || {};
    if (f.orgId && t.org_id !== f.orgId) return false;
    if (f.projectId && t.project_id !== f.projectId) return false;
    if (f.approvalStatus && t.approval_status !== f.approvalStatus) return false;
    if (f.createdBy && t.created_by !== f.createdBy) return false;
    if (f.dateFrom && t.entry_date < f.dateFrom) return false;
    if (f.dateTo && t.entry_date > f.dateTo) return false;
    
    if (f.search) {
      const s = f.search.toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const ref = (t.reference_number || '').toLowerCase();
      const num = (t.entry_number || '').toLowerCase();
      if (!desc.includes(s) && !ref.includes(s) && !num.includes(s)) return false;
    }

    return true;
  });

  // Sort by entry_date desc for stability
  filteredTxs.sort((a, b) => {
    const d1 = new Date(a.entry_date).getTime();
    const d2 = new Date(b.entry_date).getTime();
    if (d1 !== d2) return d2 - d1;
    // Fallback to primary key for stable sort
    return b._pk.localeCompare(a._pk);
  });

  const total = filteredTxs.length;

  // 3. Paginate
  const start = (page - 1) * pageSize;
  const pageTxs = filteredTxs.slice(start, start + pageSize);

  if (pageTxs.length === 0) return { rows: [], total };

  // 4. Enrich page transactions with line summary data
  const txIds = pageTxs.map(t => t.id);
  const allLines = await db.transactionLines.where('transaction_id').anyOf(txIds).toArray();

  const enrichedRows = pageTxs.map(tx => {
    const lines = allLines.filter(l => l.transaction_id === tx.id);
    const approvedLines = lines.filter(l => l.line_status === 'approved');
    
    return {
      ...tx,
      lines_total_count: lines.length,
      lines_approved_count: approvedLines.length,
      // Use stored status or compute if needed
      approval_status: tx.approval_status || 'draft'
    };
  });

  return { rows: enrichedRows, total };
}
