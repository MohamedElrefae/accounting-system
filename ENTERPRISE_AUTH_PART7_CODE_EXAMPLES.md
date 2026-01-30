# Part 7: Complete Code Examples

## Example 1: Enhanced useOptimizedAuth Hook

```typescript
// File: src/hooks/useOptimizedAuth.ts

interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // Scope-aware fields
  userOrganizations: string[];
  userProjects: string[];
  orgRoles: Map<string, RoleSlug[]>;
  orgPermissions: Map<string, Set<PermissionCode>>;
}

// Initialize with scope fields
let authState: OptimizedAuthState = {
  user: null,
  profile: null,
  loading: true,
  roles: [],
  resolvedPermissions: null,
  userOrganizations: [],
  userProjects: [],
  orgRoles: new Map(),
  orgPermissions: new Map(),
};

// Enhanced loadAuthData function
const loadAuthData = async (userId: string) => {
  try {
    // Call enhanced RPC with scope data
    const { data: authData, error: rpcError } = await supabase.rpc(
      'get_user_auth_data_with_scope',
      { p_user_id: userId }
    );
    
    if (!rpcError && authData) {
      // Process profile (existing)
      if (authData.profile) {
        authState.profile = authData.profile as Profile;
      }
      
      // Process roles (existing)
      const roleNames = authData.roles || [];
      const roleMapping: { [key: string]: RoleSlug } = {
        'super_admin': 'super_admin',
        'admin': 'admin',
        'manager': 'manager',
        'accountant': 'accountant',
        'auditor': 'auditor',
        'viewer': 'viewer',
      };
      
      const extractedRoles: RoleSlug[] = (roleNames as string[])
        .map((name: string) => roleMapping[name.toLowerCase().replace(/\s+/g, '_')])
        .filter((r): r is RoleSlug => r !== undefined);
      
      const isProfileSuperAdmin = authState.profile?.is_super_admin === true;
      const finalRoles = isProfileSuperAdmin || extractedRoles.length === 0 
        ? ['super_admin'] 
        : extractedRoles;
      
      authState.roles = finalRoles;
      authState.resolvedPermissions = flattenPermissions(finalRoles);
      
      // NEW: Process scope data
      authState.userOrganizations = authData.organizations || [];
      authState.userProjects = authData.projects || [];
      
      // NEW: Process org-specific roles and permissions
      authState.orgRoles = new Map();
      authState.orgPermissions = new Map();
      
      if (authData.org_roles) {
        Object.entries(authData.org_roles).forEach(([orgId, roles]) => {
          const orgRolesList = roles as RoleSlug[];
          authState.orgRoles.set(orgId, orgRolesList);
          
          // Calculate permissions for this org
          const orgPerms = flattenPermissions(orgRolesList);
          authState.orgPermissions.set(orgId, orgPerms.actions);
        });
      }
      
      // Cache and notify
      setCachedAuthData(userId, authState.profile, finalRoles);
      clearCaches();
      notifyListeners();
      return;
    }
    
    // Fallback logic if RPC fails
    console.warn('[Auth] RPC failed, falling back to separate queries');
    // ... existing fallback code ...
    
  } catch (error) {
    console.error('Failed to load auth data:', error);
    // ... existing error handling ...
  }
};

// NEW: Scope-aware permission checks
const belongsToOrg = (orgId: string): boolean => {
  return authState.userOrganizations.includes(orgId);
};

const canAccessProject = (projectId: string): boolean => {
  return authState.userProjects.includes(projectId);
};

const hasActionAccessInOrg = (
  action: PermissionCode,
  orgId: string
): boolean => {
  // Super admin override
  if (authState.roles.includes('super_admin') || authState.profile?.is_super_admin) {
    return true;
  }
  
  // Check org membership
  if (!belongsToOrg(orgId)) {
    return false;
  }
  
  // Check org-specific permissions
  const orgPerms = authState.orgPermissions.get(orgId);
  return orgPerms?.has(action) || false;
};

const getRolesInOrg = (orgId: string): RoleSlug[] => {
  return authState.orgRoles.get(orgId) || [];
};

// Enhanced hook export
export const useOptimizedAuth = () => {
  const [state, setState] = useState<OptimizedAuthState>(authState);
  
  useEffect(() => {
    initializeAuth();
    
    const listener = (newState: OptimizedAuthState) => {
      setState(newState);
    };
    
    authListeners.add(listener);
    return () => {
      authListeners.delete(listener);
    };
  }, []);
  
  return {
    // Existing exports
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    roles: state.roles,
    hasRouteAccess,
    hasActionAccess,
    signIn,
    signOut,
    signUp,
    
    // NEW: Scope-aware exports
    userOrganizations: state.userOrganizations,
    userProjects: state.userProjects,
    belongsToOrg,
    canAccessProject,
    hasActionAccessInOrg,
    getRolesInOrg,
  };
};
```

---

## Example 2: Enhanced ScopeContext Provider

```typescript
// File: src/contexts/ScopeContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useOptimizedAuth } from '../hooks/useOptimizedAuth';
import type { Organization } from '../services/organization';
import type { Project } from '../services/projects';

export interface ScopeContextValue {
  // Current selections
  currentOrg: Organization | null;
  currentProject: Project | null;
  
  // Available options (filtered by user access)
  availableOrgs: Organization[];
  availableProjects: Project[];
  
  // Loading states
  isLoadingOrgs: boolean;
  isLoadingProjects: boolean;
  
  // Error handling
  error: string | null;
  
  // Actions
  setOrganization: (orgId: string | null) => Promise<void>;
  setProject: (projectId: string | null) => Promise<void>;
  clearScope: () => void;
  refreshScope: () => Promise<void>;
  
  // Validation helpers
  canAccessOrg: (orgId: string) => boolean;
  canAccessProject: (projectId: string) => boolean;
}

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

export const ScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userOrganizations, userProjects, belongsToOrg, canAccessProject: authCanAccessProject } = useOptimizedAuth();
  
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load organizations user can access
  const loadAvailableOrgs = useCallback(async () => {
    if (!user || userOrganizations.length === 0) {
      setAvailableOrgs([]);
      return;
    }
    
    setIsLoadingOrgs(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', userOrganizations)
        .order('name');
      
      if (fetchError) throw fetchError;
      
      setAvailableOrgs(data || []);
      
      // Auto-select primary org if none selected
      if (!currentOrg && data && data.length > 0) {
        const primaryOrg = data.find(org => 
          // Check if this is user's primary org
          userOrganizations[0] === org.id
        ) || data[0];
        
        await setOrganization(primaryOrg.id);
      }
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
      setError(err.message);
    } finally {
      setIsLoadingOrgs(false);
    }
  }, [user, userOrganizations, currentOrg]);
  
  // Load projects user can access in current org
  const loadAvailableProjects = useCallback(async () => {
    if (!currentOrg || userProjects.length === 0) {
      setAvailableProjects([]);
      return;
    }
    
    setIsLoadingProjects(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .in('id', userProjects)
        .order('name');
      
      if (fetchError) throw fetchError;
      
      setAvailableProjects(data || []);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setError(err.message);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [currentOrg, userProjects]);
  
  // Set organization with validation
  const setOrganization = useCallback(async (orgId: string | null) => {
    if (orgId) {
      // Validate user belongs to this org
      if (!belongsToOrg(orgId)) {
        setError('You do not have access to this organization');
        throw new Error('You do not have access to this organization');
      }
      
      // Load org details
      const { data: org, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      if (fetchError) {
        setError(fetchError.message);
        throw fetchError;
      }
      
      setCurrentOrg(org);
      setError(null);
    } else {
      setCurrentOrg(null);
    }
    
    // Clear project when org changes
    setCurrentProject(null);
    
    // Reload available projects for new org
    if (orgId) {
      await loadAvailableProjects();
    }
  }, [belongsToOrg, loadAvailableProjects]);
  
  // Set project with validation
  const setProject = useCallback(async (projectId: string | null) => {
    if (projectId) {
      // Validate user can access this project
      if (!authCanAccessProject(projectId)) {
        setError('You do not have access to this project');
        throw new Error('You do not have access to this project');
      }
      
      // Load project details
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (fetchError) {
        setError(fetchError.message);
        throw fetchError;
      }
      
      // Validate project belongs to current org
      if (currentOrg && project.organization_id !== currentOrg.id) {
        setError('Project does not belong to current organization');
        throw new Error('Project does not belong to current organization');
      }
      
      setCurrentProject(project);
      setError(null);
    } else {
      setCurrentProject(null);
    }
  }, [currentOrg, authCanAccessProject]);
  
  // Clear all scope
  const clearScope = useCallback(() => {
    setCurrentOrg(null);
    setCurrentProject(null);
    setError(null);
  }, []);
  
  // Refresh scope data
  const refreshScope = useCallback(async () => {
    await loadAvailableOrgs();
    if (currentOrg) {
      await loadAvailableProjects();
    }
  }, [loadAvailableOrgs, loadAvailableProjects, currentOrg]);
  
  // Load orgs on mount and when user changes
  useEffect(() => {
    if (user) {
      loadAvailableOrgs();
    } else {
      clearScope();
    }
  }, [user, loadAvailableOrgs, clearScope]);
  
  // Load projects when org changes
  useEffect(() => {
    if (currentOrg) {
      loadAvailableProjects();
    }
  }, [currentOrg, loadAvailableProjects]);
  
  const value: ScopeContextValue = {
    currentOrg,
    currentProject,
    availableOrgs,
    availableProjects,
    isLoadingOrgs,
    isLoadingProjects,
    error,
    setOrganization,
    setProject,
    clearScope,
    refreshScope,
    canAccessOrg: belongsToOrg,
    canAccessProject: authCanAccessProject,
  };
  
  return (
    <ScopeContext.Provider value={value}>
      {children}
    </ScopeContext.Provider>
  );
};

export const useScope = (): ScopeContextValue => {
  const context = useContext(ScopeContext);
  if (!context) {
    throw new Error('useScope must be used within ScopeProvider');
  }
  return context;
};
```

---

## Example 3: Enhanced OptimizedProtectedRoute

```typescript
// File: src/components/routing/OptimizedProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useOptimizedAuth } from '../../hooks/useOptimizedAuth';
import { useScope } from '../../contexts/ScopeContext';
import type { PermissionCode } from '../../lib/permissions';

interface OptimizedProtectedRouteProps {
  children: React.ReactNode;
  requiredAction?: PermissionCode;
  requiresOrgAccess?: boolean;
  requiresProjectAccess?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const MinimalLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    fontSize: '14px',
    color: '#666'
  }}>
    Loading...
  </div>
);

const OptimizedProtectedRoute: React.FC<OptimizedProtectedRouteProps> = ({
  children,
  requiredAction,
  requiresOrgAccess = false,
  requiresProjectAccess = false,
  fallback,
  redirectTo,
}) => {
  const {
    user,
    loading,
    hasRouteAccess,
    hasActionAccess,
    belongsToOrg,
    hasActionAccessInOrg,
  } = useOptimizedAuth();
  
  const {
    currentOrg,
    currentProject,
    canAccessProject,
    isLoadingOrgs,
  } = useScope();
  
  const location = useLocation();
  const params = useParams();
  
  // Extract org/project IDs from route params
  const routeOrgId = params.orgId || params.organizationId;
  const routeProjectId = params.projectId;
  
  if (import.meta.env.DEV) {
    console.log('[OptimizedProtectedRoute] render', {
      pathname: location.pathname,
      loading,
      hasUser: !!user,
      requiresOrgAccess,
      currentOrg: currentOrg?.id,
      routeOrgId,
    });
  }
  
  // Fast loading check
  if (loading || isLoadingOrgs) {
    return <MinimalLoader />;
  }
  
  // Fast auth check
  if (!user) {
    if (import.meta.env.DEV) {
      console.log('[OptimizedProtectedRoute] no user, redirecting to /login');
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // NEW: Validate route params match user's scope
  if (routeOrgId) {
    if (!belongsToOrg(routeOrgId)) {
      console.warn('[OptimizedProtectedRoute] User does not belong to org:', routeOrgId);
      return <Navigate 
        to="/unauthorized" 
        state={{ 
          from: location,
          reason: 'org_access_denied',
          orgId: routeOrgId 
        }} 
        replace 
      />;
    }
  }
  
  if (routeProjectId) {
    if (!canAccessProject(routeProjectId)) {
      console.warn('[OptimizedProtectedRoute] User cannot access project:', routeProjectId);
      return <Navigate 
        to="/unauthorized" 
        state={{ 
          from: location,
          reason: 'project_access_denied',
          projectId: routeProjectId 
        }} 
        replace 
      />;
    }
  }
  
  // NEW: Require org selection for org-scoped routes
  if (requiresOrgAccess && !currentOrg) {
    return <Navigate 
      to="/select-organization" 
      state={{ from: location }} 
      replace 
    />;
  }
  
  // NEW: Require project selection for project-scoped routes
  if (requiresProjectAccess && !currentProject) {
    return <Navigate 
      to="/select-project" 
      state={{ from: location }} 
      replace 
    />;
  }
  
  // Existing permission checks
  const pathname = location.pathname;
  const routeAllowed = hasRouteAccess(pathname);
  
  // NEW: Use org-scoped permission check if org is selected
  let actionAllowed = true;
  if (requiredAction) {
    if (currentOrg) {
      actionAllowed = hasActionAccessInOrg(requiredAction, currentOrg.id);
    } else {
      actionAllowed = hasActionAccess(requiredAction);
    }
  }
  
  if (import.meta.env.DEV) {
    console.log('[OptimizedProtectedRoute] permissions check', {
      pathname,
      routeAllowed,
      actionAllowed,
      requiredAction: requiredAction ?? null,
      currentOrg: currentOrg?.id,
    });
  }
  
  if (!routeAllowed || !actionAllowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo ?? '/unauthorized'} state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};

export default OptimizedProtectedRoute;
```

---

## Example 4: Filtered Navigation Component

```typescript
// File: src/components/layout/FilteredNavigation.tsx

import React, { useMemo } from 'react';
import { useOptimizedAuth } from '../../hooks/useOptimizedAuth';
import { useScope } from '../../contexts/ScopeContext';
import { navigationItems } from '../../data/navigation';
import type { NavigationItem } from '../../types';

export const FilteredNavigation: React.FC = () => {
  const { hasActionAccess, hasActionAccessInOrg, roles } = useOptimizedAuth();
  const { currentOrg } = useScope();
  
  const visibleItems = useMemo(() => {
    const filterItem = (item: NavigationItem): NavigationItem | null => {
      // Super admin sees everything
      if (roles.includes('super_admin')) {
        return item;
      }
      
      // Check permission requirement
      if (item.requiredPermission) {
        const hasPermission = currentOrg
          ? hasActionAccessInOrg(item.requiredPermission, currentOrg.id)
          : hasActionAccess(item.requiredPermission);
        
        if (!hasPermission) {
          return null;
        }
      }
      
      // Check super admin only flag
      if (item.superAdminOnly && !roles.includes('super_admin')) {
        return null;
      }
      
      // Recursively filter children
      if (item.children) {
        const filteredChildren = item.children
          .map(filterItem)
          .filter((child): child is NavigationItem => child !== null);
        
        // Hide parent if no children visible
        if (filteredChildren.length === 0) {
          return null;
        }
        
        return {
          ...item,
          children: filteredChildren,
        };
      }
      
      return item;
    };
    
    return navigationItems
      .map(filterItem)
      .filter((item): item is NavigationItem => item !== null);
  }, [navigationItems, hasActionAccess, hasActionAccessInOrg, currentOrg, roles]);
  
  return (
    <NavigationMenu items={visibleItems} />
  );
};
```

---

## Example 5: Organization Selector with Validation

```typescript
// File: src/components/Scope/ScopedOrgSelector.tsx

import React from 'react';
import { Select, MenuItem, FormControl, InputLabel, Alert } from '@mui/material';
import { useScope } from '../../contexts/ScopeContext';

export const ScopedOrgSelector: React.FC = () => {
  const {
    currentOrg,
    availableOrgs,
    isLoadingOrgs,
    error,
    setOrganization,
  } = useScope();
  
  const handleChange = async (event: React.ChangeEvent<{ value: unknown }>) => {
    const orgId = event.target.value as string;
    
    try {
      await setOrganization(orgId);
    } catch (err: any) {
      console.error('Failed to set organization:', err);
      // Error is already set in context
    }
  };
  
  if (isLoadingOrgs) {
    return <div>Loading organizations...</div>;
  }
  
  if (availableOrgs.length === 0) {
    return (
      <Alert severity="warning">
        You are not assigned to any organizations. Please contact your administrator.
      </Alert>
    );
  }
  
  return (
    <FormControl fullWidth>
      <InputLabel>Organization</InputLabel>
      <Select
        value={currentOrg?.id || ''}
        onChange={handleChange}
        label="Organization"
        error={!!error}
      >
        {availableOrgs.map((org) => (
          <MenuItem key={org.id} value={org.id}>
            {org.name}
          </MenuItem>
        ))}
      </Select>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </FormControl>
  );
};
```

