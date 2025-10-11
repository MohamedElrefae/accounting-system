import React, { useEffect, useMemo, useState } from 'react'
import { getApprovalInbox, type ApprovalInboxRow, getApprovalByTarget } from '../../services/approvals'
import { approveTransaction, requestRevision, rejectTransaction } from '../../services/transactions'
import { useSearchParams, useNavigate } from 'react-router-dom'
import './Approvals.css'

const ApprovalsInbox: React.FC = () => {
  const [rows, setRows] = useState<ApprovalInboxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [canMap, setCanMap] = useState<Record<string, boolean>>({})
  const [hideNonPending, setHideNonPending] = useState<boolean>(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all')
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const targetTable = searchParams.get('target_table') || undefined
  const targetId = searchParams.get('target_id') || undefined

  async function reload() {
    setLoading(true)
    try {
      if (targetTable && targetId) {
        // Minimal view for a specific approval (e.g., opening_balances)
        const req = await getApprovalByTarget(targetTable, targetId)
        if (req) {
          const r = {
            request_id: req.id,
            transaction_id: null, // non-transaction target
            entry_number: req.target_id.slice(0,8),
            entry_date: new Date(req.submitted_at).toISOString().slice(0,10),
            amount: 0,
            description: `${req.target_table} request`,
            org_id: req.org_id,
            workflow_id: req.workflow_id || '',
            current_step_order: 1,
            step_name: 'Submitted',
            approver_type: 'user',
            submitted_by: req.submitted_by,
            submitted_at: req.submitted_at,
            status: (req as any).status,
            target_table: req.target_table,
          } as any
          setRows([r])
        } else {
          setRows([])
        }
      } else {
        const data = await getApprovalInbox()
        setRows(data)
      }
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل صندوق الموافقات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [targetTable, targetId])

  // Resolve can-approve map for visible rows
  useEffect(() => {
    (async () => {
      const entries: Record<string, boolean> = {}
      for (const r of rows) {
        try {
          const ok = await (await import('../../services/approvals')).canApprove(r.request_id)
          entries[r.request_id] = ok
        } catch { entries[r.request_id] = false }
      }
      setCanMap(entries)
    })()
  }, [rows])

  if (loading) return <div className="approval-container">جاري التحميل...</div>
  if (error) return <div className="approval-container error">{error}</div>

  let filtered = rows
  if (hideNonPending) filtered = filtered.filter(r => (r.status ?? 'pending') === 'pending')
  if (statusFilter !== 'all') filtered = filtered.filter(r => (r.status ?? 'pending') === statusFilter)
  const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
    const s = status ?? 'pending'
    const color = s === 'approved' ? '#2e7d32' : s === 'rejected' ? '#c62828' : s === 'cancelled' ? '#6d4c41' : '#1565c0'
    const label = s === 'approved' ? 'معتمد' : s === 'rejected' ? 'مرفوض' : s === 'cancelled' ? 'ملغي' : 'قيد الانتظار'
    return <span style={{ padding: '2px 8px', borderRadius: 12, background: color, color: '#fff', fontSize: 12 }}>{label}</span>
  }

  return (
    <div className="approval-container" dir="rtl">
      <div className="approval-header">
        <h1 className="approval-title">صندوق الموافقات</h1>
        <div className="approval-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="ultimate-btn" onClick={() => reload()}>تحديث</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={hideNonPending} onChange={e => setHideNonPending(e.target.checked)} />
            إخفاء غير المعلقة
          </label>
          <select className="ultimate-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
            <option value="all">كل الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="approved">معتمد</option>
            <option value="rejected">مرفوض</option>
            <option value="cancelled">ملغي</option>
          </select>
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
              <th>الحالة</th>
              <th>الخطوة الحالية</th>
              <th>الإجراءات</th>
              <th>فتح</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="empty">لا توجد طلبات موافقة</td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.request_id}>
                <td>{r.entry_number}</td>
                <td>{r.entry_date}</td>
                <td>{r.description || '—'}</td>
                <td>{Number(r.amount || 0).toLocaleString('ar-EG')}</td>
                <td><StatusPill status={r.status} /></td>
                <td>{r.step_name} (#{r.current_step_order})</td>
                <td>
                  <div className="actions">
                    <button className="ultimate-btn ultimate-btn-success" disabled={!canMap[r.request_id] || busyId === r.request_id || (r.status && r.status !== 'pending')} onClick={async () => {
                      setBusyId(r.request_id)
                      try {
                        if (r.transaction_id) await approveTransaction(r.transaction_id, null)
                        else await (await import('../../services/approvals')).reviewRequest(r.request_id, 'approve')
                        await reload()
                      } finally { setBusyId(null) }
                    }}>اعتماد</button>
                    <button className="ultimate-btn ultimate-btn-edit" disabled={!canMap[r.request_id] || busyId === r.request_id || (r.status && r.status !== 'pending')} onClick={async () => {
                      const why = window.prompt('سبب الإرجاع للتعديل؟') || ''
                      if (!why.trim()) return
                      setBusyId(r.request_id)
                      try {
                        if (r.transaction_id) await requestRevision(r.transaction_id, why)
                        else await (await import('../../services/approvals')).reviewRequest(r.request_id, 'revise', why)
                        await reload()
                      } finally { setBusyId(null) }
                    }}>إرجاع للتعديل</button>
                    <button className="ultimate-btn ultimate-btn-delete" disabled={!canMap[r.request_id] || busyId === r.request_id || (r.status && r.status !== 'pending')} onClick={async () => {
                      const why = window.prompt('سبب الرفض؟') || ''
                      if (!why.trim()) return
                      setBusyId(r.request_id)
                      try {
                        if (r.transaction_id) await rejectTransaction(r.transaction_id, why)
                        else await (await import('../../services/approvals')).reviewRequest(r.request_id, 'reject', why)
                        await reload()
                      } finally { setBusyId(null) }
                    }}>رفض</button>
                  </div>
                </td>
                <td>
                  <button className="ultimate-btn" onClick={() => {
                    if ((r as any).target_table === 'opening_balances' || (r as any).target_table === 'opening_balance_imports') {
                      // Use target_id as importId to open enhanced page
                      const importId = (r as any).target_id || r.entry_number
                      navigate(`/fiscal/enhanced/opening-balance-import?importId=${encodeURIComponent(importId)}`)
                    } else if (r.transaction_id) {
                      // Navigate to transactions list; replace with details route if available
                      navigate(`/transactions/all`)
                    }
                  }}>عرض</button>
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
