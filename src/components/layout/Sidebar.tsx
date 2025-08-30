import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Badge from '@mui/material/Badge';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTree from '@mui/icons-material/AccountTree';
import Receipt from '@mui/icons-material/Receipt';
import Description from '@mui/icons-material/Description';
import People from '@mui/icons-material/People';
import LocalShipping from '@mui/icons-material/LocalShipping';
import Assessment from '@mui/icons-material/Assessment';
import Inventory from '@mui/icons-material/Inventory';
import Settings from '@mui/icons-material/Settings';
import ListIcon from '@mui/icons-material/List';
import Add from '@mui/icons-material/Add';
import EditNote from '@mui/icons-material/EditNote';
import Book from '@mui/icons-material/Book';
import Balance from '@mui/icons-material/Balance';
import ShoppingCart from '@mui/icons-material/ShoppingCart';
import RequestQuote from '@mui/icons-material/RequestQuote';
import PersonOutline from '@mui/icons-material/PersonOutline';
import Assignment from '@mui/icons-material/Assignment';
import Business from '@mui/icons-material/Business';
import TrendingUp from '@mui/icons-material/TrendingUp';
import AccountBalance from '@mui/icons-material/AccountBalance';
import MonetizationOn from '@mui/icons-material/MonetizationOn';
import BarChart from '@mui/icons-material/BarChart';
import Category from '@mui/icons-material/Category';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import Summarize from '@mui/icons-material/Summarize';
import Group from '@mui/icons-material/Group';
import Tune from '@mui/icons-material/Tune';
import Backup from '@mui/icons-material/Backup';
import Security from '@mui/icons-material/Security';
import Database from '@mui/icons-material/Storage';
import Tag from '@mui/icons-material/LocalOffer';
import useAppStore from '../../store/useAppStore';
import { navigationItems } from '../../data/navigation';
import type { NavigationItem } from '../../types';
import { useHasPermission } from '../../hooks/useHasPermission';

export const DRAWER_WIDTH = 280;
export const DRAWER_COLLAPSED_WIDTH = 64;

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Dashboard':
      return <DashboardIcon />;
    case 'AccountTree':
      return <AccountTree />;
    case 'Receipt':
      return <Receipt />;
    case 'Description':
      return <Description />;
    case 'People':
      return <People />;
    case 'LocalShipping':
      return <LocalShipping />;
    case 'Assessment':
      return <Assessment />;
    case 'Inventory':
      return <Inventory />;
    case 'Settings':
      return <Settings />;
    case 'List':
      return <ListIcon />;
    case 'Add':
      return <Add />;
    case 'EditNote':
      return <EditNote />;
    case 'Book':
      return <Book />;
    case 'Balance':
      return <Balance />;
    case 'ShoppingCart':
      return <ShoppingCart />;
    case 'RequestQuote':
      return <RequestQuote />;
    case 'PersonOutline':
      return <PersonOutline />;
    case 'Assignment':
      return <Assignment />;
    case 'Business':
      return <Business />;
    case 'TrendingUp':
      return <TrendingUp />;
    case 'AccountBalance':
      return <AccountBalance />;
    case 'MonetizationOn':
      return <MonetizationOn />;
    case 'BarChart':
      return <BarChart />;
    case 'Category':
      return <Category />;
    case 'SwapHoriz':
      return <SwapHoriz />;
    case 'Summarize':
      return <Summarize />;
    case 'Group':
      return <Group />;
    case 'Tune':
      return <Tune />;
    case 'Backup':
      return <Backup />;
    case 'Security':
      return <Security />;
    case 'database':
      return <Database />;
    case 'tag':
      return <Tag />;
    default:
      return <DashboardIcon />;
  }
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
  const hasPermission = useHasPermission();
  
  // Force component update when language changes
  React.useEffect(() => {
    // Component will re-render when language or isRtl changes
  }, [language, isRtl]);


  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      if (prev.includes(itemId)) {
        // If clicking on already expanded item, collapse it and all its children
        const toRemove = new Set([itemId]);
        // Find all descendant items that should also be collapsed
        const findDescendants = (_parentId: string, items: NavigationItem[]) => {
          items.forEach(item => {
            if (prev.includes(item.id)) {
              toRemove.add(item.id);
            }
            if (item.children) {
              findDescendants(item.id, item.children);
            }
          });
        };
        const parentItem = findNavigationItem(itemId, navigationItems);
        if (parentItem?.children) {
          findDescendants(itemId, parentItem.children);
        }
        return prev.filter(id => !toRemove.has(id));
      } else {
        // If clicking on collapsed item, expand it (keep others expanded too for nested support)
        return [...prev, itemId];
      }
    });
  };

  // Helper function to find a navigation item by ID
  const findNavigationItem = (itemId: string, items: NavigationItem[]): NavigationItem | null => {
    for (const item of items) {
      if (item.id === itemId) return item;
      if (item.children) {
        const found = findNavigationItem(itemId, item.children);
        if (found) return found;
      }
    }
    return null;
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

    // Permission gate: prefer requiredPermission; fallback to legacy superAdminOnly
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) return null;
    if (item.superAdminOnly && !hasPermission('admin.all')) return null;

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
                <Badge badgeContent={item.badge?.text} color="error">
                  {getIcon(item.icon || 'Dashboard')}
                </Badge>
              ) : (
                getIcon(item.icon || 'Dashboard')
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
