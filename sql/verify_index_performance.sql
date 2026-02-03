-- Verify Critical Database Indexes Performance Impact
-- Run this before and after index deployment to measure improvement

-- 1. Check if all critical indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
AND tablename IN (
  'user_profiles', 'user_roles', 'org_roles', 'project_roles',
  'org_memberships', 'project_memberships', 'organizations', 'projects'
)
ORDER BY tablename, indexname;

-- 2. Measure query performance for auth operations
-- This query simulates the main auth lookup pattern

EXPLAIN ANALYZE
SELECT 
  up.id,
  up.email,
  up.is_active,
  up.is_super_admin,
  ur.role,
  ur.org_id,
  ur.project_id,
  om.organization_id,
  pm.project_id
FROM user_profiles up
LEFT JOIN user_roles ur ON up.id = ur.user_id
LEFT JOIN org_memberships om ON up.id = om.user_id
LEFT JOIN project_memberships pm ON up.id = pm.user_id
WHERE up.email = 'test@example.com'
AND up.is_active = true
LIMIT 1;

-- 3. Check scoped roles query performance
EXPLAIN ANALYZE
SELECT 
  ur.user_id,
  ur.role,
  ur.org_id,
  ur.project_id
FROM org_roles ur
WHERE ur.user_id = '00000000-0000-0000-0000-000000000000'
AND ur.org_id IS NOT NULL;

-- 4. Check project roles query performance
EXPLAIN ANALYZE
SELECT 
  pr.user_id,
  pr.role,
  pr.org_id,
  pr.project_id
FROM project_roles pr
WHERE pr.user_id = '00000000-0000-0000-0000-000000000000'
AND pr.project_id IS NOT NULL;

-- 5. Index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_scan = 0 THEN 'Not used'
    WHEN idx_tup_read = 0 THEN 'Unused'
    ELSE 'Active'
  END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'user_profiles', 'user_roles', 'org_roles', 'project_roles',
  'org_memberships', 'project_memberships', 'organizations', 'projects'
)
ORDER BY idx_scan DESC;

-- 6. Table size and index size comparison
SELECT 
  t.tablename,
  pg_size_pretty(pg_total_relation_size(t.tablename::regclass)) as total_size,
  pg_size_pretty(pg_relation_size(t.tablename::regclass)) as table_size,
  pg_size_pretty(pg_total_relation_size(t.tablename::regclass) - pg_relation_size(t.tablename::regclass)) as indexes_size,
  (SELECT count(*) FROM pg_indexes WHERE tablename = t.tablename AND schemaname = 'public') as index_count
FROM pg_tables t
WHERE schemaname = 'public'
AND t.tablename IN (
  'user_profiles', 'user_roles', 'org_roles', 'project_roles',
  'org_memberships', 'project_memberships', 'organizations', 'projects'
)
ORDER BY pg_total_relation_size(t.tablename::regclass) DESC;

-- 7. Missing indexes analysis
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN (
  'user_profiles', 'user_roles', 'org_roles', 'project_roles',
  'org_memberships', 'project_memberships', 'organizations', 'projects'
)
AND n_distinct > 100
ORDER BY tablename, n_distinct DESC;
