import React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import SidebarPortal from "./SidebarPortal";
import useAppStore from '../../store/useAppStore';

const DashboardLayout: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, language } = useAppStore();
  const [mounted, setMounted] = React.useState(true);
  const isRtl = language === 'ar';
  
  // Force complete remount when language changes
  React.useEffect(() => {
    console.log('[DashboardLayout] Language changed to:', language, 'isRtl:', isRtl);
    console.log('[DashboardLayout] Forcing complete remount...');
    
    // Force unmount and remount
    setMounted(false);
    
    // Update document direction
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Remount after a brief delay
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, [language]);


  const handleMenuClick = () => {
    toggleSidebar?.();
  };

  console.log('[DashboardLayout] Rendering with isRtl:', isRtl, 'language:', language, 'mounted:', mounted);

  // Don't render during remount transition
  if (!mounted) {
    return null;
  }

  // Render the sidebar out-of-flow via a portal so it can freely sit on the left/right
  return (
    <Box 
      key={isRtl ? 'rtl-layout' : 'ltr-layout'}
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
          }}
        >
          {/* offset for AppBar */}
          <Toolbar />
          <Box sx={{ 
            flex: 1,
            p: 3,
            overflow: 'auto',
            // logical padding to account for sidebar width on the appropriate side
            ...(isRtl
              ? { paddingRight: `${sidebarCollapsed ? 64 : 280}px` }
              : { paddingLeft: `${sidebarCollapsed ? 64 : 280}px` }),
          }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
