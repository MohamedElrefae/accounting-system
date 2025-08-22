import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Collapse,
  Badge,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Dashboard,
  AccountTree,
  Receipt,
  Description,
  People,
  LocalShipping,
  Assessment,
  Inventory,
  Settings,
  List as ListIcon,
  Add,
  EditNote,
  Book,
  Balance,
  ShoppingCart,
  RequestQuote,
  PersonOutline,
  Assignment,
  Business,
  TrendingUp,
  AccountBalance,
  MonetizationOn,
  BarChart,
  Category,
  SwapHoriz,
  Summarize,
  Group,
  Tune,
  Backup,
  Security,
} from '@mui/icons-material';
import useAppStore from '../../store/useAppStore';
import { navigationItems } from '../../data/navigation';
import type { NavigationItem } from '../../types';

export const DRAWER_WIDTH = 280;
export const DRAWER_COLLAPSED_WIDTH = 64;

const iconMap: Record<string, React.ReactElement> = {
  Dashboard: <Dashboard />,
  AccountTree: <AccountTree />,
  Receipt: <Receipt />,
  Description: <Description />,
  People: <People />,
  LocalShipping: <LocalShipping />,
  Assessment: <Assessment />,
  Inventory: <Inventory />,
  Settings: <Settings />,
  List: <ListIcon />,
  Add: <Add />,
  EditNote: <EditNote />,
  Book: <Book />,
  Balance: <Balance />,
  ShoppingCart: <ShoppingCart />,
  RequestQuote: <RequestQuote />,
  PersonOutline: <PersonOutline />,
  Assignment: <Assignment />,
  Business: <Business />,
  TrendingUp: <TrendingUp />,
  AccountBalance: <AccountBalance />,
  MonetizationOn: <MonetizationOn />,
  BarChart: <BarChart />,
  Category: <Category />,
  SwapHoriz: <SwapHoriz />,
  Summarize: <Summarize />,
  Group: <Group />,
  Tune: <Tune />,
  Backup: <Backup />,
  Security: <Security />,
};

interface SidebarProps {
  open: boolean;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const { sidebarCollapsed, language, companyName } = useAppStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard']);
  const navigate = useNavigate();
  const location = useLocation();
  const isRtl = language === 'ar';
  
  // Force component update when language changes
  React.useEffect(() => {
    console.log('[Sidebar] Language changed to:', language, 'isRtl:', isRtl);
  }, [language, isRtl]);


  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      // Accordion behavior: only one item can be expanded at a time
      if (prev.includes(itemId)) {
        // If clicking on already expanded item, collapse it
        return [];
      } else {
        // If clicking on collapsed item, expand it and collapse others
        return [itemId];
      }
    });
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const title = language === 'ar' ? item.titleAr : item.titleEn;
    const isItemActive = isActive(item.path);

    // Super admin gate for certain items
    // We rely on the presence of a badge or additional context later, but for now
    // we simply hide items marked superAdminOnly if user is not super admin.
    // We use a conservative approach: check a flag in localStorage set by auth/profile contexts.
    const isSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
    if (item.superAdminOnly && !isSuperAdmin) return null;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.id);
              } else if (item.path) {
                handleNavigation(item.path);
              }
            }}
            sx={{
              minHeight: 52,
              justifyContent: sidebarCollapsed ? 'center' : 'initial',
              px: level > 0 ? 1.5 : 2,
              py: 1,
              mx: level > 0 ? 1 : 0.5,
              my: 0.25,
              [isRtl ? 'pr' : 'pl']: level > 0 ? 3.5 + (level * 1.5) : 2,
              backgroundColor: isItemActive 
                ? 'primary.main' 
                : isExpanded && hasChildren
                ? 'action.selected'
                : 'transparent',
              borderRadius: level > 0 ? '8px' : '12px',
              border: isItemActive ? '1px solid' : 'none',
              borderColor: isItemActive ? 'primary.light' : 'transparent',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                backgroundColor: isItemActive 
                  ? 'primary.dark'
                  : hasChildren
                  ? 'action.selected'
                  : 'action.hover',
                transform: !sidebarCollapsed ? 'translateX(4px)' : 'none',
                boxShadow: !sidebarCollapsed ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
              },
              '&:active': {
                transform: !sidebarCollapsed ? 'translateX(2px)' : 'none',
              },
              // Modern gradient overlay effect
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: isRtl ? 'auto' : 0,
                right: isRtl ? 0 : 'auto',
                width: '3px',
                height: '100%',
                background: isItemActive 
                  ? (theme) => `linear-gradient(180deg, ${theme.palette.primary.contrastText} 0%, ${theme.palette.primary.contrastText}cc 100%)`
                  : 'transparent',
                borderRadius: '0 2px 2px 0',
                transition: 'all 0.2s ease-in-out',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                [isRtl ? 'ml' : 'mr']: sidebarCollapsed ? 'auto' : 3,
                justifyContent: 'center',
                color: isItemActive 
                  ? 'primary.contrastText' 
                  : isExpanded && hasChildren
                  ? 'primary.main'
                  : 'text.secondary',
                fontSize: '20px',
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error">
                  {iconMap[item.icon] || <Dashboard />}
                </Badge>
              ) : (
                iconMap[item.icon] || <Dashboard />
              )}
            </ListItemIcon>
            <ListItemText
              primary={title}
              sx={{ 
                opacity: sidebarCollapsed ? 0 : 1,
                '& .MuiListItemText-primary': {
                  color: isItemActive 
                    ? 'primary.contrastText' 
                    : isExpanded && hasChildren
                    ? 'primary.main'
                    : 'text.primary',
                  fontWeight: isItemActive ? 600 : isExpanded && hasChildren ? 500 : 400,
                  fontSize: '14px',
                  transition: 'all 0.2s ease-in-out',
                },
              }}
            />
            {hasChildren && !sidebarCollapsed && (
              <Box
                sx={{
                  color: isItemActive 
                    ? 'primary.contrastText' 
                    : isExpanded
                    ? 'primary.main'
                    : 'text.secondary',
                  transition: 'all 0.2s ease-in-out',
                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(0deg)',
                }}
              >
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </Box>
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded && !sidebarCollapsed} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map((child: NavigationItem) => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box
      component="nav"
      sx={{
        width: sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        overflowX: 'hidden',
        overflowY: 'auto',
        borderRight: !isRtl ? 1 : 0,
        borderLeft: isRtl ? 1 : 0,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        backdropFilter: (theme) => theme.palette.mode === 'dark' ? 'none' : 'blur(10px)',
        boxShadow: !isRtl 
          ? '4px 0 24px rgba(0, 0, 0, 0.12)' 
          : '-4px 0 24px rgba(0, 0, 0, 0.12)',
        height: '100%',
        // Scrollbar styling
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '3px',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          px: sidebarCollapsed ? 1 : 2.5,
          py: 2.5,
          minHeight: 72,
          borderBottom: 1,
          borderColor: 'divider',
          background: (theme) => 
            `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.light}10 100%)`,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: (theme) => 
              `linear-gradient(90deg, transparent 0%, ${theme.palette.primary.main}40 50%, transparent 100%)`,
          },
        }}
      >
        {!sidebarCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: '12px',
                background: (theme) => 
                  `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
            <AccountBalance sx={{ color: 'primary.contrastText', fontSize: '24px' }} />
            </Box>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '18px',
                letterSpacing: '-0.5px',
              }}
            >
              {companyName}
            </Typography>
          </Box>
        )}
        {sidebarCollapsed && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: '12px',
              background: (theme) => 
                `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <AccountBalance sx={{ color: 'primary.contrastText', fontSize: '28px' }} />
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {navigationItems.map((item) => renderNavigationItem(item))}
        </List>
      </Box>
    </Box>
  );
};

export default Sidebar;
