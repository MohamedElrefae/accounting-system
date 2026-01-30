# Scoped Roles - Phase 5: Frontend Implementation (Part 1)

**Date:** January 26, 2026  
**Status:** IMPLEMENTATION GUIDE  
**Focus:** Update useOptimizedAuth hook and permission functions

---

## 🎯 Phase 5 Overview

### What Needs to Be Done
1. Update `useOptimizedAuth` hook to load scoped roles
2. Add new permission checking functions
3. Create UI components for role assignment
4. Update existing components to use scoped permissions
5. Test thoroughly

### Files to Update
- `src/hooks/useOptimizedAuth.ts` - Main auth hook
- `src/services/scopedRolesService.ts` - NEW service for role management
- `src/components/admin/ScopedRoleAssignment.tsx` - NEW component for UI
- `src/pages/admin/EnterpriseUserManagement.tsx` - Update to use new roles

---

## 📝 Step 1: Update useOptimizedAuth Hook

### Current State
```typescript
// OLD: Global roles only
interface OptimizedAuthState {
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
}
```

### New State
```typescript
// NEW: Scoped roles
interface OptimizedAuthState {
  // Existing
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[]; // Keep for compatibility
  resolvedPermissions: ResolvedRole | null;
  
  // NEW: Scoped roles
  systemRoles: string[]; // ['super_admin', 'system_auditor']
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
  
  // NEW: Scope data
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
}

interface OrgRole {
  org_id: string;
  role: string; // 'org_admin', 'org_manager', etc.
  can_access_all_projects: boolean;
  org_name?: string;
  org_name_ar?: string;
}

interface ProjectRole {
  project_id: string;
  role: string; // 'project_manager', 'project_contributor', etc.
  project_name?: string;
  project_name_ar?: string;
  org_id: string;
}
```

### Implementation

```typescript
// src/hooks/useOptimizedAuth.ts

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@supabase/auth-helpers-react';
import { supabase } from '@/lib/supabase';

interface OrgRole {
  org_id: string;
  role: string;
  can_access_all_projects: boolean;
  org_name?: string;
  org_name_ar?: string;
}

interface ProjectRole {
  project_id: string;
  role: string;
  project_name?: string;
  project_name_ar?: string;
  org_id: string;
}

interface OptimizedAuthState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  
  // Legacy
  roles: string[];
  resolvedPermissions: any | null;
  
  // NEW: Scoped roles
  systemRoles: string[];
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
  
  // NEW: Scope data
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
}

const initialState: OptimizedAuthState = {
  user: null,
  profile: null,
  loading: true,
  roles: [],
  resolvedPermissions: null,
  systemRoles: [],
  orgRoles: [],
  projectRoles: [],
  userOrganizations: [],
  userProjects: [],
  defaultOrgId: null,
};

export const useOptimizedAuth = () => {
  const { user } = useAuth();
  const authState = useRef<OptimizedAuthState>(initialState);
  const [state, setState] = useCallback(
    (newState: Partial<OptimizedAuthState>) => {
      authState.current = { ...authState.current, ...newState };
      return authState.current;
    },
    []
  );

  // Load auth data on mount or user change
  useEffect(() => {
    if (!user?.id) {
      setState({ loading: false });
      return;
    }

    loadAuthData(user.id);
  }, [user?.id]);

  const loadAuthData = async (userId: string) => {
    try {
      setState({ loading: true });

      // Call RPC function to get scoped roles
      const { data: authData, error } = await supabase.rpc(
        'get_user_auth_data',
        { p_user_id: userId }
      );

      if (error) throw error;

      if (authData) {
        setState({
          profile: authData.profile,
          systemRoles: authData.system_roles || [],
          orgRoles: authData.org_roles || [],
          projectRoles: authData.project_roles || [],
          userOrganizations: authData.organizations || [],
          userProjects: authData.projects || [],
          defaultOrgId: authData.default_org,
          roles: authData.roles || [], // Legacy
          resolvedPermissions: flattenPermissions(authData.roles || []),
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
      setState({ loading: false });
    }
  };

  // NEW: Check if user has role in org
  const hasRoleInOrg = useCallback(
    (orgId: string, role: string): boolean => {
      if (authState.current.systemRoles.includes('super_admin')) return true;
      return authState.current.orgRoles.some(
        (r) => r.org_id === orgId && r.role === role
      );
    },
    []
  );

  // NEW: Check if user has role in project
  const hasRoleInProject = useCallback(
    (projectId: string, role: string): boolean => {
      if (authState.current.systemRoles.includes('super_admin')) return true;
      return authState.current.projectRoles.some(
        (r) => r.project_id === projectId && r.role === role
      );
    },
    []
  );

  // NEW: Check if user can perform action in org
  const canPerformActionInOrg = useCallback(
    (
      orgId: string,
      action: 'manage_users' | 'manage_projects' | 'manage_transactions' | 'view'
    ): boolean => {
      if (authState.current.systemRoles.includes('super_admin')) return true;

      const userRoles = authState.current.orgRoles
        .filter((r) => r.org_id === orgId)
        .map((r) => r.role);

      // Check permissions based on role
      if (userRoles.includes('org_admin')) return true;
      if (
        userRoles.includes('org_manager') &&
        ['manage_users', 'manage_projects', 'view'].includes(action)
      )
        return true;
      if (
        userRoles.includes('org_accountant') &&
        ['manage_transactions', 'view'].includes(action)
      )
        return true;
      if (
        ['org_auditor', 'org_viewer'].some((r) => userRoles.includes(r)) &&
        action === 'view'
      )
        return true;

      return false;
    },
    []
  );

  // NEW: Check if user can perform action in project
  const canPerformActionInProject = useCallback(
    (
      projectId: string,
      action: 'manage' | 'create' | 'edit' | 'view'
    ): boolean => {
      if (authState.current.systemRoles.includes('super_admin')) return true;

      // Check project-level roles
      const projectRole = authState.current.projectRoles.find(
        (r) => r.project_id === projectId
      );

      if (projectRole) {
        if (projectRole.role === 'project_manager') return true;
        if (
          projectRole.role === 'project_contributor' &&
          ['create', 'edit', 'view'].includes(action)
        )
          return true;
        if (projectRole.role === 'project_viewer' && action === 'view')
          return true;
      }

      // Check org-level access
      const project = authState.current.projectRoles.find(
        (r) => r.project_id === projectId
      );
      if (project) {
        return canPerformActionInOrg(project.org_id, 'manage_projects');
      }

      return false;
    },
    []
  );

  // NEW: Get user's roles in org
  const getUserRolesInOrg = useCallback((orgId: string): string[] => {
    return authState.current.orgRoles
      .filter((r) => r.org_id === orgId)
      .map((r) => r.role);
  }, []);

  // NEW: Get user's roles in project
  const getUserRolesInProject = useCallback((projectId: string): string[] => {
    return authState.current.projectRoles
      .filter((r) => r.project_id === projectId)
      .map((r) => r.role);
  }, []);

  return {
    // Existing
    user: authState.current.user,
    profile: authState.current.profile,
    loading: authState.current.loading,
    roles: authState.current.roles,
    resolvedPermissions: authState.current.resolvedPermissions,

    // NEW: Scoped roles
    systemRoles: authState.current.systemRoles,
    orgRoles: authState.current.orgRoles,
    projectRoles: authState.current.projectRoles,

    // NEW: Scope data
    userOrganizations: authState.current.userOrganizations,
    userProjects: authState.current.userProjects,
    defaultOrgId: authState.current.defaultOrgId,

    // NEW: Permission functions
    hasRoleInOrg,
    hasRoleInProject,
    canPerformActionInOrg,
    canPerformActionInProject,
    getUserRolesInOrg,
    getUserRolesInProject,

    // Existing functions
    refreshProfile: () => loadAuthData(user?.id || ''),
  };
};

// Helper function to flatten permissions (legacy)
function flattenPermissions(roles: string[]): any {
  // Keep existing implementation
  return null;
}
```

---

## 🔧 Step 2: Create Scoped Roles Service

### New Service File

```typescript
// src/services/scopedRolesService.ts

import { supabase } from '@/lib/supabase';

export interface OrgRoleAssignment {
  user_id: string;
  org_id: string;
  role: 'org_admin' | 'org_manager' | 'org_accountant' | 'org_auditor' | 'org_viewer';
  can_access_all_projects?: boolean;
}

export interface ProjectRoleAssignment {
  user_id: string;
  project_id: string;
  role: 'project_manager' | 'project_contributor' | 'project_viewer';
}

export interface SystemRoleAssignment {
  user_id: string;
  role: 'super_admin' | 'system_auditor';
}

export const scopedRolesService = {
  // ===== ORG ROLES =====

  // Assign role to user in org
  async assignOrgRole(assignment: OrgRoleAssignment) {
    const { data, error } = await supabase
      .from('org_roles')
      .insert([
        {
          user_id: assignment.user_id,
          org_id: assignment.org_id,
          role: assignment.role,
          can_access_all_projects: assignment.can_access_all_projects || false,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select();

    if (error) throw error;
    return data;
  },

  // Update org role
  async updateOrgRole(
    userId: string,
    orgId: string,
    role: string,
    canAccessAllProjects?: boolean
  ) {
    const { data, error } = await supabase
      .from('org_roles')
      .update({
        role,
        can_access_all_projects: canAccessAllProjects,
      })
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .select();

    if (error) throw error;
    return data;
  },

  // Remove org role
  async removeOrgRole(userId: string, orgId: string) {
    const { error } = await supabase
      .from('org_roles')
      .delete()
      .eq('user_id', userId)
      .eq('org_id', orgId);

    if (error) throw error;
  },

  // Get org roles
  async getOrgRoles(orgId: string) {
    const { data, error } = await supabase
      .from('org_roles')
      .select('*, user_profiles(id, email, name)')
      .eq('org_id', orgId);

    if (error) throw error;
    return data;
  },

  // ===== PROJECT ROLES =====

  // Assign role to user in project
  async assignProjectRole(assignment: ProjectRoleAssignment) {
    const { data, error } = await supabase
      .from('project_roles')
      .insert([
        {
          user_id: assignment.user_id,
          project_id: assignment.project_id,
          role: assignment.role,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select();

    if (error) throw error;
    return data;
  },

  // Update project role
  async updateProjectRole(userId: string, projectId: string, role: string) {
    const { data, error } = await supabase
      .from('project_roles')
      .update({ role })
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .select();

    if (error) throw error;
    return data;
  },

  // Remove project role
  async removeProjectRole(userId: string, projectId: string) {
    const { error } = await supabase
      .from('project_roles')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) throw error;
  },

  // Get project roles
  async getProjectRoles(projectId: string) {
    const { data, error } = await supabase
      .from('project_roles')
      .select('*, user_profiles(id, email, name)')
      .eq('project_id', projectId);

    if (error) throw error;
    return data;
  },

  // ===== SYSTEM ROLES =====

  // Assign system role
  async assignSystemRole(assignment: SystemRoleAssignment) {
    const { data, error } = await supabase
      .from('system_roles')
      .insert([
        {
          user_id: assignment.user_id,
          role: assignment.role,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ])
      .select();

    if (error) throw error;
    return data;
  },

  // Remove system role
  async removeSystemRole(userId: string, role: string) {
    const { error } = await supabase
      .from('system_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;
  },

  // Get system roles
  async getSystemRoles() {
    const { data, error } = await supabase
      .from('system_roles')
      .select('*, user_profiles(id, email, name)');

    if (error) throw error;
    return data;
  },
};
```

---

## 📊 Role Definitions

### Org Roles
```typescript
const ORG_ROLES = {
  org_admin: {
    label: 'Organization Admin',
    label_ar: 'مسؤول المنظمة',
    description: 'Full control in organization',
    permissions: ['manage_users', 'manage_projects', 'manage_transactions', 'view'],
  },
  org_manager: {
    label: 'Organization Manager',
    label_ar: 'مدير المنظمة',
    description: 'Manage users and projects',
    permissions: ['manage_users', 'manage_projects', 'view'],
  },
  org_accountant: {
    label: 'Accountant',
    label_ar: 'محاسب',
    description: 'Manage transactions',
    permissions: ['manage_transactions', 'view'],
  },
  org_auditor: {
    label: 'Auditor',
    label_ar: 'مدقق',
    description: 'Read-only audit access',
    permissions: ['view'],
  },
  org_viewer: {
    label: 'Viewer',
    label_ar: 'عارض',
    description: 'Read-only access',
    permissions: ['view'],
  },
};
```

### Project Roles
```typescript
const PROJECT_ROLES = {
  project_manager: {
    label: 'Project Manager',
    label_ar: 'مدير المشروع',
    description: 'Full control in project',
    permissions: ['manage', 'create', 'edit', 'view'],
  },
  project_contributor: {
    label: 'Contributor',
    label_ar: 'مساهم',
    description: 'Can create and edit',
    permissions: ['create', 'edit', 'view'],
  },
  project_viewer: {
    label: 'Viewer',
    label_ar: 'عارض',
    description: 'Read-only access',
    permissions: ['view'],
  },
};
```

---

## ✅ Next: Part 2 - UI Components

See `SCOPED_ROLES_PHASE_5_FRONTEND_PART2.md` for:
- ScopedRoleAssignment component
- How to assign users to orgs and projects
- UI for managing roles
- Integration with existing components

