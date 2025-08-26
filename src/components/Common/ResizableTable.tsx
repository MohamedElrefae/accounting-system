import React, { useState, useRef, useCallback, useEffect } from 'react'
import './ResizableTable.css'
import DateFormatter from './DateFormatter'
import CurrencyFormatter from './CurrencyFormatter'

// Column configuration interface - defined inline to avoid import issues
export interface ColumnConfig {
  key: string
  label: string
  visible: boolean
  width: number
  minWidth?: number
  maxWidth?: number
  resizable?: boolean
  sortable?: boolean
  type?: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'actions'
}

interface ResizableTableProps {
  columns: ColumnConfig[]
  data: any[]
  onColumnResize: (columnKey: string, newWidth: number) => void
  className?: string
  rowHeight?: number
  headerHeight?: number
  renderCell?: (value: any, column: ColumnConfig, row: any, rowIndex: number) => React.ReactNode
  onRowClick?: (row: any, index: number) => void
  isLoading?: boolean
  emptyMessage?: string
}

const ResizableTable: React.FC<ResizableTableProps> = ({
  columns,
  data,
  onColumnResize,
  className = '',
  rowHeight = 50,
  headerHeight = 45,
  renderCell,
  onRowClick,
  isLoading = false,
  emptyMessage = 'لا توجد بيانات'
}) => {
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [_startX, _setStartX] = useState(0)
  const [_startWidth, _setStartWidth] = useState(0)
  const tableRef = useRef<HTMLTableElement>(null)
  const resizeRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null)

  // Filter visible columns and maintain their order
  const visibleColumns = columns.filter(col => col.visible)

  const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string, currentWidth: number) => {
    e.preventDefault()
    setIsResizing(columnKey)
    _setStartX(e.clientX)
    _setStartWidth(currentWidth)
    resizeRef.current = {
      column: columnKey,
      startX: e.clientX,
      startWidth: currentWidth
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return
    
    const { column, startX, startWidth } = resizeRef.current
    const deltaX = e.clientX - startX
    const newWidth = Math.max(80, Math.min(500, startWidth + deltaX))
    
    onColumnResize(column, newWidth)
  }, [onColumnResize])

  const handleMouseUp = useCallback(() => {
    setIsResizing(null)
    resizeRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const formatCellValue = (value: any, column: ColumnConfig) => {
    if (value === null || value === undefined) return '—'
    
    switch (column.type) {
      case 'currency':
        // Use CurrencyFormatter for proper company-based currency formatting
        return <CurrencyFormatter amount={value} />
      case 'number':
        return typeof value === 'number' ? value.toLocaleString('ar-EG') : value
      case 'date':
        // Use DateFormatter for proper company-based date formatting
        return <DateFormatter date={value} />
      case 'boolean':
        return value ? 'نعم' : 'لا'
      default:
        return value
    }
  }

  const getCellContent = (row: any, column: ColumnConfig, rowIndex: number) => {
    const value = row[column.key]
    
    if (renderCell) {
      const customContent = renderCell(value, column, row, rowIndex)
      if (customContent !== undefined) {
        return customContent
      }
    }
    
    return formatCellValue(value, column)
  }

  if (isLoading) {
    return (
      <div className="resizable-table-loading">
        <div className="loading-spinner" />
        <span>جاري التحميل...</span>
      </div>
    )
  }

  return (
    <div className={`resizable-table-container ${className}`}>
      <table ref={tableRef} className="resizable-table">
        <thead>
          <tr style={{ height: `${headerHeight}px` }}>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className="resizable-th"
                style={{ 
                  width: `${column.width}px`,
                  minWidth: `${column.minWidth || 80}px`,
                  maxWidth: `${column.maxWidth || 500}px`
                }}
              >
                <div className="th-content">
                  <span className="th-label">{column.label}</span>
                  {column.resizable !== false && (
                    <div
                      className={`column-resizer ${
                        isResizing === column.key ? 'resizing' : ''
                      }`}
                      onMouseDown={(e) => handleMouseDown(e, column.key, column.width)}
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length} className="empty-row">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={onRowClick ? 'clickable-row' : ''}
                style={{ height: `${rowHeight}px` }}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`resizable-td ${column.type || 'text'}-cell`}
                    style={{ 
                      width: `${column.width}px`,
                      minWidth: `${column.minWidth || 80}px`,
                      maxWidth: `${column.maxWidth || 500}px`
                    }}
                  >
                    <div className="td-content">
                      {getCellContent(row, column, rowIndex)}
                    </div>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {/* Resize overlay */}
      {isResizing && <div className="resize-overlay" />}
    </div>
  )
}

export default ResizableTable
