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
  onColumnResize: (key: string, width: number) => void
  onEditLine: (line: TransactionLineRecord) => void
  onDeleteLine: (id: string) => void
  onSelectLine: (line: TransactionLineRecord) => void
  onOpenDocuments?: (line: TransactionLineRecord) => void
  onOpenCostAnalysis?: (line: TransactionLineRecord) => void
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
  onColumnResize,
  onEditLine,
  onDeleteLine,
  onSelectLine,
  onOpenDocuments,
  onOpenCostAnalysis
}) => {
  // Prepare table data
  const tableData = useMemo(() => {
    const accLabel = (id?: string | null) => {
      if (!id) return ''
      const a = accounts.find(x => x.id === id)
      return a ? `${a.code} - ${a.name}` : id
    }

    const catMap: Record<string, string> = {}
    for (const c of categories) { catMap[c.id] = `${c.code} - ${c.description}` }

    return lines.map((line: any) => ({
      line_no: line.line_no,
      account_label: accLabel(line.account_id),
      debit_amount: line.debit_amount,
      credit_amount: line.credit_amount,
      description: line.description || '—',
      project_label: line.project_id ? (projects.find(p => p.id === line.project_id)?.name || line.project_id) : '—',
      cost_center_label: line.cost_center_id ? (costCenters.find(cc => cc.id === line.cost_center_id) ? `${costCenters.find(cc => cc.id === line.cost_center_id)!.code} - ${costCenters.find(cc => cc.id === line.cost_center_id)!.name}` : line.cost_center_id) : '—',
      work_item_label: line.work_item_id ? (workItems.find(w => w.id === line.work_item_id)?.name || line.work_item_id) : '—',
      classification_label: line.classification_id ? (classifications.find(c => c.id === line.classification_id)?.name || line.classification_id) : '—',
      sub_tree_label: line.sub_tree_id ? (catMap[line.sub_tree_id] || line.sub_tree_id) : '—',
      discount_amount: line.discount_amount || 0,
      tax_amount: line.tax_amount || 0,
      total_cost: line.total_cost || 0,
      standard_cost: line.standard_cost || 0,
      actions: null,
      original: line
    }))
  }, [lines, accounts, projects, categories, workItems, costCenters, classifications])

  return (
    <ResizableTable
      columns={columns}
      data={tableData}
      onColumnResize={onColumnResize}
      className={`transaction-lines-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
      isLoading={loading}
      emptyMessage="لا توجد قيود تفصيلية — حدد معاملة من الجدول العلوي"
      highlightRowId={selectedLineId}
      getRowId={(row) => (row as any).original?.id ?? (row as any).id}
      renderCell={(_value, column, row, _rowIndex) => {
        // Handle cost columns - display currency format
        if (column.key === 'discount_amount' || column.key === 'tax_amount' || column.key === 'total_cost' || column.key === 'standard_cost') {
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

        // Handle actions column
        if (column.key === 'actions') {
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

        return _value
      }}
      onRowClick={(row) => onSelectLine(row.original)}
    />
  )
}

export default TransactionLinesTable
