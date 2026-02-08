-- =====================================================
-- OPTIMIZED AUTH RPC FUNCTION - PERFORMANCE FOCUSED
-- =====================================================
-- Date: January 31, 2026
-- Purpose: Replace slow get_user_auth_data with optimized version
-- Performance Target: <100ms (currently 150-300ms)
-- =====================================================

-- First, create the necessary indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_roles_user_id ON org_roles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_roles_user_id ON project_roles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_roles_user_id ON system_roles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- =====================================================
-- OPTIMIZED get_user_auth_data FUNCTION
-- =====================================================
-- Reduces database operations from 7 to 3
-- Uses optimized queries with proper indexes
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_auth_data_optimized(p_user_id UUID)
RETURNS JSON AS $
DECLARE
  v_result JSON;
  v_profile JSON;
  v_roles_data JSON;
  v_scope_data JSON;
BEGIN
  -- =====================================================
  -- QUERY 1: Get user profile (fast with index)
  -- =====================================================
  SELECT row_to_json(up.*)
  INTO v_profile
  FROM user_profiles up
  WHERE up.id = p_user_id;

  -- =====================================================
  -- QUERY 2: Get all roles data in single query (optimized)
  -- =====================================================
  WITH role_aggregation AS (
    -- System roles
    SELECT 
      'system' as role_type,
      json_agg(sr.role) as roles,
      '[]'::json as role_details
    FROM system_roles sr
    WHERE sr.user_id = p_user_id
    
    UNION ALL
    
    -- Org roles with details
    SELECT 
      'org' as role_type,
      json_agg(or1.role) as roles,
      json_agg(
        json_build_object(
          'org_id', or1.org_id,
          'role', or1.role,
          'can_access_all_projects', or1.can_access_all_projects,
          'org_name', o.name,
          'org_name_ar', o.name_ar
        )
      ) as role_details
    FROM org_roles or1
    JOIN organizations o ON o.id = or1.org_id
    WHERE or1.user_id = p_user_id
    
    UNION ALL
    
    -- Project roles with details
    SELECT 
      'project' as role_type,
      json_agg(pr.role) as roles,
      json_agg(
        json_build_object(
          'project_id', pr.project_id,
          'role', pr.role,
          'project_name', p.name,
          'project_name_ar', p.name_ar,
          'org_id', p.org_id
        )
      ) as role_details
    FROM project_roles pr
    JOIN projects p ON p.id = pr.project_id
    WHERE pr.user_id = p_user_id
  )
  SELECT json_object_agg(role_type, json_build_object('roles', roles, 'details', role_details))
  INTO v_roles_data
  FROM role_aggregation;

  -- =====================================================
  -- QUERY 3: Get scope data (organizations and projects)
  -- =====================================================
  WITH scope_aggregation AS (
    -- User's organizations
    SELECT 
      'organizations' as scope_type,
      json_agg(DISTINCT or1.org_id) as scope_ids,
      (
        SELECT or2.org_id
        FROM org_roles or2
        WHERE or2.user_id = p_user_id
        ORDER BY or2.created_at ASC
        LIMIT 1
      ) as default_id
    FROM org_roles or1
    WHERE or1.user_id = p_user_id
    
    UNION ALL
    
    -- User's projects (optimized UNION)
    SELECT 
      'projects' as scope_type,
      json_agg(DISTINCT project_id) as scope_ids,
      NULL as default_id
    FROM (
      -- Direct project access
      SELECT pr.project_id
      FROM project_roles pr
      WHERE pr.user_id = p_user_id
      
      UNION
      
      -- Org-level project access (optimized with EXISTS)
      SELECT p.id as project_id
      FROM projects p
      WHERE EXISTS (
        SELECT 1 FROM org_roles or1 
        WHERE or1.user_id = p_user_id 
        AND or1.org_id = p.org_id 
        AND or1.can_access_all_projects = true
      )
    ) AS accessible_projects
  )
  SELECT json_object_agg(scope_type, json_build_object('ids', scope_ids, 'default', default_id))
  INTO v_scope_data
  FROM scope_aggregation;

  -- =====================================================
  -- Build final result with legacy compatibility
  -- =====================================================
  v_result := json_build_object(
    'profile', v_profile,
    
    -- New structured data
    'roles_data', COALESCE(v_roles_data, '{}'::json),
    'scope_data', COALESCE(v_scope_data, '{}'::json),
    
    -- Legacy compatibility fields
    'system_roles', COALESCE(v_roles_data->'system'->>'roles', '[]')::json,
    'org_roles', COALESCE(v_roles_data->'org'->>'details', '[]')::json,
    'project_roles', COALESCE(v_roles_data->'project'->>'details', '[]')::json,
    'organizations', COALESCE(v_scope_data->'organizations'->>'ids', '[]')::json,
    'projects', COALESCE(v_scope_data->'projects'->>'ids', '[]')::json,
    'default_org', v_scope_data->'organizations'->>'default',
    
    -- Legacy flattened roles for backward compatibility
    'roles', (
      SELECT COALESCE(json_agg(DISTINCT role_name), '[]'::json)
      FROM (
        -- System roles
        SELECT jsonb_array_elements_text(COALESCE(v_roles_data->'system'->>'roles', '[]')::jsonb) as role_name
        
        UNION
        
        -- Org roles (strip org_ prefix for legacy compatibility)
        SELECT CASE 
          WHEN role_name LIKE 'org_%' THEN substring(rol