# Enterprise Auth Implementation - Action Plan

**Date:** January 23, 2026  
**Status:** READY TO EXECUTE  
**Priority:** CRITICAL SECURITY FIX  

---

## Executive Summary

Based on the **ENTERPRISE_AUTH_REVISED_ANALYSIS.md**, we have identified 5 critical security gaps in the authentication and scope enforcement system. This document provides a step-by-step action plan to fix these issues.

### Critical Issues Identified

1. ❌ **Roles are global, not org-scoped** - `user_roles` table has no `organization_id` column
2. ❌ **Auth RPC doesn't load org/project memberships** - Frontend can't validate scope
3. ❌ **RLS policies too permissive** - Debug policies in production (`USING (true)`)
4. ❌ **No project assignments** - `project_memberships` table is empty
5. ❌ **Frontend permissions hardcoded** - Not synced with database

### Impact

- **Security Risk:** Accountant can access ANY organization's data
- **Data Leakage:** No isolation between organizations
- **Compliance Issue:** Violates data privacy requirements

---

## Phase 0: Quick Wins (IMMEDIATE - 30 minutes)

These fixes can be deployed immediately to improve security:

### Quick Win 1: Fix Debug RLS Policies (10 minutes)

**File:** `sql/quick_wins_fix_rls_policies.sql`

```sql
-- Remove debug policies that allow everything
DROP POLICY IF EXISTS "debug_projects_policy" ON projects;
DROP POLICY IF EXISTS "allow_read_organizations" ON organizations;

-- Create proper org-scoped policies
CREATE POLICY "users_see_their_orgs" ON organizations FOR SELECT
USING (
  id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )
);

CREATE POLICY "users_see_org_projects" ON projects FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )
);

-- Fix transactions RLS to check org membership
DROP POLICY IF EXISTS "tx_select" ON transactions;

CREATE POLICY "users_see_org_transactions" ON transactions FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )
);
```

**Test:**
```sql
-- Login as accountant user
-- Should only see their organizations
SELECT * FROM organizations;

-- Should only see projects in their orgs
SELECT * FROM projects;

-- Should only see transactions in their orgs
SELECT * FROM transactions;
```

### Quick Win 2: Test Current Org Membership (5 minutes)

```sql
-- Verify org_memberships data
SELECT 
  om.user_id,
  up.email,
  om.org_id,
  o.name as org_name,
  om.can_access_all_projects
FROM org_memberships om
JOIN user_profiles up ON up.id = om.user_id
JOIN organizations o ON o.id = om.org_id
ORDER BY up.email, o.name;
```

### Quick Win 3: Document Current State (15 minutes)

Create a snapshot of current permissions for rollback:

```sql
-- Backup current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Phase 1: Database Schema Fixes (Week 1 - Days 1-3)

### Step 1.1: Add organization_id to user_roles

**File:** `supabase/migrations/YYYYMMDD_add_org_id_to_user_roles.sql`

```sql
-- Add organization_id column to user_roles
ALTER TABLE user_roles 
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create index for performance
CREATE INDEX idx_user_roles_org_id ON user_roles(organization_id);

-- Create index for common query pattern
CREATE INDEX idx_user_roles_user_org ON user_roles(user_id, organization_id);

-- Add comment
COMMENT ON COLUMN user_roles.organization_id IS 
  'Organization scope for this role assignment. NULL = global role (super_admin only)';
```

**Migration Strategy:**
```sql
-- For existing roles, set organization_id based on user's primary org
UPDATE user_roles ur
SET organization_id = (
  SELECT org_id 
  FROM org_memberships om 
  WHERE om.user_id = ur.user_id 
  AND om.is_default = true
  LIMIT 1
)
WHERE ur.organization_id IS NULL
AND EXISTS (
  SELECT 1 FROM roles r 
  WHERE r.id = ur.role_id 
  AND r.name != 'super_admin'
);

-- Super admin roles stay NULL (global)
-- Verify
SELECT 
  ur.id,
  up.email,
  r.name as role,
  ur.organization_id,
  o.name as org_name
FROM user_roles ur
JOIN user_profiles up ON up.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
LEFT JOIN organizations o ON o.id = ur.organization_id
ORDER BY up.email, r.name;
```

### Step 1.2: Create Enhanced Auth RPC

**File:** `supabase/migrations/YYYYMMDD_create_enhanced_auth_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION get_user_auth_data_with_scope(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (
      SELECT row_to_json(p.*) 
      FROM user_profiles p 
      WHERE p.id = p_user_id
    ),
    'roles', (
      SELECT COALESCE(json_agg(DISTINCT r.name), '[]'::json)
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = p_user_id
      AND ur.is_active = true
    ),
    'organizations', (
      SELECT COALESCE(json_agg(DISTINCT om.org_id), '[]'::json)
      FROM org_memberships om
      WHERE om.user_id = p_user_id
    ),
    'projects', (
      SELECT COALESCE(json_agg(DISTINCT pm.project_id), '[]'::json)
      FROM project_memberships pm
      WHERE pm.user_id = p_user_id
    ),
    'org_roles', (
      SELECT COALESCE(
        json_object_agg(
          ur.organization_id::text,
          (
            SELECT json_agg(DISTINCT r.name)
            FROM roles r
            WHERE r.id = ur.role_id
          )
        ),
        '{}'::json
      )
      FROM user_roles ur
      WHERE ur.user_id = p_user_id
      AND ur.organization_id IS NOT NULL
      AND ur.is_active = true
      GROUP BY ur.organization_id
    ),
    'default_org', (
      SELECT om.org_id
      FROM org_memberships om
      WHERE om.user_id = p_user_id
      AND om.is_default = true
      LIMIT 1
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_auth_data_with_scope(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_auth_data_with_scope(UUID) IS 
  'Enhanced auth RPC that returns user profile, roles, and org/project memberships for scope validation';
```

**Test:**
```sql
-- Test with accountant user
SELECT get_user_auth_data_with_scope('accountant-user-id-here');

-- Expected result structure:
{
  "profile": {...},
  "roles": ["accountant"],
  "organizations": ["org-1-uuid", "org-2-uuid"],
  "projects": ["proj-1-uuid"],
  "org_roles": {
    "org-1-uuid": ["accountant"],
    "org-2-uuid": ["viewer"]
  },
  "default_org": "org-1-uuid"
}
```

### Step 1.3: Update Existing get_user_auth_data (Backward Compatibility)

```sql
-- Keep old function for backward compatibility
-- But add deprecation notice
COMMENT ON FUNCTION get_user_auth_data(UUID) IS 
  'DEPRECATED: Use get_user_auth_data_with_scope() instead. This function will be removed in future version.';
```

---

## Phase 2: Frontend Auth Integration (Week 1 - Days 4-5)

### Step 2.1: Update useOptimizedAuth Interface

**File:** `src/hooks/useOptimizedAuth.ts`

Add to interface:
```typescript
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
  defaultOrgId: string | null;
}
```

### Step 2.2: Update loadAuthData Function

Add after existing RPC call:
```typescript
// Call enhanced RPC for scope data
const { data: scopeData, error: scopeError } = await supabase.rpc(
  'get_user_auth_data_with_scope',
  { p_user_id: userId }
);

if (!scopeError && scopeData) {
  // Process scope data
  authState.userOrganizations = scopeData.organizations || [];
  authState.userProjects = scopeData.projects || [];
  authState.defaultOrgId = scopeData.default_org || null;
  
  // Process org-specific roles
  authState.orgRoles = new Map();
  if (scopeData.org_roles) {
    Object.entries(scopeData.org_roles).forEach(([orgId, roles]) => {
      authState.orgRoles.set(orgId, roles as RoleSlug[]);
    });
  }
}
```

### Step 2.3: Add Scope Validation Functions

```typescript
// Check if user belongs to org
const belongsToOrg = (orgId: string): boolean => {
  return authState.userOrganizations.includes(orgId);
};

// Check if user can access project
const canAccessProject = (projectId: string): boolean => {
  return authState.userProjects.includes(projectId);
};

// Get roles for specific org
const getRolesInOrg = (orgId: string): RoleSlug[] => {
  return authState.orgRoles.get(orgId) || [];
};

// Check permission in org context
const hasActionAccessInOrg = (
  action: PermissionCode,
  orgId: string
): boolean => {
  if (!belongsToOrg(orgId)) return false;
  
  // Get org-specific roles
  const orgRoles = getRolesInOrg(orgId);
  if (orgRoles.length === 0) return false;
  
  // Check if any org role has this permission
  const orgPermissions = flattenPermissions(orgRoles);
  return orgPermissions.actions.has(action);
};
```

### Step 2.4: Export New Functions

```typescript
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
  defaultOrgId: authState.defaultOrgId,
  belongsToOrg,
  canAccessProject,
  getRolesInOrg,
  hasActionAccessInOrg,
};
```

---

## Phase 3: ScopeContext Validation (Week 2 - Days 1-2)

### Step 3.1: Update ScopeContext Provider

**File:** `src/contexts/ScopeContext.tsx`

The interface already exists, we need to implement validation in the provider:

```typescript
// In ScopeProvider component
const { userOrganizations, userProjects, belongsToOrg, canAccessProject } = useOptimizedAuth();

const setOrganization = async (orgId: string | null) => {
  if (orgId) {
    // Validate user belongs to this org
    if (!belongsToOrg(orgId)) {
      throw new Error('You do not have access to this organization');
    }
    
    // Load org details
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    
    if (error) {
      throw new Error(`Failed to load organization: ${error.message}`);
    }
    
    setCurrentOrg(org);
  } else {
    setCurrentOrg(null);
  }
  
  // Clear project when org changes
  setCurrentProject(null);
};

const setProject = async (projectId: string | null) => {
  if (projectId) {
    // Validate user can access this project
    if (!canAccessProject(projectId)) {
      throw new Error('You do not have access to this project');
    }
    
    // Load project details
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) {
      throw new Error(`Failed to load project: ${error.message}`);
    }
    
    // Validate project belongs to current org
    if (currentOrg && project.organization_id !== currentOrg.id) {
      throw new Error('Project does not belong to current organization');
    }
    
    setCurrentProject(project);
  } else {
    setCurrentProject(null);
  }
};
```

---

## Phase 4: Route Protection (Week 2 - Days 3-4)

### Step 4.1: Update OptimizedProtectedRoute

**File:** `src/components/routing/OptimizedProtectedRoute.tsx`

Add props:
```typescript
interface OptimizedProtectedRouteProps {
  children: React.ReactNode;
  requiredAction?: PermissionCode;
  requiresOrgAccess?: boolean;  // NEW
  requiresProjectAccess?: boolean;  // NEW
  fallback?: React.ReactNode;
  redirectTo?: string;
}
```

Add validation:
```typescript
const { belongsToOrg } = useOptimizedAuth();
const { currentOrg, currentProject } = useScope();
const params = useParams();

// Validate org access if required
if (requiresOrgAccess) {
  if (!currentOrg || !belongsToOrg(currentOrg.id)) {
    return <Navigate to="/select-organization" state={{ from: location }} replace />;
  }
}

// Validate route params match user's scope
const routeOrgId = params.orgId || params.organizationId;
if (routeOrgId && !belongsToOrg(routeOrgId)) {
  return <Navigate to="/unauthorized" state={{ 
    reason: 'org_access_denied',
    orgId: routeOrgId 
  }} replace />;
}
```

---

## Phase 5: Testing (Week 2 - Day 5)

### Test Case 1: Accountant Cannot Access Other Orgs

```typescript
// Test script: tests/auth/scope-validation.test.ts
describe('Scope Validation', () => {
  it('should prevent accountant from accessing other orgs', async () => {
    // Login as accountant (belongs to org-1 only)
    await signIn('accountant@example.com', 'password');
    
    // Try to select org-2
    await expect(
      setOrganization('org-2-uuid')
    ).rejects.toThrow('You do not have access to this organization');
    
    // Try to navigate to org-2 settings
    await navigate('/organizations/org-2-uuid/settings');
    
    // Should redirect to unauthorized
    expect(location.pathname).toBe('/unauthorized');
  });
});
```

### Test Case 2: RLS Policies Work

```sql
-- Test as accountant user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "accountant-user-id"}';

-- Should only see their orgs
SELECT COUNT(*) FROM organizations;
-- Expected: 1 or 2 (their orgs only)

-- Should not see other orgs
SELECT COUNT(*) FROM organizations WHERE id = 'other-org-uuid';
-- Expected: 0

-- Should only see transactions in their orgs
SELECT COUNT(*) FROM transactions;
-- Expected: Only transactions in their orgs
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Backup current database
- [ ] Document current RLS policies
- [ ] Test migrations in staging
- [ ] Review all SQL scripts
- [ ] Get manager approval

### Deployment Steps

1. [ ] Deploy Quick Wins (RLS policies) - 10 minutes
2. [ ] Test Quick Wins with accountant user - 5 minutes
3. [ ] Deploy Phase 1 (database schema) - 15 minutes
4. [ ] Test enhanced RPC function - 5 minutes
5. [ ] Deploy Phase 2 (frontend auth) - 20 minutes
6. [ ] Test scope validation - 10 minutes
7. [ ] Deploy Phase 3 (ScopeContext) - 15 minutes
8. [ ] Deploy Phase 4 (route protection) - 15 minutes
9. [ ] Run full test suite - 30 minutes
10. [ ] Monitor for errors - 24 hours

### Post-Deployment

- [ ] Verify accountant cannot access other orgs
- [ ] Verify RLS policies working
- [ ] Check error logs
- [ ] User acceptance testing
- [ ] Document any issues

---

## Rollback Plan

If issues occur:

1. **Rollback RLS Policies:**
   ```sql
   -- Restore original policies from backup
   -- See Phase 0, Quick Win 3 for backup
   ```

2. **Rollback Database Changes:**
   ```sql
   -- Remove organization_id column
   ALTER TABLE user_roles DROP COLUMN organization_id;
   
   -- Drop enhanced RPC
   DROP FUNCTION get_user_auth_data_with_scope(UUID);
   ```

3. **Rollback Frontend:**
   ```bash
   git revert <commit-hash>
   npm run build
   npm run deploy
   ```

---

## Success Metrics

### Security Metrics
- ✅ Accountant cannot access unauthorized orgs
- ✅ RLS policies enforce org isolation
- ✅ Route protection validates scope
- ✅ No cross-org data leakage

### Performance Metrics
- ✅ Auth load time < 500ms (with cache)
- ✅ Permission checks < 1ms
- ✅ No N+1 queries

### User Experience
- ✅ Clear error messages
- ✅ Smooth org/project selection
- ✅ No unexpected redirects

---

## Next Steps

1. **Review this plan with manager** - Get approval
2. **Execute Quick Wins** - Immediate security improvement
3. **Schedule deployment window** - Week 1-2
4. **Assign tasks to team** - Split work
5. **Daily standups** - Track progress

---

**Status:** READY TO EXECUTE  
**Estimated Time:** 2 weeks  
**Risk Level:** Medium (with proper testing)  
**Business Impact:** HIGH (critical security fix)
