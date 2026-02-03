-- Test Optimized RPC Functions
-- Run this after deploying the optimized RPC functions

-- =====================================================
-- 1. TEST: get_user_auth_data_optimized
-- =====================================================

-- Get a test user
WITH test_user AS (
  SELECT id, email FROM user_profiles LIMIT 1
)
SELECT 
  'get_user_auth_data_optimized' as test_name,
  (SELECT id FROM test_user) as user_id,
  (SELECT email FROM test_user) as user_email,
  get_user_auth_data_optimized((SELECT id FROM test_user)) as result;

-- =====================================================
-- 2. TEST: validate_permissions_batch
-- =====================================================

-- Get a test user
WITH test_user AS (
  SELECT id FROM user_profiles LIMIT 1
)
SELECT 
  'validate_permissions_batch' as test_name,
  (SELECT id FROM test_user) as user_id,
  validate_permissions_batch(
    (SELECT id FROM test_user),
    '[
      {"resource": "transactions", "action": "read"},
      {"resource": "reports", "action": "write"},
      {"resource": "admin", "action": "manage"}
    ]'::json
  ) as result;

-- =====================================================
-- 3. TEST: get_role_hierarchy_cached
-- =====================================================

-- Get a test user
WITH test_user AS (
  SELECT id FROM user_profiles LIMIT 1
)
SELECT 
  'get_role_hierarchy_cached' as test_name,
  (SELECT id FROM test_user) as user_id,
  get_role_hierarchy_cached((SELECT id FROM test_user), 'all') as result;

-- =====================================================
-- 4. PERFORMANCE COMPARISON
-- =====================================================

-- Compare execution times: Original vs Optimized
-- This requires having both old and new functions available

-- Test optimized function performance
WITH perf_test AS (
  SELECT 
    'optimized' as version,
    COUNT(*) as iterations,
    AVG(EXTRACT(milliseconds FROM (get_user_auth_data_optimized(up.id)->>'execution_time_ms')::numeric)) as avg_time_ms,
    MAX(EXTRACT(milliseconds FROM (get_user_auth_data_optimized(up.id)->>'execution_time_ms')::numeric)) as max_time_ms,
    MIN(EXTRACT(milliseconds FROM (get_user_auth_data_optimized(up.id)->>'execution_time_ms')::numeric)) as min_time_ms
  FROM user_profiles up
  WHERE up.is_active = true
  LIMIT 10
)
SELECT * FROM perf_test;

-- =====================================================
-- 5. VERIFY FUNCTION CORRECTNESS
-- =====================================================

-- Verify that optimized function returns same data as original queries
WITH test_user AS (
  SELECT id FROM user_profiles WHERE is_active = true LIMIT 1
),
optimized_result AS (
  SELECT get_user_auth_data_optimized((SELECT id FROM test_user)) as data
),
user_data AS (
  SELECT 
    up.id,
    up.email,
    up.full_name,
    up.is_active,
    up.is_super_admin
  FROM user_profiles up
  WHERE up.id = (SELECT id FROM test_user)
)
SELECT 
  'User Data Verification' as check_name,
  CASE 
    WHEN (optimized_result.data->>'user'->>'id')::uuid = user_data.id THEN 'PASS'
    ELSE 'FAIL'
  END as result,
  user_data.id as expected_user_id,
  (optimized_result.data->>'user'->>'id')::uuid as actual_user_id
FROM optimized_result, user_data;

-- =====================================================
-- 6. BATCH PERMISSION VALIDATION TEST
-- =====================================================

-- Test batch permission validation with various scenarios
WITH test_user AS (
  SELECT id FROM user_profiles WHERE is_active = true LIMIT 1
),
batch_test AS (
  SELECT validate_permissions_batch(
    (SELECT id FROM test_user),
    '[
      {"resource": "transactions", "action": "read", "context": {"org_id": null}},
      {"resource": "transactions", "action": "write", "context": {"org_id": null}},
      {"resource": "reports", "action": "read", "context": {"org_id": null}},
      {"resource": "reports", "action": "export", "context": {"org_id": null}},
      {"resource": "admin", "action": "manage", "context": {"org_id": null}}
    ]'::json
  ) as result
)
SELECT 
  'Batch Permission Test' as test_name,
  batch_test.result->>'batch_size' as batch_size,
  batch_test.result->>'execution_time_ms' as execution_time_ms,
  batch_test.result->'results' as permission_results
FROM batch_test;

-- =====================================================
-- 7. ROLE HIERARCHY TEST
-- =====================================================

-- Test role hierarchy retrieval
WITH test_user AS (
  SELECT id FROM user_profiles WHERE is_active = true LIMIT 1
),
hierarchy_test AS (
  SELECT get_role_hierarchy_cached(
    (SELECT id FROM test_user),
    'all'
  ) as result
)
SELECT 
  'Role Hierarchy Test' as test_name,
  hierarchy_test.result->>'user_id' as user_id,
  hierarchy_test.result->>'scope' as scope,
  json_array_length(hierarchy_test.result->'org_hierarchy') as org_roles_count,
  json_array_length(hierarchy_test.result->'project_hierarchy') as project_roles_count,
  json_array_length(hierarchy_test.result->'system_hierarchy') as system_roles_count,
  hierarchy_test.result->>'execution_time_ms' as execution_time_ms
FROM hierarchy_test;

-- =====================================================
-- 8. PERFORMANCE STATISTICS
-- =====================================================

-- Get performance statistics if available
SELECT 
  'Performance Statistics' as metric,
  get_auth_performance_stats(24) as stats;

-- =====================================================
-- 9. FUNCTION METADATA
-- =====================================================

-- List all optimized auth functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_user_auth_data_optimized',
  'validate_permissions_batch',
  'get_role_hierarchy_cached',
  'track_auth_performance',
  'get_auth_performance_stats'
)
ORDER BY routine_name;

-- =====================================================
-- 10. QUERY PLAN ANALYSIS
-- =====================================================

-- Analyze query plan for optimized function
EXPLAIN ANALYZE
SELECT get_user_auth_data_optimized(
  (SELECT id FROM user_profiles LIMIT 1)
);

-- Analyze query plan for batch validation
EXPLAIN ANALYZE
SELECT validate_permissions_batch(
  (SELECT id FROM user_profiles LIMIT 1),
  '[{"resource": "transactions", "action": "read"}]'::json
);

-- Analyze query plan for role hierarchy
EXPLAIN ANALYZE
SELECT get_role_hierarchy_cached(
  (SELECT id FROM user_profiles LIMIT 1),
  'all'
);
