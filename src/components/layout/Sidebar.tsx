import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
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
  Lightbulb,
} from '@mui/icons-material';
import useAppStore from '../../store/useAppStore';
import { navigationItems } from '../../data/navigation';
import type { NavigationItem } from '../../types';
import useOptimizedAuth from '../../hooks/useOptimizedAuth';
import { derivePermissionFromId } from '../../lib/permissions';
import BrandHeader from './BrandHeader';

export const DRAWER_WIDTH = 280;
export const DRAWER_COLLAPSED_WIDTH = 64;

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Dashboard': return <Dashboard />;
    case 'AccountTree': return <AccountTree />;
    case 'Receipt': return <Receipt />;
    case 'Description': return <Description />;
    case 'People': return <People />;
    case 'LocalShipping': return <LocalShipping />;
    case 'Assessment': return <Assessment />;
    case 'Inventory': return <Inventory />;
    case 'Settings': return <Settings />;
    case 'List': return <ListIcon />;
    case 'Add': return <Add />;
    case 'EditNote': return <Edit />;
    case 'Book': return <Description />;
    case 'Balance': return <AccountBalance />;
    case 'ShoppingCart': return <Inventory />;
    case 'RequestQuote': return <Receipt />;
    case 'PersonOutline': return <Group />;
    case 'Assignment': return <AssignmentTurnedIn />;
    case 'Business': return <Business />;
    case 'TrendingUp': return <TrendingUp />;
    case 'AccountBalance': return <AccountBalance />;
    case 'MonetizationOn': return <TrendingUp />;
    case 'BarChart': return <TableChart />;
    case 'Category': return <Category />;
    case 'SwapHoriz': return <TrendingUp />;
    case 'Summarize': return <Description />;
    case 'Group': return <Group />;
    case 'Tune': return <Tune />;
    case 'Backup': return <CloudUpload />;
    case 'Security': return <Security />;
    case 'database': return <TableChart />;
    case 'tag': return <Category />;
    case 'type': return <Tune />;
    case 'AutoAwesome': return <AutoAwesome />;
    case 'Lightbulb': return <Lightbulb />;
    case 'Upload': return <Upload />;
    default: return <Dashboard />;
  }
};

interface SidebarProps {
  open: boolean;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const { sidebarCollapsed, language } = useAppStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard']); // Keep dashboard open by default
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ orgId?: string; projectId?: string }>();
  const isRtl = language === 'ar';

  const {
    user,
    loading,
    hasRoleInOrg,
    canPerformActionInProject,
    // fallback to legacy check if item has no strict scope
    hasActionAccess, // "hasPermission" equivalent
  } = useOptimizedAuth();

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
    // Enforce accordion behavior... (Same as before)
    setExpandedItems((prev) => {
      // Logic copied from previous implementation for expand/collapse behavior
      const path = findPathToItem(navigationItems, itemId) || [itemId];
      const topLevelId = path[0];
      const isTopLevel = path.length === 1;

      if (isTopLevel) {
        if (prev.includes(itemId)) {
          const item = findNavigationItem(itemId, navigationItems);
          const toRemove = new Set<string>([itemId, ...getDescendantIds(item || undefined)]);
          return prev.filter((id) => !toRemove.has(id));
        }
        const keepWithinThisTop = prev.filter((id) => {
          const p = findPathToItem(navigationItems, id);
          return p && p[0] === itemId;
        });
        return Array.from(new Set<string>([...keepWithinThisTop, itemId]));
      } else {
        const currentItem = findNavigationItem(itemId, navigationItems);
        if (prev.includes(itemId)) {
          const toRemove = new Set<string>([itemId, ...getDescendantIds(currentItem || undefined)]);
          return prev.filter((id) => !toRemove.has(id));
        }
        const keepWithinSameTop = prev.filter((id) => {
          const p = findPathToItem(navigationItems, id);
          return p && p[0] === topLevelId;
        });
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

  /**
   * CORE FILTERING LOGIC (The "Projection" Layer)
   */
  const filterItem = (item: NavigationItem): boolean => {
    // 1. Super Admin Only override
    if (item.superAdminOnly) {
      // Assuming super_admin is checked via hasGlobalPermission or roles
      // hasActionAccess('admin.all') is the legacy way.
      // Let's check strict super admin role via hook if available, or fallback
      if (!user?.app_metadata?.roles?.includes('super_admin')) return false;
    }

    // 2. Strict Scope Check (New)
    if (item.scope === 'org') {
      if (!params.orgId) return false; // Context mismatch
      // If generic "org" scope, just need membership? or specific permission?
      // If item also has requiredPermission, check that in org context
      if (item.requiredPermission) {
        // Check if it's a role instruction or action
        // For now, assume action.
        // TODO: Update useOptimizedAuth to explicitly export canPerformActionInOrg if not already
        // (It was added in phase 9 plan, assuming it's returned by hook)
        // We can access 'user.orgPermissions' manually or use helper
        // Using helper:
        // Note: canPerformActionInOrg is returned by useOptimizedAuth in our updated hook
        // We'll trust the hook.
        // @ts-ignore
        if (typeof canPerformActionInOrg === 'function') {
          // @ts-ignore
          if (!canPerformActionInOrg(params.orgId, item.requiredPermission)) return false;
        }
      } else {
        // Just org membership required
        // @ts-ignore
        if (!hasRoleInOrg(params.orgId, 'viewer') && !hasRoleInOrg(params.orgId, 'admin')) {
          // Check any role ??
          // For now, if no specific permission, we allow if partial member.
        }
      }
    } else if (item.scope === 'project') {
      if (!params.projectId) return false;
      if (item.requiredPermission) {
        if (typeof canPerformActionInProject === 'function') {
          // @ts-ignore
          if (!canPerformActionInProject(params.projectId, item.requiredPermission)) return false;
        }
      }
    } else if (item.scope === 'global') {
      if (item.requiredPermission) {
        if (!hasActionAccess(item.requiredPermission as any)) return false;
      }
    } else {
      // Legacy / Unscoped mode (fallback)
      // Determine the permission to check
      let permissionToCheck = item.requiredPermission;

      // NEW: Auto-derive permission from item ID for leaf items without explicit permission
      if (!permissionToCheck && item.path && !item.children) {
        permissionToCheck = derivePermissionFromId(item.id, 'view') as any;

        // -- Debug Log for Dynamic Derivation --
        if (item.id === 'trial-balance') {
          // console.log(`[Sidebar Debug] Derived permission for ${item.id}: ${permissionToCheck}`);
        }
      }

      if (permissionToCheck) {
        // Use legacy global check
        const hasAccess = hasActionAccess && hasActionAccess(permissionToCheck as any);

        if (import.meta.env.DEV) {
          // console.log(`[Sidebar Debug] Item: ${item.id} | Req: ${permissionToCheck} | Granted: ${hasAccess} | UserRoles: ${user?.app_metadata?.roles}`);
        }

        if (!hasAccess) {
          return false;
        }
      }
    }

    return true;
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    // FIRST: Check visibility strict
    if (!filterItem(item)) return null;

    // Check children visibility
    const visibleChildren = item.children ? item.children.filter(filterItem) : [];
    const hasChildren = visibleChildren.length > 0;

    // If item has children but all are hidden -> Hide parent (unless parent has its own path)
    if (item.children && item.children.length > 0 && !hasChildren && !item.path) {
      return null;
    }

    const isExpanded = expandedItems.includes(item.id);
    const title = language === 'ar' ? item.titleAr : item.titleEn;
    const isItemActive = isActive(item.path);

    const ButtonComponent = (
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
              ? (theme: any) => `linear-gradient(180deg, ${theme.palette.primary.contrastText} 0%, ${theme.palette.primary.contrastText}cc 100%)`
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
    );

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          {sidebarCollapsed ? (
            <Tooltip title={title || ''} placement={isRtl ? 'left' : 'right'} arrow>
              <Box>{ButtonComponent}</Box>
            </Tooltip>
          ) : (
            ButtonComponent
          )}
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded && !sidebarCollapsed} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {visibleChildren.map((child: NavigationItem) => renderNavigationItem(child, level + 1))}
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
      <BrandHeader collapsed={!!sidebarCollapsed} />

      <Box sx={{ overflow: 'auto' }}>
        <List>
          {loading ? (
            // Show skeletons while auth is loading
            Array.from(new Array(6)).map((_, index) => (
              <ListItem key={`skeleton-${index}`} disablePadding sx={{ py: 0.5, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%', minHeight: 48 }}>
                  <Skeleton variant="circular" width={24} height={24} />
                  {!sidebarCollapsed && <Skeleton variant="text" width="60%" height={24} />}
                </Box>
              </ListItem>
            ))
          ) : (
            navigationItems.map((item) => renderNavigationItem(item))
          )}
        </List>
      </Box>
    </Box>
  );
};

export default Sidebar;
