-- Test get_user_auth_data RPC function performance with real data
-- This will help us understand actual performance characteristics

-- First, get a sample user ID for testing
WITH sample_user AS (
  SELECT id, email, full_name_ar 
  FROM user_profiles 
  LIMIT 1
)
SELECT 
  'Sample User Info' as test_type,
  id as user_id,
  email,
  full_name_ar
FROM sample_user;

-- Test the RPC function (you'll need to run this manually with the user ID from above)
-- SELECT get_user_auth_data('USER_ID_FROM_ABOVE');

-- Get indexes on auth-related tables
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
  'user_profiles', 'user_roles', 'organizations', 'projects',
  'org_memberships', 'project_memberships', 'org_roles', 'project_roles'
)
ORDER BY tablename, indexname;

-- Get RPC function definition
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_auth_data';

-- Analyze table statistics for performance insights
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  n_distinct,
  correlation,
  most_common_vals,
  most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public' 
AND tablename IN (
  'user_profiles', 'user_roles', 'organizations', 'projects',
  'org_memberships', 'project_memberships', 'org_roles', 'project_roles'
)
AND attname IN ('id', 'user_id', 'org_id', 'project_id', 'role')
ORDER BY tablename, attname;