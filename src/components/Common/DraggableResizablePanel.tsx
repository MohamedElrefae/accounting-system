import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Maximize, 
  Minimize, 
  X, 
  Move,
  RotateCcw
} from 'lucide-react';
import styles from './DraggableResizablePanel.module.css';

interface DraggableResizablePanelProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  headerGradient?: string;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMaximized: boolean;
  isDocked: boolean;
  dockPosition: 'left' | 'right' | 'top' | 'bottom';
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onMaximize: () => void;
  onDock: (position: 'left' | 'right' | 'top' | 'bottom') => void;
  onResetPosition: () => void;
  /** Optional label to show next to the size badge, e.g. current preset name */
  presetName?: string;
}

const DraggableResizablePanel: React.FC<DraggableResizablePanelProps> = ({
  children,
  title,
  subtitle,
  headerActions,
  headerGradient,
  isOpen,
  onClose,
  position,
  size,
  isMaximized,
  isDocked,
  dockPosition,
  onMove,
  onResize,
  onMaximize,
  onDock,
  onResetPosition,
  presetName
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, origX: 0, origY: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showControls, setShowControls] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // When starting a drag while docked/maximized, we temporarily allow free drag
  const freeDragRef = useRef(false);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // If user tries to drag while docked/maximized, first reset to free mode
    if (isMaximized || isDocked) {
      onResetPosition();
      freeDragRef.current = true;
    }
    // Allow left mouse button only (when button is available); some environments may not set button on mousedown
    if (typeof e.button === 'number' && e.button !== 0) return;
    const targetEl = e.target as HTMLElement;
    // If clicking inside actions area (buttons etc.), don't start a drag
    if (targetEl?.closest(`.${styles.actions}`)) return;
    // Also ignore direct interactive elements just in case
    if (targetEl?.closest('button, a, input, textarea, select, [role="button"]')) return;

    e.preventDefault();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
      origX: position.x,
      origY: position.y
    });

    // Improve UX during drag
    try {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } catch {}
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canMove = isDragging && (!isMaximized || freeDragRef.current) && (!isDocked || freeDragRef.current);
    if (canMove) {
      // Compute unclamped new position
      let nextX = e.clientX - dragStart.x;
      let nextY = e.clientY - dragStart.y;

      // Shift-drag axis locking: lock to dominant axis while Shift is held
      if (e.shiftKey) {
        const dx = nextX - dragStart.origX;
        const dy = nextY - dragStart.origY;
        if (Math.abs(dx) > Math.abs(dy)) {
          // lock vertical
          nextY = dragStart.origY;
        } else {
          // lock horizontal
          nextX = dragStart.origX;
        }
      }

      // Allow the panel to move partially off-screen while keeping a visible margin
      const visibleMargin = 32; // px that must remain visible
      const minX = Math.min(0, window.innerWidth - size.width + visibleMargin);
      const maxX = Math.max(0, window.innerWidth - visibleMargin);
      const minY = Math.min(0, window.innerHeight - size.height + visibleMargin);
      const maxY = Math.max(0, window.innerHeight - visibleMargin);

      const newPosition = {
        x: Math.max(minX, Math.min(maxX, nextX)),
        y: Math.max(minY, Math.min(maxY, nextY))
      };
    } else if (isResizing && (!isMaximized || freeDragRef.current) && (!isDocked || freeDragRef.current)) {
      let newWidth = Math.max(400, resizeStart.width + (e.clientX - resizeStart.x));
      let newHeight = Math.max(300, resizeStart.height + (e.clientY - resizeStart.y));

      // Shift-resize axis locking: lock the smaller delta axis while Shift is held
      if (e.shiftKey) {
        const dx = Math.abs(e.clientX - resizeStart.x);
        const dy = Math.abs(e.clientY - resizeStart.y);
        if (dx > dy) {
          // lock height
          newHeight = resizeStart.height;
        } else {
          // lock width
          newWidth = resizeStart.width;
        }
      }

      onResize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isMaximized, isDocked, size.width, size.height, dragStart.x, dragStart.y, dragStart.origX, dragStart.origY, onMove, isResizing, resizeStart.width, resizeStart.height, resizeStart.x, resizeStart.y, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    freeDragRef.current = false;
    // Restore selection and cursor
    try {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    } catch {}
  }, []);

  // Touch handlers (support drag/resize on touch devices)
  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (isMaximized || isDocked) {
      onResetPosition();
      freeDragRef.current = true;
    }
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y, origX: position.x, origY: position.y });
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch {}
  };
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || (isMaximized && !freeDragRef.current) || (isDocked && !freeDragRef.current)) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    let nextX = touch.clientX - dragStart.x;
    let nextY = touch.clientY - dragStart.y;
    const visibleMargin = 32;
    const minX = Math.min(0, window.innerWidth - size.width + visibleMargin);
    const maxX = Math.max(0, window.innerWidth - visibleMargin);
    const minY = Math.min(0, window.innerHeight - size.height + visibleMargin);
    const maxY = Math.max(0, window.innerHeight - visibleMargin);
    onMove({ x: Math.max(minX, Math.min(maxX, nextX)), y: Math.max(minY, Math.min(maxY, nextY)) });
  }, [isDragging, isMaximized, isDocked, dragStart.x, dragStart.y, size.width, size.height, onMove]);
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    freeDragRef.current = false;
    try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch {}
  }, []);

  // Handle resizing
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMaximized || isDocked) {
      onResetPosition();
      freeDragRef.current = true;
    }
    
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    try {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nwse-resize';
    } catch {}
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Touch support
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove as any);
        document.removeEventListener('touchend', handleTouchEnd as any);
      };
    }
    return undefined;
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Keyboard escape hatch: ESC resets layout (undock/unmaximize + reset position)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onResetPosition();
        try {
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
        } catch {}
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onResetPosition]);

  // Calculate panel style based on state
  const getPanelStyle = (): React.CSSProperties => {
    if (isMaximized) {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10000
      };
    }

    if (isDocked) {
      const dockStyles = {
        left: { left: 0, top: 0, width: '400px', height: '100vh' } as React.CSSProperties,
        right: { right: 0, top: 0, width: '400px', height: '100vh' } as React.CSSProperties,
        top: { top: 0, left: 0, width: '100vw', height: '300px' } as React.CSSProperties,
        bottom: { bottom: 0, left: 0, width: '100vw', height: '300px' } as React.CSSProperties
      } as const;
      return {
        position: 'fixed',
        ...dockStyles[dockPosition],
        zIndex: 10000
      };
    }

    return {
      position: 'fixed',
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
      zIndex: 10000
    } as React.CSSProperties;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={styles.backdrop}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        className={styles.panel}
        style={{
          ...getPanelStyle(),
          borderRadius: isMaximized ? 0 : '12px',
          transition: isMaximized ? 'all 0.3s ease' : 'none',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Title Bar */}
        <div
          className={styles.titleBar}
          style={{
            background: headerGradient || 'linear-gradient(135deg, var(--primary-blue), var(--accent-color))',
            cursor: isDragging ? 'grabbing' : 'grab',
            borderTopLeftRadius: isMaximized ? 0 : '10px',
            borderTopRightRadius: isMaximized ? 0 : '10px'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={onResetPosition}
          title="انقر مرتين لإعادة التمركز وفك التثبيت"
        >
          <div className={styles.titleLeft}>
            <Move size={16} />
            <div className={styles.titleTexts}>
              <h3 className={styles.title}>{title}</h3>
              {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
            </div>
          </div>

          <div className={styles.actions}>
            {headerActions}
            {/* Control Buttons */}
            {showControls && (
              <>
                {/* Dock Controls */}
                <div className={styles.dockGroup}>
                  <button
                    onClick={() => onDock('left')}
                    title="رسو يسار"
                    className={styles.dockBtn}
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => onDock('right')}
                    title="رسو يمين"
                    className={styles.dockBtn}
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => onDock('top')}
                    title="رسو أعلى"
                    className={styles.dockBtn}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onDock('bottom')}
                    title="رسو أسفل"
                    className={styles.dockBtn}
                  >
                    ▼
                  </button>
                </div>

                {/* Reset Position */}
                <button
                  onClick={onResetPosition}
                  title="إعادة تعيين الموقع"
                  className={styles.controlBtn}
                >
                  <RotateCcw size={14} />
                </button>
              </>
            )}

            {/* Maximize/Minimize */}
            <button
              onClick={onMaximize}
              title={isMaximized ? 'تصغير' : 'تكبير'}
              className={styles.controlBtn}
            >
              {isMaximized ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="إغلاق"
              className={styles.closeBtn}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {children}
        </div>

        {/* Resize Handle */}
        {!isMaximized && !isDocked && (
          <div
            className={styles.resizeHandle}
            onMouseDown={handleResizeStart}
          >
            ⟲
          </div>
        )}

        {/* Size Indicator */}
        {showControls && !isMaximized && !isDocked && (
          <div className={styles.sizeIndicator}>
            <span>{size.width} × {size.height}</span>
            {presetName ? <span className={styles.presetName}>— {presetName}</span> : null}
          </div>
        )}

        {/* Position Indicator */}
        {showControls && !isMaximized && !isDocked && (
          <div className={styles.posIndicator}>
            ({position.x}, {position.y})
          </div>
        )}

        {/* Status Indicator */}
        <div
          className={styles.statusBadge}
          style={{ background: isDocked ? 'rgba(34, 197, 94, 0.9)' : isMaximized ? 'rgba(59, 130, 246, 0.9)' : 'rgba(156, 163, 175, 0.9)' }}
        >
          {isDocked ? `مرسو ${dockPosition === 'left' ? 'يسار' : dockPosition === 'right' ? 'يمين' : dockPosition === 'top' ? 'أعلى' : 'أسفل'}` : 
           isMaximized ? 'مكبر' : 'حر'}
        </div>
      </div>
    </>
  );
};

export default DraggableResizablePanel;
