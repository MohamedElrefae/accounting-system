import React, { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { useSmartRoutePreloading } from '../../routes/RouteGroups';

interface OptimizedNavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  routeGroup?: 'transactions' | 'reports' | 'fiscal' | 'inventory' | 'admin' | 'main-data';
  onClick?: () => void;
}

const OptimizedNavItem: React.FC<OptimizedNavItemProps> = ({
  to,
  icon,
  text,
  routeGroup,
  onClick
}) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  const { preloadOnHover, enabled } = useSmartRoutePreloading();

  // Preload route on hover for instant navigation
  const handleMouseEnter = useCallback(() => {
    if (!routeGroup) return;

    if (enabled) {
      preloadOnHover(routeGroup);
      return;
    }

    // Preload the route group
    switch (routeGroup) {
      case 'transactions':
        import('../../routes/TransactionRoutes');
        break;
      case 'reports':
        import('../../routes/ReportRoutes');
        break;
      case 'fiscal':
        import('../../routes/FiscalRoutes');
        break;
      case 'inventory':
        import('../../routes/InventoryRoutes');
        break;
      case 'admin':
        import('../../routes/AdminRoutes');
        break;
      case 'main-data':
        import('../../routes/MainDataRoutes');
        break;
    }
  }, [enabled, preloadOnHover, routeGroup]);

  // Preload on focus as well (keyboard navigation)
  const handleFocus = useCallback(() => {
    handleMouseEnter();
  }, [handleMouseEnter]);

  return (
    <ListItem disablePadding>
      <ListItemButton
        component={Link}
        to={to}
        selected={isActive}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        onClick={onClick}
        sx={{
          minHeight: 48,
          '&.Mui-selected': {
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '& .MuiListItemIcon-root': {
              color: 'primary.contrastText',
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          {icon}
        </ListItemIcon>
        <ListItemText 
          primary={text}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 400,
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

export default OptimizedNavItem;