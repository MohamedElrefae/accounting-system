import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, useTheme } from '@mui/material'

interface DraggableResizableDialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
  // Optional props to keep compatibility with callers
  storageKey?: string
  initialWidth?: number
  initialHeight?: number
  showLayoutButtons?: boolean
  enableDockTopBottom?: boolean
  rememberLayoutKey?: string
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const DraggableResizableDialog: React.FC<DraggableResizableDialogProps> = ({
  open,
  onClose,
  title,
  children,
  storageKey,
  initialWidth = 900,
  initialHeight = 600,
}) => {
  const theme = useTheme()
  const isRtl = theme.direction === 'rtl'

  // Persist size and position if storageKey provided
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    if (!storageKey) return { width: initialWidth, height: initialHeight }
    try {
      const raw = localStorage.getItem(`${storageKey}:size`)
      if (raw) return JSON.parse(raw)
    } catch { }
    return { width: initialWidth, height: initialHeight }
  })
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (!storageKey) return { x: Math.max(40, (window.innerWidth - initialWidth) / 2), y: Math.max(40, (window.innerHeight - initialHeight) / 6) }
    try {
      const raw = localStorage.getItem(`${storageKey}:pos`)
      if (raw) return JSON.parse(raw)
    } catch { }
    return { x: Math.max(40, (window.innerWidth - initialWidth) / 2), y: Math.max(40, (window.innerHeight - initialHeight) / 6) }
  })

  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(`${storageKey}:size`, JSON.stringify(size)) } catch { }
  }, [size, storageKey])
  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(`${storageKey}:pos`, JSON.stringify(pos)) } catch { }
  }, [pos, storageKey])

  const dragging = useRef(false)
  const dragStart = useRef<{ x: number; y: number; px: number; py: number }>({ x: 0, y: 0, px: 0, py: 0 })

  const resizing = useRef(false)
  const resizeStart = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 })

  const onTitleMouseDown: React.MouseEventHandler = (e) => {
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', onDragEnd)
  }

  const onDrag = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    const nx = dragStart.current.px + dx
    const ny = dragStart.current.py + dy

    // Safety margin: keep at least 50px of header visible
    const safeX = clamp(nx, -size.width + 50, window.innerWidth - 50)
    const safeY = clamp(ny, 0, window.innerHeight - 50)

    setPos({ x: safeX, y: safeY })
  }, [size.width])

  const onDragEnd = useCallback(() => {
    dragging.current = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', onDragEnd)
  }, [onDrag])

  const onResizeHandleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    resizing.current = true
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height }
    document.addEventListener('mousemove', onResize)
    document.addEventListener('mouseup', onResizeEnd)
    e.preventDefault()
    e.stopPropagation()
  }

  const onResize = useCallback((e: MouseEvent) => {
    if (!resizing.current) return
    const dw = e.clientX - resizeStart.current.x
    const dh = e.clientY - resizeStart.current.y

    const w = clamp(resizeStart.current.w + dw, 200, 4000)
    const h = clamp(resizeStart.current.h + dh, 150, 4000)
    setSize({ width: w, height: h })
  }, [])

  const onResizeEnd = useCallback(() => {
    resizing.current = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', onResizeEnd)
  }, [onResize])

  useEffect(() => () => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', onResizeEnd)
  }, [onDrag, onDragEnd, onResize, onResizeEnd])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      // Override the container and backdrop to allow clicking/dragging "outside"
      sx={{
        '& .MuiDialog-container': {
          display: 'block',
          overflow: 'visible',
          pointerEvents: 'none'
        },
        '& .MuiDialog-paper': {
          pointerEvents: 'auto'
        },
        '& .MuiBackdrop-root': {
          // Keep backdrop but don't let it block clicks if we want to drag far
          // Or just keep it as is if modal is truly modal
        }
      }}
      PaperProps={{
        sx: {
          width: size.width,
          height: size.height,
          position: 'fixed',
          top: 0,
          left: 0,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          m: 0,
          maxWidth: 'none !important',
          maxHeight: 'none !important',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      {title && (
        <DialogTitle onMouseDown={onTitleMouseDown} sx={{ cursor: 'move', userSelect: 'none' }}>{title}</DialogTitle>
      )}
      <DialogContent dividers sx={{ p: 2, position: 'relative', flexGrow: 1 }}>
        {children}
      </DialogContent>
      {/* Resize handle moved to Paper level (sibling of content) */}
      <div
        onMouseDown={onResizeHandleMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 24,
          height: 24,
          cursor: 'nwse-resize',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '0 4px 4px 0'
        }}
        title="Resize"
      >
        <div style={{ width: 10, height: 10, borderRight: '2px solid #999', borderBottom: '2px solid #999' }} />
      </div>
    </Dialog>
  )
}

export default DraggableResizableDialog
