import React, { useEffect, useMemo, useState } from 'react'
import './TransactionAnalysisModal.css'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns } from '../../hooks/useUniversalExport'
import { getTransactionAnalysisDetail, getTransactionAnalysisBreakdownByItem, getTransactionAnalysisBreakdownByCostCenter, getTransactionAnalysisBreakdownByExpensesCategory, type TransactionAnalysisDetail } from '../../services/transactions'

interface Props {
  open: boolean
  transactionId: string | null
  onClose: () => void
  // Optional: pass known fields to avoid initial blank header
  entryNumber?: string
  description?: string
  effectiveTolerance?: number
}

const formatNumber = (n: number | null | undefined) => {
  if (n == null) return '-'
  try {
    return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  } catch {
    return String(n)
  }
}

const TransactionAnalysisModal: React.FC<Props> = ({ open, transactionId, onClose, entryNumber, description, effectiveTolerance }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState<TransactionAnalysisDetail | null>(null)
  const [tab, setTab] = useState<'header' | 'by_item' | 'by_cost_center' | 'by_category'>('header')
  const [rowsByItem, setRowsByItem] = useState<Array<{ analysis_work_item_id: string; analysis_work_item_code: string; analysis_work_item_name: string; amount: number }>>([])
  const [rowsByCC, setRowsByCC] = useState<Array<{ cost_center_id: string; cost_center_code: string; cost_center_name: string; amount: number }>>([])
  const [rowsByCat, setRowsByCat] = useState<Array<{ expenses_category_id: string; expenses_category_code: string; expenses_category_name: string; amount: number }>>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!open || !transactionId) return
      setLoading(true)
      setError('')
      try {
        const [d, byItem, byCC, byCat] = await Promise.all([
          getTransactionAnalysisDetail(transactionId),
          getTransactionAnalysisBreakdownByItem(transactionId).catch(() => []),
          getTransactionAnalysisBreakdownByCostCenter(transactionId).catch(() => []),
          getTransactionAnalysisBreakdownByExpensesCategory(transactionId).catch(() => []),
        ])
        if (!cancelled) {
          setData(d)
          setRowsByItem(byItem || [])
          setRowsByCC(byCC || [])
          setRowsByCat(byCat || [])
        }
      } catch (e: unknown) {
        const error = e as { message?: string };
        if (!cancelled) setError(error?.message || 'حدث خطأ أثناء تحميل التحليل')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    // Close on Escape
    const onKey = (ev: KeyboardEvent) => {
      if (!open) return
      if (ev.key === 'Escape') {
        try { onClose() } catch { /* ignore close errors */ }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { cancelled = true; window.removeEventListener('keydown', onKey) }
  }, [open, transactionId, onClose])

  const header = useMemo(() => {
    return data ?? null
  }, [data])

  // Totals for breakdowns - must be called before any early returns
  const totalByItem = useMemo(() => rowsByItem.reduce((s, r) => s + (r?.amount || 0), 0), [rowsByItem])
  const totalByCC = useMemo(() => rowsByCC.reduce((s, r) => s + (r?.amount || 0), 0), [rowsByCC])
  const totalByCat = useMemo(() => rowsByCat.reduce((s, r) => s + (r?.amount || 0), 0), [rowsByCat])

  if (!open) return null

  return (
    <div className="transaction-modal" role="dialog" aria-modal="true" dir="rtl" onClick={onClose}>
      <div className="transaction-modal-content transaction-modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <div>
            <h3 className="modal-title">تحليل التكلفة</h3>
            <div style={{ color: '#a3a3a3', fontSize: 12 }}>
              {entryNumber ? `رقم القيد: ${entryNumber}` : header?.entry_number ? `رقم القيد: ${header.entry_number}` : ''}
              {description ? ` — ${description}` : header?.description ? ` — ${header.description}` : ''}
              {typeof effectiveTolerance === 'number' && (
                <span style={{ marginInlineStart: 8 }}>(الهامش: {effectiveTolerance})</span>
              )}
            </div>
          </div>
          <div className="button-container">
            <button className="ultimate-btn ultimate-btn-delete" onClick={onClose}>
              <div className="btn-content"><span className="btn-text">إغلاق</span></div>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border, rgba(0,0,0,0.15))', paddingBottom: 8 }}>
          <button className={`ultimate-btn ${tab === 'header' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('header')}>
            <div className="btn-content"><span className="btn-text">الملخص</span></div>
          </button>
          <button className={`ultimate-btn ${tab === 'by_item' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('by_item')}>
            <div className="btn-content"><span className="btn-text">حسب عنصر التحليل</span></div>
          </button>
          <button className={`ultimate-btn ${tab === 'by_cost_center' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('by_cost_center')}>
            <div className="btn-content"><span className="btn-text">حسب مركز التكلفة</span></div>
          </button>
          <button className={`ultimate-btn ${tab === 'by_category' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('by_category')}>
            <div className="btn-content"><span className="btn-text">حسب فئة المصروف</span></div>
          </button>
        </div>

        {loading && (
          <div className="loading-container"><div className="loading-spinner" /></div>
        )}
        {error && !loading && (
          <div className="error-message">{error}</div>
        )}

        {!loading && !error && tab === 'header' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            <div className="summary-card">
              <div className="summary-label">مبلغ القيد</div>
              <div className="summary-value arabic-numbers">{formatNumber(header?.transaction_amount)} ر.س</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">إجمالي البنود</div>
              <div className="summary-value arabic-numbers">{formatNumber(header?.line_items_total ?? 0)} ر.س</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">عدد البنود</div>
              <div className="summary-value">{header?.line_items_count ?? 0}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">قيمة التباين</div>
              <div className={`summary-value arabic-numbers ${Math.abs(header?.variance_amount || 0) > 0 ? 'text-warn' : ''}`}>
                {formatNumber(header?.variance_amount ?? 0)} ر.س
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">نسبة التباين</div>
              <div className={`summary-value arabic-numbers ${Math.abs(header?.variance_amount || 0) > 0 ? 'text-warn' : ''}`}>
                {header?.variance_pct != null ? `${formatNumber(header?.variance_pct)}%` : '-'}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">حالة المطابقة</div>
              <div className="summary-value">{header?.is_matched ? 'متطابق' : 'غير متطابق'}</div>
            </div>
            <div className="summary-card" style={{ gridColumn: '1 / -1' }}>
              <div className="summary-label">يحتاج متابعة؟</div>
              <div className={`summary-value ${header?.needs_attention ? 'text-warn' : ''}`}>{header?.needs_attention ? 'نعم' : 'لا'}</div>
            </div>
          </div>
        )}

        {!loading && !error && tab === 'by_item' && (
          <div className="placeholder-table">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <ExportButtons
                data={{ columns: createStandardColumns([
                  { key: 'code', header: 'الكود', type: 'text' },
                  { key: 'name', header: 'اسم بند التحليل', type: 'text' },
                  { key: 'amount', header: 'المبلغ', type: 'currency' },
                ]), rows: rowsByItem.map(r => ({ code: r.analysis_work_item_code, name: r.analysis_work_item_name, amount: r.amount })) }}
                config={{ title: 'تحليل حسب بند التحليل', rtlLayout: true, useArabicNumerals: true }}
                size="small"
                layout="horizontal"
              />
            </div>
            {rowsByItem.length === 0 ? (
              <div style={{ color: '#a3a3a3' }}>لا توجد بيانات</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right' }}>الكود</th>
                    <th style={{ textAlign: 'right' }}>اسم بند التحليل</th>
                    <th style={{ textAlign: 'right' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsByItem.map(r => {
                    const warn = Math.abs(r.amount || 0) > (effectiveTolerance ?? 0)
                    return (
                      <tr key={r.analysis_work_item_id} className={warn ? 'tr-row-warn' : undefined}>
                        <td>{r.analysis_work_item_code}</td>
                        <td>{r.analysis_work_item_name}</td>
                        <td className={`arabic-numbers ${warn ? 'tr-cell-warn' : ''}`}>{formatNumber(r.amount)} ر.س</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>الإجمالي</td>
                    <td className="arabic-numbers" style={{ fontWeight: 700 }}>{formatNumber(totalByItem)} ر.س</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {!loading && !error && tab === 'by_cost_center' && (
          <div className="placeholder-table">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <ExportButtons
                data={{ columns: createStandardColumns([
                  { key: 'code', header: 'الكود', type: 'text' },
                  { key: 'name', header: 'اسم مركز التكلفة', type: 'text' },
                  { key: 'amount', header: 'المبلغ', type: 'currency' },
                ]), rows: rowsByCC.map(r => ({ code: r.cost_center_code, name: r.cost_center_name, amount: r.amount })) }}
                config={{ title: 'تحليل حسب مركز التكلفة', rtlLayout: true, useArabicNumerals: true }}
                size="small"
                layout="horizontal"
              />
            </div>
            {rowsByCC.length === 0 ? (
              <div style={{ color: '#a3a3a3' }}>لا توجد بيانات</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right' }}>الكود</th>
                    <th style={{ textAlign: 'right' }}>اسم مركز التكلفة</th>
                    <th style={{ textAlign: 'right' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsByCC.map(r => {
                    const warn = Math.abs(r.amount || 0) > (effectiveTolerance ?? 0)
                    return (
                      <tr key={r.cost_center_id} className={warn ? 'tr-row-warn' : undefined}>
                        <td>{r.cost_center_code}</td>
                        <td>{r.cost_center_name}</td>
                        <td className={`arabic-numbers ${warn ? 'tr-cell-warn' : ''}`}>{formatNumber(r.amount)} ر.س</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>الإجمالي</td>
                    <td className="arabic-numbers" style={{ fontWeight: 700 }}>{formatNumber(totalByCC)} ر.س</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {!loading && !error && tab === 'by_category' && (
          <div className="placeholder-table">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <ExportButtons
                data={{ columns: createStandardColumns([
                  { key: 'code', header: 'الكود', type: 'text' },
                  { key: 'name', header: 'فئة المصروف', type: 'text' },
                  { key: 'amount', header: 'المبلغ', type: 'currency' },
                ]), rows: rowsByCat.map(r => ({ code: r.expenses_category_code, name: r.expenses_category_name, amount: r.amount })) }}
                config={{ title: 'تحليل حسب فئة المصروف', rtlLayout: true, useArabicNumerals: true }}
                size="small"
                layout="horizontal"
              />
            </div>
            {rowsByCat.length === 0 ? (
              <div style={{ color: '#a3a3a3' }}>لا توجد بيانات</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right' }}>الكود</th>
                    <th style={{ textAlign: 'right' }}>فئة المصروف</th>
                    <th style={{ textAlign: 'right' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsByCat.map(r => {
                    const warn = Math.abs(r.amount || 0) > (effectiveTolerance ?? 0)
                    return (
                      <tr key={r.expenses_category_id} className={warn ? 'tr-row-warn' : undefined}>
                        <td>{r.expenses_category_code}</td>
                        <td>{r.expenses_category_name}</td>
                        <td className={`arabic-numbers ${warn ? 'tr-cell-warn' : ''}`}>{formatNumber(r.amount)} ر.س</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>الإجمالي</td>
                    <td className="arabic-numbers" style={{ fontWeight: 700 }}>{formatNumber(totalByCat)} ر.س</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionAnalysisModal
