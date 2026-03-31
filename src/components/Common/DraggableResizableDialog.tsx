import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, useTheme, IconButton, Box } from '@mui/material'
import { CloseIcon, FullscreenIcon, FullscreenExitIcon } from '../icons/SimpleIcons'

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
  // New props for modern design
  showHeaderActions?: boolean
  headerGradient?: string
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
  showHeaderActions = true,
  headerGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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

  const [isMaximized, setIsMaximized] = useState(false)
  const [_maximizedSize, setMaximizedSize] = useState({ width: 0, height: 0 })
  const [normalSize, setNormalSize] = useState({ width: 0, height: 0 })
  const [normalPos, setNormalPos] = useState({ x: 0, y: 0 })

  // Store normal state before maximizing
  const handleMaximizeToggle = useCallback(() => {
    try {
      if (isMaximized) {
        // Restore normal size and position
        setSize(normalSize)
        setPos(normalPos)
        setIsMaximized(false)
      } else {
        // Store current state and maximize
        setNormalSize(size)
        setNormalPos(pos)
        const maximizedW = window.innerWidth - 40
        const maximizedH = window.innerHeight - 40
        setMaximizedSize({ width: maximizedW, height: maximizedH })
        setSize({ width: maximizedW, height: maximizedH })
        setPos({ x: 20, y: 20 })
        setIsMaximized(true)
      }
    } catch (error) {
      console.error('Maximize toggle error:', error)
    }
  }, [isMaximized, size, pos, setSize, setPos, setNormalSize, setNormalPos, setMaximizedSize, normalSize, normalPos])

  const onTitleMouseDown: React.MouseEventHandler = (e) => {
    try {
      dragging.current = true
      dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', onDragEnd)
    } catch (error) {
      console.error('Title mouse down error:', error)
      dragging.current = false
    }
  }

  const onDrag = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    // In RTL mode, invert the horizontal movement
    const adjustedDx = isRtl ? -dx : dx

    const nx = dragStart.current.px + adjustedDx
    const ny = dragStart.current.py + dy

    // Safety margin: keep at least 50px of header visible
    const safeX = clamp(nx, -size.width + 50, window.innerWidth - 50)
    const safeY = clamp(ny, 0, window.innerHeight - 50)

    setPos({ x: safeX, y: safeY })
  }, [size.width, isRtl])

  const onDragEnd = useCallback(() => {
    dragging.current = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', onDragEnd)
  }, [onDrag])

  const onResizeHandleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    try {
      e.preventDefault()
      e.stopPropagation()

      resizing.current = true
      resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height }

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizing.current) return

        let dw = e.clientX - resizeStart.current.x
        const dh = e.clientY - resizeStart.current.y

        // In RTL mode, invert the horizontal movement for resize
        if (isRtl) {
          dw = -dw
        }

        setSize({ width: w, height: h })
      }

      const handleMouseUp = () => {
        resizing.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = isRtl ? 'nesw-resize' : 'nwse-resize'
      document.body.style.userSelect = 'none'

    } catch (error) {
      console.error('Resize handle mouse down error:', error)
      resizing.current = false
    }
  }

  useEffect(() => () => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', onDragEnd)
  }, [onDrag, onDragEnd])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
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
          flexDirection: 'column',
          border: '2px solid #667eea',
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          pointerEvents: 'auto'
        }
      }}
    >
      {title && (
        <DialogTitle
          onMouseDown={onTitleMouseDown}
          sx={{
            cursor: 'move',
            userSelect: 'none',
            background: headerGradient,
            color: 'white',
            borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            fontSize: '16px',
            fontWeight: 600
          }}
        >
          <Box>{title}</Box>
          {showHeaderActions && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                onClick={handleMaximizeToggle}
                sx={{
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                }}
              >
                {isMaximized ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          )}
        </DialogTitle>
      )}
      <DialogContent dividers sx={{
        p: 2,
        position: 'relative',
        flexGrow: 1,
        overflow: 'auto',
        minWidth: 200,
        minHeight: 150
      }}>
        {children}
      </DialogContent>
      {/* Modern Resize Handle */}
      <div
        onMouseDown={onResizeHandleMouseDown}
        style={{
          position: 'absolute',
          [isRtl ? 'left' : 'right']: 0,
          bottom: 0,
          width: 30,
          height: 30,
          cursor: isRtl ? 'nesw-resize' : 'nwse-resize',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(102, 126, 234, 0.25)',
          borderRadius: isRtl ? '8px 0 0 0' : '0 0 8px 0',
          border: `2px solid #667eea`,
          borderTop: isRtl ? '2px solid #667eea' : 'none',
          borderLeft: isRtl ? 'none' : '2px solid #667eea',
          userSelect: 'none',
          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.5)',
          transform: 'scale(1.1)'
        }}
        title="Resize - Click and drag to resize freely like Transaction Wizard"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.4)'
          e.currentTarget.style.transform = 'scale(1.2)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.7)'
        }}
        onMouseLeave={(e) => {
          if (!resizing.current) {
            e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.25)'
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.5)'
          }
        }}
      >
        <div style={{
          width: 16,
          height: 16,
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '2px',
            backgroundColor: '#667eea',
            bottom: 0,
            right: 0
          }} />
          <div style={{
            position: 'absolute',
            width: '2px',
            height: '100%',
            backgroundColor: '#667eea',
            bottom: 0,
            right: 0
          }} />
          <div style={{
            position: 'absolute',
            width: '6px',
            height: '6px',
            borderRight: '2px solid #667eea',
            borderBottom: '2px solid #667eea',
            bottom: 0,
            right: 0
          }} />
        </div>
      </div>
    </Dialog>
  )
}

export default DraggableResizableDialog
