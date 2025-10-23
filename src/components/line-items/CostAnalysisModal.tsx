import React, { useState, useEffect } from 'react'
import type { EditableTxLineItem } from '../../services/transaction-line-items'

export interface CostAnalysisModalProps {
  item: EditableTxLineItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (item: EditableTxLineItem) => void
  workItems: Array<{ id: string; code: string; name: string }>
  analysisItems: Record<string, { code: string; name: string }>
  costCenters: Array<{ id: string; code: string; name: string }>
  transactionLineDefaults?: {
    work_item_id?: string | null
    analysis_work_item_id?: string | null
    sub_tree_id?: string | null
  }
}

/**
 * Modal for editing cost analysis assignments (work_item, analysis_work_item, cost center)
 * 
 * Allows per-line granularity while defaulting from transaction_lines.
 * Users can override defaults for flexible cost allocation.
 */
export const CostAnalysisModal: React.FC<CostAnalysisModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  workItems,
  analysisItems,
  costCenters,
  transactionLineDefaults,
}) => {
  const [workItemId, setWorkItemId] = useState<string | null>(null)
  const [analysisWorkItemId, setAnalysisWorkItemId] = useState<string | null>(null)
  const [subTreeId, setSubTreeId] = useState<string | null>(null)
  const [showDefaults, setShowDefaults] = useState(false)

  // Initialize with item values or defaults
  useEffect(() => {
    if (item) {
      setWorkItemId(item.work_item_id ?? null)
      setAnalysisWorkItemId(item.analysis_work_item_id ?? null)
      setSubTreeId(item.sub_tree_id ?? null)
      setShowDefaults(false)
    }
  }, [item, isOpen])

  const handleReset = () => {
    // Reset to transaction_lines defaults
    setWorkItemId(transactionLineDefaults?.work_item_id ?? null)
    setAnalysisWorkItemId(transactionLineDefaults?.analysis_work_item_id ?? null)
    setSubTreeId(transactionLineDefaults?.sub_tree_id ?? null)
    setShowDefaults(true)
  }

  const handleSave = () => {
    if (!item) return

    const updated: EditableTxLineItem = {
      ...item,
      work_item_id: workItemId,
      analysis_work_item_id: analysisWorkItemId,
      sub_tree_id: subTreeId,
    }

    onSave(updated)
    onClose()
  }

  const getWorkItemLabel = (id: string | null) => {
    if (!id) return '—'
    const item = workItems.find(w => w.id === id)
    return item ? `${item.code} - ${item.name}` : id
  }

  const getAnalysisItemLabel = (id: string | null) => {
    if (!id) return '—'
    const item = analysisItems[id]
    return item ? `${item.code} - ${item.name}` : id
  }

  const getCostCenterLabel = (id: string | null) => {
    if (!id) return '—'
    const cc = costCenters.find(c => c.id === id)
    return cc ? `${cc.code} - ${cc.name}` : id
  }

  if (!isOpen || !item) return null

  return (
    <div className="modal-overlay" onClick={() => !showDefaults && onClose()}>
      <div className="modal-content" style={{ width: '500px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="modal-title">💰 تحليل التكلفة - Cost Analysis</h3>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={showDefaults}
            style={{ fontSize: '20px', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Item Info */}
          <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Line Item</div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {item.item_code || `#${item.line_number}`} - {item.item_name || 'Untitled'}
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Qty: {item.quantity} × ${item.unit_price} = ${((item.quantity ?? 0) * (item.unit_price ?? 0)).toFixed(2)}
            </div>
          </div>

          {/* Transaction Line Defaults Info */}
          {transactionLineDefaults && (
            <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px', fontSize: '12px' }}>
              <div style={{ fontWeight: '500', marginBottom: '8px' }}>📋 GL Line Defaults:</div>
              <div>Work Item: {getWorkItemLabel(transactionLineDefaults.work_item_id)}</div>
              <div>Analysis: {getAnalysisItemLabel(transactionLineDefaults.analysis_work_item_id)}</div>
              <div>Cost Center: {getCostCenterLabel(transactionLineDefaults.sub_tree_id)}</div>
            </div>
          )}

          {/* Cost Assignment Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Work Item */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>
                📌 Work Item / عنصر العمل
              </label>
              <select
                value={workItemId || ''}
                onChange={e => setWorkItemId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                }}
              >
                <option value="">— None / بلا —</option>
                {workItems.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Analysis Work Item */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>
                🔍 Analysis Item / بند التحليل
              </label>
              <select
                value={analysisWorkItemId || ''}
                onChange={e => setAnalysisWorkItemId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                }}
              >
                <option value="">— None / بلا —</option>
                {Object.entries(analysisItems).map(([id, item]) => (
                  <option key={id} value={id}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost Center / Sub Tree */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px' }}>
                🏢 Cost Center / مركز التكلفة
              </label>
              <select
                value={subTreeId || ''}
                onChange={e => setSubTreeId(e.target.value || null)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                }}
              >
                <option value="">— None / بلا —</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Values Display */}
          <div style={{ padding: '12px', backgroundColor: '#f0f4ff', borderRadius: '4px', fontSize: '12px' }}>
            <div style={{ fontWeight: '500', marginBottom: '8px' }}>📊 Current Selection:</div>
            <div>Work Item: <strong>{getWorkItemLabel(workItemId)}</strong></div>
            <div>Analysis: <strong>{getAnalysisItemLabel(analysisWorkItemId)}</strong></div>
            <div>Cost Center: <strong>{getCostCenterLabel(subTreeId)}</strong></div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #eee' }}>
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={showDefaults}
            title="Reset to GL line defaults"
          >
            🔄 Reset to Defaults
          </button>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={showDefaults}
          >
            Cancel / إلغاء
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={showDefaults}
          >
            ✓ Save / حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

export default CostAnalysisModal
