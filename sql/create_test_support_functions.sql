-- =====================================================
-- TEST SUPPORT FUNCTIONS FOR PROPERTY-BASED TESTING
-- =====================================================
-- Date: February 1, 2026
-- Purpose: Support functions for database index optimization property tests
-- Part of: Enterprise Auth Performance Optimization Spec
-- =====================================================

-- Function to get active query count for performance testing
CREATE OR REPLACE FUNCTION get_active_query_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO query_count
  FROM pg_stat_activity
  WHERE state = 'active'
    AND query NOT LIKE '%pg_stat_activity%'
    AND query NOT LIKE '%get_active_query_count%';
  
  RETURN COALESCE(query_count, 0);
END;
$$;

-- Optimized authentication data function (consolidates 8 queries into 4)
CREATE OR REPLACE FUNCTION get_user_auth_data_optimized(
  p_user_id UUID,
  p_org_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  user_data JSON;
  org_data JSON;
  project_data JSON;
  role_data JSON;
BEGIN
  -- Query 1: User profile with system roles (consolidated)
  SELECT json_build_object(
    'id', up.id,
    'email', up.email,
    'full_name', up.full_name,
    'is_active', up.is_active,
    'is_super_admin', up.is_super_admin,
    'system_roles', COALESCE(
      (SELECT json_agg(sr.role) 
       FROM system_roles sr 
       WHERE sr.user_id = up.id), 
      '[]'::json
    )
  )
  INTO user_data
  FROM user_profiles up
  WHERE up.id = p_user_id;
  
  -- Query 2: Organization data with roles (consolidated)
  SELECT json_agg(
    json_build_object(
      'id', o.id,
      'name', o.name,
      'code', o.code,
      'is_active', o.is_active,
      'user_role', or1.role,
      'can_access_all_projects', or1.can_access_all_projects
    )
  )
  INTO org_data
  FROM organizations o
  LEFT JOIN org_roles or1 ON or1.org_id = o.id AND or1.user_id = p_user_id
  WHERE o.is_active = true
    AND (p_org_id IS NULL OR o.id = p_org_id)
    AND (or1.user_id IS NOT NULL OR EXISTS(
      SELECT 1 FROM system_roles sr 
      WHERE sr.user_id = p_user_id AND sr.role = 'super_admin'
    ));
  
  -- Query 3: Project data with roles (consolidated)
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'org_id', p.org_id,
      'is_active', p.is_active,
      'user_role', pr.role,
      'access_via_org', CASE 
        WHEN or1.can_access_all_projects = true THEN true 
        ELSE false 
      END
    )
  )
  INTO project_data
  FROM projects p
  LEFT JOIN project_roles pr ON pr.project_id = p.id AND pr.user_id = p_user_id
  LEFT JOIN org_roles or1 ON or1.org_id = p.org_id 
    AND or1.user_id = p_user_id 
    AND or1.can_access_all_projects = true
  WHERE p.is_active = true
    AND (p_project_id IS NULL OR p.id = p_project_id)
    AND (
      pr.user_id IS NOT NULL 
      OR or1.user_id IS NOT NULL 
      OR EXISTS(
        SELECT 1 FROM system_roles sr 
        WHERE sr.user_id = p_user_id AND sr.role = 'super_admin'
      )
    );
  
  -- Query 4: Consolidated role summary
  SELECT json_build_object(
    'org_roles', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'org_id', org_id,
          'role', role,
          'can_access_all_projects', can_access_all_projects
        )
      ) FROM org_roles WHERE user_id = p_user_id),
      '[]'::json
    ),
    'project_roles', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'project_id', project_id,
          'role', role
        )
      ) FROM project_roles WHERE user_id = p_user_id),
      '[]'::json
    )
  )
  INTO role_data;
  
  -- Build final result
  result := json_build_object(
    'user', user_data,
    'organizations', COALESCE(org_data, '[]'::json),
    'projects', COALESCE(project_data, '[]'::json),
    'roles', role_data
  );
  
  RETURN result;
END;
$$;

-- Function to validate index usage in query plans
CREATE OR REPLACE FUNCTION validate_index_usage(
  p_query_text TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_result JSON;
  index_usage BOOLEAN := false;
BEGIN
  -- Execute EXPLAIN to get query plan
  EXECUTE 'EXPLAIN (FORMAT JSON) ' || p_query_text INTO plan_result;
  
  -- Check if indexes are being used
  SELECT EXISTS(
    SELECT 1 
    FROM json_array_elements(plan_result->'Plan'->'Plans') AS plan
    WHERE plan->>'Node Type' LIKE '%Index%'
  ) INTO index_usage;
  
  RETURN json_build_object(
    'uses_indexes', index_usage,
    'plan', plan_result
  );
END;
$$;

-- Function to measure query execution time
CREATE OR REPLACE FUNCTION measure_query_time(
  p_query_text TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  execution_time INTERVAL;
  result JSON;
BEGIN
  start_time := clock_timestamp();
  
  -- Execute the query
  EXECUTE p_query_text;
  
  end_time := clock_timestamp();
  execution_time := end_time - start_time;
  
  RETURN json_build_object(
    'execution_time_ms', EXTRACT(milliseconds FROM execution_time),
    'start_time', start_time,
    'end_time', end_time
  );
END;
$$;

-- Function to get database performance statistics
CREATE OR REPLACE FUNCTION get_db_performance_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'cache_hit_ratio', ROUND(
      (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
    ),
    'active_connections', (
      SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
    ),
    'index_usage', json_agg(
      json_build_object(
        'table_name', schemaname || '.' || tablename,
        'index_name', indexname,
        'index_size', pg_size_pretty(pg_relation_size(indexname::regclass))
      )
    )
  )
  INTO stats
  FROM pg_statio_user_tables
  WHERE schemaname = 'public'
    AND (heap_blks_hit + heap_blks_read) > 0;
  
  RETURN stats;
END;
$$;

-- Function to create test data for property testing
CREATE OR REPLACE FUNCTION create_test_auth_data(
  p_user_count INTEGER DEFAULT 10,
  p_org_count INTEGER DEFAULT 5,
  p_project_count INTEGER DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_data JSON;
  user_ids UUID[];
  org_ids UUID[];
  project_ids UUID[];
  i INTEGER;
BEGIN
  -- Create test users
  FOR i IN 1..p_user_count LOOP
    INSERT INTO user_profiles (email, full_name, is_active)
    VALUES (
      'test.user.' || i || '@property.test',
      'Test User ' || i,
      true
    )
    RETURNING id INTO user_ids[i];
  END LOOP;
  
  -- Create test organizations
  FOR i IN 1..p_org_count LOOP
    INSERT INTO organizations (name, code, is_active)
    VALUES (
      'Test Org ' || i,
      'TEST' || i,
      true
    )
    RETURNING id INTO org_ids[i];
  END LOOP;
  
  -- Create test projects
  FOR i IN 1..p_project_count LOOP
    INSERT INTO projects (name, org_id, is_active)
    VALUES (
      'Test Project ' || i,
      org_ids[(i % p_org_count) + 1],
      true
    )
    RETURNING id INTO project_ids[i];
  END LOOP;
  
  -- Create test role assignments
  FOR i IN 1..p_user_count LOOP
    -- Assign org roles
    INSERT INTO org_roles (user_id, org_id, role, can_access_all_projects)
    VALUES (
      user_ids[i],
      org_ids[(i % p_org_count) + 1],
      CASE (i % 4)
        WHEN 0 THEN 'admin'
        WHEN 1 THEN 'manager'
        WHEN 2 THEN 'member'
        ELSE 'viewer'
      END,
      (i % 3 = 0) -- Every 3rd user gets all project access
    );
    
    -- Assign project roles
    INSERT INTO project_roles (user_id, project_id, role)
    VALUES (
      user_ids[i],
      project_ids[(i % p_project_count) + 1],
      CASE (i % 3)
        WHEN 0 THEN 'project_manager'
        WHEN 1 THEN 'contributor'
        ELSE 'viewer'
      END
    );
  END LOOP;
  
  -- Return created data summary
  created_data := json_build_object(
    'users_created', p_user_count,
    'orgs_created', p_org_count,
    'projects_created', p_project_count,
    'user_ids', array_to_json(user_ids),
    'org_ids', array_to_json(org_ids),
    'project_ids', array_to_json(project_ids)
  );
  
  RETURN created_data;
END;
$$;

-- Function to cleanup test data
CREATE OR REPLACE FUNCTION cleanup_test_auth_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete test role assignments
  DELETE FROM org_roles WHERE user_id IN (
    SELECT id FROM user_profiles WHERE email LIKE '%@property.test'
  );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM project_roles WHERE user_id IN (
    SELECT id FROM user_profiles WHERE email LIKE '%@property.test'
  );
  
  DELETE FROM system_roles WHERE user_id IN (
    SELECT id FROM user_profiles WHERE email LIKE '%@property.test'
  );
  
  -- Delete test projects
  DELETE FROM projects WHERE name LIKE 'Test Project %';
  
  -- Delete test organizations
  DELETE FROM organizations WHERE name LIKE 'Test Org %';
  
  -- Delete test users
  DELETE FROM user_profiles WHERE email LIKE '%@property.test';
  
  RETURN deleted_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_active_query_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_auth_data_optimized(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_index_usage(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION measure_query_time(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_db_performance_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION create_test_auth_data(INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_test_auth_data() TO authenticated;

-- Create indexes for test support functions if they don't exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_test_email 
ON user_profiles(email) WHERE email LIKE '%@property.test';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_test_name 
ON organizations(name) WHERE name LIKE 'Test Org %';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_test_name 
ON projects(name) WHERE name LIKE 'Test Project %';

-- Update statistics
ANALYZE user_profiles;
ANALYZE organizations;
ANALYZE projects;
ANALYZE org_roles;
ANALYZE project_roles;
ANALYZE system_roles;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Test support functions created successfully';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '- get_active_query_count()';
  RAISE NOTICE '- get_user_auth_data_optimized()';
  RAISE NOTICE '- validate_index_usage()';
  RAISE NOTICE '- measure_query_time()';
  RAISE NOTICE '- get_db_performance_stats()';
  RAISE NOTICE '- create_test_auth_data()';
  RAISE NOTICE '- cleanup_test_auth_data()';
END $$;