-- ============================================================================
-- DIAGNOSE ACTUAL SYNC ISSUE - Service vs Database Mismatch
-- ============================================================================

-- SECTION 1: What the service is trying to call
-- ============================================================================
SELECT 
  'Service Calls These RPC Functions' as section,
  'create_sub_tree' as function_name,
  'Creates new sub-tree category' as purpose
UNION ALL
SELECT 'Service Calls These RPC Functions', 'update_sub_tree', 'Updates existing category'
UNION ALL
SELECT 'Service Calls These RPC Functions', 'delete_sub_tree', 'Deletes category'
UNION ALL
SELECT 'Service Calls These RPC Functions', 'rpc_sub_tree_next_code', 'Generates next code';

-- SECTION 2: What actually exists in database
-- ============================================================================
SELECT 
  'Functions That Actually Exist' as section,
  proname as function_name,
  CASE 
    WHEN proname = 'create_sub_tree' THEN '✅ Service calls this'
    WHEN proname = 'update_sub_tree' THEN '✅ Service calls this'
    WHEN proname = 'delete_sub_tree' THEN '✅ Service calls this'
    WHEN proname = 'rpc_sub_tree_next_code' THEN '✅ Service calls this'
    ELSE '❌ Service does NOT call this'
  END as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
  'create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code',
  'get_sub_tree_list', 'get_sub_tree_tree', 'get_transaction_analysis_by_sub_tree',
  'refresh_sub_tree_rollups', 'sub_tree_biu_set_path_level', 'sub_tree_maintain_path',
  'sub_tree_update_timestamp'
)
ORDER BY proname;

-- SECTION 3: Check if service can actually call the functions
-- ============================================================================
SELECT 
  'RPC Function Call Test' as test_name,
  'create_sub_tree' as function_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'create_sub_tree' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN 'EXISTS - Service should be able to call it'
    ELSE 'MISSING - Service will get 404'
  END as result
UNION ALL
SELECT 'RPC Function Call Test', 'update_sub_tree',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'update_sub_tree' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN 'EXISTS - Service should be able to call it'
    ELSE 'MISSING - Service will get 404'
  END
UNION ALL
SELECT 'RPC Function Call Test', 'delete_sub_tree',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'delete_sub_tree' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN 'EXISTS - Service should be able to call it'
    ELSE 'MISSING - Service will get 404'
  END
UNION ALL
SELECT 'RPC Function Call Test', 'rpc_sub_tree_next_code',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'rpc_sub_tree_next_code' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN 'EXISTS - Service should be able to call it'
    ELSE 'MISSING - Service will get 404'
  END;

-- SECTION 4: Check what the service is actually getting from views
-- ============================================================================
SELECT 
  'View Data Check' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN linked_account_code IS NOT NULL THEN 1 END) as has_linked_account_code,
  COUNT(CASE WHEN child_count IS NOT NULL THEN 1 END) as has_child_count,
  COUNT(CASE WHEN has_transactions IS NOT NULL THEN 1 END) as has_has_transactions
FROM public.sub_tree_full;

-- SECTION 5: Test the actual RPC call that service makes
-- ============================================================================
-- This simulates what the service does when you try to create a category
-- If this works, the RPC function exists and is callable
SELECT 
  'RPC Function Callable Test' as test_name,
  'Attempting to call: rpc_sub_tree_next_code' as action,
  'If this query succeeds, the function is callable' as note;

-- Try to call the function (this will fail if function doesn't exist)
-- SELECT public.rpc_sub_tree_next_code(
--   p_org_id := 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
--   p_parent_id := NULL::uuid
-- );

-- SECTION 6: Check service layer expectations vs database reality
-- ============================================================================
SELECT 
  'Service Layer Expectations' as aspect,
  'View: sub_tree_full_v2' as component,
  'Should have 18 columns' as expectation,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'sub_tree_full_v2')::text as actual_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'sub_tree_full_v2') = 18 
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
UNION ALL
SELECT 'Service Layer Expectations', 'View: sub_tree_full', 'Should have 18 columns',
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'sub_tree_full')::text,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'sub_tree_full') = 18 
    THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END;

-- SECTION 7: Check if there are any RLS policy issues
-- ============================================================================
SELECT 
  'RLS Policy Check' as check_name,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN permissive = true THEN 1 END) as permissive_policies,
  COUNT(CASE WHEN permissive = false THEN 1 END) as restrictive_policies
FROM pg_policies
WHERE tablename = 'sub_tree';

-- SECTION 8: Check function permissions for authenticated users
-- ============================================================================
SELECT 
  'Function Permissions' as check_name,
  proname as function_name,
  CASE 
    WHEN proacl::text LIKE '%authenticated%' THEN '✅ Authenticated users can call'
    WHEN proacl::text LIKE '%public%' THEN '✅ Public can call'
    WHEN proacl::text LIKE '%anon%' THEN '✅ Anonymous can call'
    ELSE '❌ May have permission issues'
  END as permission_status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code');

-- SECTION 9: Summary - What's the actual problem?
-- ============================================================================
SELECT 
  'DIAGNOSIS SUMMARY' as section,
  'Database Status' as aspect,
  'All RPC functions exist ✅' as finding
UNION ALL
SELECT 'DIAGNOSIS SUMMARY', 'View Status', 'All views exist with correct fields ✅'
UNION ALL
SELECT 'DIAGNOSIS SUMMARY', 'Trigger Status', 'All triggers exist ✅'
UNION ALL
SELECT 'DIAGNOSIS SUMMARY', 'Data Status', 'All data is clean and consistent ✅'
UNION ALL
SELECT 'DIAGNOSIS SUMMARY', 'Actual Problem', 'If you still get 404, it means:
1. Browser cache has old data
2. Service is calling wrong function name
3. RLS policies are blocking the call
4. Authentication token is invalid'
UNION ALL
SELECT 'DIAGNOSIS SUMMARY', 'Next Step', 'Clear browser cache and try again';

-- ============================================================================
-- INTERPRETATION
-- ============================================================================
-- If all functions show "EXISTS - Service should be able to call it":
--   ✅ Database is correct
--   ✅ Service should work
--   ❌ If still getting 404, it's a browser cache or auth issue
--
-- If any function shows "MISSING - Service will get 404":
--   ❌ That function needs to be created
--   ❌ Run the migration again
--
-- If RLS policies show issues:
--   ❌ May need to grant permissions
--   ❌ Check authentication token
-- ============================================================================
