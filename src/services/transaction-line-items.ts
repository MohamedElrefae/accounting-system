import { supabase } from '../utils/supabase'

export interface DbTxLineItem {
  id: string
  transaction_id: string
  org_id: string | null
  line_number: number
  item_code: string | null
  item_name: string | null
  item_name_ar: string | null
  description: string | null
  description_ar: string | null
  unit_of_measure: string | null
  analysis_work_item_id: string | null
  sub_tree_id: string | null
  quantity: number
  percentage: number
  unit_price: number
  discount_amount: number | null
  tax_amount: number | null
  total_amount: number | null
  line_item_id?: string | null
  created_at: string
  updated_at: string
}

export interface EditableTxLineItem {
  id?: string
  line_number: number
  quantity: number
  percentage?: number
  unit_price: number
  discount_amount?: number
  tax_amount?: number
  unit_of_measure?: string | null
  item_code?: string | null
  item_name?: string | null
  analysis_work_item_id?: string | null
  sub_tree_id?: string | null
  line_item_id?: string | null
}

export function computeLineTotal(row: EditableTxLineItem): number {
  const qty = Number(row.quantity || 0)
  const unit = Number(row.unit_price || 0)
  const pct = Number(row.percentage == null ? 100 : row.percentage)
  const disc = Number(row.discount_amount || 0)
  const tax = Number(row.tax_amount || 0)
  return qty * unit * (pct / 100) - disc + tax
}

export class TransactionLineItemsService {
  async listByTransaction(transactionId: string): Promise<DbTxLineItem[]> {
    const { data, error } = await supabase
      .from('transaction_line_items')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('line_number', { ascending: true })
      .order('id', { ascending: true })
    if (error) throw error
    return (data || []) as DbTxLineItem[]
  }

  async upsertMany(transactionId: string, items: EditableTxLineItem[]): Promise<void> {
    // Normalize defaults
    const normalized = items.map(it => ({
      ...it,
      percentage: it.percentage == null ? 100 : it.percentage,
      discount_amount: it.discount_amount == null ? 0 : it.discount_amount,
      tax_amount: it.tax_amount == null ? 0 : it.tax_amount,
    }))

    // Fetch existing ids for diff
    const { data: existing, error: readErr } = await supabase
      .from('transaction_line_items')
      .select('id')
      .eq('transaction_id', transactionId)
    if (readErr) throw readErr

    const existingIds = new Set((existing || []).map(r => r.id as string))
    const incomingIds = new Set(normalized.filter(x => x.id).map(x => x.id as string))

    const toInsert = normalized.filter(x => !x.id).map(x => ({
      transaction_id: transactionId,
      line_number: x.line_number,
      quantity: x.quantity,
      percentage: x.percentage,
      unit_price: x.unit_price,
      discount_amount: x.discount_amount,
      tax_amount: x.tax_amount,
      unit_of_measure: x.unit_of_measure ?? null,
      item_code: x.item_code ?? null,
      item_name: x.item_name ?? null,
      analysis_work_item_id: x.analysis_work_item_id ?? null,
      sub_tree_id: x.sub_tree_id ?? null,
      line_item_id: x.line_item_id ?? null,
      // total_amount remains null; compute in views/clients
    }))

    const toUpdate = normalized.filter(x => x.id).map(x => ({
      id: x.id!,
      line_number: x.line_number,
      quantity: x.quantity,
      percentage: x.percentage,
      unit_price: x.unit_price,
      discount_amount: x.discount_amount,
      tax_amount: x.tax_amount,
      unit_of_measure: x.unit_of_measure ?? null,
      item_code: x.item_code ?? null,
      item_name: x.item_name ?? null,
      analysis_work_item_id: x.analysis_work_item_id ?? null,
      sub_tree_id: x.sub_tree_id ?? null,
      line_item_id: x.line_item_id ?? null,
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
        .eq('transaction_id', transactionId)
      if (error) throw error
    }
  }
}

export const transactionLineItemsService = new TransactionLineItemsService()
