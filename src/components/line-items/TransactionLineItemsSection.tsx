import React, { useEffect, useState, useCallback } from 'react'
import { TransactionLineItemsEditor } from './TransactionLineItemsEditor'
import {
  transactionLineItemsEnhancedService,
  type EditableTxLineItem,
} from '../../services/transaction-line-items-enhanced'

export interface TransactionLineItemsSectionProps {
  transactionLineId: string
  orgId: string
  disabled?: boolean
  // Cost analysis data
  workItems?: Array<{ id: string; code: string; name: string }>
  analysisItems?: Record<string, { code: string; name: string }>
  costCenters?: Array<{ id: string; code: string; name: string }>
  transactionLineDefaults?: {
    work_item_id?: string | null
    analysis_work_item_id?: string | null
    sub_tree_id?: string | null
  }
}

/**
 * Drop-in section to manage transaction_line_items with minimal wiring.
 * Loads from DB, allows editing, and persists via upsertMany.
 */
export const TransactionLineItemsSection: React.FC<TransactionLineItemsSectionProps> = ({
  transactionLineId,
  orgId,
  disabled = false,
  workItems,
  analysisItems,
  costCenters,
  transactionLineDefaults,
}) => {
  const [items, setItems] = useState<EditableTxLineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    let canceled = false
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const rows = await transactionLineItemsEnhancedService.getLineItemsList(transactionLineId)
      if (canceled) return
      const mapped: EditableTxLineItem[] = rows.map(r => ({
        id: r.id,
        line_number: r.line_number,
        quantity: r.quantity,
        percentage: r.percentage ?? 100,
        unit_price: r.unit_price,
        unit_of_measure: r.unit_of_measure,
        item_code: r.item_code,
        item_name: r.item_name,
        analysis_work_item_id: r.analysis_work_item_id,
        sub_tree_id: r.sub_tree_id,
        line_item_catalog_id: r.line_item_catalog_id,
        work_item_id: r.work_item_id,
        item_name_ar: r.item_name_ar,
      }))
      setItems(mapped)
    } catch (e: any) {
      if (!canceled) setError(e?.message || 'Failed to load line items')
    } finally {
      if (!canceled) setLoading(false)
    }
    return () => { canceled = true }
  }, [transactionLineId])

  useEffect(() => {
    const cancel = fetchItems()
    return () => { if (typeof cancel === 'function') cancel() }
  }, [fetchItems])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await transactionLineItemsEnhancedService.saveLineItems(transactionLineId, items)
      setSuccess('Saved')
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="tx-lines root flex-col gap-4">
      <div className="tx-lines__header flex-row items-center justify-between">
        <h3 className="text-title">🚀 بنود المعاملة المحسّنة</h3>
        <div className="flex-row gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => { void fetchItems() }} disabled={loading || saving}>Reload</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={disabled || loading || saving}>Save lines</button>
        </div>
      </div>

      {loading && <div className="text-secondary">Loading…</div>}
      {error && <div role="alert" className="text-danger">{error}</div>}
      {success && <div className="text-success">{success}</div>}

      <TransactionLineItemsEditor
        transactionLineId={transactionLineId}
        orgId={orgId}
        items={items}
        onChange={setItems}
        disabled={disabled || loading || saving}
        workItems={workItems}
        analysisItems={analysisItems}
        costCenters={costCenters}
        transactionLineDefaults={transactionLineDefaults}
      />
    </section>
  )
}
