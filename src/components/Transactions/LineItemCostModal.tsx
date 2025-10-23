import React, { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import type { WorkItemRow } from '../../types/work-items'

export interface LineItemCostData {
  id: string
  transaction_id: string
  line_no: number
  work_item_id: string | null
  analysis_work_item_id: string | null
  sub_tree_id: string | null
}

export interface LineItemCostModalProps {
  isOpen: boolean
  onClose: () => void
  transactionLineId: string | null
  transactionId: string | null
  workItems: WorkItemRow[]
  analysisItems: Record<string, { code: string; name: string }>
  costCenters: Array<{ id: string; code: string; name: string }>
  onSaveSuccess?: () => void
}

/**
 * Modal for editing cost dimensions (work item, analysis item, cost center)
 * for a specific transaction line
 */
const LineItemCostModal: React.FC<LineItemCostModalProps> = ({
  isOpen,
  onClose,
  transactionLineId,
  transactionId,
  workItems,
  analysisItems,
  costCenters,
  onSaveSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [lineData, setLineData] = useState<LineItemCostData | null>(null)
  const [formData, setFormData] = useState({
    work_item_id: '',
    analysis_work_item_id: '',
    sub_tree_id: ''
  })

  // Load current line data when modal opens
  useEffect(() => {
    if (!isOpen || !transactionLineId || !transactionId) {
      setLineData(null)
      setFormData({ work_item_id: '', analysis_work_item_id: '', sub_tree_id: '' })
      return
    }

    const loadLineData = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: err } = await supabase
          .from('transaction_lines')
          .select('id, transaction_id, line_no, work_item_id, analysis_work_item_id, sub_tree_id')
          .eq('id', transactionLineId)
          .eq('transaction_id', transactionId)
          .single()

        if (err) throw err

        if (data) {
          setLineData(data as LineItemCostData)
          setFormData({
            work_item_id: data.work_item_id || '',
            analysis_work_item_id: data.analysis_work_item_id || '',
            sub_tree_id: data.sub_tree_id || ''
          })
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load line data')
      } finally {
        setLoading(false)
      }
    }

    loadLineData()
  }, [isOpen, transactionLineId, transactionId])

  const handleSave = async () => {
    if (!transactionLineId) return

    try {
      setSaving(true)
      setError(null)

      const { error: err } = await supabase
        .from('transaction_lines')
        .update({
          work_item_id: formData.work_item_id || null,
          analysis_work_item_id: formData.analysis_work_item_id || null,
          sub_tree_id: formData.sub_tree_id || null
        })
        .eq('id', transactionLineId)

      if (err) throw err

      onSaveSuccess?.()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to save cost data')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const getWorkItemLabel = (id: string | null | undefined) => {
    if (!id) return '—'
    const item = workItems.find(w => w.id === id)
    return item ? `${item.code} - ${item.name}` : id
  }

  const getAnalysisItemLabel = (id: string | null | undefined) => {
    if (!id) return '—'
    const item = analysisItems[id]
    return item ? `${item.code} - ${item.name}` : id
  }

  const getCostCenterLabel = (id: string | null | undefined) => {
    if (!id) return '—'
    const cc = costCenters.find(c => c.id === id)
    return cc ? `${cc.code} - ${cc.name}` : id
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            💰 تعديل بيانات التكلفة - القيد #{lineData?.line_no}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#666' }}>
              جاري التحميل...
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: '#fee',
                border: '1px solid #f88',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '16px',
                color: '#c00'
              }}
            >
              {error}
            </div>
          )}

          {!loading && lineData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Line Info */}
              <div
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  معلومات القيد
                </div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  الرقم: #{lineData.line_no} | المعاملة: {transactionId?.substring(0, 8)}...
                </div>
              </div>

              {/* Work Item */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  📌 عنصر العمل
                </label>
                <select
                  value={formData.work_item_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      work_item_id: e.target.value
                    }))
                  }
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">— بلا —</option>
                  {workItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
                {formData.work_item_id && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    المختار: {getWorkItemLabel(formData.work_item_id)}
                  </div>
                )}
              </div>

              {/* Analysis Item */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  🔍 بند التحليل
                </label>
                <select
                  value={formData.analysis_work_item_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      analysis_work_item_id: e.target.value
                    }))
                  }
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">— بلا —</option>
                  {Object.entries(analysisItems).map(([id, item]) => (
                    <option key={id} value={id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
                {formData.analysis_work_item_id && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    المختار: {getAnalysisItemLabel(formData.analysis_work_item_id)}
                  </div>
                )}
              </div>

              {/* Cost Center */}
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  🏢 مركز التكلفة
                </label>
                <select
                  value={formData.sub_tree_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sub_tree_id: e.target.value
                    }))
                  }
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">— بلا —</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code} - {cc.name}
                    </option>
                  ))}
                </select>
                {formData.sub_tree_id && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    المختار: {getCostCenterLabel(formData.sub_tree_id)}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div
                style={{
                  backgroundColor: '#f0f4ff',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '8px' }}>
                  📊 الملخص:
                </div>
                <div>
                  عنصر العمل: <strong>{getWorkItemLabel(formData.work_item_id)}</strong>
                </div>
                <div>
                  بند التحليل:{' '}
                  <strong>{getAnalysisItemLabel(formData.analysis_work_item_id)}</strong>
                </div>
                <div>
                  مركز التكلفة: <strong>{getCostCenterLabel(formData.sub_tree_id)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end'
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#4CAF50',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'جاري الحفظ...' : '✓ حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LineItemCostModal
