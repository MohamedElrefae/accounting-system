import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Tooltip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import KeyboardTabIcon from '@mui/icons-material/KeyboardTab'
import KeyboardTabOutlinedIcon from '@mui/icons-material/KeyboardTabOutlined'

interface Props {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  storageKey: string
  initialWidth?: number
  initialHeight?: number
  minWidth?: number
  minHeight?: number
  allowDock?: boolean
  allowFullscreen?: boolean
  // Enhanced settings like Unified CRUD panel
  enableDockTopBottom?: boolean
  rememberLayoutKey?: string // if provided, saves preferred layout separately
  showLayoutButtons?: boolean // show save/reset buttons in header
}

// Draggable + resizable dialog without external deps. Persists size/position.
type Mode = 'free' | 'fullscreen' | 'dock-left' | 'dock-right' | 'dock-top' | 'dock-bottom'

export default function DraggableResizableDialog({
  open,
  onClose,
  title,
  actions,
  children,
  storageKey,
  initialWidth = 900,
  initialHeight = 600,
  minWidth = 600,
  minHeight = 400,
  allowDock = true,
  allowFullscreen = true,
  enableDockTopBottom = false,
  rememberLayoutKey,
  showLayoutButtons = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [size, setSize] = useState<{ w: number; h: number }>({ w: initialWidth, h: initialHeight })
  const [mode, setMode] = useState<Mode>('free')
  const dragging = useRef<{ active: boolean; dx: number; dy: number }>({ active: false, dx: 0, dy: 0 })
  const resizing = useRef<{ active: boolean; sx: number; sy: number; startW: number; startH: number }>({ active: false, sx: 0, sy: 0, startW: initialWidth, startH: initialHeight })

  // Load persisted state
  useEffect(() => {
    if (!open) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const v = JSON.parse(raw)
        if (v && typeof v === 'object') {
          const w = Math.max(minWidth, Math.min(window.innerWidth - 40, Number(v.w) || initialWidth))
          const h = Math.max(minHeight, Math.min(window.innerHeight - 40, Number(v.h) || initialHeight))
          let x = Math.max(20, Math.min(window.innerWidth - w - 20, Number(v.x) || 40))
          let y = Math.max(20, Math.min(window.innerHeight - h - 20, Number(v.y) || 40))
          setSize({ w, h })
          setPos({ x, y })
          if (typeof (v.mode) === 'string') setMode(v.mode as Mode)
          return
        }
      }
    } catch {}
    // Default center
    const w = Math.max(minWidth, Math.min(window.innerWidth - 40, initialWidth))
    const h = Math.max(minHeight, Math.min(window.innerHeight - 40, initialHeight))
    const x = Math.round((window.innerWidth - w) / 2)
    const y = Math.round((window.innerHeight - h) / 2)
    setSize({ w, h })
    setPos({ x, y })
  }, [open, storageKey, initialWidth, initialHeight, minWidth, minHeight])

  // Keyboard shortcuts (Esc to close)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Keep in viewport on window resize
  useEffect(() => {
    const onResize = () => {
      if (mode === 'fullscreen') {
        setPos({ x: 10, y: 10 })
        setSize({ w: window.innerWidth - 20, h: window.innerHeight - 20 })
        return
      }
      if (mode === 'dock-left' || mode === 'dock-right') {
        const half = Math.max(minWidth, Math.floor((window.innerWidth - 30) / 2))
        const h = Math.max(minHeight, window.innerHeight - 20)
        setSize({ w: half, h })
        setPos({ x: mode === 'dock-left' ? 10 : (window.innerWidth - half - 10), y: 10 })
        return
      }
      if (mode === 'dock-top' || mode === 'dock-bottom') {
        const w = Math.max(minWidth, window.innerWidth - 20)
        const halfH = Math.max(minHeight, Math.floor((window.innerHeight - 30) / 2))
        setSize({ w, h: halfH })
        setPos({ x: 10, y: mode === 'dock-top' ? 10 : (window.innerHeight - halfH - 10) })
        return
      }
      setSize(s => ({ w: Math.max(minWidth, Math.min(window.innerWidth - 40, s.w)), h: Math.max(minHeight, Math.min(window.innerHeight - 40, s.h)) }))
      setPos(p => ({ x: Math.max(20, Math.min(window.innerWidth - size.w - 20, p.x)), y: Math.max(20, Math.min(window.innerHeight - size.h - 20, p.y)) }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [size.w, size.h, minWidth, minHeight])

  // Mouse handlers for drag
  useEffect(() => {
    const mm = (e: MouseEvent) => {
      if (dragging.current.active && mode === 'free') {
        const nx = Math.max(0, Math.min(window.innerWidth - size.w, e.clientX - dragging.current.dx))
        const ny = Math.max(0, Math.min(window.innerHeight - size.h, e.clientY - dragging.current.dy))
        setPos({ x: nx, y: ny })
      }
      if (resizing.current.active && mode === 'free') {
        const dw = e.clientX - resizing.current.sx
        const dh = e.clientY - resizing.current.sy
        const nw = Math.max(minWidth, Math.min(window.innerWidth - pos.x - 20, resizing.current.startW + dw))
        const nh = Math.max(minHeight, Math.min(window.innerHeight - pos.y - 20, resizing.current.startH + dh))
        setSize({ w: nw, h: nh })
      }
    }
    const mu = () => {
      if (dragging.current.active || resizing.current.active) {
        dragging.current.active = false
        resizing.current.active = false
        // Persist
        try { localStorage.setItem(storageKey, JSON.stringify({ x: pos.x, y: pos.y, w: size.w, h: size.h, mode })) } catch {}
      }
    }
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }
  }, [pos.x, pos.y, size.w, size.h, storageKey, minWidth, minHeight, pos, size])

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-draggable-stop]')) return
    if (mode !== 'free') return
    dragging.current = { active: true, dx: e.clientX - pos.x, dy: e.clientY - pos.y }
  }
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { active: true, sx: e.clientX, sy: e.clientY, startW: size.w, startH: size.h }
  }

  const resetLayout = () => {
    try { localStorage.removeItem(storageKey) } catch {}
    const w = Math.max(minWidth, Math.min(window.innerWidth - 40, initialWidth))
    const h = Math.max(minHeight, Math.min(window.innerHeight - 40, initialHeight))
    const x = Math.round((window.innerWidth - w) / 2)
    const y = Math.round((window.innerHeight - h) / 2)
    setSize({ w, h })
    setPos({ x, y })
  }

  const applyMode = (m: Mode) => {
    if (m === 'fullscreen') {
      setPos({ x: 10, y: 10 }); setSize({ w: window.innerWidth - 20, h: window.innerHeight - 20 })
    } else if (m === 'dock-left' || m === 'dock-right') {
      const half = Math.max(minWidth, Math.floor((window.innerWidth - 30) / 2))
      const h = Math.max(minHeight, window.innerHeight - 20)
      setSize({ w: half, h }); setPos({ x: m === 'dock-left' ? 10 : (window.innerWidth - half - 10), y: 10 })
    } else if (m === 'dock-top' || m === 'dock-bottom') {
      const w = Math.max(minWidth, window.innerWidth - 20)
      const halfH = Math.max(minHeight, Math.floor((window.innerHeight - 30) / 2))
      setSize({ w, h: halfH }); setPos({ x: 10, y: m === 'dock-top' ? 10 : (window.innerHeight - halfH - 10) })
    }
    setMode(m)
    try { localStorage.setItem(storageKey, JSON.stringify({ x: pos.x, y: pos.y, w: size.w, h: size.h, mode: m })) } catch {}
  }

  const toggleFullscreen = () => {
    if (!allowFullscreen) return
    if (mode === 'fullscreen') applyMode('free'); else applyMode('fullscreen')
  }

  const dockLeft = () => { if (allowDock) applyMode('dock-left') }
  const dockRight = () => { if (allowDock) applyMode('dock-right') }
  const dockTop = () => { if (allowDock && enableDockTopBottom) applyMode('dock-top') }
  const dockBottom = () => { if (allowDock && enableDockTopBottom) applyMode('dock-bottom') }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      hideBackdrop={false}
      scroll="paper"
      keepMounted
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }
      }}
      slotProps={{
        backdrop: { sx: { backgroundColor: 'var(--overlay_background)' } }
      }}
      PaperProps={{
        sx: {
          position: 'absolute',
          m: 0,
          top: pos.y,
          left: pos.x,
          width: size.w,
          height: size.h,
          display: 'flex',
          backgroundColor: 'var(--modal_bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          transform: 'none'
        }
      }}
    >
      <DialogTitle
        onMouseDown={startDrag}
        onDoubleClick={toggleFullscreen}
        sx={{
          cursor: mode==='free' ? 'move' : 'default',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
          backgroundColor: 'var(--surface)'
        }}
      >
        <Box>{title}</Box>
        <Box data-draggable-stop>
          {allowDock && (
            <>
              <Tooltip title="Dock left"><IconButton size="small" onClick={dockLeft}><KeyboardTabOutlinedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Dock right"><IconButton size="small" onClick={dockRight} sx={{ transform: 'scaleX(-1)' }}><KeyboardTabOutlinedIcon fontSize="small" /></IconButton></Tooltip>
              {enableDockTopBottom && (
                <>
                  <Tooltip title="Dock top"><IconButton size="small" onClick={dockTop}><KeyboardTabIcon style={{ transform:'rotate(90deg)' }} fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Dock bottom"><IconButton size="small" onClick={dockBottom}><KeyboardTabIcon style={{ transform:'rotate(-90deg)' }} fontSize="small" /></IconButton></Tooltip>
                </>
              )}
            </>
          )}
          {allowFullscreen && (
            <Tooltip title={mode==='fullscreen' ? 'Exit full screen' : 'Full screen'}>
              <IconButton size="small" onClick={toggleFullscreen}>
                {mode==='fullscreen' ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          {showLayoutButtons && (
            <>
              <button
                onClick={() => {
                  try {
                    const prefKey = rememberLayoutKey || `${storageKey}:preferred`
                    localStorage.setItem(prefKey, JSON.stringify({ position: pos, size, mode, savedAt: Date.now() }))
                  } catch {}
                }}
                title="Save layout"
                style={{ marginInlineEnd: 8, cursor: 'pointer', background: 'transparent', border: 0, color: 'inherit' }}
              >💾</button>
              <button onClick={resetLayout} title="Reset layout" style={{ marginInlineEnd: 8, cursor: 'pointer', background: 'transparent', border: 0, color: 'inherit' }}>↺</button>
            </>
          )}
          <IconButton onClick={onClose} size="small" aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ overflow: 'auto', p: 2, flex: 1 }}>
        {children}
      </DialogContent>
      {actions && (
        <DialogActions sx={{ p: 1.5 }}>
          {actions}
        </DialogActions>
      )}
      {/* Resize handle */}
      {mode==='free' && (
      <Box
        data-draggable-stop
        onMouseDown={startResize}
        sx={{ position: 'absolute', width: 16, height: 16, right: 4, bottom: 4, cursor: 'nwse-resize', opacity: 0.7 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 14h12v-2H4v-2H2v4z" fill="currentColor" /></svg>
      </Box>
      )}
    </Dialog>
  )
}
