-- Migration: Extend get_user_auth_data to include org/project scope data
-- Date: 2026-01-26
-- Purpose: Add organizations, projects, and default_org to auth data for frontend validation

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_auth_data(UUID);

-- Create extended function with scope data
CREATE OR REPLACE FUNCTION get_user_auth_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    -- Existing fields
    'profile', (
      SELECT row_to_json(up.*) 
      FROM user_profiles up 
      WHERE up.id = p_user_id
    ),
    'roles', (
      SELECT COALESCE(array_agg(r.name), ARRAY[]::text[])
      FROM user_roles ur 
      JOIN roles r ON r.id = ur.role_id 
      WHERE ur.user_id = p_user_id
    ),
    
    -- NEW: Organizations user belongs to
    'organizations', (
      SELECT COALESCE(array_agg(om.org_id), ARRAY[]::uuid[])
      FROM org_memberships om 
      WHERE om.user_id = p_user_id
    ),
    
    -- NEW: Projects user can access
    -- Includes both direct project memberships AND org-level access
    'projects', (
      SELECT COALESCE(array_agg(DISTINCT p.id), ARRAY[]::uuid[])
      FROM projects p 
      WHERE p.id IN (
        -- Direct project memberships
        SELECT pm.project_id 
        FROM project_memberships pm 
        WHERE pm.user_id = p_user_id
        
        UNION
        
        -- Org-level access (can_access_all_projects = true)
        SELECT p2.id 
        FROM projects p2 
        JOIN org_memberships om2 ON om2.org_id = p2.org_id 
        WHERE om2.user_id = p_user_id 
          AND om2.can_access_all_projects = true
          AND p2.status = 'active'
      )
    ),
    
    -- NEW: Default organization
    'default_org', (
      SELECT om.org_id 
      FROM org_memberships om 
      WHERE om.user_id = p_user_id 
        AND om.is_default = true 
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_auth_data(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_auth_data IS 'Returns user profile, roles, organizations, projects, and default org for auth initialization. Used by useOptimizedAuth hook for frontend validation.';

-- Test query (commented out - uncomment to test with real user ID)
-- SELECT get_user_auth_data('your-user-id-here');
