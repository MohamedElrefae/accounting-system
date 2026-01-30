-- ============================================================================
-- Migration: Create Enhanced Auth RPC with Scope Support
-- ============================================================================
-- This migration creates get_user_auth_data_with_scope() function that returns:
-- - User profile
-- - Global roles
-- - Organizations user belongs to
-- - Projects user can access
-- - Org-specific roles
-- - Default organization
--
-- This enables frontend to validate scope and enforce org-level permissions.
-- ============================================================================

-- Step 1: Create the enhanced auth RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_auth_data_with_scope(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $
DECLARE
  v_result JSON;
  v_profile JSON;
  v_roles JSON;
  v_organizations JSON;
  v_projects JSON;
  v_org_roles JSON;
  v_default_org UUID;
BEGIN
  -- Get user profile
  SELECT row_to_json(p.*)
  INTO v_profile
  FROM user_profiles p
  WHERE p.id = p_user_id;
  
  -- Get global roles (all roles, will be filtered by frontend)
  SELECT COALESCE(json_agg(DISTINCT r.name), '[]'::json)
  INTO v_roles
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id
  AND ur.is_active = true;
  
  -- Get organizations user belongs to
  SELECT COALESCE(json_agg(DISTINCT om.org_id), '[]'::json)
  INTO v_organizations
  FROM org_memberships om
  WHERE om.user_id = p_user_id;
  
  -- Get projects user can access
  -- Two paths: via project_memberships OR via can_access_all_projects flag
  SELECT COALESCE(json_agg(DISTINCT project_id), '[]'::json)
  INTO v_projects
  FROM (
    -- Path 1: Specific project assignments
    SELECT pm.project_id
    FROM project_memberships pm
    WHERE pm.user_id = p_user_id
    
    UNION
    
    -- Path 2: All projects in orgs where user has can_access_all_projects = true
    SELECT p.id as project_id
    FROM projects p
    WHERE p.org_id IN (
      SELECT om.org_id
      FROM org_memberships om
      WHERE om.user_id = p_user_id
      AND om.can_access_all_projects = true
    )
  ) all_projects;
  
  -- Get org-specific roles
  -- Returns: { "org-uuid-1": ["accountant"], "org-uuid-2": ["admin"] }
  SELECT COALESCE(
    json_object_agg(
      ur.organization_id::text,
      role_names
    ),
    '{}'::json
  )
  INTO v_org_roles
  FROM (
    SELECT 
      ur.organization_id,
      json_agg(DISTINCT r.name) as role_names
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
    AND ur.organization_id IS NOT NULL
    AND ur.is_active = true
    GROUP BY ur.organization_id
  ) org_role_groups;
  
  -- Get default organization
  SELECT om.org_id
  INTO v_default_org
  FROM org_memberships om
  WHERE om.user_id = p_user_id
  AND om.is_default = true
  LIMIT 1;
  
  -- If no default org, use the first one
  IF v_default_org IS NULL THEN
    SELECT om.org_id
    INTO v_default_org
    FROM org_memberships om
    WHERE om.user_id = p_user_id
    ORDER BY om.created_at ASC
    LIMIT 1;
  END IF;
  
  -- Build result JSON
  v_result := json_build_object(
    'profile', v_profile,
    'roles', v_roles,
    'organizations', v_organizations,
    'projects', v_projects,
    'org_roles', v_org_roles,
    'default_org', v_default_org
  );
  
  RETURN v_result;
END;
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_auth_data_with_scope(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_auth_data_with_scope(UUID) IS 
  'Enhanced auth RPC that returns user profile, roles, and org/project memberships for scope validation. Used by frontend to enforce organization-level access control.';

-- Step 2: Create convenience function for current user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_auth_data_with_scope()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $
BEGIN
  RETURN get_user_auth_data_with_scope(auth.uid());
END;
$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_my_auth_data_with_scope() TO authenticated;

COMMENT ON FUNCTION get_my_auth_data_with_scope() IS 
  'Convenience function to get auth data for current user. Calls get_user_auth_data_with_scope(auth.uid())';

-- Step 3: Create function to check if user belongs to org
-- ============================================================================

CREATE OR REPLACE FUNCTION user_belongs_to_org(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM org_memberships om
    WHERE om.user_id = p_user_id
    AND om.org_id = p_org_id
  );
END;
$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_belongs_to_org(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION user_belongs_to_org(UUID, UUID) IS 
  'Check if user belongs to an organization';

-- Step 4: Create function to check if user can access project
-- ============================================================================

CREATE OR REPLACE FUNCTION user_can_access_project(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $
DECLARE
  v_project_org_id UUID;
BEGIN
  -- Get project's organization
  SELECT org_id INTO v_project_org_id
  FROM projects
  WHERE id = p_project_id;
  
  IF v_project_org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has access via project_memberships
  IF EXISTS (
    SELECT 1
    FROM project_memberships pm
    WHERE pm.user_id = p_user_id
    AND pm.project_id = p_project_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has access via can_access_all_projects flag
  IF EXISTS (
    SELECT 1
    FROM org_memberships om
    WHERE om.user_id = p_user_id
    AND om.org_id = v_project_org_id
    AND om.can_access_all_projects = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_can_access_project(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION user_can_access_project(UUID, UUID) IS 
  'Check if user can access a project (via project_memberships or can_access_all_projects flag)';

-- Step 5: Create function to get user permissions in org
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_permissions_in_org(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $
DECLARE
  v_permissions TEXT[];
BEGIN
  -- Get all permissions for user's roles in this org
  SELECT array_agg(DISTINCT p.name)
  INTO v_permissions
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  JOIN role_permissions rp ON rp.role_id = r.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id
  AND (
    ur.organization_id = p_org_id  -- Org-specific role
    OR ur.organization_id IS NULL  -- Global role (super_admin)
  )
  AND ur.is_active = true;
  
  RETURN COALESCE(v_permissions, ARRAY[]::TEXT[]);
END;
$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_permissions_in_org(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_user_permissions_in_org(UUID, UUID) IS 
  'Get all permissions for a user in a specific organization (includes permissions from global roles)';

-- Step 6: Deprecate old function (keep for backward compatibility)
-- ============================================================================

-- Add deprecation notice to old function
COMMENT ON FUNCTION get_user_auth_data(UUID) IS 
  'DEPRECATED: Use get_user_auth_data_with_scope() instead. This function does not return organization/project memberships and will be removed in a future version.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT '=== ENHANCED AUTH RPC VERIFICATION ===' as section;

-- Test 1: Get auth data for a user
SELECT 
  'Test get_user_auth_data_with_scope():' as test;

-- Replace with actual user ID
SELECT get_user_auth_data_with_scope(
  (SELECT id FROM user_profiles LIMIT 1)
);

-- Test 2: Get auth data for current user
SELECT 
  'Test get_my_auth_data_with_scope():' as test;

SELECT get_my_auth_data_with_scope();

-- Test 3: Check org membership
SELECT 
  'Test user_belongs_to_org():' as test;

SELECT 
  up.email,
  o.name as organization,
  user_belongs_to_org(up.id, o.id) as belongs_to_org
FROM user_profiles up
CROSS JOIN organizations o
WHERE up.email LIKE '%@%'
LIMIT 5;

-- Test 4: Check project access
SELECT 
  'Test user_can_access_project():' as test;

SELECT 
  up.email,
  p.name as project,
  user_can_access_project(up.id, p.id) as can_access
FROM user_profiles up
CROSS JOIN projects p
WHERE up.email LIKE '%@%'
LIMIT 5;

-- Test 5: Get permissions in org
SELECT 
  'Test get_user_permissions_in_org():' as test;

SELECT 
  up.email,
  o.name as organization,
  get_user_permissions_in_org(up.id, o.id) as permissions
FROM user_profiles up
CROSS JOIN organizations o
WHERE up.email LIKE '%@%'
LIMIT 5;

-- Test 6: Compare old vs new function
SELECT 
  'Compare old vs new auth functions:' as test;

WITH test_user AS (
  SELECT id FROM user_profiles LIMIT 1
)
SELECT 
  'Old function (get_user_auth_data)' as function_name,
  get_user_auth_data((SELECT id FROM test_user)) as result
UNION ALL
SELECT 
  'New function (get_user_auth_data_with_scope)' as function_name,
  get_user_auth_data_with_scope((SELECT id FROM test_user)) as result;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

/*
get_user_auth_data_with_scope() should return:
{
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    ...
  },
  "roles": ["accountant", "viewer"],
  "organizations": ["org-uuid-1", "org-uuid-2"],
  "projects": ["proj-uuid-1", "proj-uuid-2"],
  "org_roles": {
    "org-uuid-1": ["accountant"],
    "org-uuid-2": ["viewer"]
  },
  "default_org": "org-uuid-1"
}

user_belongs_to_org() should return:
- true if user is in org_memberships for that org
- false otherwise

user_can_access_project() should return:
- true if user is in project_memberships for that project
- true if user has can_access_all_projects = true in project's org
- false otherwise

get_user_permissions_in_org() should return:
- Array of permission names for user's roles in that org
- Includes permissions from global roles (super_admin)
*/

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
-- To rollback this migration:

DROP FUNCTION IF EXISTS get_user_auth_data_with_scope(UUID);
DROP FUNCTION IF EXISTS get_my_auth_data_with_scope();
DROP FUNCTION IF EXISTS user_belongs_to_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_can_access_project(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_permissions_in_org(UUID, UUID);

-- Restore old function comment
COMMENT ON FUNCTION get_user_auth_data(UUID) IS 
  'Get user authentication data including profile and roles';
*/

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

/*
1. All functions are marked STABLE (not VOLATILE) for better query optimization
2. Functions use SECURITY DEFINER to bypass RLS for consistent results
3. Indexes needed for optimal performance:
   - org_memberships(user_id)
   - project_memberships(user_id)
   - user_roles(user_id, organization_id)
   - projects(org_id)

4. Expected query times:
   - get_user_auth_data_with_scope(): 10-50ms (depending on data size)
   - user_belongs_to_org(): 1-5ms
   - user_can_access_project(): 1-5ms
   - get_user_permissions_in_org(): 5-20ms

5. Caching recommendations:
   - Frontend should cache result of get_user_auth_data_with_scope()
   - Cache duration: 5-30 minutes
   - Invalidate cache on role/org membership changes
*/

-- ============================================================================
-- INTEGRATION NOTES
-- ============================================================================

/*
Frontend Integration:

1. Update useOptimizedAuth hook:
   - Call get_user_auth_data_with_scope() instead of get_user_auth_data()
   - Store userOrganizations, userProjects, orgRoles in state
   - Add belongsToOrg(), canAccessProject() functions

2. Update ScopeContext:
   - Validate org selection with belongsToOrg()
   - Validate project selection with canAccessProject()
   - Throw error if user tries to select unauthorized org/project

3. Update OptimizedProtectedRoute:
   - Extract orgId from route params
   - Check belongsToOrg(orgId) before allowing access
   - Redirect to /unauthorized if check fails

4. Update permission checks:
   - Use hasActionAccessInOrg(action, orgId) instead of hasActionAccess(action)
   - Check org-specific roles from orgRoles map
   - Fall back to global roles for super_admin

Example Frontend Code:

```typescript
// In useOptimizedAuth.ts
const { data: authData } = await supabase.rpc(
  'get_user_auth_data_with_scope',
  { p_user_id: userId }
);

authState.userOrganizations = authData.organizations || [];
authState.userProjects = authData.projects || [];
authState.orgRoles = new Map(Object.entries(authData.org_roles || {}));
authState.defaultOrgId = authData.default_org;

// In ScopeContext.tsx
const setOrganization = async (orgId: string) => {
  if (!belongsToOrg(orgId)) {
    throw new Error('You do not have access to this organization');
  }
  // ... load org details
};

// In OptimizedProtectedRoute.tsx
const { orgId } = useParams();
if (orgId && !belongsToOrg(orgId)) {
  return <Navigate to="/unauthorized" />;
}
```
*/
