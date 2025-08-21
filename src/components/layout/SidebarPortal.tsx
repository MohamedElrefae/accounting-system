import React from 'react';
import { createPortal } from 'react-dom';
import Sidebar, { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from './Sidebar';
import useAppStore from '../../store/useAppStore';

// Renders the Sidebar into #sidebar-root and positions it fixed on the correct side
const SidebarPortal: React.FC = () => {
  const { sidebarCollapsed, language } = useAppStore();
  const isRtl = language === 'ar';

  const target = (typeof document !== 'undefined' && document.getElementById('sidebar-root')) || null;
  if (!target) return null;

  const width = sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 64, // default MUI AppBar height on desktop
        [isRtl ? 'right' : 'left']: 0,
        height: 'calc(100dvh - 64px)',
        width,
        zIndex: 1300,
        pointerEvents: 'auto',
        direction: isRtl ? 'rtl' : 'ltr',
      } as React.CSSProperties}
    >
      <Sidebar open={!sidebarCollapsed} />
    </div>,
    target
  );
};

export default SidebarPortal;

