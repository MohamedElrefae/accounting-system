-- =====================================================
-- SCOPED ROLES MIGRATION - PHASE 4: UPDATE AUTH RPC
-- =====================================================
-- Date: January 26, 2026
-- Purpose: Update get_user_auth_data to return scoped roles
-- Changes: Return org_roles, project_roles, system_roles
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_auth_data(UUID);

-- =====================================================
-- UPDATED get_user_auth_data FUNCTION
-- =====================================================
-- Returns user profile + scoped roles + scope data
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_auth_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_profile JSON;
  v_system_roles JSON;
  v_org_roles JSON;
  v_project_roles JSON;
  v_organizations JSON;
  v_projects JSON;
  v_default_org UUID;
BEGIN
  -- Get user profile
  SELECT row_to_json(up.*)
  INTO v_profile
  FROM user_profiles up
  WHERE up.id = p_user_id;

  -- Get system roles
  SELECT COALESCE(json_agg(sr.role), '[]'::json)
  INTO v_system_roles
  FROM system_roles sr
  WHERE sr.user_id = p_user_id;

  -- Get org roles with org details
  SELECT COALESCE(json_agg(
    json_build_object(
      'org_id', or1.org_id,
      'role', or1.role,
      'can_access_all_projects', or1.can_access_all_projects,
      'org_name', o.name,
      'org_name_ar', o.name_ar
    )
  ), '[]'::json)
  INTO v_org_roles
  FROM org_roles or1
  JOIN organizations o ON o.id = or1.org_id
  WHERE or1.user_id = p_user_id;

  -- Get project roles with project details
  SELECT COALESCE(json_agg(
    json_build_object(
      'project_id', pr.project_id,
      'role', pr.role,
      'project_name', p.name,
      'project_name_ar', p.name_ar,
      'org_id', p.org_id
    )
  ), '[]'::json)
  INTO v_project_roles
  FROM project_roles pr
  JOIN projects p ON p.id = pr.project_id
  WHERE pr.user_id = p_user_id;

  -- Get list of organization IDs user has access to
  SELECT COALESCE(json_agg(DISTINCT or1.org_id), '[]'::json)
  INTO v_organizations
  FROM org_roles or1
  WHERE or1.user_id = p_user_id;

  -- Get list of project IDs user has access to
  -- Includes: direct project roles + org-level access
  SELECT COALESCE(json_agg(DISTINCT project_id), '[]'::json)
  INTO v_projects
  FROM (
    -- Direct project roles
    SELECT pr.project_id
    FROM project_roles pr
    WHERE pr.user_id = p_user_id
    
    UNION
    
    -- Projects from org-level access
    SELECT p.id as project_id
    FROM projects p
    JOIN org_roles or1 ON or1.org_id = p.org_id
    WHERE or1.user_id = p_user_id
    AND or1.can_access_all_projects = true
  ) AS accessible_projects;

  -- Get default organization (first org user belongs to)
  SELECT or1.org_id
  INTO v_default_org
  FROM org_roles or1
  WHERE or1.user_id = p_user_id
  ORDER BY or1.created_at ASC
  LIMIT 1;

  -- Build final result
  v_result := json_build_object(
    'profile', v_profile,
    'system_roles', v_system_roles,
    'org_roles', v_org_roles,
    'project_roles', v_project_roles,
    'organizations', v_organizations,
    'projects', v_projects,
    'default_org', v_default_org,
    
    -- Legacy compatibility: return flattened roles list
    'roles', (
      SELECT COALESCE(json_agg(DISTINCT role_name), '[]'::json)
      FROM (
        -- System roles
        SELECT sr.role as role_name
        FROM system_roles sr
        WHERE sr.user_id = p_user_id
        
        UNION
        
        -- Project roles (map to legacy names)
        SELECT CASE 
          WHEN pr.role LIKE 'project_%' THEN substring(pr.role from 9)
          ELSE pr.role
        END as role_name
        FROM project_roles pr
        WHERE pr.user_id = p_user_id
        
        UNION
        
        -- Org roles (map to legacy names)
        SELECT CASE 
          -- Handle standard scoped roles by stripping prefix
          WHEN or1.role LIKE 'org_%' THEN substring(or1.role from 5)
          ELSE or1.role
        END as role_name
        FROM org_roles or1
        WHERE or1.user_id = p_user_id
      ) AS all_roles
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_auth_data(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION get_user_auth_data IS 'Returns user profile, scoped roles, and accessible orgs/projects';

-- =====================================================
-- HELPER FUNCTIONS FOR SCOPED ROLE QUERIES
-- =====================================================

-- Get user's roles in specific org
CREATE OR REPLACE FUNCTION get_user_roles_in_org(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(
    json_build_object(
      'role', or1.role,
      'can_access_all_projects', or1.can_access_all_projects
    )
  ), '[]'::json)
  INTO v_result
  FROM org_roles or1
  WHERE or1.user_id = p_user_id
  AND or1.org_id = p_org_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_roles_in_org(UUID, UUID) TO authenticated;

-- Get user's roles in specific project
CREATE OR REPLACE FUNCTION get_user_roles_in_project(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(json_agg(
    json_build_object(
      'role', pr.role
    )
  ), '[]'::json)
  INTO v_result
  FROM project_roles pr
  WHERE pr.user_id = p_user_id
  AND pr.project_id = p_project_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_roles_in_project(UUID, UUID) TO authenticated;

-- Check if user has specific permission in org
CREATE OR REPLACE FUNCTION user_can_in_org(
  p_user_id UUID,
  p_org_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := false;
BEGIN
  -- Super admins can do anything
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- Check org-level permissions based on role
  SELECT EXISTS (
    SELECT 1 FROM org_roles
    WHERE user_id = p_user_id
    AND org_id = p_org_id
    AND (
      -- Org admins can do everything
      (role = 'org_admin') OR
      -- Org managers can manage users and projects
      (role = 'org_manager' AND p_action IN ('manage_users', 'manage_projects', 'view')) OR
      -- Org accountants can manage transactions
      (role = 'org_accountant' AND p_action IN ('manage_transactions', 'view')) OR
      -- Org auditors can view
      (role = 'org_auditor' AND p_action = 'view') OR
      -- Org viewers can view
      (role = 'org_viewer' AND p_action = 'view')
    )
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION user_can_in_org(UUID, UUID, TEXT) TO authenticated;

-- Check if user has specific permission in project
CREATE OR REPLACE FUNCTION user_can_in_project(
  p_user_id UUID,
  p_project_id UUID,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_org_id UUID;
BEGIN
  -- Super admins can do anything
  IF is_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- Get project's org_id
  SELECT org_id INTO v_org_id
  FROM projects
  WHERE id = p_project_id;

  -- Check org-level access first
  IF user_can_in_org(p_user_id, v_org_id, p_action) THEN
    RETURN true;
  END IF;

  -- Check project-level permissions
  SELECT EXISTS (
    SELECT 1 FROM project_roles
    WHERE user_id = p_user_id
    AND project_id = p_project_id
    AND (
      -- Project managers can do everything
      (role = 'project_manager') OR
      -- Project contributors can create/edit
      (role = 'project_contributor' AND p_action IN ('create', 'edit', 'view')) OR
      -- Project viewers can view
      (role = 'project_viewer' AND p_action = 'view')
    )
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION user_can_in_project(UUID, UUID, TEXT) TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test the updated function
DO $$
DECLARE
  v_test_result JSON;
  v_user_id UUID;
BEGIN
  -- Get first user for testing
  SELECT id INTO v_user_id
  FROM auth.users
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Call the function
    SELECT get_user_auth_data(v_user_id) INTO v_test_result;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SCOPED ROLES - AUTH DATA TEST';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Result: %', v_test_result;
    RAISE NOTICE '==============================================';
  ELSE
    RAISE NOTICE 'No users found for testing';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The get_user_auth_data function now returns:
-- - profile: User profile data
-- - system_roles: Array of system-level roles
-- - org_roles: Array of org roles with org details
-- - project_roles: Array of project roles with project details
-- - organizations: Array of org IDs user has access to
-- - projects: Array of project IDs user has access to
-- - default_org: Default organization ID
-- - roles: Legacy flattened roles array (for compatibility)
--
-- Next steps:
-- 1. Update useOptimizedAuth hook to use new structure
-- 2. Test with different user types
-- 3. Verify permissions work correctly
-- =====================================================
