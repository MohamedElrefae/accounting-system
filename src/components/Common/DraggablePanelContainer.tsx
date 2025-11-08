import React from 'react';
import DraggableResizablePanel from './DraggableResizablePanel';
import usePanelState, { type PanelStateDefaults, type UsePanelStateReturn } from '../../hooks/usePanelState';

type DockPosition = 'left' | 'right' | 'top' | 'bottom';

type DraggablePanelChildren = React.ReactNode | ((controls: UsePanelStateReturn) => React.ReactNode);

type DraggablePanelContainerProps = {
  storageKey: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  headerGradient?: string;
  presetName?: string;
  defaults?: PanelStateDefaults;
  children: DraggablePanelChildren;
};

const DraggablePanelContainer: React.FC<DraggablePanelContainerProps> = ({
  storageKey,
  isOpen,
  onClose,
  title,
  subtitle,
  headerActions,
  headerGradient,
  presetName,
  defaults,
  children,
}) => {
  const controls = usePanelState(
    storageKey,
    defaults,
  );

  const { state, setPosition, setSize, toggleMaximize, setDocked, setDockPosition, reset } = controls;

  const content = typeof children === 'function'
    ? (children as (controls: UsePanelStateReturn) => React.ReactNode)(controls)
    : children;

  const handleDock = (position: DockPosition) => {
    setDockPosition(position);
    setDocked(true);
  };

  return (
    <DraggableResizablePanel
      title={title}
      subtitle={subtitle}
      headerActions={headerActions}
      headerGradient={headerGradient}
      isOpen={isOpen}
      onClose={onClose}
      position={state.position}
      size={state.size}
      isMaximized={state.isMaximized}
      isDocked={state.isDocked}
      dockPosition={state.dockPosition}
      onMove={setPosition}
      onResize={setSize}
      onMaximize={toggleMaximize}
      onDock={handleDock}
      onResetPosition={reset}
      presetName={presetName}
    >
      {content}
    </DraggableResizablePanel>
  );
};

export default DraggablePanelContainer;
