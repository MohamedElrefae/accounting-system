-- Phase 2 Verification Script
-- Run this in Supabase SQL Editor to verify all Phase 2 components are deployed

-- ============================================================================
-- 1. VERIFY AUDIT_LOG TABLE EXISTS
-- ============================================================================
SELECT 
  'AUDIT_LOG TABLE' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'audit_log' AND table_schema = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- ============================================================================
-- 2. VERIFY AUDIT_LOG TABLE STRUCTURE
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_log' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. VERIFY AUDIT_LOG INDEXES
-- ============================================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'audit_log' AND schemaname = 'public'
ORDER BY indexname;

-- ============================================================================
-- 4. VERIFY ALL PHASE 2 FUNCTIONS EXIST
-- ============================================================================
SELECT 
  'log_audit' as function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'log_audit' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'assign_role_to_user',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'assign_role_to_user' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'revoke_role_from_user',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'revoke_role_from_user' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'get_user_roles',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_user_roles' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'assign_permission_to_role',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'assign_permission_to_role' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'revoke_permission_from_role',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'revoke_permission_from_role' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'get_role_permissions',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_role_permissions' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
  'get_user_permissions_filtered',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_user_permissions_filtered' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
ORDER BY function_name;

-- ============================================================================
-- 5. VERIFY FUNCTION SIGNATURES
-- ============================================================================
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'log_audit',
    'assign_role_to_user',
    'revoke_role_from_user',
    'get_user_roles',
    'assign_permission_to_role',
    'revoke_permission_from_role',
    'get_role_permissions',
    'get_user_permissions_filtered'
  )
ORDER BY p.proname;

-- ============================================================================
-- 6. VERIFY RLS POLICIES ON AUDIT_LOG
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'audit_log' AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- 7. VERIFY AUDIT_LOG ROW LEVEL SECURITY IS ENABLED
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'audit_log' AND schemaname = 'public';

-- ============================================================================
-- 8. TEST: Count audit log entries
-- ============================================================================
SELECT 
  COUNT(*) as total_audit_entries,
  COUNT(DISTINCT org_id) as unique_orgs,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT action) as unique_actions,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM audit_log;

-- ============================================================================
-- 9. TEST: Sample audit log entries (last 10)
-- ============================================================================
SELECT 
  id,
  org_id,
  user_id,
  action,
  resource,
  resource_id,
  created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 10. VERIFY FUNCTION GRANTS
-- ============================================================================
SELECT 
  p.proname as function_name,
  (aclexplode(p.proacl)).grantee::regrole as grantee,
  (aclexplode(p.proacl)).privilege_type as privilege
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'log_audit',
    'assign_role_to_user',
    'revoke_role_from_user',
    'get_user_roles',
    'assign_permission_to_role',
    'revoke_permission_from_role',
    'get_role_permissions',
    'get_user_permissions_filtered'
  )
ORDER BY p.proname, grantee;

-- ============================================================================
-- 11. SUMMARY: Phase 2 Deployment Status
-- ============================================================================
SELECT 
  'Phase 2 Deployment Summary' as check_type,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
        AND p.proname IN (
          'log_audit',
          'assign_role_to_user',
          'revoke_role_from_user',
          'get_user_roles',
          'assign_permission_to_role',
          'revoke_permission_from_role',
          'get_role_permissions',
          'get_user_permissions_filtered'
        )
    ) = 8 
    AND EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'audit_log' AND table_schema = 'public'
    )
    THEN '✅ ALL PHASE 2 COMPONENTS DEPLOYED'
    ELSE '❌ SOME COMPONENTS MISSING'
  END as status;

-- ============================================================================
-- 12. DETAILED FUNCTION PARAMETER INFO
-- ============================================================================
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'log_audit',
    'assign_role_to_user',
    'revoke_role_from_user',
    'get_user_roles',
    'assign_permission_to_role',
    'revoke_permission_from_role',
    'get_role_permissions',
    'get_user_permissions_filtered'
  )
ORDER BY p.proname;
