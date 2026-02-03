-- =====================================================
-- CRITICAL AUTH INDEXES - PHASE 1 PERFORMANCE OPTIMIZATION
-- =====================================================
-- Date: February 1, 2026
-- Purpose: Create missing critical indexes for authentication performance
-- Impact: Expected 50-70% query performance improvement
-- Part of: Enterprise Auth Performance Optimization Spec
-- =====================================================

-- Check current index status first
DO $check_indexes$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CHECKING CURRENT INDEX STATUS';
  RAISE NOTICE '==============================================';
END $check_indexes$;

-- Display current indexes on scoped roles tables
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('org_roles', 'project_roles', 'system_roles', 'user_profiles', 'organizations', 'projects')
ORDER BY tablename, indexname;

-- =====================================================
-- 1. SCOPED ROLES INDEXES (CRITICAL - Phase 6 Migration)
-- =====================================================

-- Verify and create org_roles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_roles_user_org_composite 
ON org_roles(user_id, org_id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_roles_org_access_projects 
ON org_roles(org_id, can_access_all_projects) 
WHERE can_access_all_projects = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_roles_user_active 
ON org_roles(user_id) 
WHERE created_at IS NOT NULL;

-- Verify and create project_roles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_roles_user_project_composite 
ON project_roles(user_id, project_id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_roles_project_users 
ON project_roles(project_id, user_id);

-- Verify and create system_roles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_roles_user_role_composite 
ON system_roles(user_id, role);

-- =====================================================
-- 2. LEGACY TABLES INDEXES (Still needed during migration)
-- =====================================================

-- User roles indexes for legacy compatibility
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_org_legacy 
ON user_roles(user_id, org_id) 
WHERE org_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_project_legacy 
ON user_roles(user_id, project_id) 
WHERE project_id IS NOT NULL;

-- Organization memberships indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_memberships_user_org_role 
ON org_memberships(user_id, org_id, role);

-- Project memberships indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_memberships_user_project_role 
ON project_memberships(user_id, project_id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_memberships_org_projects 
ON project_memberships(org_id, project_id);

-- =====================================================
-- 3. CORE TABLES PERFORMANCE INDEXES
-- =====================================================

-- User profiles optimized indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email_active 
ON user_profiles(email) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_super_admin 
ON user_profiles(id) 
WHERE is_super_admin = true;

-- Organizations performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_active_code 
ON organizations(code, id) 
WHERE is_active = true;

-- Projects performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org_active 
ON projects(org_id, id) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_name_search 
ON projects(name, org_id) 
WHERE is_active = true;

-- =====================================================
-- 4. COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- Multi-table join optimization for get_user_auth_data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_roles_with_org_details 
ON org_roles(user_id, org_id, role, can_access_all_projects, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_roles_with_project_details 
ON project_roles(user_id, project_id, role, created_at);

-- Permission checking optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org_user_access 
ON projects(org_id, is_active, id);

-- =====================================================
-- 5. SPECIALIZED INDEXES FOR SCOPED ACCESS PATTERNS
-- =====================================================

-- Org-level project access pattern (can_access_all_projects = true)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_roles_all_projects_access 
ON org_roles(user_id, org_id) 
WHERE can_access_all_projects = true;

-- Project access via org roles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_for_org_access 
ON projects(org_id, is_active, id, name);

-- System admin bypass patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_roles_super_admin 
ON system_roles(user_id) 
WHERE role = 'super_admin';

-- =====================================================
-- 6. VERIFICATION AND STATISTICS
-- =====================================================

-- Update table statistics for query planner
ANALYZE org_roles;
ANALYZE project_roles;
ANALYZE system_roles;
ANALYZE user_profiles;
ANALYZE organizations;
ANALYZE projects;
ANALYZE user_roles;
ANALYZE org_memberships;
ANALYZE project_memberships;

-- Display created indexes
DO $display_indexes$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CRITICAL INDEXES CREATED SUCCESSFULLY';
  RAISE NOTICE '==============================================';
  
  -- Show index sizes
  RAISE NOTICE 'Index sizes:';
END $display_indexes$;

SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes 
WHERE tablename IN ('org_roles', 'project_roles', 'system_roles', 'user_profiles', 'organizations', 'projects')
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexname::regclass) DESC;

-- =====================================================
-- 7. PERFORMANCE IMPACT VALIDATION
-- =====================================================

-- Test query performance with new indexes
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.is_super_admin
FROM user_profiles up
WHERE up.email = 'test@example.com' 
  AND up.is_active = true;

-- Test scoped roles query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
  or1.role,
  or1.can_access_all_projects,
  o.name as org_name
FROM org_roles or1
JOIN organizations o ON o.id = or1.org_id
WHERE or1.user_id = (SELECT id FROM user_profiles LIMIT 1)
  AND o.is_active = true;

-- Test project access query performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT DISTINCT p.id, p.name
FROM projects p
WHERE p.org_id IN (
  SELECT or1.org_id 
  FROM org_roles or1 
  WHERE or1.user_id = (SELECT id FROM user_profiles LIMIT 1)
    AND or1.can_access_all_projects = true
)
UNION
SELECT p.id, p.name
FROM projects p
JOIN project_roles pr ON pr.project_id = p.id
WHERE pr.user_id = (SELECT id FROM user_profiles LIMIT 1);

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

DO $completion$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CRITICAL AUTH INDEXES DEPLOYMENT COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Expected Performance Improvements:';
  RAISE NOTICE '- Auth queries: 50-70%% faster';
  RAISE NOTICE '- Scoped role lookups: 60-80%% faster';
  RAISE NOTICE '- Permission checks: 40-60%% faster';
  RAISE NOTICE '- Overall auth load time: 220ms → 120-150ms';
  RAISE NOTICE '==============================================';
END $completion$;