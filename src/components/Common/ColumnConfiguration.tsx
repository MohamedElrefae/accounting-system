import React, { useState, useRef, useEffect, useMemo } from 'react'
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
  type?: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'badge' | 'actions'
  frozen?: boolean
  pinPriority?: number // Higher number = higher priority (pins first)
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

  // Working copy for edits (apply on Save)
  const [working, setWorking] = useState<ColumnConfig[]>(columns)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      setWorking(columns.map(c => ({ ...c })))
      setQuery('')
      setDraggedIndex(null)
      setDropTargetIndex(null)
      dragCounter.current = 0
    }
  }, [isOpen, columns])

  const filteredWorking = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return working
    return working.filter(c => (c.label || '').toLowerCase().includes(q) || c.key.toLowerCase().includes(q))
  }, [working, query])

  const handleVisibilityChange = (index: number, visible: boolean) => {
    const idx = working.findIndex(c => c.key === filteredWorking[index].key)
    if (idx < 0) return
    const next = [...working]
    next[idx] = { ...next[idx], visible }
    setWorking(next)
  }

  const handleWidthChange = (index: number, width: number) => {
    const idx = working.findIndex(c => c.key === filteredWorking[index].key)
    if (idx < 0) return
    const next = [...working]
    const column = next[idx]
    const minWidth = column.minWidth || 80
    const maxWidth = column.maxWidth || 500
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width))
    next[idx] = { ...next[idx], width: constrainedWidth }
    setWorking(next)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', filteredWorking[index].key)
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

    const listKeys = filteredWorking.map(c => c.key)
    const draggedKey = listKeys[draggedIndex]
    const globalFrom = working.findIndex(c => c.key === draggedKey)
    if (globalFrom < 0) return

    const targetKey = listKeys[targetIndex]
    const globalTo = working.findIndex(c => c.key === targetKey)
    if (globalTo < 0) return

    const next = [...working]
    const [moved] = next.splice(globalFrom, 1)
    const insertIndex = globalFrom < globalTo ? globalTo : globalTo
    next.splice(insertIndex, 0, moved)

    setWorking(next)
    setDropTargetIndex(null)
    dragCounter.current = 0
  }

  const toggleAll = (visible: boolean) => {
    const next = working.map(col => ({ ...col, visible }))
    setWorking(next)
  }

  const resetToDefaults = () => {
    if (onReset) {
      onReset()
    }
  }

  const handleFreezeToggle = (index: number, frozen: boolean) => {
    const idx = working.findIndex(c => c.key === filteredWorking[index].key)
    if (idx < 0) return
    const next = [...working]
    next[idx] = { ...next[idx], frozen, pinPriority: frozen ? (next[idx].pinPriority || 1) : undefined }
    setWorking(next)
  }

  const handlePinPriorityChange = (index: number, priority: number) => {
    const idx = working.findIndex(c => c.key === filteredWorking[index].key)
    if (idx < 0) return
    const next = [...working]
    next[idx] = { ...next[idx], pinPriority: priority, frozen: priority > 0 }
    setWorking(next)
  }

  const applyChanges = () => {
    onConfigChange(working)
    onClose()
  }

  if (!isOpen) return null
  return (
    <div className="column-config-overlay" onClick={onClose}>
      <div className="column-config-modal resizable-modal" onClick={(e) => e.stopPropagation()}>
        <div className="column-config-header">
          <div>
            <h3>إعدادات الأعمدة</h3>
            <p className="config-subtitle">تكوين الرؤية وترتيب وعرض الأعمدة وأولوية التثبيت</p>
          </div>
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
          <div className="search-box">
            <input
              className="config-search-input"
              placeholder="بحث عن عمود..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="column-config-content">
          <div className="config-list-header">
            <div className="header-drag">ترتيب</div>
            <div className="header-visibility">مرئي</div>
            <div className="header-freeze">تثبيت</div>
            <div className="header-label">اسم العمود</div>
            <div className="header-width">العرض (px)</div>
            <div className="header-priority">أولوية التثبيت</div>
          </div>

          <div className="column-config-list">
            {filteredWorking.map((column, index) => (
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

                <div className="freeze-control" title="تثبيت هذا العمود">
                  <input
                    type="checkbox"
                    checked={!!column.frozen}
                    onChange={(e) => handleFreezeToggle(index, e.target.checked)}
                    id={`col-freeze-${column.key}`}
                  />
                  <label htmlFor={`col-freeze-${column.key}`} className="checkbox-label"></label>
                </div>

                <div className="column-label" title={column.label}>
                  <div className="label-content">
                    {column.frozen && <span className="pin-icon" title="مثبت">📌</span>}
                    {column.label}
                  </div>
                  <div className="column-key">{column.key}</div>
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

                <div className="priority-control">
                  <select
                    value={column.pinPriority || 0}
                    onChange={(e) => handlePinPriorityChange(index, parseInt(e.target.value))}
                    disabled={!column.frozen}
                    className="priority-select"
                    title="أعلى رقم = أولوية أعلى (يثبت أولاً)"
                  >
                    <option value={0}>لا يوجد</option>
                    <option value={1}>منخفض (1)</option>
                    <option value={2}>متوسط (2)</option>
                    <option value={3}>عالي (3)</option>
                    <option value={4}>عالي جداً (4)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="column-config-summary">
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-value">{working.filter(c => c.visible).length}</span>
              <span className="stat-label">مرئي</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{working.filter(c => c.frozen).length}</span>
              <span className="stat-label">مثبت</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{working.filter(c => c.width && c.width > 0).length}</span>
              <span className="stat-label">عرض مخصص</span>
            </div>
          </div>
        </div>

        <div className="column-config-footer">
          <button className="config-btn config-btn-secondary" onClick={onClose}>إلغاء</button>
          <button className="config-btn config-btn-success" onClick={applyChanges}>حفظ التغييرات</button>
        </div>
      </div>
    </div>
  )
}

export default ColumnConfiguration
