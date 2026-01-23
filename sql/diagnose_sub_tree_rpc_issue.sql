-- ============================================================================
-- DIAGNOSE SUB_TREE RPC ISSUE
-- ============================================================================
-- This script checks if the sub_tree RPC functions exist and are callable

-- SECTION 1: Check if sub_tree table exists
-- ============================================================================
SELECT 
  'TABLE CHECK' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_tree')
    THEN '✅ sub_tree table exists'
    ELSE '❌ sub_tree table does NOT exist'
  END as result;

-- SECTION 2: Check if RPC functions exist
-- ============================================================================
SELECT 
  'RPC FUNCTION CHECK' as check_type,
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code');

-- SECTION 3: Check if views exist
-- ============================================================================
SELECT 
  'VIEW CHECK' as check_type,
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('sub_tree_full', 'sub_tree_full_v2');

-- SECTION 4: Check if old expenses_categories table exists
-- ============================================================================
SELECT 
  'OLD TABLE CHECK' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses_categories')
    THEN '❌ OLD expenses_categories table still exists'
    ELSE '✅ OLD expenses_categories table removed'
  END as result;

-- SECTION 5: Check if old RPC functions still exist
-- ============================================================================
SELECT 
  'OLD RPC CHECK' as check_type,
  proname as function_name,
  'FOUND - SHOULD BE DELETED' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname LIKE '%expenses_categor%';

-- SECTION 6: Check transaction_lines table for sub_tree_id column
-- ============================================================================
SELECT 
  'TRANSACTION_LINES CHECK' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_lines' AND column_name = 'sub_tree_id')
    THEN '✅ transaction_lines.sub_tree_id column exists'
    ELSE '❌ transaction_lines.sub_tree_id column does NOT exist'
  END as result;

-- SECTION 7: Check RLS policies on sub_tree
-- ============================================================================
SELECT 
  'RLS POLICY CHECK' as check_type,
  policyname,
  tablename,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'sub_tree';

-- SECTION 8: Check if any old functions reference expenses_categories
-- ============================================================================
SELECT 
  'OLD FUNCTION REFERENCES' as check_type,
  proname as function_name,
  'REFERENCES expenses_categories - SHOULD BE DELETED' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND pg_get_functiondef(oid) LIKE '%expenses_categories%';

-- SECTION 9: Final summary
-- ============================================================================
SELECT 
  'FINAL STATUS' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND proname = 'create_sub_tree')
    THEN '✅ create_sub_tree RPC exists'
    ELSE '❌ create_sub_tree RPC MISSING'
  END as result
UNION ALL
SELECT 'FINAL STATUS',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND proname = 'update_sub_tree')
    THEN '✅ update_sub_tree RPC exists'
    ELSE '❌ update_sub_tree RPC MISSING'
  END
UNION ALL
SELECT 'FINAL STATUS',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND proname = 'delete_sub_tree')
    THEN '✅ delete_sub_tree RPC exists'
    ELSE '❌ delete_sub_tree RPC MISSING'
  END
UNION ALL
SELECT 'FINAL STATUS',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND proname = 'rpc_sub_tree_next_code')
    THEN '✅ rpc_sub_tree_next_code RPC exists'
    ELSE '❌ rpc_sub_tree_next_code RPC MISSING'
  END
UNION ALL
SELECT 'FINAL STATUS',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses_categories')
    THEN '❌ OLD expenses_categories table still exists'
    ELSE '✅ OLD expenses_categories table removed'
  END;

