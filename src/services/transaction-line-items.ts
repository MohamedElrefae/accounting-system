import { supabase } from '../utils/supabase'

export interface DbTxLineItem {
  id: string
  transaction_line_id?: string | null
  org_id: string | null
  line_number: number
  // Display-only fields (not stored on table):
  item_code?: string | null
  item_name?: string | null
  unit_of_measure: string | null
  analysis_work_item_id: string | null
  sub_tree_id: string | null
  quantity: number
  percentage: number
  unit_price: number
  total_amount: number | null
  line_item_catalog_id?: string | null
  created_at: string
  updated_at: string
}

export interface EditableTxLineItem {
  id?: string
  transaction_line_id?: string | null
  line_number: number
  quantity: number
  percentage?: number
  unit_price: number
  unit_of_measure?: string | null
  // Display-only inputs; not persisted on table
  item_code?: string | null
  item_name?: string | null
  analysis_work_item_id?: string | null
  sub_tree_id?: string | null
  line_item_catalog_id?: string | null
}

export function computeLineTotal(row: EditableTxLineItem): number {
  const qty = Number(row.quantity || 0)
  const unit = Number(row.unit_price || 0)
  const pct = Number(row.percentage == null ? 100 : row.percentage)
  // Match DB: quantity * (percentage/100) * unit_price
  return qty * unit * (pct / 100)
}

export class TransactionLineItemsService {
  /**
   * Note: transaction_line_items are now linked to transaction_lines, not transactions directly.
   * Use listByTransactionLine() instead.
   * @deprecated Use listByTransactionLine(transactionLineId) instead
   */
  async listByTransaction(transactionId: string): Promise<DbTxLineItem[]> {
    throw new Error('listByTransaction() is deprecated. Use listByTransactionLine(transactionLineId) instead.')
  }

  async listByTransactionLine(transactionLineId: string): Promise<DbTxLineItem[]> {
    const { data, error } = await supabase
      .from('transaction_line_items')
      .select(`
        id, transaction_line_id, org_id, line_number,
        quantity, percentage, unit_price, unit_of_measure,
        analysis_work_item_id, sub_tree_id,
        total_amount, line_item_catalog_id,
        created_at, updated_at
      `)
      .eq('transaction_line_id', transactionLineId)
      .order('line_number', { ascending: true })
      .order('id', { ascending: true })
    if (error) throw error
    return (data || []) as DbTxLineItem[]
  }

  async countByTransactionLine(transactionLineId: string): Promise<number> {
    const { count, error } = await supabase
      .from('transaction_line_items')
      .select('*', { count: 'exact', head: true })
      .eq('transaction_line_id', transactionLineId)
    if (error) throw error
    return count || 0
  }

  /**
   * Upsert many items by transaction_line_id.
   * Note: This now works with transaction_line_id, not transaction_id.
   * @param transactionLineId - The transaction_line_id to scope the operation
   * @param items - Items to insert/update/delete
   */
  async upsertMany(transactionLineId: string, items: EditableTxLineItem[]): Promise<void> {
    // Normalize defaults
    const normalized = items.map(it => ({
      ...it,
      percentage: it.percentage == null ? 100 : it.percentage,
      discount_amount: it.discount_amount == null ? 0 : it.discount_amount,
      tax_amount: it.tax_amount == null ? 0 : it.tax_amount,
    }))

    // Fetch existing ids for this transaction_line
    const { data: existing, error: readErr } = await supabase
      .from('transaction_line_items')
      .select('id')
      .eq('transaction_line_id', transactionLineId)
    if (readErr) throw readErr

    const existingIds = new Set((existing || []).map(r => r.id as string))
    const incomingIds = new Set(normalized.filter(x => x.id).map(x => x.id as string))

    const toInsert = normalized.filter(x => !x.id).map(x => ({
      transaction_line_id: transactionLineId,
      line_number: x.line_number,
      quantity: x.quantity,
      percentage: x.percentage,
      unit_price: x.unit_price,
      unit_of_measure: x.unit_of_measure ?? null,
      analysis_work_item_id: x.analysis_work_item_id ?? null,
      sub_tree_id: x.sub_tree_id ?? null,
      line_item_catalog_id: x.line_item_catalog_id ?? null,
      org_id: undefined, // Will be set by DB default or policy
    }))

    const toUpdate = normalized.filter(x => x.id).map(x => ({
      id: x.id!,
      line_number: x.line_number,
      quantity: x.quantity,
      percentage: x.percentage,
      unit_price: x.unit_price,
      unit_of_measure: x.unit_of_measure ?? null,
      analysis_work_item_id: x.analysis_work_item_id ?? null,
      sub_tree_id: x.sub_tree_id ?? null,
      line_item_catalog_id: x.line_item_catalog_id ?? null,
      updated_at: new Date().toISOString(),
    }))

    const toDelete = Array.from(existingIds).filter(id => !incomingIds.has(id))

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('transaction_line_items')
        .insert(toInsert)
      if (error) throw error
    }

    if (toUpdate.length > 0) {
      const { error } = await supabase
        .from('transaction_line_items')
        .upsert(toUpdate, { onConflict: 'id' })
      if (error) throw error
    }

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('transaction_line_items')
        .delete()
        .in('id', toDelete)
        .eq('transaction_line_id', transactionLineId)
      if (error) throw error
    }
  }
}

export const transactionLineItemsService = new TransactionLineItemsService()
