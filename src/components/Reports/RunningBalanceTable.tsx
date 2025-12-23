import React, { useMemo } from 'react'
import ResizableTable from '../Common/ResizableTable'
import type { ColumnConfig } from '../Common/ColumnConfiguration'

export interface RunningBalanceRecord {
  id: string
  entry_date: string
  entry_number: string
  description: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  account_id?: string
  account_code?: string
  account_name?: string
  account_name_ar?: string
  project_id?: string | null
  project_code?: string
  project_name?: string
  classification_id?: string | null
  classification_code?: string
  classification_name?: string
}

interface RunningBalanceTableProps {
  records: RunningBalanceRecord[]
  columns: ColumnConfig[]
  loading: boolean
  selectedRecordId?: string
  onColumnResize: (key: string, width: number) => void
  onSelectRecord: (record: RunningBalanceRecord) => void
  emptyMessage?: string
}

const RunningBalanceTable: React.FC<RunningBalanceTableProps> = ({
  records,
  columns,
  loading,
  selectedRecordId,
  onColumnResize,
  onSelectRecord,
  emptyMessage = 'No running balance records found'
}) => {
  // Prepare table data with formatted values
  const tableData = useMemo(() => {
    if (!records || !Array.isArray(records)) {
      console.warn('RunningBalanceTable: records prop is undefined or not an array', records)
      return []
    }

    return records.map((record) => ({
      ...record,
      // Format account display
      account_display: record.account_code && (record.account_name_ar || record.account_name)
        ? `${record.account_code} - ${record.account_name_ar || record.account_name}`
        : record.account_id || '',
      
      // Format currency values
      debit_display: record.debit_amount > 0 ? record.debit_amount : null,
      credit_display: record.credit_amount > 0 ? record.credit_amount : null,
      running_balance_display: record.running_balance,
      
      // Format project display
      project_display: record.project_code && record.project_name
        ? `${record.project_code} - ${record.project_name}`
        : '',
      
      // Format classification display
      classification_display: record.classification_code && record.classification_name
        ? `${record.classification_code} - ${record.classification_name}`
        : ''
    }))
  }, [records])

  // Custom cell renderer
  const renderCell = (value: unknown, column: ColumnConfig, row: any, rowIndex: number) => {
    switch (column.type) {
      case 'currency':
        if (value === null || value === undefined || value === 0) {
          return <span style={{ color: 'transparent' }}>0.00</span>
        }
        return (
          <span style={{ 
            fontWeight: column.key === 'running_balance_display' ? 'bold' : 'normal',
            color: column.key === 'running_balance_display' && (value as number) < 0 ? 'red' : 'inherit'
          }}>
            {(value as number).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        )
      
      case 'date':
        if (!value) return ''
        const date = new Date(value as string)
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
      
      default:
        return value as React.ReactNode
    }
  }

  // Handle row click
  const handleRowClick = (row: any, index: number) => {
    const originalRecord = records[index]
    if (originalRecord) {
      onSelectRecord(originalRecord)
    }
  }

  return (
    <ResizableTable
      columns={columns}
      data={tableData}
      onColumnResize={onColumnResize}
      isLoading={loading}
      emptyMessage={emptyMessage}
      highlightRowId={selectedRecordId}
      getRowId={(row, index) => records[index]?.id || index}
      onRowClick={handleRowClick}
      renderCell={renderCell}
      className="running-balance-table"
    />
  )
}

export default RunningBalanceTable
