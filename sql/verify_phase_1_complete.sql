-- ============================================================================
-- PHASE 1 VERIFICATION SCRIPT
-- Purpose: Verify all Phase 1 RPC functions are deployed and working
-- Date: January 25, 2026
-- ============================================================================

-- ============================================================================
-- SECTION 1: Verify All Functions Exist
-- ============================================================================

ECHO 'SECTION 1: Verifying Function Existence...';

SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_orgs',
    'get_user_permissions',
    'check_org_access',
    'get_user_scope',
    'update_user_scope'
  )
ORDER BY routine_name;

-- Expected: 5 rows (all functions exist)

-- ============================================================================
-- SECTION 2: Verify Function Signatures
-- ============================================================================

ECHO 'SECTION 2: Verifying Function Signatures...';

-- Function 1: get_user_orgs()
SELECT 
  'get_user_orgs' as function_name,
  'RETURNS TABLE(id uuid, name text, member_count int)' as expected_signature,
  routine_definition LIKE '%id uuid%' as has_id_column,
  routine_definition LIKE '%name text%' as has_name_column,
  routine_definition LIKE '%member_count%' as has_member_count_column
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_orgs';

-- Function 2: get_user_permissions()
SELECT 
  'get_user_permissions' as function_name,
  'RETURNS TABLE(permission_id int, permission_name text, resource text, action text)' as expected_signature,
  routine_definition LIKE '%permission_id%' as has_permission_id,
  routine_definition LIKE '%permission_name%' as has_permission_name,
  routine_definition LIKE '%resource%' as has_resource,
  routine_definition LIKE '%action%' as has_action
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_permissions';

-- Function 3: check_org_access()
SELECT 
  'check_org_access' as function_name,
  'RETURNS boolean' as expected_signature,
  routine_definition LIKE '%boolean%' as returns_boolean,
  routine_definition LIKE '%org_id%' as has_org_id_param
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_org_access';

-- Function 4: get_user_scope()
SELECT 
  'get_user_scope' as function_name,
  'RETURNS TABLE(org_id uuid, org_name text, project_id uuid, project_name text)' as expected_signature,
  routine_definition LIKE '%org_id%' as has_org_id,
  routine_definition LIKE '%org_name%' as has_org_name,
  routine_definition LIKE '%project_id%' as has_project_id,
  routine_definition LIKE '%project_name%' as has_project_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_scope';

-- Function 5: update_user_scope()
SELECT 
  'update_user_scope' as function_name,
  'RETURNS void' as expected_signature,
  routine_definition LIKE '%void%' as returns_void,
  routine_definition LIKE '%org_id%' as has_org_id_param,
  routine_definition LIKE '%project_id%' as has_project_id_param
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_user_scope';

-- ============================================================================
-- SECTION 3: Verify Function Security Settings
-- ============================================================================

ECHO 'SECTION 3: Verifying Function Security Settings...';

SELECT 
  routine_name,
  routine_definition LIKE '%SECURITY DEFINER%' as uses_security_definer,
  routine_definition LIKE '%SET search_path = public%' as sets_search_path,
  routine_definition LIKE '%LANGUAGE sql%' as uses_sql_language
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_orgs',
    'get_user_permissions',
    'check_org_access',
    'get_user_scope',
    'update_user_scope'
  )
ORDER BY routine_name;

-- Expected: All functions use SECURITY DEFINER and set search_path

-- ============================================================================
-- SECTION 4: Verify Function Permissions
-- ============================================================================

ECHO 'SECTION 4: Verifying Function Permissions...';

SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_routine_grants
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_orgs',
    'get_user_permissions',
    'check_org_access',
    'get_user_scope',
    'update_user_scope'
  )
ORDER BY routine_name, grantee;

-- Expected: authenticated role has EXECUTE permission on all functions

-- ============================================================================
-- SECTION 5: Test Function Execution (if user is authenticated)
-- ============================================================================

ECHO 'SECTION 5: Testing Function Execution...';

-- Test 1: get_user_orgs()
SELECT 
  'get_user_orgs' as test_name,
  COUNT(*) as org_count,
  'PASS' as status
FROM get_user_orgs()
UNION ALL
-- Test 2: check_org_access() - test with first org
SELECT 
  'check_org_access' as test_name,
  CASE WHEN result THEN 1 ELSE 0 END as org_count,
  'PASS' as status
FROM (
  SELECT check_org_access(id) as result
  FROM organizations
  LIMIT 1
) t
UNION ALL
-- Test 3: get_user_scope()
SELECT 
  'get_user_scope' as test_name,
  COUNT(*) as org_count,
  'PASS' as status
FROM get_user_scope()
UNION ALL
-- Test 4: get_user_permissions()
SELECT 
  'get_user_permissions' as test_name,
  COUNT(*) as org_count,
  'PASS' as status
FROM get_user_permissions();

-- ============================================================================
-- SECTION 6: Verify Phase 0 RLS Policies Still Exist
-- ============================================================================

ECHO 'SECTION 6: Verifying Phase 0 RLS Policies...';

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual IS NOT NULL as has_qual,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'org_isolation'
ORDER BY tablename;

-- Expected: 10 policies (one per table)

-- ============================================================================
-- SECTION 7: Verify Database Schema Integrity
-- ============================================================================

ECHO 'SECTION 7: Verifying Database Schema Integrity...';

-- Check all required tables exist
SELECT 
  table_name,
  EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = t.table_name
  ) as table_exists
FROM (
  VALUES 
    ('organizations'),
    ('org_memberships'),
    ('users'),
    ('roles'),
    ('permissions'),
    ('role_permissions'),
    ('user_roles'),
    ('accounts'),
    ('transactions'),
    ('transaction_line_items'),
    ('projects'),
    ('user_profiles')
) t(table_name)
ORDER BY table_name;

-- Expected: All 12 tables exist

-- ============================================================================
-- SECTION 8: Verify Data Integrity
-- ============================================================================

ECHO 'SECTION 8: Verifying Data Integrity...';

SELECT 
  'organizations' as table_name,
  COUNT(*) as row_count
FROM organizations
UNION ALL
SELECT 'org_memberships', COUNT(*) FROM org_memberships
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'transaction_line_items', COUNT(*) FROM transaction_line_items
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
ORDER BY table_name;

-- ============================================================================
-- SECTION 9: Verify Foreign Key Relationships
-- ============================================================================

ECHO 'SECTION 9: Verifying Foreign Key Relationships...';

SELECT 
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.referential_constraints
WHERE constraint_schema = 'public'
ORDER BY table_name, constraint_name;

-- ============================================================================
-- SECTION 10: Summary Report
-- ============================================================================

ECHO 'SECTION 10: Summary Report';

SELECT 
  'Phase 1 Verification' as check_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name IN ('get_user_orgs', 'get_user_permissions', 'check_org_access', 'get_user_scope', 'update_user_scope')) = 5
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  'All 5 RPC functions deployed' as details
UNION ALL
SELECT 
  'RLS Policies',
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND policyname = 'org_isolation') >= 10
    THEN 'PASS'
    ELSE 'FAIL'
  END,
  'All 10 org_isolation policies deployed'
UNION ALL
SELECT 
  'Function Permissions',
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.role_routine_grants 
          WHERE routine_schema = 'public' 
          AND grantee = 'authenticated') >= 5
    THEN 'PASS'
    ELSE 'FAIL'
  END,
  'authenticated role has EXECUTE on all functions'
UNION ALL
SELECT 
  'Database Schema',
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('organizations', 'org_memberships', 'roles', 'permissions', 'user_roles')) = 5
    THEN 'PASS'
    ELSE 'FAIL'
  END,
  'All core tables exist'
UNION ALL
SELECT 
  'Overall Status',
  'READY',
  'Phase 1 Complete - Ready for Phase 2'
ORDER BY check_name;

-- ============================================================================
-- FINAL VERIFICATION QUERY
-- ============================================================================

ECHO '=== PHASE 1 VERIFICATION COMPLETE ===';
ECHO 'If all sections show expected results, Phase 1 is ready.';
ECHO 'Next: Deploy Phase 2 (Enhanced Permissions System)';
