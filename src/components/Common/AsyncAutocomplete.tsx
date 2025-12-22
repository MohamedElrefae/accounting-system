import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { TextField, MenuItem, IconButton, CircularProgress } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export type AsyncOption<T = any> = { id: string; label: string; raw?: T }

interface AsyncAutocompleteProps<T = any> {
  label?: string
  value: string
  onChange: (id: string) => void
  loader: (query: string) => Promise<AsyncOption<T>[]>
  error?: boolean
  helperText?: string
  disabled?: boolean
  placeholder?: string
  debounceMs?: number
  maxMenuHeight?: number
}

const AsyncAutocomplete = <T,>({ label, value, onChange, loader, error, helperText, disabled, placeholder, debounceMs = 250, maxMenuHeight = 280 }: AsyncAutocompleteProps<T>) => {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<AsyncOption<T>[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState<number>(-1)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<number | null>(null)

  const runLoad = useCallback((q: string) => {
    let cancelled = false
    setLoading(true)
    loader(q)
      .then((opts) => { if (!cancelled) setOptions(opts) })
      .catch(() => { if (!cancelled) setOptions([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loader])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => { runLoad(query) }, debounceMs)
    return () => { if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null } }
  }, [query, open, debounceMs, runLoad])

  useEffect(() => {
    // When opening, load with current label text to show initial options
    if (open && options.length === 0) runLoad(query)
    // Reset highlight when menu opens
    if (open) setHighlightIdx(-1)
  }, [open, options.length, query, runLoad])

  const selectedLabel = useMemo(() => {
    const found = options.find(o => o.id === value)
    return found?.label ?? ''
  }, [options, value])

  const handleSelect = (id: string) => {
    onChange(id)
    setQuery('')
    setOpen(false)
    setHighlightIdx(-1)
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((idx) => Math.min(options.length - 1, idx + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((idx) => Math.max(0, (idx === -1 ? 0 : idx - 1)))
    } else if (e.key === 'Enter') {
      if (highlightIdx >= 0 && highlightIdx < options.length) {
        e.preventDefault()
        handleSelect(options[highlightIdx].id)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <TextField
        fullWidth
        label={label}
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        inputRef={inputRef}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => { setTimeout(() => setOpen(false), 150) }}
        error={error}
        helperText={helperText}
        disabled={disabled}
        InputProps={{
          endAdornment: (
            <>
              {loading && <CircularProgress size={18} sx={{ mr: 1 }} />}
              {!!value && (
                <IconButton size="small" aria-label="clear" onMouseDown={(e)=> e.preventDefault()} onClick={() => { handleSelect('') }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </>
          )
        }}
      />
      {open && (
        <div
          style={{ position: 'absolute', zIndex: 10, background: 'var(--mui-palette-background-paper, #fff)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: '100%', maxHeight: maxMenuHeight, overflowY: 'auto', borderRadius: 4, marginTop: 4 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.length === 0 && !loading && (
            <div style={{ padding: '8px 12px', color: '#888' }}>لا يوجد نتائج</div>
          )}
          {options.map((opt, idx) => (
            <MenuItem
              key={opt.id || `opt-${idx}`}
              selected={idx === highlightIdx || opt.id === value}
              onClick={() => handleSelect(opt.id)}
            >
              {opt.label}
            </MenuItem>
          ))}
        </div>
      )}
    </div>
  )
}

export default AsyncAutocomplete
