-- =====================================================
-- COMPLETE SCHEMA DISCOVERY FOR PERFORMANCE ANALYSIS
-- =====================================================
-- Purpose: Get current database schema for auth performance analysis
-- Date: January 31, 2026
-- =====================================================

-- 1. DISCOVER ALL TABLES AND THEIR STRUCTURE
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. GET DETAILED COLUMN INFORMATION FOR AUTH-RELATED TABLES
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
        ELSE ''
    END as key_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE t.table_schema = 'public'
AND t.table_name IN (
    'user_profiles',
    'organizations', 
    'projects',
    'org_memberships',
    'project_memberships',
    'user_roles',
    'roles',
    'system_roles',
    'org_roles', 
    'project_roles',
    'access_requests'
)
ORDER BY t.table_name, c.ordinal_position;

-- 3. DISCOVER INDEXES ON AUTH-RELATED TABLES
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'user_profiles',
    'organizations', 
    'projects',
    'org_memberships',
    'project_memberships',
    'user_roles',
    'roles',
    'system_roles',
    'org_roles', 
    'project_roles'
)
ORDER BY tablename, indexname;

-- 4. DISCOVER ALL RPC FUNCTIONS RELATED TO AUTH
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%auth%' 
OR p.proname LIKE '%user%'
OR p.proname LIKE '%org%'
OR p.proname LIKE '%project%'
OR p.proname LIKE '%role%'
ORDER BY p.proname;

-- 5. CHECK FOR SCOPED ROLES TABLES (LATEST IMPLEMENTATION)
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('system_roles', 'org_roles', 'project_roles')
ORDER BY table_name, ordinal_position;

-- 6. DISCOVER FOREIGN KEY RELATIONSHIPS
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN (
    'user_profiles',
    'organizations', 
    'projects',
    'org_memberships',
    'project_memberships',
    'user_roles',
    'roles',
    'system_roles',
    'org_roles', 
    'project_roles'
)
ORDER BY tc.table_name, kcu.column_name;

-- 7. CHECK CURRENT RLS POLICIES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'user_profiles',
    'organizations', 
    'projects',
    'org_memberships',
    'project_memberships',
    'user_roles',
    'roles',
    'system_roles',
    'org_roles', 
    'project_roles'
)
ORDER BY tablename, policyname;

-- 8. GET SAMPLE DATA FROM KEY TABLES (FIRST 3 ROWS)
-- Organizations
SELECT 'organizations' as table_name, id, code, name, name_ar, is_active, created_at
FROM organizations 
LIMIT 3;

-- User Profiles
SELECT 'user_profiles' as table_name, id, email, first_name, last_name, full_name_ar, is_super_admin, created_at
FROM user_profiles 
LIMIT 3;

-- Org Memberships (if exists)
SELECT 'org_memberships' as table_name, user_id, org_id, can_access_all_projects, is_default, created_at
FROM org_memberships 
LIMIT 3;

-- System Roles (if exists)
SELECT 'system_roles' as table_name, user_id, role, created_at
FROM system_roles 
LIMIT 3;

-- Org Roles (if exists)  
SELECT 'org_roles' as table_name, user_id, org_id, role, can_access_all_projects, created_at
FROM org_roles 
LIMIT 3;

-- Project Roles (if exists)
SELECT 'project_roles' as table_name, user_id, project_id, role, created_at
FROM project_roles 
LIMIT 3;

-- 9. CHECK TABLE SIZES AND ROW COUNTS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN (
    'user_profiles',
    'organizations', 
    'projects',
    'org_memberships',
    'project_memberships',
    'user_roles',
    'roles',
    'system_roles',
    'org_roles', 
    'project_roles'
)
ORDER BY tablename, attname;

-- 10. GET ROW COUNTS FOR ALL AUTH TABLES
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as row_count
FROM user_profiles
UNION ALL
SELECT 
    'organizations' as table_name,
    COUNT(*) as row_count
FROM organizations
UNION ALL
SELECT 
    'projects' as table_name,
    COUNT(*) as row_count
FROM projects
UNION ALL
SELECT 
    'org_memberships' as table_name,
    COUNT(*) as row_count
FROM org_memberships
UNION ALL
SELECT 
    'project_memberships' as table_name,
    COUNT(*) as row_count
FROM project_memberships
UNION ALL
SELECT 
    'user_roles' as table_name,
    COUNT(*) as row_count
FROM user_roles
UNION ALL
SELECT 
    'roles' as table_name,
    COUNT(*) as row_count
FROM roles
UNION ALL
SELECT 
    'system_roles' as table_name,
    COUNT(*) as row_count
FROM system_roles
UNION ALL
SELECT 
    'org_roles' as table_name,
    COUNT(*) as row_count
FROM org_roles
UNION ALL
SELECT 
    'project_roles' as table_name,
    COUNT(*) as row_count
FROM project_roles;

-- =====================================================
-- PERFORMANCE ANALYSIS QUERIES
-- =====================================================

-- 11. TEST CURRENT get_user_auth_data PERFORMANCE
EXPLAIN ANALYZE 
SELECT get_user_auth_data(
    (SELECT id FROM user_profiles LIMIT 1)
);

-- 12. TEST ORGANIZATION LOADING PERFORMANCE
EXPLAIN ANALYZE
SELECT id, code, name, name_ar, is_active, created_at
FROM organizations
WHERE is_active = true
ORDER BY code;

-- 13. TEST USER ORG MEMBERSHIP QUERY PERFORMANCE
EXPLAIN ANALYZE
SELECT DISTINCT o.id, o.code, o.name, o.name_ar
FROM organizations o
JOIN org_memberships om ON om.org_id = o.id
WHERE om.user_id = (SELECT id FROM user_profiles LIMIT 1)
AND o.is_active = true
ORDER BY o.code;

-- 14. TEST PROJECT LOADING FOR SPECIFIC ORG PERFORMANCE
EXPLAIN ANALYZE
SELECT p.id, p.code, p.name, p.name_ar, p.org_id
FROM projects p
WHERE p.org_id = (SELECT id FROM organizations LIMIT 1)
AND p.status = 'active'
ORDER BY p.code;

-- 15. TEST USER PROJECT ACCESS QUERY PERFORMANCE
EXPLAIN ANALYZE
SELECT DISTINCT p.id, p.code, p.name, p.name_ar, p.org_id
FROM projects p
WHERE p.id IN (
    -- Direct project memberships
    SELECT pm.project_id 
    FROM project_memberships pm 
    WHERE pm.user_id = (SELECT id FROM user_profiles LIMIT 1)
    
    UNION
    
    -- Org-level access (can_access_all_projects = true)
    SELECT p2.id 
    FROM projects p2 
    JOIN org_memberships om2 ON om2.org_id = p2.org_id 
    WHERE om2.user_id = (SELECT id FROM user_profiles LIMIT 1)
      AND om2.can_access_all_projects = true
      AND p2.status = 'active'
)
ORDER BY p.code;

-- =====================================================
-- MIGRATION HISTORY CHECK
-- =====================================================

-- 16. CHECK LATEST MIGRATIONS APPLIED
SELECT 
    version,
    name,
    executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 10;

-- =====================================================
-- END OF SCHEMA DISCOVERY
-- =====================================================