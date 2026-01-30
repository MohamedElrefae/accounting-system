# Part 6: Implementation Roadmap

## Phase 1: Database Schema Validation (Week 1)

### Step 1.1: Run Discovery Queries
```bash
# Execute these SQL files in Supabase SQL Editor:
1. sql/comprehensive_schema_analysis.sql
2. sql/organization_project_scope_analysis.sql
3. sql/auth_rpc_functions_analysis.sql
```

### Step 1.2: Verify Tables Exist
```sql
-- Confirm these tables exist with correct structure:
- user_organizations (user_id, organization_id, is_primary)
- user_projects (user_id, project_id, role)
- user_roles (user_id, role_id, organization_id, project_id)
- organizations (id, name, settings)
- projects (id, name, organization_id)
```

### Step 1.3: Create Missing Tables (if needed)
```sql
-- If user_organizations doesn't exist:
CREATE TABLE user_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- If user_projects doesn't exist:
CREATE TABLE user_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
```

### Step 1.4: Add RLS Policies
```sql
-- user_organizations RLS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own org memberships"
ON user_organizations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage org memberships"
ON user_organizations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.slug IN ('super_admin', 'admin')
  )
);
```

---

## Phase 2: Backend - Enhanced Auth RPC (Week 1-2)

### Step 2.1: Create Enhanced Auth RPC Function
```sql
-- File: supabase/migrations/YYYYMMDD_enhanced_auth_rpc.sql

CREATE OR REPLACE FUNCTION get_user_auth_data_with_scope(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_profile JSON;
  v_roles TEXT[];
  v_organizations UUID[];
  v_projects UUID[];
  v_org_roles JSON;
  v_result JSON;
BEGIN
  -- Get profile
  SELECT row_to_json(p.*) INTO v_profile
  FROM user_profiles p
  WHERE p.id = p_user_id;
  
  -- Get global roles
  SELECT array_agg(DISTINCT r.slug) INTO v_roles
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;
  
  -- Get organizations user belongs to
  SELECT array_agg(DISTINCT organization_id) INTO v_organizations
  FROM user_organizations
  WHERE user_id = p_user_id;
  
  -- Get projects user can access
  SELECT array_agg(DISTINCT project_id) INTO v_projects
  FROM user_projects
  WHERE user_id = p_user_id;
  
  -- Get roles per organization
  SELECT json_object_agg(
    ur.organization_id::TEXT,
    (
      SELECT array_agg(DISTINCT r.slug)
      FROM roles r
      WHERE r.id = ur.role_id
    )
  ) INTO v_org_roles
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
  AND ur.organization_id IS NOT NULL
  GROUP BY ur.organization_id;
  
  -- Build result
  v_result := json_build_object(
    'profile', v_profile,
    'roles', COALESCE(v_roles, ARRAY[]::TEXT[]),
    'organizations', COALESCE(v_organizations, ARRAY[]::UUID[]),
    'projects', COALESCE(v_projects, ARRAY[]::UUID[]),
    'org_roles', COALESCE(v_org_roles, '{}'::JSON)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_auth_data_with_scope(UUID) TO authenticated;
```

### Step 2.2: Test RPC Function
```sql
-- Test with your accountant user
SELECT get_user_auth_data_with_scope('accountant-user-id-here');

-- Expected result:
{
  "profile": {...},
  "roles": ["accountant"],
  "organizations": ["org-1", "org-2"],
  "projects": ["proj-1", "proj-2"],
  "org_roles": {
    "org-1": ["accountant"],
    "org-2": ["viewer"]
  }
}
```

---

## Phase 3: Frontend - Enhanced Auth Hook (Week 2)

### Step 3.1: Update AuthState Interface
```typescript
// File: src/hooks/useOptimizedAuth.ts

interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // NEW: Scope-aware fields
  userOrganizations: string[];
  userProjects: string[];
  orgRoles: Map<string, RoleSlug[]>;
  orgPermissions: Map<string, Set<PermissionCode>>;
}
```

### Step 3.2: Update loadAuthData Function
```typescript
const loadAuthData = async (userId: string) => {
  // Call enhanced RPC
  const { data: authData, error } = await supabase.rpc(
    'get_user_auth_data_with_scope',
    { p_user_id: userId }
  );
  
  if (error || !authData) {
    // Fallback logic
    return;
  }
  
  // Process profile and roles (existing)
  authState.profile = authData.profile;
  authState.roles = processRoles(authData.roles);
  authState.resolvedPermissions = flattenPermissions(authState.roles);
  
  // NEW: Process scope data
  authState.userOrganizations = authData.organizations || [];
  authState.userProjects = authData.projects || [];
  
  // NEW: Process org-specific roles
  authState.orgRoles = new Map();
  authState.orgPermissions = new Map();
  
  if (authData.org_roles) {
    Object.entries(authData.org_roles).forEach(([orgId, roles]) => {
      authState.orgRoles.set(orgId, roles as RoleSlug[]);
      authState.orgPermissions.set(
        orgId,
        flattenPermissions(roles as RoleSlug[]).actions
      );
    });
  }
  
  // Cache and notify
  setCachedAuthData(userId, authState.profile, authState.roles);
  notifyListeners();
};
```

### Step 3.3: Add Scope-Aware Permission Checks
```typescript
// NEW: Check if user belongs to org
const belongsToOrg = (orgId: string): boolean => {
  return authState.userOrganizations.includes(orgId);
};

// NEW: Check if user can access project
const canAccessProject = (projectId: string): boolean => {
  return authState.userProjects.includes(projectId);
};

// NEW: Check permission in org context
const hasActionAccessInOrg = (
  action: PermissionCode,
  orgId: string
): boolean => {
  if (!belongsToOrg(orgId)) return false;
  
  const orgPerms = authState.orgPermissions.get(orgId);
  return orgPerms?.has(action) || false;
};

// Export new functions
return {
  // Existing exports
  user,
  profile,
  loading,
  roles,
  hasRouteAccess,
  hasActionAccess,
  signIn,
  signOut,
  
  // NEW exports
  userOrganizations: authState.userOrganizations,
  userProjects: authState.userProjects,
  belongsToOrg,
  canAccessProject,
  hasActionAccessInOrg,
};
```

---

## Phase 4: Frontend - Enhanced ScopeContext (Week 2-3)

### Step 4.1: Add Validation to ScopeContext
```typescript
// File: src/contexts/ScopeContext.tsx

const ScopeProvider: React.FC<Props> = ({ children }) => {
  const { user, userOrganizations, userProjects } = useOptimizedAuth();
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // NEW: Validate org selection
  const setOrganization = async (orgId: string | null) => {
    if (orgId) {
      // Check if user belongs to this org
      if (!userOrganizations.includes(orgId)) {
        throw new Error('You do not have access to this organization');
      }
      
      // Load org details
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      
      setCurrentOrg(org);
    } else {
      setCurrentOrg(null);
    }
    
    // Clear project when org changes
    setCurrentProject(null);
  };
  
  // NEW: Validate project selection
  const setProject = async (projectId: string | null) => {
    if (projectId) {
      // Check if user can access this project
      if (!userProjects.includes(projectId)) {
        throw new Error('You do not have access to this project');
      }
      
      // Check if project belongs to current org
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (project && currentOrg && project.organization_id !== currentOrg.id) {
        throw new Error('Project does not belong to current organization');
      }
      
      setCurrentProject(project);
    } else {
      setCurrentProject(null);
    }
  };
  
  return (
    <ScopeContext.Provider value={{
      currentOrg,
      currentProject,
      userOrganizations,
      userProjects,
      setOrganization,
      setProject,
      canAccessOrg: (orgId) => userOrganizations.includes(orgId),
      canAccessProject: (projectId) => userProjects.includes(projectId),
    }}>
      {children}
    </ScopeContext.Provider>
  );
};
```

---

## Phase 5: Frontend - Enhanced Route Protection (Week 3)

### Step 5.1: Update OptimizedProtectedRoute
```typescript
// File: src/components/routing/OptimizedProtectedRoute.tsx

interface OptimizedProtectedRouteProps {
  children: React.ReactNode;
  requiredAction?: PermissionCode;
  requiresOrgAccess?: boolean;  // NEW
  requiresProjectAccess?: boolean;  // NEW
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const OptimizedProtectedRoute: React.FC<OptimizedProtectedRouteProps> = ({
  children,
  requiredAction,
  requiresOrgAccess = false,
  requiresProjectAccess = false,
  fallback,
  redirectTo,
}) => {
  const { user, loading, hasRouteAccess, hasActionAccess, belongsToOrg } = useOptimizedAuth();
  const { currentOrg, currentProject, canAccessProject } = useScope();
  const location = useLocation();
  const params = useParams();
  
  // Existing checks
  if (loading) return <MinimalLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  // NEW: Scope validation
  if (requiresOrgAccess) {
    if (!currentOrg || !belongsToOrg(currentOrg.id)) {
      return <Navigate to="/select-organization" state={{ from: location }} replace />;
    }
  }
  
  if (requiresProjectAccess) {
    if (!currentProject || !canAccessProject(currentProject.id)) {
      return <Navigate to="/select-project" state={{ from: location }} replace />;
    }
  }
  
  // NEW: Validate route params match user's scope
  const routeOrgId = params.orgId || params.organizationId;
  if (routeOrgId && !belongsToOrg(routeOrgId)) {
    return <Navigate to="/unauthorized" state={{ 
      reason: 'org_access_denied',
      orgId: routeOrgId 
    }} replace />;
  }
  
  // Existing permission checks
  const routeAllowed = hasRouteAccess(location.pathname);
  const actionAllowed = !requiredAction || hasActionAccess(requiredAction);
  
  if (!routeAllowed || !actionAllowed) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to={redirectTo ?? '/unauthorized'} state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
};
```

### Step 5.2: Update Route Definitions
```typescript
// File: src/routes/SettingsRoutes.tsx

<Route path="organization-management" element={
  <OptimizedProtectedRoute 
    requiredAction="settings.manage"
    requiresOrgAccess={true}  // NEW: Require org access
  >
    <OptimizedSuspense>
      <OrganizationManagement />
    </OptimizedSuspense>
  </OptimizedProtectedRoute>
} />
```

---

## Phase 6: Testing & Validation (Week 3-4)

### Test Case 1: Accountant Cannot Access Other Orgs
```typescript
// Test: Accountant user tries to access admin's org
1. Login as accountant
2. Try to select organization they don't belong to
3. Expected: Error "You do not have access to this organization"
4. Try to navigate to /settings/organization-management
5. Expected: Redirect to /unauthorized
```

### Test Case 2: Org-Scoped Permissions Work
```typescript
// Test: User has different roles in different orgs
1. Login as user with multiple org memberships
2. Select org-1 (where user is accountant)
3. Check menu: Should see accounting items only
4. Select org-2 (where user is admin)
5. Check menu: Should see all admin items
```

### Test Case 3: Route Params Validated
```typescript
// Test: User cannot access org via URL manipulation
1. Login as accountant (belongs to org-1)
2. Try to navigate to /organizations/org-2/settings
3. Expected: Redirect to /unauthorized
4. Check error message shows org_access_denied
```

---

## Phase 7: Database RLS Policies (Week 4)

### Update RLS Policies for All Tables
```sql
-- Example: transactions table
DROP POLICY IF EXISTS "Users can view transactions" ON transactions;

CREATE POLICY "Users can view org transactions"
ON transactions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create transactions in their orgs"
ON transactions FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organizations uo
    JOIN user_roles ur ON ur.user_id = uo.user_id
    JOIN roles r ON r.id = ur.role_id
    WHERE uo.user_id = auth.uid()
    AND ur.organization_id = organization_id
    AND r.slug IN ('accountant', 'admin', 'super_admin')
  )
);
```

---

## Success Criteria

✅ **Phase 1 Complete When:**
- All required tables exist
- RLS policies are in place
- Discovery queries return expected data

✅ **Phase 2 Complete When:**
- Enhanced RPC function returns org/project memberships
- Test queries show correct data for test users

✅ **Phase 3 Complete When:**
- Auth hook loads scope data
- New permission check functions work
- Cache includes scope data

✅ **Phase 4 Complete When:**
- ScopeContext validates org/project selection
- Unauthorized org selection throws error
- Org change clears project selection

✅ **Phase 5 Complete When:**
- Routes validate org/project access
- URL manipulation blocked
- Unauthorized access redirects properly

✅ **Phase 6 Complete When:**
- All test cases pass
- Accountant cannot access other orgs
- Menu items filtered correctly

✅ **Phase 7 Complete When:**
- RLS policies enforce org scope
- Database queries respect user memberships
- Cross-org data access blocked

