import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SearchableDropdownItem {
  id: string
  code: string
  name: string
  name_ar?: string
}

interface SearchableDropdownProps {
  items: SearchableDropdownItem[]
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  maxVisibleItems?: number
  disabled?: boolean
  style?: React.CSSProperties
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  items,
  value,
  onChange,
  placeholder = '— بحث —',
  maxVisibleItems = 50,
  disabled = false,
  style
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items.slice(0, maxVisibleItems)

    const term = searchTerm.toLowerCase()
    return items
      .filter(item =>
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        (item.name_ar && item.name_ar.toLowerCase().includes(term))
      )
      .slice(0, maxVisibleItems)
  }, [searchTerm, items, maxVisibleItems])

  const selectedItem = items.find(i => i.id === value)

  const openMenu = () => {
    if (disabled) return
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) {
      setMenuRect({ top: rect.bottom + 4, left: Math.max(8, rect.left), width: Math.max(320, Math.min(480, rect.width)) })
      setIsOpen(true)
    } else {
      setIsOpen(true)
    }
  }

  useEffect(() => {
    const onScrollOrResize = () => {
      if (!isOpen) return
      const rect = anchorRef.current?.getBoundingClientRect()
      if (rect) setMenuRect({ top: rect.bottom + 4, left: Math.max(8, rect.left), width: Math.max(320, Math.min(480, rect.width)) })
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => { window.removeEventListener('scroll', onScrollOrResize, true); window.removeEventListener('resize', onScrollOrResize) }
  }, [isOpen])

  return (
    <div ref={anchorRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Input/Display */}
      <div
        onClick={openMenu}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid var(--border, rgba(255,255,255,0.12))',
          borderRadius: '6px',
          backgroundColor: 'var(--surface, #0f0f0f)',
          color: 'var(--text, #eaeaea)',
          fontSize: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedItem ? `${selectedItem.code} - ${selectedItem.name}` : placeholder}
        </span>
        <span style={{ fontSize: '10px', marginInlineStart: '4px' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* Dropdown Menu (portal to avoid clipping) */}
      {isOpen && !disabled && menuRect && createPortal(
        <>
          {/* Overlay to close dropdown */}
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
          />

          {/* Menu */}
          <div
            style={{
              position: 'fixed',
              top: `${menuRect.top}px`,
              left: `${menuRect.left}px`,
              width: `${menuRect.width}px`,
              zIndex: 1001,
              backgroundColor: 'var(--surface, #0f0f0f)',
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
              borderRadius: '6px',
              boxShadow: '0 8px 18px rgba(0,0,0,0.4)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Field */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالكود أو الاسم..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))',
                backgroundColor: 'var(--surface-2, #1a1a1a)',
                color: 'var(--text, #eaeaea)',
                fontSize: '12px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
              autoFocus
            />

            {/* Items List */}
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {/* Clear Option */}
              <div
                onClick={() => { onChange(null); setIsOpen(false); setSearchTerm('') }}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
                  cursor: 'pointer',
                  backgroundColor: value === null ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: 'var(--text, #eaeaea)',
                  fontSize: '12px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = value === null ? 'rgba(59, 130, 246, 0.2)' : 'transparent' }}
              >
                — بلا —
              </div>

              {/* Filtered Items */}
              {filteredItems.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#a3a3a3', fontSize: '12px' }}>
                  لا توجد نتائج
                </div>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { onChange(item.id); setIsOpen(false); setSearchTerm('') }}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
                      cursor: 'pointer',
                      backgroundColor: value === item.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                      color: 'var(--text, #eaeaea)',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = value === item.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent' }}
                  >
                    <span style={{ flex: 1, textAlign: 'right' }}>
                      {item.code} - {item.name}
                    </span>
                    {item.name_ar && (
                      <span style={{ flex: 1, textAlign: 'right', color: '#a3a3a3', fontSize: '11px' }}>
                        {item.name_ar}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Results Count */}
            {items.length > maxVisibleItems && (
              <div style={{ padding: '6px 12px', backgroundColor: 'var(--surface-2, #1a1a1a)', borderTop: '1px solid var(--border, rgba(255,255,255,0.08))', color: '#a3a3a3', fontSize: '10px', textAlign: 'center' }}>
                {filteredItems.length === maxVisibleItems ? `عرض أول ${maxVisibleItems} من ${items.length}` : `${filteredItems.length} نتيجة من ${items.length}`}
              </div>
            )}
          </div>
        </>, document.body)
      }
    </div>
  )
}
