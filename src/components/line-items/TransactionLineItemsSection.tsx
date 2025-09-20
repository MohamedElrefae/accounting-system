import React, { useEffect, useState } from 'react'
import { TransactionLineItemsEditor } from './TransactionLineItemsEditor'
import { transactionLineItemsService, type EditableTxLineItem } from '../../services/transaction-line-items'

export interface TransactionLineItemsSectionProps {
  transactionId: string
  orgId: string
  disabled?: boolean
}

/**
 * Drop-in section to manage transaction_line_items with minimal wiring.
 * Loads from DB, allows editing, and persists via upsertMany.
 */
export const TransactionLineItemsSection: React.FC<TransactionLineItemsSectionProps> = ({
  transactionId,
  orgId,
  disabled = false,
}) => {
  const [items, setItems] = useState<EditableTxLineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      setSuccess(null)
      try {
        const rows = await transactionLineItemsService.listByTransaction(transactionId)
        if (!mounted) return
        const mapped: EditableTxLineItem[] = rows.map(r => ({
          id: r.id,
          line_number: r.line_number,
          quantity: r.quantity,
          percentage: r.percentage ?? 100,
          unit_price: r.unit_price,
          discount_amount: r.discount_amount ?? 0,
          tax_amount: r.tax_amount ?? 0,
          unit_of_measure: r.unit_of_measure,
          item_code: r.item_code,
          item_name: r.item_name,
          analysis_work_item_id: r.analysis_work_item_id,
          sub_tree_id: r.sub_tree_id,
          line_item_id: (r as any).line_item_id ?? null,
        }))
        setItems(mapped)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load line items')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [transactionId])

  const save = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await transactionLineItemsService.upsertMany(transactionId, items)
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
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()} disabled={loading || saving}>Reload</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={disabled || loading || saving}>Save lines</button>
        </div>
      </div>

      {loading && <div className="text-secondary">Loading…</div>}
      {error && <div role="alert" className="text-danger">{error}</div>}
      {success && <div className="text-success">{success}</div>}

      <TransactionLineItemsEditor
        transactionId={transactionId}
        orgId={orgId}
        items={items}
        onChange={setItems}
        disabled={disabled || loading || saving}
      />
    </section>
  )
}
