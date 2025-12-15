import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import SidebarPortal from "./SidebarPortal";
import useAppStore from '../../store/useAppStore';
import { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from './Sidebar';
import { useSmartRoutePreloading } from '../../routes/RouteGroups';

const DashboardLayout: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, language } = useAppStore();
  const isRtl = language === 'ar';
  const location = useLocation();
  const { recordNavigation, preloadBasedOnPatterns, enabled } = useSmartRoutePreloading();
  
  // Simple direction update - no remounting needed
  React.useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRtl]);

  React.useEffect(() => {
    if (!enabled) return;
    recordNavigation(location.pathname);
    preloadBasedOnPatterns();
  }, [enabled, location.pathname, preloadBasedOnPatterns, recordNavigation]);

  const handleMenuClick = () => {
    toggleSidebar?.();
  };

  // Render the sidebar out-of-flow via a portal so it can freely sit on the left/right
  return (
    <Box 
      sx={{
        display: 'flex', 
        flexDirection: 'column',
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
      }}
    >
      <CssBaseline />
      <TopBar onMenuClick={handleMenuClick} />
      {/* Out-of-flow sidebar mount */}
      <SidebarPortal />

      {/* Main content container. Add inline padding so content doesn't go under fixed sidebar */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          component="main"
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'background.default',
            overflow: 'hidden',
            // Shift the entire main area away from the fixed sidebar using logical margin
            marginInlineStart: `${sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH}px`,
            transition: 'margin 200ms ease',
          }}
        >
          {/* offset for AppBar */}
          <Toolbar />
          <Box
            key={location.pathname}
            sx={{ 
            flex: 1,
            p: 3,
            overflow: 'auto',
          }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
