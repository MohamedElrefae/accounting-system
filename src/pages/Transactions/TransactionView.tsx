import React from 'react'
import type { TransactionRecord, TransactionAudit } from '../../services/transactions'
import type { ApprovalHistoryRow } from '../../services/approvals'
import AttachDocumentsPanel from '../../components/documents/AttachDocumentsPanel'
import { WithPermission } from '../../components/Common/withPermission'

interface Props {
  transaction: TransactionRecord
  audit: TransactionAudit[]
  userNames: Record<string, string>
  onClose: () => void
  categoryLabel?: string
  approvalHistory?: ApprovalHistoryRow[]
}

const TransactionView: React.FC<Props> = ({ transaction, audit, userNames, onClose, categoryLabel, approvalHistory }) => {
  // Extract latest submit note from audit details
  const submitNote = React.useMemo(() => {
    for (const row of audit) {
      try {
        const d: any = row.details
        if (d && typeof d === 'object' && d.note) {
          return String(d.note)
        }
      } catch {}
    }
    return ''
  }, [audit])

  // Unified approval status (includes posted)
  const unifiedStatus = React.useMemo(() => {
    const st = transaction.is_posted ? 'posted' : String((transaction as any).approval_status || 'draft')
    const map: Record<string, { label: string; cls: string; tip: string }> = {
      draft: { label: 'مسودة', cls: 'ultimate-btn-neutral', tip: 'لم يتم إرسالها للمراجعة بعد' },
      submitted: { label: 'مُرسلة', cls: 'ultimate-btn-edit', tip: 'بإنتظار المراجعة' },
      revision_requested: { label: 'طلب تعديل', cls: 'ultimate-btn-warning', tip: 'أُعيدت للتعديل — أعد الإرسال بعد التصحيح' },
      approved: { label: 'معتمدة', cls: 'ultimate-btn-success', tip: 'تم الاعتماد' },
      rejected: { label: 'مرفوضة', cls: 'ultimate-btn-delete', tip: 'تم الرفض' },
      cancelled: { label: 'ملغاة', cls: 'ultimate-btn-neutral', tip: 'ألغى المُرسل الإرسال' },
      posted: { label: 'مرحلة', cls: 'ultimate-btn-posted', tip: 'تم الترحيل (مُثبت في الدفاتر)' },
    }
    return map[st] || map['draft']
  }, [transaction])

  return (
    <div className="transaction-modal" onClick={onClose}>
      <div className="transaction-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">تفاصيل المعاملة</h3>
        <div>رقم القيد: {transaction.entry_number}</div>
        <div>التاريخ: {new Date(transaction.entry_date).toLocaleDateString('ar-EG')}</div>
        <div>البيان: {transaction.description}</div>
        <div>المبلغ: {transaction.amount.toLocaleString('ar-EG')}</div>
        <div>المرجع: {transaction.reference_number || '—'}</div>
        <div>فئة المصروف: {categoryLabel || '—'}</div>
        <div>أنشئت بواسطة: {transaction.created_by ? (userNames[transaction.created_by] || transaction.created_by) : '—'}</div>
        <div>مرحلة بواسطة: {transaction.posted_by ? (userNames[transaction.posted_by] || transaction.posted_by) : '—'}</div>
        <div>
          <span style={{ marginLeft: 8 }}>حالة الاعتماد:</span>
          <span className={`ultimate-btn ${unifiedStatus.cls}`} style={{ cursor: 'default', padding: '4px 8px', minHeight: 28 }} title={unifiedStatus.tip}>
            <span className="btn-text">{unifiedStatus.label}</span>
          </span>
        </div>

        {submitNote && (
          <div className="submit-note-box">
            <div className="modal-title modal-label">ملاحظات الإرسال</div>
            <div className="submit-note-text">{submitNote}</div>
          </div>
        )}

        <div className="audit-title">سجل الإجراءات</div>
        <div className="audit-box">
          {audit.length === 0 ? (
            <div>لا يوجد سجل</div>
          ) : audit.map(row => (
            <div key={row.id} className="audit-entry">
              <div><strong>الإجراء:</strong> {row.action}</div>
              <div><strong>المستخدم:</strong> {row.actor_id ? (userNames[row.actor_id] || row.actor_id.substring(0,8)) : '—'}</div>
              <div><strong>التاريخ:</strong> {new Date(row.created_at).toLocaleString('ar-EG')}</div>
            </div>
          ))}
        </div>

        {/* Documents attachment panel */}
        <div className="audit-title" style={{ marginTop: 12 }}>المستندات</div>
        <div style={{ background: 'var(--mui-palette-background-paper)', border: '1px solid var(--mui-palette-divider)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <WithPermission permission="documents.view">
            <AttachDocumentsPanel 
              orgId={(transaction as any).org_id || ''}
              transactionId={transaction.id}
              projectId={(transaction as any).project_id || undefined}
            />
          </WithPermission>
        </div>

        {approvalHistory && approvalHistory.length > 0 && (
          <>
            <div className="audit-title">سجل الموافقات</div>
            <div className="audit-box">
              {approvalHistory.map((r) => (
                <div key={r.id} className="audit-entry">
                  <div><strong>الخطوة:</strong> #{r.step_order}</div>
                  <div><strong>الإجراء:</strong> {r.action === 'approve' ? 'اعتماد' : r.action === 'request_changes' ? 'إرجاع للتعديل' : r.action === 'reject' ? 'رفض' : 'ملاحظة'}</div>
                  <div><strong>المستخدم:</strong> {userNames[r.actor_user_id] || r.actor_user_id.substring(0,8)}</div>
                  {r.reason ? (<div><strong>السبب:</strong> {r.reason}</div>) : null}
                  <div><strong>التاريخ:</strong> {new Date(r.created_at).toLocaleString('ar-EG')}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="button-container">
          <button className="ultimate-btn ultimate-btn-delete" onClick={onClose}>
            <div className="btn-content"><span className="btn-text">إغلاق</span></div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransactionView

