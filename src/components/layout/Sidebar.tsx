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
  Edit,
  Category,
  AutoAwesome,
  AccountBalance,
  TrendingUp,
  Group,
  Tune,
  Security,
  Upload,
  Business,
  TableChart,
  CloudUpload,
  AssignmentTurnedIn,
} from '@mui/icons-material';
import useAppStore from '../../store/useAppStore';
import { navigationItems } from '../../data/navigation';
import type { NavigationItem } from '../../types';
import { useHasPermission } from '../../hooks/useHasPermission';

export const DRAWER_WIDTH = 280;
export const DRAWER_COLLAPSED_WIDTH = 64;

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Dashboard':
      return <Dashboard />;
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
      return <Edit />;
    case 'Book':
      return <Description />;
    case 'Balance':
      return <AccountBalance />;
    case 'ShoppingCart':
      return <Inventory />;
    case 'RequestQuote':
      return <Receipt />;
    case 'PersonOutline':
      return <Group />;
    case 'Assignment':
      return <AssignmentTurnedIn />;
    case 'Business':
      return <Business />;
    case 'TrendingUp':
      return <TrendingUp />;
    case 'AccountBalance':
      return <AccountBalance />;
    case 'MonetizationOn':
      return <TrendingUp />;
    case 'BarChart':
      return <TableChart />;
    case 'Category':
      return <Category />;
    case 'SwapHoriz':
      return <TrendingUp />;
    case 'Summarize':
      return <Description />;
    case 'Group':
      return <Group />;
    case 'Tune':
      return <Tune />;
    case 'Backup':
      return <CloudUpload />;
    case 'Security':
      return <Security />;
    case 'database':
      return <TableChart />;
    case 'tag':
      return <Category />;
    case 'type':
      return <Tune />;
    case 'AutoAwesome':
      return <AutoAwesome />;
    case 'Upload':
      return <Upload />;
    default:
      return <Dashboard />;
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

  // Find path from top-level to target item id (array of ids). Returns null if not found
  const findPathToItem = (
    items: NavigationItem[],
    targetId: string,
    path: string[] = []
  ): string[] | null => {
    for (const item of items) {
      const newPath = [...path, item.id];
      if (item.id === targetId) return newPath;
      if (item.children) {
        const childPath = findPathToItem(item.children, targetId, newPath);
        if (childPath) return childPath;
      }
    }
    return null;
  };

  // Get all descendant ids for the given item (excluding the item itself)
  const getDescendantIds = (item?: NavigationItem): string[] => {
    if (!item || !item.children) return [];
    const ids: string[] = [];
    const walk = (nodes: NavigationItem[]) => {
      for (const node of nodes) {
        ids.push(node.id);
        if (node.children) walk(node.children);
      }
    };
    walk(item.children);
    return ids;
  };

  const toggleExpanded = (itemId: string) => {
    // Enforce accordion behavior only at top-level.
    // Multiple submenus under the currently expanded top-level are allowed.
    setExpandedItems((prev) => {
      const path = findPathToItem(navigationItems, itemId) || [itemId];
      const topLevelId = path[0];
      const isTopLevel = path.length === 1;

      if (isTopLevel) {
        if (prev.includes(itemId)) {
          // Collapse this top-level and all its descendants
          const item = findNavigationItem(itemId, navigationItems);
          const toRemove = new Set<string>([itemId, ...getDescendantIds(item || undefined)]);
          return prev.filter((id) => !toRemove.has(id));
        }
        // Expand this top-level; collapse all other top-level sections and their descendants
        const keepWithinThisTop = prev.filter((id) => {
          const p = findPathToItem(navigationItems, id);
          return p && p[0] === itemId;
        });
        // Ensure the top-level id itself is included
        return Array.from(new Set<string>([...keepWithinThisTop, itemId]));
      } else {
        // Child or deeper item under some top-level
        const currentItem = findNavigationItem(itemId, navigationItems);
        if (prev.includes(itemId)) {
          // Collapse this item and all its descendants only
          const toRemove = new Set<string>([itemId, ...getDescendantIds(currentItem || undefined)]);
          return prev.filter((id) => !toRemove.has(id));
        }
        // Expand this item while keeping only ids under the same top-level section
        const keepWithinSameTop = prev.filter((id) => {
          const p = findPathToItem(navigationItems, id);
          return p && p[0] === topLevelId;
        });
        // Make sure the top-level is expanded and include this item
        return Array.from(new Set<string>([...keepWithinSameTop, topLevelId, itemId]));
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
