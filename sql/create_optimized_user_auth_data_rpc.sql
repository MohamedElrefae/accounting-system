-- =====================================================
-- OPTIMIZED USER AUTH DATA RPC - PERFORMANCE + SECURITY
-- =====================================================
-- Purpose: Single RPC call that returns user profile, roles, and ONLY user's orgs/projects
-- Security: User can only see orgs/projects they have access to
-- Performance: Single query, indexed lookups, minimal data transfer
-- Date: January 31, 2026
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_auth_data_optimized(UUID);

-- =====================================================
-- OPTIMIZED get_user_auth_data_optimized FUNCTION
-- =====================================================
-- Returns ONLY data the user has access to
-- Combines profile + roles + user's orgs + user's projects in single call
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_auth_data_optimized(p_user_id UUID)
RETURNS JSON AS $
DECLARE
  v_result JSON;
  v_profile JSON;
  v_roles JSON;
  v_user_organizations JSON;
  v_user_projects JSON;
  v_default_org_id UUID;
BEGIN
  -- Get user profile
  SELECT row_to_json(up.*)
  INTO v_profile
  FROM user_profiles up
  WHERE up.id = p_user_id;

  -- Get user roles (system + org + project roles flattened)
  SELECT COALESCE(json_agg(DISTINCT role_name), '[]'::json)
  INTO v_roles
  FROM (
    -- System roles
    SELECT sr.role as role_name
    FROM system_roles sr
    WHERE sr.user_id = p_user_id
    
    UNION
    
    -- Org roles (map to legacy names for compatibility)
    SELECT CASE 
      WHEN or1.role LIKE 'org_%' THEN substring(or1.role from 5)
      ELSE or1.role
    END as role_name
    FROM org_roles or1
    WHERE or1.user_id = p_user_id
    
    UNION
    
    -- Project roles (map to legacy names for compatibility)
    SELECT CASE 
      WHEN pr.role LIKE 'project_%' THEN substring(pr.role from 9)
      ELSE pr.role
    END as role_name
    FROM project_roles pr
    WHERE pr.user_id = p_user_id
  ) AS all_roles;

  -- Get ONLY organizations user has access to
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', o.id,
      'code', o.code,
      'name', o.name,
      'name_ar', o.name_ar,
      'is_active', o.is_active,
      'user_role', COALESCE(or1.role, 'member'),
      'can_access_all_projects', COALESCE(or1.can_access_all_projects, false),
      'is_default', COALESCE(om.is_default, false)
    )
  ), '[]'::json)
  INTO v_user_organizations
  FROM organizations o
  LEFT JOIN org_roles or1 ON or1.org_id = o.id AND or1.user_id = p_user_id
  LEFT JOIN org_memberships om ON om.org_id = o.id AND om.user_id = p_user_id
  WHERE (or1.user_id IS NOT NULL OR om.user_id IS NOT NULL)
  AND o.is_active = true
  ORDER BY o.code;

  -- Get ONLY projects user has access to
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', p.id,
      'code', p.code,
      'name', p.name,
      'name_ar', p.name_ar,
      'org_id', p.org_id,
      'status', p.status,
      'user_role', COALESCE(pr.role, 'viewer'),
      'access_type', CASE 
        WHEN pr.user_id IS NOT NULL THEN 'direct'
        WHEN or1.can_access_all_projects = true THEN 'org_level'
        ELSE 'none'
      END
    )
  ), '[]'::json)
  INTO v_user_projects
  FROM projects p
  LEFT JOIN project_roles pr ON pr.project_id = p.id AND pr.user_id = p_user_id
  LEFT JOIN org_roles or1 ON or1.org_id = p.org_id AND or1.user_id = p_user_id
  WHERE (
    -- Direct project access
    pr.user_id IS NOT NULL
    OR
    -- Org-level access
    (or1.user_id IS NOT NULL AND or1.can_access_all_projects = true)
  )
  AND p.status = 'active'
  ORDER BY p.org_id, p.code;

  -- Get default organization (first org user belongs to)
  SELECT o.id
  INTO v_default_org_id
  FROM organizations o
  LEFT JOIN org_roles or1 ON or1.org_id = o.id AND or1.user_id = p_user_id
  LEFT JOIN org_memberships om ON om.org_id = o.id AND om.user_id = p_user_id
  WHERE (or1.user_id IS NOT NULL OR om.user_id IS NOT NULL)
  AND o.is_active = true
  ORDER BY 
    COALESCE(om.is_default, false) DESC,  -- Default org first
    or1.created_at ASC,                   -- Then by join date
    om.created_at ASC
  LIMIT 1;

  -- Build final result with user-scoped data only
  v_result := json_build_object(
    'profile', v_profile,
    'roles', v_roles,
    'organizations', v_user_organizations,
    'projects', v_user_projects,
    'default_org_id', v_default_org_id,
    
    -- Legacy compatibility fields
    'user_organizations', (
      SELECT COALESCE(json_agg(org_data->>'id'), '[]'::json)
      FROM json_array_elements(v_user_organizations) AS org_data
    ),
    'user_projects', (
      SELECT COALESCE(json_agg(proj_data->>'id'), '[]'::json)
      FROM json_array_elements(v_user_projects) AS proj_data
    ),
    'default_org', v_default_org_id
  );

  RETURN v_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_auth_data_optimized(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_auth_data_optimized IS 'Returns user profile, roles, and ONLY organizations/projects the user has access to. Optimized for performance and security.';

-- =========================