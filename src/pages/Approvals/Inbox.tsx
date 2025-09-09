import React, { useEffect, useState } from 'react'
import { getApprovalInbox, type ApprovalInboxRow } from '../../services/approvals'
import { approveTransaction, requestRevision, rejectTransaction } from '../../services/transactions'
import './Approvals.css'

const ApprovalsInbox: React.FC = () => {
  const [rows, setRows] = useState<ApprovalInboxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const data = await getApprovalInbox()
      setRows(data)
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل صندوق الموافقات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  if (loading) return <div className="approval-container">جاري التحميل...</div>
  if (error) return <div className="approval-container error">{error}</div>

  return (
    <div className="approval-container" dir="rtl">
      <div className="approval-header">
        <h1 className="approval-title">صندوق الموافقات</h1>
        <div className="approval-actions">
          <button className="ultimate-btn" onClick={() => reload()}>تحديث</button>
        </div>
      </div>
      <div className="approval-table-wrap">
        <table className="approval-table">
          <thead>
            <tr>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>المبلغ</th>
              <th>الخطوة الحالية</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="empty">لا توجد طلبات موافقة معلقة</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.request_id}>
                <td>{r.entry_number}</td>
                <td>{r.entry_date}</td>
                <td>{r.description || '—'}</td>
                <td>{Number(r.amount || 0).toLocaleString('ar-EG')}</td>
                <td>{r.step_name} (#{r.current_step_order})</td>
                <td>
                  <div className="actions">
                    <button className="ultimate-btn ultimate-btn-success" disabled={busyId === r.transaction_id} onClick={async () => {
                      setBusyId(r.transaction_id)
                      try { await approveTransaction(r.transaction_id, null); await reload() } finally { setBusyId(null) }
                    }}>اعتماد</button>
                    <button className="ultimate-btn ultimate-btn-edit" disabled={busyId === r.transaction_id} onClick={async () => {
                      const why = window.prompt('سبب الإرجاع للتعديل؟') || ''
                      if (!why.trim()) return
                      setBusyId(r.transaction_id)
                      try { await requestRevision(r.transaction_id, why); await reload() } finally { setBusyId(null) }
                    }}>إرجاع للتعديل</button>
                    <button className="ultimate-btn ultimate-btn-delete" disabled={busyId === r.transaction_id} onClick={async () => {
                      const why = window.prompt('سبب الرفض؟') || ''
                      if (!why.trim()) return
                      setBusyId(r.transaction_id)
                      try { await rejectTransaction(r.transaction_id, why); await reload() } finally { setBusyId(null) }
                    }}>رفض</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ApprovalsInbox
