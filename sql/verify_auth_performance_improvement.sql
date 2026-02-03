-- =====================================================
-- AUTH PERFORMANCE VERIFICATION SCRIPT
-- =====================================================
-- Date: February 1, 2026
-- Purpose: Verify performance improvements from critical indexes
-- Part of: Enterprise Auth Performance Optimization Spec
-- =====================================================

-- Set up timing and performance tracking
\timing on
SET track_io_timing = on;
SET log_min_duration_statement = 0;

-- =====================================================
-- 1. BASELINE PERFORMANCE TESTS
-- =====================================================

DO $performance_test$
DECLARE
  v_start_time timestamp;
  v_end_time timestamp;
  v_duration interval;
  v_test_user_id uuid;
  v_result json;
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'AUTH PERFORMANCE VERIFICATION TESTS';
  RAISE NOTICE '==============================================';
  
  -- Get a test user ID
  SELECT id INTO v_test_user_id FROM user_profiles LIMIT 1;
  
  IF v_test_user_id IS NULL THEN
    RAISE NOTICE 'No test users found. Creating test user...';
    INSERT INTO user_profiles (email, full_name, is_active)
    VALUES ('performance.test@example.com', 'Performance Test User', true)
    RETURNING id INTO v_test_user_id;
  END IF;
  
  RAISE NOTICE 'Using test user ID: %', v_test_user_id;
  RAISE NOTICE '';
  
  -- =====================================================
  -- Test 1: get_user_auth_data Performance
  -- =====================================================
  RAISE NOTICE '1. Testing get_user_auth_data RPC function performance...';
  v_start_time := clock_timestamp();
  
  SELECT get_user_auth_data(v_test_user_id) INTO v_result;
  
  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;
  
  RAISE NOTICE '   Duration: % ms', EXTRACT(milliseconds FROM v_duration);
  RAISE NOTICE '   Target: < 150ms (down from 220ms baseline)';
  RAISE NOTICE '   Status: %', 
    CASE 
      WHEN EXTRACT(milliseconds FROM v_duration) < 150 THEN '✅ PASS'
      WHEN EXTRACT(milliseconds FROM v_duration) < 180 THEN '⚠️  IMPROVED'
      ELSE '❌ NEEDS WORK'
    END;
  RAISE NOTICE '';
  
  -- =====================================================
  -- Test 2: Scoped Roles Query Performance
  -- =====================================================
  RAISE NOTICE '2. Testing scoped roles query performance...';
  v_start_time := clock_timestamp();
  
  PERFORM 
    or1.role,
    or1.can_access_all_projects,
    o.name as org_name
  FROM org_roles or1
  JOIN organizations o ON o.id = or1.org_id
  WHERE or1.user_id = v_test_user_id
    AND o.is_active = true;
  
  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;
  
  RAISE NOTICE '   Duration: % ms', EXTRACT(milliseconds FROM v_duration);
  RAISE NOTICE '   Target: < 30ms (down from 45ms baseline)';
  RAISE NOTICE '   Status: %', 
    CASE 
      WHEN EXTRACT(milliseconds FROM v_duration) < 30 THEN '✅ PASS'
      WHEN EXTRACT(milliseconds FROM v_duration) < 40 THEN '⚠️  IMPROVED'
      ELSE '❌ NEEDS WORK'
    END;
  RAISE NOTICE '';
  
  -- =====================================================
  -- Test 3: Project Access Query Performance
  -- =====================================================
  RAISE NOTICE '3. Testing project access query performance...';
  v_start_time := clock_timestamp();
  
  PERFORM DISTINCT p.id, p.name
  FROM projects p
  WHERE p.org_id IN (
    SELECT or1.org_id 
    FROM org_roles or1 
    WHERE or1.user_id = v_test_user_id
      AND or1.can_access_all_projects = true
  )
  UNION
  SELECT p.id, p.name
  FROM projects p
  JOIN project_roles pr ON pr.project_id = p.id
  WHERE pr.user_id = v_test_user_id;
  
  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;
  
  RAISE NOTICE '   Duration: % ms', EXTRACT(milliseconds FROM v_duration);
  RAISE NOTICE '   Target: < 40ms (down from 60ms baseline)';
  RAISE NOTICE '   Status: %', 
    CASE 
      WHEN EXTRACT(milliseconds FROM v_duration) < 40 THEN '✅ PASS'
      WHEN EXTRACT(milliseconds FROM v_duration) < 50 THEN '⚠️  IMPROVED'
      ELSE '❌ NEEDS WORK'
    END;
  RAISE NOTICE '';
  
  -- =====================================================
  -- Test 4: Permission Check Performance
  -- =====================================================
  RAISE NOTICE '4. Testing permission check performance...';
  v_start_time := clock_timestamp();
  
  PERFORM is_super_admin(v_test_user_id);
  PERFORM has_org_role(v_test_user_id, (SELECT id FROM organizations LIMIT 1), 'org_admin');
  PERFORM has_project_role(v_test_user_id, (SELECT id FROM projects LIMIT 1), 'project_manager');
  
  v_end_time := clock_timestamp();
  v_duration := v_end_time - v_start_time;
  
  RAISE NOTICE '   Duration: % ms', EXTRACT(milliseconds FROM v_duration);
  RAISE NOTICE '   Target: < 15ms (down from 25ms baseline)';
  RAISE NOTICE '   Status: %', 
    CASE 
      WHEN EXTRACT(milliseconds FROM v_duration) < 15 THEN '✅ PASS'
      WHEN EXTRACT(milliseconds FROM v_duration) < 20 THEN '⚠️  IMPROVED'
      ELSE '❌ NEEDS WORK'
    END;
  RAISE NOTICE '';
  
END $performance_test$;

-- =====================================================
-- 2. INDEX USAGE VERIFICATION
-- =====================================================

RAISE NOTICE '==============================================';
RAISE NOTICE 'INDEX USAGE VERIFICATION';
RAISE NOTICE '==============================================';

-- Check if indexes are being used in query plans
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT get_user_auth_data((SELECT id FROM user_profiles LIMIT 1));

-- =====================================================
-- 3. CACHE HIT RATIO CHECK
-- =====================================================

RAISE NOTICE '==============================================';
RAISE NOTICE 'DATABASE CACHE STATISTICS';
RAISE NOTICE '==============================================';

SELECT 
  'Buffer Cache Hit Ratio' as metric,
  ROUND(
    (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
  ) as percentage
FROM pg_statio_user_tables
WHERE schemaname = 'public'
  AND (heap_blks_hit + heap_blks_read) > 0;

-- =====================================================
-- 4. TABLE AND INDEX SIZES
-- =====================================================

RAISE NOTICE '==============================================';
RAISE NOTICE 'TABLE AND INDEX SIZES';
RAISE NOTICE '==============================================';

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('org_roles', 'project_roles', 'system_roles', 'user_profiles', 'organizations', 'projects')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 5. PERFORMANCE SUMMARY
-- =====================================================

DO $summary$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'PERFORMANCE OPTIMIZATION SUMMARY';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Expected Improvements from Index Creation:';
  RAISE NOTICE '- Auth load time: 220ms → 120-150ms (32-45%% improvement)';
  RAISE NOTICE '- Scoped role queries: 45ms → 25-30ms (33-44%% improvement)';
  RAISE NOTICE '- Project access queries: 60ms → 35-40ms (33-42%% improvement)';
  RAISE NOTICE '- Permission checks: 25ms → 10-15ms (40-60%% improvement)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Monitor performance in production';
  RAISE NOTICE '2. Implement RPC function optimizations';
  RAISE NOTICE '3. Add service layer caching';
  RAISE NOTICE '4. Optimize UI component rendering';
  RAISE NOTICE '==============================================';
END $summary$;