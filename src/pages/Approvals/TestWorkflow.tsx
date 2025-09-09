import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { pickWorkflowForTransaction, type ApprovalWorkflowRow, type ApprovalStepRow } from '../../services/approvals'
import { supabase } from '../../utils/supabase'
import './Approvals.css'

const TestWorkflowPage: React.FC = () => {
  const [txId, setTxId] = useState('')
  const [result, setResult] = useState<{ workflow: ApprovalWorkflowRow | null; steps: ApprovalStepRow[]; reason?: any | null } | null>(null)
  const [recent, setRecent] = useState<{ id: string; entry_number: string; entry_date: string; amount: number; approval_status: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadRecent() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, entry_number, entry_date, amount, approval_status')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      setRecent((data as any[]) || [])
    } catch (e: any) {
      setRecent([])
    }
  }

  const location = useLocation()
  useEffect(() => { loadRecent() }, [])
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const id = params.get('txId') || ''
      if (id) setTxId(id)
    } catch {}
  }, [location.search])

  async function simulate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      if (!txId.trim()) throw new Error('أدخل رقم معرف المعاملة')
      const r = await pickWorkflowForTransaction(txId.trim())
      setResult(r)
    } catch (e: any) {
      setError(e?.message || 'فشل الاختبار')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="approval-container" dir="rtl">
      <div className="approval-header">
        <h1 className="approval-title">اختبار مسار الموافقات</h1>
        <div className="approval-actions">
          <button className="ultimate-btn" onClick={() => loadRecent()}>تحديث القائمة</button>
        </div>
      </div>

      <div className="approval-table-wrap" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          {/* Simulator */}
          <div>
            <h3 className="modal-title">المحاكاة</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="filter-input" placeholder="Transaction ID" value={txId} onChange={e => setTxId(e.target.value)} />
              <button className="ultimate-btn ultimate-btn-add" onClick={simulate} disabled={loading}>{loading ? 'جارٍ...' : 'محاكاة'}</button>
            </div>
            {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}

            {result && (
              <div style={{ marginTop: 12 }}>
                <div className="modal-title">النتيجة</div>
                <div style={{ margin: '8px 0' }}>
                  {result.workflow ? (
                    <>
                      <div><strong>المسار:</strong> {result.workflow.name} ({result.workflow.id.slice(0,8)})</div>
                      <div><strong>المؤسسة:</strong> {result.workflow.org_id || '—'}</div>
                      <div><strong>نشط:</strong> {result.workflow.is_active ? 'نعم' : 'لا'}</div>
                    </>
                  ) : (
                    <div>لا يوجد مسار مطابق — ستُعتمد مباشرة حسب منطق الاحتياط</div>
                  )}
                </div>
                {result.reason && (
                  <div style={{ margin: '8px 0' }}>
                    <div className="modal-title">سبب الاختيار</div>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result.reason, null, 2)}</pre>
                  </div>
                )}
                <div className="audit-title">الخطوات</div>
                <div className="audit-box">
                  {result.steps.length === 0 ? (
                    <div>لا توجد خطوات لعرضها</div>
                  ) : result.steps.map(s => (
                    <div key={s.id} className="audit-entry">
                      <div><strong>#:</strong> {s.step_order}</div>
                      <div><strong>الاسم:</strong> {s.name}</div>
                      <div><strong>النوع:</strong> {s.approver_type}</div>
                      <div><strong>نهائي:</strong> {s.is_final ? 'نعم' : 'لا'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent transactions picker */}
          <div>
            <h3 className="modal-title">معاملات حديثة</h3>
            <table className="approval-table">
              <thead>
                <tr>
                  <th>رقم القيد</th>
                  <th>التاريخ</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>اختيار</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={5} className="empty">لا توجد بيانات</td></tr>
                ) : recent.map(r => (
                  <tr key={r.id}>
                    <td>{r.entry_number}</td>
                    <td>{r.entry_date}</td>
                    <td>{Number(r.amount||0).toLocaleString('ar-EG')}</td>
                    <td>{r.approval_status || '—'}</td>
                    <td>
                      <button className="ultimate-btn ultimate-btn-edit" onClick={() => setTxId(r.id)}>اختيار</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestWorkflowPage
