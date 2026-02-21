-- ============================================================================
-- TEST SUBTREE SYNC FIX
-- ============================================================================
-- This script tests whether the SubTree service can now properly save data

-- Test 1: Check if RPC functions exist and are callable
SELECT 'RPC Functions Test' as test_section;

-- Test create_sub_tree function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'create_sub_tree' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✅ create_sub_tree EXISTS'
    ELSE '❌ create_sub_tree MISSING'
  END as status;

-- Test update_sub_tree function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'update_sub_tree' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✅ update_sub_tree EXISTS'
    ELSE '❌ update_sub_tree MISSING'
  END as status;

-- Test delete_sub_tree function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'delete_sub_tree' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✅ delete_sub_tree EXISTS'
    ELSE '❌ delete_sub_tree MISSING'
  END as status;

-- Test rpc_sub_tree_next_code function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'rpc_sub_tree_next_code' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✅ rpc_sub_tree_next_code EXISTS'
    ELSE '❌ rpc_sub_tree_next_code MISSING'
  END as status;

-- Test 2: Check RLS policies allow RPC calls
SELECT 'RLS Policies Test' as test_section;

-- Check if policies exist
SELECT 
  policyname,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'sub_tree'
ORDER BY policyname;

-- Test 3: Check function permissions
SELECT 'Function Permissions Test' as test_section;

SELECT 
  proname as function_name,
  proacl::text as permissions,
  CASE 
    WHEN proacl::text LIKE '%authenticated%' THEN '✅ Authenticated users can call'
    WHEN proacl::text LIKE '%public%' THEN '✅ Public can call'
    ELSE '❌ May have permission issues'
  END as permission_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code');

-- Test 4: Sample RPC call (replace with actual org_id)
SELECT 'Sample RPC Call Test' as test_section;

-- This tests the actual RPC call that the service will make
-- NOTE: Replace 'YOUR_ORG_ID_HERE' with an actual organization ID
-- SELECT public.rpc_sub_tree_next_code(
--   p_org_id := 'YOUR_ORG_ID_HERE'::uuid,
--   p_parent_id := NULL::uuid
-- );

-- Test 5: Check current data in sub_tree table
SELECT 'Current Data Check' as test_section;

SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
  COUNT(CASE WHEN linked_account_id IS NOT NULL THEN 1 END) as linked_records
FROM public.sub_tree;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. All RPC functions should show as EXISTS
-- 3. RLS policies should be present
-- 4. Function permissions should allow authenticated users
-- 5. Test the actual RPC call with a real org_id
-- 
-- If any test shows ❌, run the migration again:
-- supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql
-- ============================================================================
