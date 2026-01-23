-- ============================================================================
-- VERIFY SUB TREE SYNC ISSUES - Diagnostic Queries
-- ============================================================================
-- Run these queries in Supabase SQL Editor to identify what's missing/broken
-- ============================================================================

-- SECTION 1: Check if RPC functions exist
-- ============================================================================
SELECT 
  'RPC Functions Status' as check_name,
  COUNT(*) as total_functions,
  COUNT(CASE WHEN proname = 'create_sub_tree' THEN 1 END) as create_sub_tree_exists,
  COUNT(CASE WHEN proname = 'update_sub_tree' THEN 1 END) as update_sub_tree_exists,
  COUNT(CASE WHEN proname = 'delete_sub_tree' THEN 1 END) as delete_sub_tree_exists,
  COUNT(CASE WHEN proname = 'rpc_sub_tree_next_code' THEN 1 END) as rpc_sub_tree_next_code_exists
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code');

-- SECTION 2: List all RPC functions that DO exist
-- ============================================================================
SELECT 
  'All RPC Functions' as check_name,
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname LIKE '%sub_tree%'
ORDER BY proname;

-- SECTION 3: Check if views exist
-- ============================================================================
SELECT 
  'Views Status' as check_name,
  COUNT(*) as total_views,
  COUNT(CASE WHEN table_name = 'sub_tree_full' THEN 1 END) as sub_tree_full_exists,
  COUNT(CASE WHEN table_name = 'sub_tree_full_v2' THEN 1 END) as sub_tree_full_v2_exists
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('sub_tree_full', 'sub_tree_full_v2');

-- SECTION 4: Check sub_tree_full view columns
-- ============================================================================
SELECT 
  'sub_tree_full Columns' as check_name,
  column_name,
  ordinal_position,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'sub_tree_full'
ORDER BY ordinal_position;

-- SECTION 5: Check sub_tree_full_v2 view columns
-- ============================================================================
SELECT 
  'sub_tree_full_v2 Columns' as check_name,
  column_name,
  ordinal_position,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'sub_tree_full_v2'
ORDER BY ordinal_position;

-- SECTION 6: Check triggers on sub_tree table
-- ============================================================================
SELECT 
  'Triggers on sub_tree' as check_name,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
AND event_object_table = 'sub_tree'
ORDER BY trigger_name;

-- SECTION 7: Check sub_tree table structure
-- ============================================================================
SELECT 
  'sub_tree Table Columns' as check_name,
  column_name,
  ordinal_position,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'sub_tree'
ORDER BY ordinal_position;

-- SECTION 8: Check sub_tree table data
-- ============================================================================
SELECT 
  'sub_tree Data Status' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN path IS NULL THEN 1 END) as null_paths,
  COUNT(CASE WHEN path = ''::ltree THEN 1 END) as empty_paths,
  COUNT(CASE WHEN level < 1 OR level > 4 THEN 1 END) as invalid_levels,
  COUNT(CASE WHEN description IS NULL OR LENGTH(description) < 1 THEN 1 END) as null_descriptions,
  COUNT(CASE WHEN description IS NOT NULL AND LENGTH(description) > 300 THEN 1 END) as too_long_descriptions
FROM public.sub_tree;

-- SECTION 9: Sample sub_tree data
-- ============================================================================
SELECT 
  'Sample sub_tree Records' as check_name,
  id,
  org_id,
  parent_id,
  code,
  description,
  level,
  path::text as path,
  linked_account_id,
  is_active,
  created_at,
  updated_at
FROM public.sub_tree
LIMIT 10;

-- SECTION 10: Test view query - sub_tree_full
-- ============================================================================
SELECT 
  'Test sub_tree_full View' as check_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN linked_account_code IS NULL THEN 1 END) as null_linked_account_codes,
  COUNT(CASE WHEN child_count IS NULL THEN 1 END) as null_child_counts,
  COUNT(CASE WHEN has_transactions IS NULL THEN 1 END) as null_has_transactions
FROM public.sub_tree_full;

-- SECTION 11: Test view query - sub_tree_full_v2
-- ============================================================================
SELECT 
  'Test sub_tree_full_v2 View' as check_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN linked_account_code IS NULL THEN 1 END) as null_linked_account_codes,
  COUNT(CASE WHEN child_count IS NULL THEN 1 END) as null_child_counts,
  COUNT(CASE WHEN has_transactions IS NULL THEN 1 END) as null_has_transactions
FROM public.sub_tree_full_v2;

-- SECTION 12: Compare views - find differences
-- ============================================================================
SELECT 
  'View Comparison' as check_name,
  'sub_tree_full' as view_name,
  COUNT(*) as record_count
FROM public.sub_tree_full
UNION ALL
SELECT 
  'View Comparison' as check_name,
  'sub_tree_full_v2' as view_name,
  COUNT(*) as record_count
FROM public.sub_tree_full_v2;

-- SECTION 13: Check indexes on sub_tree
-- ============================================================================
SELECT 
  'Indexes on sub_tree' as check_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'sub_tree'
ORDER BY indexname;

-- SECTION 14: Check RLS policies on sub_tree
-- ============================================================================
SELECT 
  'RLS Policies on sub_tree' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'sub_tree'
ORDER BY policyname;

-- SECTION 15: Check if transaction_lines table exists and has sub_tree_id
-- ============================================================================
SELECT 
  'transaction_lines Table' as check_name,
  COUNT(*) as column_count,
  COUNT(CASE WHEN column_name = 'sub_tree_id' THEN 1 END) as has_sub_tree_id_column
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transaction_lines';

-- SECTION 16: Check accounts table for linked accounts
-- ============================================================================
SELECT 
  'accounts Table' as check_name,
  COUNT(*) as total_accounts,
  COUNT(CASE WHEN code IS NOT NULL THEN 1 END) as accounts_with_code,
  COUNT(CASE WHEN name IS NOT NULL THEN 1 END) as accounts_with_name
FROM public.accounts
LIMIT 1;

-- SECTION 17: Check if any sub_tree records have linked accounts
-- ============================================================================
SELECT 
  'sub_tree Linked Accounts' as check_name,
  COUNT(*) as total_sub_tree_records,
  COUNT(CASE WHEN linked_account_id IS NOT NULL THEN 1 END) as records_with_linked_account,
  COUNT(CASE WHEN linked_account_id IS NULL THEN 1 END) as records_without_linked_account
FROM public.sub_tree;

-- SECTION 18: Check if linked accounts actually exist in accounts table
-- ============================================================================
SELECT 
  'Linked Account Validation' as check_name,
  COUNT(DISTINCT st.linked_account_id) as unique_linked_account_ids,
  COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN st.linked_account_id END) as valid_linked_account_ids,
  COUNT(DISTINCT CASE WHEN a.id IS NULL THEN st.linked_account_id END) as invalid_linked_account_ids
FROM public.sub_tree st
LEFT JOIN public.accounts a ON a.id = st.linked_account_id
WHERE st.linked_account_id IS NOT NULL;

-- SECTION 19: Check function permissions
-- ============================================================================
SELECT 
  'Function Permissions' as check_name,
  proname as function_name,
  proacl as permissions
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code');

-- SECTION 20: Check if migration was actually applied
-- ============================================================================
SELECT 
  'Migration Status' as check_name,
  COUNT(*) as total_migrations,
  COUNT(CASE WHEN name LIKE '%sub_tree%' THEN 1 END) as sub_tree_migrations
FROM supabase_migrations.schema_migrations;

-- ============================================================================
-- SUMMARY: What to look for
-- ============================================================================
-- If create_sub_tree_exists = 0: RPC functions were NOT created
-- If sub_tree_full_exists = 0: Views were NOT created
-- If null_paths > 0: Path data is incomplete
-- If null_linked_account_codes > 0: Views are missing linked_account_code field
-- If null_child_counts > 0: Views are missing child_count field
-- If null_has_transactions > 0: Views are missing has_transactions field
-- If trigger count < 2: Triggers were NOT created
-- ============================================================================
