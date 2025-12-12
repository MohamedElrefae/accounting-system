import React, { useMemo } from 'react'
import ResizableTable from '../../components/Common/ResizableTable'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'

export interface TransactionLineRecord {
  id: string
  transaction_id: string
  line_no: number
  account_id: string
  debit_amount: number
  credit_amount: number
  description?: string
  project_id?: string | null
  cost_center_id?: string | null
  work_item_id?: string | null
  analysis_work_item_id?: string | null
  classification_id?: string | null
  sub_tree_id?: string | null
  created_at: string
  updated_at: string
  documents_count?: number
  // New aggregated fields from transaction_line_items
  line_items_count?: number
  line_items_total?: number
  // Existing cost fields
  discount_amount?: number
  tax_amount?: number
  total_cost?: number | null
  standard_cost?: number | null
}

interface TransactionLinesTableProps {
  lines: TransactionLineRecord[]
  accounts: Array<{ id: string; code: string; name: string }>
  projects: Array<{ id: string; code: string; name: string }>
  categories: Array<{ id: string; code: string; description: string }>
  workItems: Array<{ id: string; code: string; name: string }>
  costCenters: Array<{ id: string; code: string; name: string }>
  classifications: Array<{ id: string; code: string; name: string }>
  columns: ColumnConfig[]
  wrapMode: boolean
  loading: boolean
  selectedLineId?: string
  mode?: 'my' | 'pending' | 'all'
  onColumnResize: (key: string, width: number) => void
  onEditLine: (line: TransactionLineRecord) => void
  onDeleteLine: (id: string) => void
  onSelectLine: (line: TransactionLineRecord) => void
  onOpenDocuments?: (line: TransactionLineRecord) => void
  onOpenCostAnalysis?: (line: TransactionLineRecord) => void
  onOpenLineReview?: (line: TransactionLineRecord) => void
  onApproveLine?: (lineId: string) => void
  onRejectLine?: (lineId: string) => void
}

const TransactionLinesTable: React.FC<TransactionLinesTableProps> = ({
  lines,
  accounts,
  projects,
  categories,
  workItems,
  costCenters,
  classifications,
  columns,
  wrapMode,
  loading,
  selectedLineId,
  mode = 'my',
  onColumnResize,
  onEditLine,
  onDeleteLine,
  onSelectLine,
  onOpenDocuments,
  onOpenCostAnalysis,
  onOpenLineReview,
  _onApproveLine, // Available for future line approval functionality
  _onRejectLine,  // Available for future line rejection functionality
}) => {
  // Prepare table data
  const tableData = useMemo(() => {
    // Safety check - if lines is undefined or not an array, return empty array
    if (!lines || !Array.isArray(lines)) {
      console.warn('TransactionLinesTable: lines prop is undefined or not an array', lines)
      return []
    }
    
    const accLabel = (line: any) => {
      // Use enriched data from v_transaction_lines_enriched view
      // which includes account_code, account_name, and account_name_ar
      if (line.account_code && (line.account_name_ar || line.account_name)) {
        return `${line.account_code} - ${line.account_name_ar || line.account_name}`
      }
      // Fallback to looking up from accounts array if enriched data not available
      if (line.account_id) {
        const a = accounts.find(x => x.id === line.account_id)
        return a ? `${a.code} - ${a.name}` : line.account_id
      }
      return ''
    }

    const catMap: Record<string, string> = {}
    for (const c of categories) { catMap[c.id] = `${c.code} - ${c.description}` }

    return lines.map((line: any) => ({
      line_no: line.line_no,
      account_label: accLabel(line),
      debit_amount: line.debit_amount,
      credit_amount: line.credit_amount,
      description: line.description || '—',
      project_label: line.project_id ? (projects.find(p => p.id === line.project_id)?.name || line.project_id) : '—',
      cost_center_label: line.cost_center_id ? (costCenters.find(cc => cc.id === line.cost_center_id) ? `${costCenters.find(cc => cc.id === line.cost_center_id)!.code} - ${costCenters.find(cc => cc.id === line.cost_center_id)!.name}` : line.cost_center_id) : '—',
      work_item_label: line.work_item_id ? (workItems.find(w => w.id === line.work_item_id)?.name || line.work_item_id) : '—',
      classification_label: line.classification_id ? (classifications.find(c => c.id === line.classification_id)?.name || line.classification_id) : '—',
      sub_tree_label: line.sub_tree_id ? (catMap[line.sub_tree_id] || line.sub_tree_id) : '—',
      // Aggregated line items fields
      line_items_count: Number(line.line_items_count || 0),
      line_items_total: Number(line.line_items_total || 0),
      // Cost fields
      discount_amount: line.discount_amount || 0,
      tax_amount: line.tax_amount || 0,
      total_cost: line.total_cost || 0,
      standard_cost: line.standard_cost || 0,
      // Line approval status
      line_status: line.line_status || 'draft',
      actions: null,
      original: line
    }))
  }, [lines, accounts, projects, categories, workItems, costCenters, classifications])

  return (
    <ResizableTable
      columns={columns || []}
      data={tableData}
      onColumnResize={onColumnResize}
      className={`transaction-lines-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
      isLoading={loading}
      emptyMessage="لا توجد قيود تفصيلية — حدد معاملة من الجدول العلوي"
      highlightRowId={selectedLineId}
      getRowId={(row) => (row as any).original?.id ?? (row as any).id}
      renderCell={(_value, column, row, _rowIndex) => {
        // Handle currency columns
        if (column.key === 'discount_amount' || column.key === 'tax_amount' || column.key === 'total_cost' || column.key === 'standard_cost' || column.key === 'line_items_total') {
          const value = _value || 0
          return (
            <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
              {typeof value === 'number' ? value.toFixed(2) : value}
            </div>
          )
        }

        // Handle documents column
        if (column.key === 'documents') {
          const count = row.original.documents_count || 0;
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{count}</span>
              <button
                className="ultimate-btn ultimate-btn-edit"
                onClick={() => onOpenDocuments?.(row.original)}
                title="المستندات المرفقة"
              >
                <div className="btn-content"><span className="btn-text">📎</span></div>
              </button>
            </div>
          )
        }

        // Handle cost analysis column - separate column for cost analysis
        if (column.key === 'cost_analysis') {
          return (
            <button
              className="ultimate-btn ultimate-btn-success"
              onClick={() => onOpenCostAnalysis?.(row.original)}
              title="تحليل التكلفة"
              style={{ width: '100%' }}
            >
              <div className="btn-content"><span className="btn-text">التكلفة</span></div>
            </button>
          )
        }

        // Handle line status badge
        if (column.key === 'line_status') {
          const status = (row.original as any).line_status || 'draft'
          const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
            draft: { label: 'مسودة', color: '#6b7280', icon: '📝' },
            pending: { label: 'قيد المراجعة', color: '#f59e0b', icon: '⏳' },
            approved: { label: 'معتمد', color: '#10b981', icon: '✅' },
            rejected: { label: 'مرفوض', color: '#ef4444', icon: '❌' },
            request_change: { label: 'طلب تعديل', color: '#f59e0b', icon: '✏️' }
          }
          const config = statusConfig[status] || statusConfig.draft

          return (
            <span
              style={{
                background: config.color,
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}
              title={config.label}
            >
              {config.icon} {config.label}
            </span>
          )
        }

        // Handle actions column
        if (column.key === 'actions') {
          const lineStatus = (row.original as any).line_status || 'draft'
          const isPosted = lineStatus === 'posted'
          console.log('🔍 Line action rendering:', `mode=${mode}, lineStatus=${lineStatus}, lineNo=${row.original.line_no}`)

          // Pending mode: show review button (always visible, disabled if posted)
          if (mode === 'pending') {
            return (
              <button
                className="ultimate-btn ultimate-btn-success"
                onClick={() => !isPosted && onOpenLineReview?.(row.original)}
                disabled={isPosted}
                title={isPosted ? 'لا يمكن مراجعة السطر المرحل' : 'مراجعة واعتماد السطر'}
                style={{
                  opacity: isPosted ? 0.5 : 1,
                  cursor: isPosted ? 'not-allowed' : 'pointer'
                }}
              >
                <div className="btn-content"><span className="btn-text">مراجعة</span></div>
              </button>
            )
          }

          // My/All mode: show edit/delete buttons
          if (lineStatus !== 'approved' && lineStatus !== 'posted') {
            return (
              <div className="tree-node-actions" style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="ultimate-btn ultimate-btn-edit"
                  onClick={() => onEditLine(row.original)}
                  title="تعديل السطر"
                >
                  <div className="btn-content"><span className="btn-text">تعديل</span></div>
                </button>

                <button
                  className="ultimate-btn ultimate-btn-delete"
                  onClick={() => onDeleteLine(row.original.id)}
                  title="حذف السطر"
                >
                  <div className="btn-content"><span className="btn-text">حذف</span></div>
                </button>
              </div>
            )
          }

          // Approved/Posted: show status only
          return (
            <span style={{ color: '#10b981', fontSize: '12px' }}>
              {lineStatus === 'approved' ? '✅ معتمد' : '📌 مرحل'}
            </span>
          )
        }

        return _value
      }}
      onRowClick={(row) => onSelectLine && onSelectLine(row.original)}
    />
  )
}

export default TransactionLinesTable
