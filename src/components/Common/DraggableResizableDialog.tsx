import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogTitle, DialogContent } from '@mui/material'

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
  // Persist size and position if storageKey provided
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    if (!storageKey) return { width: initialWidth, height: initialHeight }
    try {
      const raw = localStorage.getItem(`${storageKey}:size`)
      if (raw) return JSON.parse(raw)
    } catch {}
    return { width: initialWidth, height: initialHeight }
  })
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (!storageKey) return { x: Math.max(40, (window.innerWidth - initialWidth) / 2), y: Math.max(40, (window.innerHeight - initialHeight) / 6) }
    try {
      const raw = localStorage.getItem(`${storageKey}:pos`)
      if (raw) return JSON.parse(raw)
    } catch {}
    return { x: Math.max(40, (window.innerWidth - initialWidth) / 2), y: Math.max(40, (window.innerHeight - initialHeight) / 6) }
  })

  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(`${storageKey}:size`, JSON.stringify(size)) } catch {}
  }, [size, storageKey])
  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(`${storageKey}:pos`, JSON.stringify(pos)) } catch {}
  }, [pos, storageKey])

  const dragging = useRef(false)
  const dragStart = useRef<{ x:number; y:number; px:number; py:number }>({ x:0, y:0, px:0, py:0 })

  const resizing = useRef(false)
  const resizeStart = useRef<{ x:number; y:number; w:number; h:number }>({ x:0, y:0, w:0, h:0 })

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
    const nx = clamp(dragStart.current.px + dx, 0, Math.max(0, window.innerWidth - size.width))
    const ny = clamp(dragStart.current.py + dy, 0, Math.max(0, window.innerHeight - size.height))
    setPos({ x: nx, y: ny })
  }, [size.width, size.height])

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
    const w = clamp(resizeStart.current.w + dw, 480, Math.min(window.innerWidth - pos.x, 1600))
    const h = clamp(resizeStart.current.h + dh, 320, Math.min(window.innerHeight - pos.y, 1200))
    setSize({ width: w, height: h })
  }, [pos.x, pos.y])

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
      PaperProps={{
        sx: { width: size.width, height: size.height, position: 'fixed', left: pos.x, top: pos.y, overflow: 'hidden' }
      }}
    >
      {title && (
        <DialogTitle onMouseDown={onTitleMouseDown} sx={{ cursor: 'move', userSelect: 'none' }}>{title}</DialogTitle>
      )}
      <DialogContent dividers sx={{ p: 2, position: 'relative' }}>
        {children}
        {/* Resize handle */}
        <div
          onMouseDown={onResizeHandleMouseDown}
          style={{ position: 'absolute', right: 6, bottom: 6, width: 14, height: 14, cursor: 'nwse-resize', opacity: 0.6, borderRight: '2px solid #999', borderBottom: '2px solid #999' }}
          title="Resize"
        />
      </DialogContent>
    </Dialog>
  )
}

export default DraggableResizableDialog
