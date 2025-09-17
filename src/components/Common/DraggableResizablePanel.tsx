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
  onResetPosition
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showControls, setShowControls] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized || isDocked) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && !isMaximized && !isDocked) {
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y))
      };
      onMove(newPosition);
    } else if (isResizing && !isMaximized && !isDocked) {
      const newWidth = Math.max(400, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(300, resizeStart.height + (e.clientY - resizeStart.y));
      onResize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isMaximized, isDocked, size.width, size.height, dragStart.x, dragStart.y, onMove, isResizing, resizeStart.width, resizeStart.height, resizeStart.x, resizeStart.y, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Handle resizing
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMaximized || isDocked) return;
    
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Calculate panel style based on state
  const getPanelStyle = (): React.CSSProperties => {
    if (isMaximized) {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000
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
        zIndex: 1000
      };
    }

    return {
      position: 'fixed',
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
      zIndex: 1000
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
            {size.width} × {size.height}
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
