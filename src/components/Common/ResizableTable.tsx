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
  type?: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'badge' | 'actions'
  frozen?: boolean
  pinPriority?: number // Higher number = higher priority (pins first)
}

type RowRecord = Record<string, unknown>

interface ResizableTableProps<T extends RowRecord> {
  columns: ColumnConfig[]
  data: T[]
  onColumnResize: (columnKey: string, newWidth: number) => void
  className?: string
  rowHeight?: number
  headerHeight?: number
  renderCell?: (value: unknown, column: ColumnConfig, row: T, rowIndex: number) => React.ReactNode
  onRowClick?: (row: T, index: number) => void
  isLoading?: boolean
  emptyMessage?: string
  frozenLeftCount?: number
  // New: highlight selected row (id or index) and row id getter for generic data
  highlightRowId?: string | number
  getRowId?: (row: T, index: number) => string | number
}

function ResizableTable<T extends RowRecord>({
  columns,
  data,
  onColumnResize,
  className = '',
  rowHeight = 50,
  headerHeight = 45,
  renderCell,
  onRowClick,
  isLoading = false,
  emptyMessage = 'لا توجد بيانات',
  frozenLeftCount = 0,
  highlightRowId,
  getRowId,
}: ResizableTableProps<T>) {
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const resizeRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null)

  // Filter visible columns and sort by pin priority
  const visibleColumns = columns
    .filter(col => col.visible)
    .sort((a, b) => {
      // First sort by frozen status and pin priority
      const aFrozen = a.frozen ? 1 : 0
      const bFrozen = b.frozen ? 1 : 0
      
      if (aFrozen !== bFrozen) {
        return bFrozen - aFrozen // Frozen columns first
      }
      
      // If both are frozen, sort by pin priority (higher first)
      if (a.frozen && b.frozen) {
        const aPriority = a.pinPriority || 0
        const bPriority = b.pinPriority || 0
        if (aPriority !== bPriority) {
          return bPriority - aPriority // Higher priority first
        }
      }
      
      // Maintain original order for same priority/frozen status
      const aIndex = columns.indexOf(a)
      const bIndex = columns.indexOf(b)
      return aIndex - bIndex
    })

  // Determine direction (rtl/ltr) for freeze side
  const tableDir = (tableRef.current?.closest('[dir]') as HTMLElement | null)?.getAttribute('dir') || document.documentElement.getAttribute('dir') || 'ltr'
  const isRTL = tableDir.toLowerCase() === 'rtl'

  // Build arrays for per-column freeze flags and compute offsets for sticky side
  const frozenByFlag = visibleColumns.map(c => Boolean(c.frozen))

  // Support legacy count-based freezing as a base (first N in DOM order)
  const frozenCount = Math.max(0, Math.min(frozenLeftCount || 0, visibleColumns.length))
  for (let i = 0; i < frozenCount; i++) frozenByFlag[i] = true

  // Compute offsets for left or right depending on language direction
  const stickyLeftOffsets: number[] = new Array(visibleColumns.length).fill(0)
  const stickyRightOffsets: number[] = new Array(visibleColumns.length).fill(0)

  if (frozenByFlag.some(Boolean)) {
    if (!isRTL) {
      // LTR: accumulate from left
      let acc = 0
      for (let i = 0; i < visibleColumns.length; i++) {
        if (frozenByFlag[i]) {
          stickyLeftOffsets[i] = acc
          acc += visibleColumns[i].width
        }
      }
    } else {
      // RTL: accumulate from right
      let acc = 0
      for (let i = visibleColumns.length - 1; i >= 0; i--) {
        if (frozenByFlag[i]) {
          stickyRightOffsets[i] = acc
          acc += visibleColumns[i].width
        }
      }
    }
  }

  // Define move/up handlers BEFORE the mousedown handler to avoid TDZ/runtime init issues
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return

    const { column, startX, startWidth } = resizeRef.current
    const deltaX = e.clientX - startX
    const newWidth = Math.max(20, Math.round(startWidth + delta))

    onColumnResize(column, newWidth)
  }, [onColumnResize])

  const handleMouseUp = useCallback(() => {
    setIsResizing(null)
    resizeRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, columnKey: string, currentWidth: number) => {
    e.preventDefault()
    setIsResizing(columnKey)
    resizeRef.current = {
      column: columnKey,
      startX: e.clientX,
      startWidth: currentWidth
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, handleMouseUp])

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const formatCellValue = (value: unknown, column: ColumnConfig) => {
    if (value === null || value === undefined) return '—'
    
    switch (column.type) {
      case 'currency':
        // Use CurrencyFormatter only for numeric values
        return typeof value === 'number' ? <CurrencyFormatter amount={value} /> : String(value)
      case 'number':
        return typeof value === 'number' ? value.toLocaleString('ar-EG') : String(value)
      case 'date':
        // Use DateFormatter for proper company-based date formatting
        return (typeof value === 'string' || value instanceof Date) ? <DateFormatter date={value} /> : String(value)
      case 'boolean':
        return value ? 'نعم' : 'لا'
      default:
        return String(value)
    }
  }

  const getCellContent = (row: T, column: ColumnConfig, rowIndex: number) => {
    const rec = row as RowRecord
    const value = rec[column.key]
    
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
            {visibleColumns.map((column, idx) => (
              <th
                key={column.key}
                className={`resizable-th ${column.type || 'text'}-cell ${frozenByFlag[idx] ? 'frozen' : ''} ${isRTL ? 'rtl' : 'ltr'}`}
                style={{ 
                  width: `${column.width}px`,
                  minWidth: `${(column.minWidth ?? 20)}px`,
                  ...(typeof column.maxWidth === 'number' ? { maxWidth: `${column.maxWidth}px` } : { maxWidth: 'none' as any }),
                  ...(frozenByFlag[idx] && !isRTL ? { left: `${stickyLeftOffsets[idx]}px` } : {}),
                  ...(frozenByFlag[idx] && isRTL ? { right: `${stickyRightOffsets[idx]}px` } : {}),
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
            data.map((row, rowIndex) => {
              const rowId = getRowId ? getRowId(row, rowIndex) : rowIndex
              const isSelected = highlightRowId !== undefined && highlightRowId === rowId
              return (
                <tr
                  key={rowIndex}
                  className={`${onRowClick ? 'clickable-row' : ''} ${isSelected ? 'selected-row' : ''}`}
                  style={{ height: `${rowHeight}px` }}
                  onClick={() => onRowClick?.(row, rowIndex)}
                  data-row-id={String(rowId)}
                >
                  {visibleColumns.map((column, cidx) => (
                    <td
                      key={column.key}
                      className={`resizable-td ${column.type || 'text'}-cell ${frozenByFlag[cidx] ? 'frozen' : ''} ${isRTL ? 'rtl' : 'ltr'}`}
                      style={{ 
                        width: `${column.width}px`,
                        minWidth: `${(column.minWidth ?? 20)}px`,
                        ...(typeof column.maxWidth === 'number' ? { maxWidth: `${column.maxWidth}px` } : { maxWidth: 'none' as any }),
                        ...(frozenByFlag[cidx] && !isRTL ? { left: `${stickyLeftOffsets[cidx]}px` } : {}),
                        ...(frozenByFlag[cidx] && isRTL ? { right: `${stickyRightOffsets[cidx]}px` } : {}),
                      }}
                    >
                      <div className="td-content">
                        {getCellContent(row, column, rowIndex)}
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      
      {/* Resize overlay */}
      {isResizing && <div className="resize-overlay" />}
    </div>
  )
}

export default ResizableTable
