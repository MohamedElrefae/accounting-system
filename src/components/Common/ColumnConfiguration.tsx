import React, { useState, useRef } from 'react'
import './ColumnConfiguration.css'

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

interface ColumnConfigurationProps {
  columns: ColumnConfig[]
  onConfigChange: (newConfig: ColumnConfig[]) => void
  isOpen: boolean
  onClose: () => void
  onReset?: () => void
}

const ColumnConfiguration: React.FC<ColumnConfigurationProps> = ({
  columns,
  onConfigChange,
  isOpen,
  onClose,
  onReset
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const dragCounter = useRef(0)

  if (!isOpen) return null

  const handleVisibilityChange = (index: number, visible: boolean) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], visible }
    onConfigChange(newColumns)
  }

  const handleWidthChange = (index: number, width: number) => {
    const newColumns = [...columns]
    const column = newColumns[index]
    const minWidth = column.minWidth || 80
    const maxWidth = column.maxWidth || 500
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width))
    
    newColumns[index] = { ...newColumns[index], width: constrainedWidth }
    onConfigChange(newColumns)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedIndex(null)
    setDropTargetIndex(null)
    dragCounter.current = 0
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragCounter.current++
    setDropTargetIndex(index)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDropTargetIndex(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDropTargetIndex(null)
      dragCounter.current = 0
      return
    }

    const newColumns = [...columns]
    const draggedItem = newColumns[draggedIndex]
    
    // Remove the dragged item
    newColumns.splice(draggedIndex, 1)
    
    // Insert at the target position
    const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
    newColumns.splice(insertIndex, 0, draggedItem)
    
    onConfigChange(newColumns)
    setDropTargetIndex(null)
    dragCounter.current = 0
  }

  const toggleAll = (visible: boolean) => {
    const newColumns = columns.map(col => ({ ...col, visible }))
    onConfigChange(newColumns)
  }

  const resetToDefaults = () => {
    if (onReset) {
      onReset()
    }
  }

  return (
    <div className="column-config-overlay" onClick={onClose}>
      <div className="column-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="column-config-header">
          <h3>إعدادات الأعمدة</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="column-config-controls">
          <div className="bulk-actions">
            <button 
              className="config-btn config-btn-success"
              onClick={() => toggleAll(true)}
            >
              إظهار الكل
            </button>
            <button 
              className="config-btn config-btn-warning"
              onClick={() => toggleAll(false)}
            >
              إخفاء الكل
            </button>
            {onReset && (
              <button 
                className="config-btn config-btn-secondary"
                onClick={resetToDefaults}
              >
                استعادة الافتراضي
              </button>
            )}
          </div>
        </div>

        <div className="column-config-content">
          <div className="config-list-header">
            <div className="header-drag">ترتيب</div>
            <div className="header-visibility">مرئي</div>
            <div className="header-label">اسم العمود</div>
            <div className="header-width">العرض (px)</div>
          </div>

          <div className="column-config-list">
            {columns.map((column, index) => (
              <div
                key={column.key}
                className={`column-config-item ${
                  draggedIndex === index ? 'dragging' : ''
                } ${
                  dropTargetIndex === index ? 'drop-target' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="drag-handle" title="اسحب لإعادة الترتيب">
                  ⋮⋮
                </div>
                
                <div className="visibility-control">
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={(e) => handleVisibilityChange(index, e.target.checked)}
                    id={`col-${column.key}`}
                  />
                  <label htmlFor={`col-${column.key}`} className="checkbox-label"></label>
                </div>

                <div className="column-label" title={column.label}>
                  {column.label}
                </div>

                <div className="width-control">
                  <input
                    type="number"
                    value={column.width}
                    onChange={(e) => handleWidthChange(index, parseInt(e.target.value) || 100)}
                    min={column.minWidth || 80}
                    max={column.maxWidth || 500}
                    step="10"
                    disabled={!column.resizable}
                    className="width-input"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="column-config-footer">
          <button className="config-btn config-btn-primary" onClick={onClose}>
            تطبيق
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColumnConfiguration
