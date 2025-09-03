import React from 'react'
import type { TransactionRecord, TransactionAudit } from '../../services/transactions'

interface Props {
  transaction: TransactionRecord
  audit: TransactionAudit[]
  userNames: Record<string, string>
  onClose: () => void
  categoryLabel?: string
}

const TransactionView: React.FC<Props> = ({ transaction, audit, userNames, onClose, categoryLabel }) => {
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
        <div>الحالة: {transaction.is_posted ? 'مرحلة' : 'غير مرحلة'}</div>

        <div style={{ marginTop: '8px', fontWeight: 600 }}>سجل الإجراءات</div>
        <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px' }}>
          {audit.length === 0 ? (
            <div>لا يوجد سجل</div>
          ) : audit.map(row => (
            <div key={row.id} style={{ padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
              <div><strong>الإجراء:</strong> {row.action}</div>
              <div><strong>المستخدم:</strong> {row.actor_id ? (userNames[row.actor_id] || row.actor_id.substring(0,8)) : '—'}</div>
              <div><strong>التاريخ:</strong> {new Date(row.created_at).toLocaleString('ar-EG')}</div>
            </div>
          ))}
        </div>
        <div className="button-container" style={{ marginTop: '10px' }}>
          <button className="ultimate-btn ultimate-btn-delete" onClick={onClose}>
            <div className="btn-content"><span className="btn-text">إغلاق</span></div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransactionView

