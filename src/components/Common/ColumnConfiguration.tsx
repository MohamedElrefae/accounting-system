import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
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
  sampleData?: Array<Record<string, any>>
}

const ColumnConfiguration: React.FC<ColumnConfigurationProps> = ({
  columns,
  onConfigChange,
  isOpen,
  onClose,
  onReset,
  sampleData = []
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const dragCounter = useRef(0)

  // Working copy for edits (apply on Save)
  const [working, setWorking] = useState<ColumnConfig[]>(columns)
  const [query, setQuery] = useState('')

  // Heuristic auto-fit width calculator (label-based)
  const computeAutoWidth = useCallback((c: ColumnConfig) => {
    const label = (c.label || c.key || '')
    const base = 9.5 // px per char (approx)
    const padding = 32 // paddings + buffer
    const typeBias = (() => {
      switch (c.type) {
        case 'number': return 80
        case 'date': return 120
        case 'currency': return 130
        case 'badge': return 110
        default: return 0
      }
    })()
    let maxLen = label.length
    if (Array.isArray(sampleData) && sampleData.length > 0) {
      // check up to first 200 rows for performance
      const limit = Math.min(sampleData.length, 200)
      for (let i = 0; i < limit; i++) {
        const row = sampleData[i]
        const v = row?.[c.key]
        const s = (v === null || v === undefined) ? '' : String(v)
        if (s.length > maxLen) maxLen = s.length
      }
    }
    const approx = Math.max(60, Math.round(maxLen * base + padding))
    return Math.max(typeBias, approx)
  }, [sampleData])

  const widthDragRef = useRef<{ globalIndex: number; startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setWorking(columns.map(c => ({ ...c })))
      setQuery('')
      setDraggedIndex(null)
      setDropTargetIndex(null)
      dragCounter.current = 0
      
      // Add keyboard support for Escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }
      document.addEventListener('keydown', handleEscape)
      
      // Focus trap - focus first interactive element
      setTimeout(() => {
        const firstButton = document.querySelector('.column-config-modal button') as HTMLElement
        firstButton?.focus()
      }, 100)
      
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, columns, onClose])

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
    const w = Number.isFinite(width) ? Math.max(20, Math.round(width)) : 100
    next[idx] = { ...next[idx], width: w }
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

  // Begin width drag on handle (index is filteredWorking index)
  const startWidthDrag = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    const key = filteredWorking[index]?.key
    const globalIndex = working.findIndex(c => c.key === key)
    if (globalIndex < 0) return
    widthDragRef.current = {
      globalIndex,
      startX: e.clientX,
      startWidth: working[globalIndex]?.width || 100,
    }
    document.addEventListener('mousemove', onWidthDragMove)
    document.addEventListener('mouseup', onWidthDragEnd)
  }, [filteredWorking, working])

  const onWidthDragMove = useCallback((e: MouseEvent) => {
    if (!widthDragRef.current) return
    const { globalIndex, startX, startWidth } = widthDragRef.current
    const delta = e.clientX - startX
    const nextWidth = Math.max(20, Math.round(startWidth + delta))
    setWorking(prev => {
      if (globalIndex < 0 || globalIndex >= prev.length) return prev
      const next = [...prev]
      next[globalIndex] = { ...next[globalIndex], width: nextWidth }
      return next
    })
  }, [])

  const onWidthDragEnd = useCallback(() => {
    document.removeEventListener('mousemove', onWidthDragMove)
    document.removeEventListener('mouseup', onWidthDragEnd)
    widthDragRef.current = null
  }, [onWidthDragMove])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onWidthDragMove)
      document.removeEventListener('mouseup', onWidthDragEnd)
    }
  }, [onWidthDragMove, onWidthDragEnd])

  const toggleAll = (visible: boolean) => {
    const next = working.map(col => ({ ...col, visible }))
    setWorking(next)
  }

  // Preset sizing
  const applyPreset = (preset: 'compact' | 'comfortable' | 'wide') => {
    const pick = (c: ColumnConfig) => {
      switch (c.type) {
        case 'number': return preset === 'compact' ? 80 : preset === 'comfortable' ? 100 : 120
        case 'date': return preset === 'compact' ? 120 : preset === 'comfortable' ? 140 : 170
        case 'currency': return preset === 'compact' ? 120 : preset === 'comfortable' ? 150 : 190
        case 'badge': return preset === 'compact' ? 110 : preset === 'comfortable' ? 130 : 150
        case 'actions': return preset === 'compact' ? 140 : preset === 'comfortable' ? 180 : 220
        default: return preset === 'compact' ? 160 : preset === 'comfortable' ? 220 : 300
      }
    }
    setWorking(prev => prev.map(c => ({ ...c, width: pick(c) })))
  }

  const equalizeWidths = () => {
    const vis = working.filter(c => c.visible)
    if (!vis.length) return
    const avg = Math.round(vis.reduce((s, c) => s + (c.width || 120), 0) / vis.length)
    setWorking(prev => prev.map(c => ({ ...c, width: avg })))
  }

  const exportConfig = async () => {
    try {
      const json = JSON.stringify({ columns: working }, null, 2)
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(json)
      else window.prompt('انسخ الإعدادات:', json)
    } catch {}
  }

  const importConfig = async () => {
    try {
      const input = window.prompt('ألصق الإعدادات (JSON):')
      if (!input) return
      const parsed = JSON.parse(input)
      if (parsed && Array.isArray(parsed.columns)) setWorking(parsed.columns)
    } catch { alert('تنسيق غير صالح') }
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
    <div 
      className="column-config-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="column-config-title"
    >
      <div 
        className="column-config-modal resizable-modal" 
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="column-config-header">
          <div>
            <h3 id="column-config-title">إعدادات الأعمدة</h3>
            <p className="config-subtitle">تكوين الرؤية وترتيب وعرض الأعمدة وأولوية التثبيت</p>
          </div>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="إغلاق"
            title="إغلاق"
          >
            ×
          </button>
        </div>

        <div className="column-config-controls">
          <div className="bulk-actions">
            <button 
              className="config-btn config-btn-success"
              onClick={() => toggleAll(true)}
              aria-label="إظهار جميع الأعمدة"
              title="إظهار جميع الأعمدة"
            >
              إظهار الكل
            </button>
            <button 
              className="config-btn config-btn-warning"
              onClick={() => toggleAll(false)}
              aria-label="إخفاء جميع الأعمدة"
              title="إخفاء جميع الأعمدة"
            >
              إخفاء الكل
            </button>
            {onReset && (
              <button 
                className="config-btn config-btn-secondary"
                onClick={resetToDefaults}
                aria-label="استعادة الإعدادات الافتراضية"
                title="استعادة الإعدادات الافتراضية"
              >
                استعادة الافتراضي
              </button>
            )}
            <div className="sizing-presets" style={{ display: 'inline-flex', gap: 6, marginInlineStart: 10 }}>
              <button className="config-btn" onClick={() => applyPreset('compact')}>مضغوط</button>
              <button className="config-btn" onClick={() => applyPreset('comfortable')}>مريح</button>
              <button className="config-btn" onClick={() => applyPreset('wide')}>واسع</button>
              <button className="config-btn" onClick={equalizeWidths}>تساوي العرض</button>
              <button className="config-btn" onClick={() => setWorking(prev => prev.map(c => ({ ...c, width: computeAutoWidth(c) })))}>ملاءمة تلقائية</button>
              <button className="config-btn" onClick={exportConfig}>نسخ الإعدادات</button>
              <button className="config-btn" onClick={importConfig}>لصق الإعدادات</button>
            </div>
          </div>
          <div className="search-box">
            <label htmlFor="column-search" className="sr-only">بحث عن عمود</label>
            <input
              id="column-search"
              className="config-search-input"
              placeholder="بحث عن عمود..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="بحث عن عمود"
              type="search"
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
            <div className="header-minwidth">الحد الأدنى (px)</div>
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

                <div className="width-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    value={column.width}
                    onChange={(e) => handleWidthChange(index, parseInt(e.target.value) || 100)}
                    step="10"
                    className="width-input"
                    style={{ width: 90 }}
                  />
                  <div
                    className="width-drag-handle"
                    title="اسحب لتغيير العرض"
                    onMouseDown={(e) => startWidthDrag(e, index)}
                    style={{ cursor: 'ew-resize', width: 18, height: 18, borderRadius: 3, background: '#ddd', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}
                  >
                    ⋮
                  </div>
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

                <div className="minwidth-control" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    value={column.minWidth ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : (parseInt(e.target.value) || undefined)
                      const idx = working.findIndex(c => c.key === filteredWorking[index].key)
                      if (idx >= 0) {
                        const next = [...working]
                        next[idx] = { ...next[idx], minWidth: val }
                        setWorking(next)
                      }
                    }}
                    placeholder="—"
                    className="minwidth-input"
                    style={{ width: 80 }}
                  />
                  <button
                    className="config-btn"
                    title="إلغاء الحد الأدنى"
                    onClick={() => {
                      const idx = working.findIndex(c => c.key === filteredWorking[index].key)
                      if (idx >= 0) {
                        const next = [...working]
                        next[idx] = { ...next[idx], minWidth: undefined }
                        setWorking(next)
                      }
                    }}
                  >
                    لا حد
                  </button>
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
          <button 
            className="config-btn config-btn-success" 
            onClick={applyChanges}
            aria-label="حفظ التغييرات وإغلاق"
            title="حفظ التغييرات وإغلاق"
          >
            حفظ التغييرات
          </button>
          <button 
            className="config-btn config-btn-secondary" 
            onClick={onClose}
            aria-label="إلغاء وإغلاق بدون حفظ"
            title="إلغاء وإغلاق بدون حفظ"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColumnConfiguration
