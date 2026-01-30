# Part 5: Enterprise Solution Architecture

## Overview: Scope-Aware Auth System

```
┌─────────────────────────────────────────────────────────────┐
│                    USER AUTHENTICATION                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │→ │ Profile  │→ │  Roles   │→ │  Scope   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   SCOPE CONTEXT (Enhanced)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Current Org: org-123                                 │  │
│  │  User's Orgs: [org-123, org-456]                     │  │
│  │  User's Projects: [proj-1, proj-2]                   │  │
│  │  Roles in org-123: ['accountant']                    │  │
│  │  Permissions in org-123: ['transactions.create']     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  ROUTE PROTECTION (Enhanced)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Check user authenticated                          │  │
│  │  2. Check user has permission                         │  │
│  │  3. Check user belongs to org (NEW)                  │  │
│  │  4. Check route params match user's scope (NEW)      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS (Scoped)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SELECT * FROM transactions                           │  │
│  │  WHERE organization_id = current_org                  │  │
│  │  AND user_has_access(auth.uid(), organization_id)    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Solution Component 1: Enhanced Auth State

**File:** `src/hooks/useOptimizedAuth.ts`

**Add to AuthState:**
```typescript
interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // NEW: Scope-aware fields
  userOrganizations: string[];  // org IDs user belongs to
  userProjects: string[];       // project IDs user can access
  orgRoles: Map<string, RoleSlug[]>;  // roles per organization
  orgPermissions: Map<string, Set<PermissionCode>>;  // permissions per org
}
```

**New RPC Function Needed:**
```sql
CREATE OR REPLACE FUNCTION get_user_auth_data_with_scope(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (SELECT row_to_json(p.*) FROM user_profiles p WHERE p.id = p_user_id),
    'roles', (SELECT array_agg(r.slug) FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = p_user_id),
    'organizations', (SELECT array_agg(organization_id) FROM user_organizations WHERE user_id = p_user_id),
    'projects', (SELECT array_agg(project_id) FROM user_projects WHERE user_id = p_user_id),
    'org_roles', (
      SELECT json_object_agg(
        ur.organization_id,
        (SELECT array_agg(r.slug) FROM roles r WHERE r.id = ur.role_id)
      )
      FROM user_roles ur
      WHERE ur.user_id = p_user_id AND ur.organization_id IS NOT NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Solution Component 2: Scope-Aware Permission Checks

**File:** `src/lib/permissions.ts`

**Enhanced Permission Functions:**
```typescript
// OLD: Global permission check
hasActionAccess(action: PermissionCode): boolean

// NEW: Scope-aware permission check
hasActionAccessInOrg(
  action: PermissionCode,
  organizationId: string
): boolean {
  // 1. Check if user belongs to this org
  if (!authState.userOrganizations.includes(organizationId)) {
    return false;
  }
  
  // 2. Get user's roles in this org
  const rolesInOrg = authState.orgRoles.get(organizationId) || [];
  
  // 3. Check if any role has this permission
  const permissions = authState.orgPermissions.get(organizationId);
  return permissions?.has(action) || false;
}

// NEW: Route access with org context
hasRouteAccessInOrg(
  pathname: string,
  organizationId?: string
): boolean {
  // If route requires org context, validate it
  if (organizationId) {
    if (!authState.userOrganizations.includes(organizationId)) {
      return false;
    }
  }
  
  // Then check route permission
  return hasRouteInSnapshot(authState.resolvedPermissions, pathname);
}
```

---

## Solution Component 3: Enhanced ScopeContext

**File:** `src/contexts/ScopeContext.tsx`

**Add Validation:**
```typescript
export interface ScopeContextValue {
  // Existing
  currentOrg: Organization | null;
  currentProject: Project | null;
  
  // NEW: Validation state
  userOrganizations: Organization[];  // orgs user can access
  userProjects: Project[];            // projects user can access
  canAccessOrg: (orgId: string) => boolean;
  canAccessProject: (projectId: string) => boolean;
  
  // Enhanced setters with validation
  setOrganization: (orgId: string | null) => Promise<void>;
  setProject: (projectId: string | null) => Promise<void>;
}

// Implementation
const setOrganization = async (orgId: string | null) => {
  if (orgId) {
    // Validate user belongs to this org
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .single();
    
    if (!membership) {
      throw new Error('You do not have access to this organization');
    }
  }
  
  // Clear project when org changes
  setCurrentProject(null);
  setCurrentOrg(orgId);
  
  // Reload permissions for new org
  await refreshOrgPermissions(orgId);
};
```

---

## Solution Component 4: Enhanced Route Protection

**File:** `src/components/routing/OptimizedProtectedRoute.tsx`

**Add Scope Validation:**
```typescript
const OptimizedProtectedRoute: React.FC<Props> = ({
  children,
  requiredAction,
  requiresOrgAccess = false,  // NEW
  requiresProjectAccess = false,  // NEW
}) => {
  const { user, loading, hasRouteAccess, hasActionAccess } = useOptimizedAuth();
  const { currentOrg, currentProject, canAccessOrg, canAccessProject } = useScope();
  const location = useLocation();
  const params = useParams();
  
  // Extract org/project from route params
  const routeOrgId = params.orgId || params.organizationId;
  const routeProjectId = params.projectId;
  
  // Existing checks
  if (loading) return <MinimalLoader />;
  if (!user) return <Navigate to="/login" />;
  
  // NEW: Scope validation
  if (requiresOrgAccess || routeOrgId) {
    const orgToCheck = routeOrgId || currentOrg?.id;
    if (!orgToCheck || !canAccessOrg(orgToCheck)) {
      return <Navigate to="/unauthorized" state={{ 
        reason: 'org_access_denied',
        orgId: orgToCheck 
      }} />;
    }
  }
  
  if (requiresProjectAccess || routeProjectId) {
    const projectToCheck = routeProjectId || currentProject?.id;
    if (!projectToCheck || !canAccessProject(projectToCheck)) {
      return <Navigate to="/unauthorized" state={{ 
        reason: 'project_access_denied',
        projectId: projectToCheck 
      }} />;
    }
  }
  
  // Existing permission checks
  const routeAllowed = hasRouteAccess(location.pathname);
  const actionAllowed = !requiredAction || hasActionAccess(requiredAction);
  
  if (!routeAllowed || !actionAllowed) {
    return <Navigate to="/unauthorized" />;
  }
  
  return <>{children}</>;
};
```

---

## Solution Component 5: Filtered Navigation

**File:** `src/components/layout/Sidebar.tsx` (or wherever navigation is rendered)

**Filter Menu Items:**
```typescript
const FilteredNavigation: React.FC = () => {
  const { hasActionAccess, userOrganizations } = useOptimizedAuth();
  const { currentOrg } = useScope();
  
  const visibleItems = useMemo(() => {
    return navigationItems.filter(item => {
      // Check permission
      if (item.requiredPermission && !hasActionAccess(item.requiredPermission)) {
        return false;
      }
      
      // Check org access if item requires it
      if (item.requiresOrgAccess && currentOrg) {
        if (!userOrganizations.includes(currentOrg.id)) {
          return false;
        }
      }
      
      // Recursively filter children
      if (item.children) {
        item.children = item.children.filter(/* same logic */);
        return item.children.length > 0;
      }
      
      return true;
    });
  }, [navigationItems, hasActionAccess, currentOrg, userOrganizations]);
  
  return <NavigationMenu items={visibleItems} />;
};
```

