import React, { useMemo } from 'react'
import ResizableTable from '../../components/Common/ResizableTable'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import type { TransactionRecord } from '../../services/transactions'
import { WithPermission } from '../../components/Common/withPermission'

interface TransactionsHeaderTableProps {
  transactions: TransactionRecord[]
  accounts: Array<{ id: string; code: string; name: string }>
  organizations: Array<{ id: string; code: string; name: string }>
  projects: Array<{ id: string; code: string; name: string }>
  categories: Array<{ id: string; code: string; description: string }>
  workItems: Array<{ id: string; code: string; name: string }>
  analysisItemsMap: Record<string, { code: string; name: string }>
  classifications: Array<{ id: string; code: string; name: string }>
  userNames: Record<string, string>
  columns: ColumnConfig[]
  wrapMode: boolean
  loading: boolean
  onColumnResize: (key: string, width: number) => void
  onSelectTransaction: (tx: TransactionRecord) => void
  selectedTransactionId?: string
  // All the action handlers
  onEdit: (tx: TransactionRecord) => void
  onDelete: (tx: TransactionRecord) => void
  onOpenDetails: (tx: TransactionRecord) => Promise<void>
  onOpenDocuments: (tx: TransactionRecord) => void
  onOpenApprovalWorkflow: (tx: TransactionRecord) => void
  mode: 'my' | 'pending' | 'all'
  currentUserId?: string
  hasPerm: (perm: string) => boolean
}

const TransactionsHeaderTable: React.FC<TransactionsHeaderTableProps> = ({
  transactions,
  organizations,
  projects,
  userNames,
  columns,
  wrapMode,
  loading,
  onColumnResize,
  onSelectTransaction,
  selectedTransactionId,
  onEdit,
  onDelete,
  onOpenDetails,
  onOpenDocuments,
  onOpenApprovalWorkflow,
  mode,
  currentUserId,
  hasPerm
}) => {
  console.log('🐛 TransactionsHeaderTable received:', transactions?.length || 0, 'transactions');

  // Prepare table data
  const tableData = useMemo(() => {
    return transactions.map((t: any) => ({
      entry_number: t.entry_number,
      entry_date: t.entry_date,
      description: t.description,
      line_items_count: Number((t as any).line_items_count ?? 0),
      line_items_total: Number((t as any).line_items_total ?? 0),
      total_debits: Number((t as any).total_debits ?? 0),
      total_credits: Number((t as any).total_credits ?? 0),
      organization_name: organizations.find(o => o.id === (t.org_id || ''))?.name || '—',
      project_name: projects.find(p => p.id === (t.project_id || ''))?.name || '—',
      reference_number: t.reference_number || '—',
      notes: t.notes || '—',
      created_by_name: t.created_by ? (userNames[t.created_by] || t.created_by.substring(0, 8)) : '—',
      posted_by_name: t.posted_by ? (userNames[t.posted_by] || t.posted_by.substring(0, 8)) : '—',
      posted_at: (t as any).posted_at || null,
      approval_status: t.is_posted ? 'posted' : ((t as any).status || (t as any).approval_status || 'draft'),
      documents_count: (t as any).documents_count || 0,
      actions: null,
      original: t
    }))
  }, [transactions, userNames, organizations, projects])

  return (
    <ResizableTable
      columns={columns}
      data={tableData}
      onColumnResize={onColumnResize}
      className={`transactions-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
      isLoading={loading}
      emptyMessage="لا توجد معاملات"
      highlightRowId={selectedTransactionId}
      getRowId={(row) => (row as any).original?.id ?? (row as any).id}
      renderCell={(_value, column, row, _rowIndex) => {
        // Handle approval status badge with line progress
        if (column.key === 'approval_status') {
          // Use the status directly from the record (unified source of truth)
          const st = row.original.is_posted ? 'posted' : (row.original.approval_status || 'draft')
          const linesApproved = row.original.lines_approved_count || 0
          const linesTotal = row.original.lines_total_count || 0

          const map: Record<string, { label: string; cls: string; tip: string }> = {
            draft: { label: 'مسودة', cls: 'ultimate-btn-neutral', tip: 'لم يتم إرسالها للمراجعة بعد' },
            submitted: { label: 'مُرسلة', cls: 'ultimate-btn-edit', tip: 'بإنتظار المراجعة' },
            pending: { label: 'قيد المراجعة', cls: 'ultimate-btn-edit', tip: 'بإنتظار اعتماد السطور' },
            revision_requested: { label: 'طلب تعديل', cls: 'ultimate-btn-warning', tip: 'أُعيدت للتعديل — أعد الإرسال بعد التصحيح' },
            requires_revision: { label: 'يحتاج تعديل', cls: 'ultimate-btn-warning', tip: 'تم رفض بعض السطور' },
            approved: { label: 'معتمدة', cls: 'ultimate-btn-success', tip: 'تم اعتماد جميع السطور' },
            rejected: { label: 'مرفوضة', cls: 'ultimate-btn-delete', tip: 'تم الرفض' },
            cancelled: { label: 'ملغاة', cls: 'ultimate-btn-neutral', tip: 'ألغى المُرسل الإرسال' },
            posted: { label: 'مرحلة', cls: 'ultimate-btn-posted', tip: 'تم الترحيل (مُثبت في الدفاتر)' },
          }
          const conf = map[st] || map['draft']

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              <span className={`ultimate-btn ${conf.cls}`} style={{ cursor: 'default', padding: '6px 12px', minHeight: 32, fontSize: '13px' }} title={conf.tip}>
                <span className="btn-text">{conf.label}</span>
              </span>
              {linesTotal > 0 && !row.original.is_posted && (
                <span
                  dir="ltr"
                  style={{
                    fontSize: '12px',
                    color: linesApproved === linesTotal ? '#10b981' : '#f59e0b',
                    fontWeight: '800',
                    background: linesApproved === linesTotal ? '#ecfdf5' : '#fffbeb',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: `1px solid ${linesApproved === linesTotal ? '#10b981' : '#f59e0b'}`
                  }}
                  title={`${linesApproved} من ${linesTotal} سطور معتمدة`}
                >
                  {linesApproved} / {linesTotal}
                </span>
              )}
            </div>
          )
        }

        // Handle documents count
        if (column.key === 'documents_count') {
          const count = (row.original as any).documents_count || 0
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{count}</span>
              {count > 0 && <span title={`عدد المرفقات: ${count}`}>📎</span>}
            </div>
          )
        }

        // Handle documents button
        if (column.key === 'documents') {
          return (
            <WithPermission perm="documents.read">
              <button
                className="ultimate-btn ultimate-btn-edit"
                title="إدارة مستندات المعاملة"
                onClick={() => onOpenDocuments(row.original)}
              >
                <div className="btn-content"><span className="btn-text">مستندات</span></div>
              </button>
            </WithPermission>
          )
        }

        // Handle actions column
        if (column.key === 'actions') {
          const linesApproved = row.original.lines_approved_count || 0
          const linesTotal = row.original.lines_total_count || 0
          const isApproved = linesTotal > 0 && linesApproved === linesTotal

          return (
            <div className="tree-node-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <button
                className="ultimate-btn ultimate-btn-edit"
                onClick={async () => {
                  onSelectTransaction(row.original)
                  await onOpenDetails(row.original)
                }}
                title="عرض التفاصيل والسجل"
              >
                <div className="btn-content"><span className="btn-text">تفاصيل</span></div>
              </button>

              {/* Edit button - Only if not posted AND not approved */}
              {mode === 'my' && !row.original.is_posted && !isApproved && hasPerm('transactions.update') && row.original.created_by === currentUserId && (
                <button
                  className="ultimate-btn ultimate-btn-edit"
                  onClick={() => {
                    onSelectTransaction(row.original)
                    onEdit(row.original)
                  }}
                >
                  <div className="btn-content"><span className="btn-text">تعديل</span></div>
                </button>
              )}
              {mode === 'all' && !row.original.is_posted && !isApproved && hasPerm('transactions.manage') && (
                <button
                  className="ultimate-btn ultimate-btn-edit"
                  onClick={() => {
                    onSelectTransaction(row.original)
                    onEdit(row.original)
                  }}
                >
                  <div className="btn-content"><span className="btn-text">تعديل</span></div>
                </button>
              )}

              {/* Delete button - Only if not posted AND not approved */}
              {mode === 'my' && !row.original.is_posted && !isApproved && hasPerm('transactions.delete') && row.original.created_by === currentUserId && (
                <button
                  className="ultimate-btn ultimate-btn-delete"
                  onClick={() => onDelete(row.original)}
                  title="حذف المعاملة (لا يمكن التراجع)"
                >
                  <div className="btn-content"><span className="btn-text">حذف</span></div>
                </button>
              )}

              {/* Submit for review - REMOVED: Use modern approval system via details panel */}

              {/* Review Lines button (pending mode) - Line-based approval */}
              {mode === 'pending' && (
                <WithPermission perm="transactions.review">
                  <button
                    className="ultimate-btn ultimate-btn-success"
                    onClick={() => onOpenApprovalWorkflow(row.original)}
                    disabled={row.original.is_posted}
                    title={row.original.is_posted ? 'لا يمكن مراجعة المعاملة المرحلة' : 'مراجعة واعتماد السطور'}
                    style={{
                      opacity: row.original.is_posted ? 0.5 : 1,
                      cursor: row.original.is_posted ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <div className="btn-content"><span className="btn-text">مراجعة</span></div>
                  </button>
                </WithPermission>
              )}
            </div>
          )
        }

        return _value as React.ReactNode
      }}
      onRowClick={(row) => onSelectTransaction(row.original)}
    />
  )
}

export default TransactionsHeaderTable
