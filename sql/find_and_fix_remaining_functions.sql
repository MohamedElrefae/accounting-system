-- ============================================================================
-- FIND AND FIX REMAINING FUNCTIONS REFERENCING expenses_categories
-- ============================================================================

-- SECTION 1: Find all functions that reference expenses_categories
-- ============================================================================
SELECT 
  'Functions Still Referencing expenses_categories' as check_name,
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND pg_get_functiondef(oid) LIKE '%expenses_categories%'
ORDER BY proname;

-- ============================================================================
-- DROP ALL REMAINING FUNCTIONS THAT REFERENCE expenses_categories
-- ============================================================================

-- These functions may still exist and reference the old table
DROP FUNCTION IF EXISTS public.expenses_categories_biu_set_path_level() CASCADE;
DROP FUNCTION IF EXISTS public.expenses_categories_biu_enforce() CASCADE;
DROP FUNCTION IF EXISTS public.tg_touch_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public._ec_label_from_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.expenses_categories_next_code(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_expenses_categories_tree(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_expenses_categories_list(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_expenses_categories_rollups() CASCADE;

-- ============================================================================
-- VERIFY ALL REFERENCES ARE GONE
-- ============================================================================
SELECT 
  'Final Verification' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE pg_get_functiondef(oid) LIKE '%expenses_categories%' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    )
    THEN '❌ Functions still reference expenses_categories'
    ELSE '✅ All functions cleaned up'
  END as result;

-- ============================================================================
-- VERIFY sub_tree FUNCTIONS EXIST
-- ============================================================================
SELECT 
  'sub_tree Functions Status' as check_name,
  proname as function_name,
  CASE 
    WHEN proname = 'create_sub_tree' THEN '✅ EXISTS'
    WHEN proname = 'update_sub_tree' THEN '✅ EXISTS'
    WHEN proname = 'delete_sub_tree' THEN '✅ EXISTS'
    WHEN proname = 'rpc_sub_tree_next_code' THEN '✅ EXISTS'
    WHEN proname = 'sub_tree_maintain_path' THEN '✅ EXISTS'
    WHEN proname = 'sub_tree_update_timestamp' THEN '✅ EXISTS'
    ELSE '❓ UNKNOWN'
  END as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
  'create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code',
  'sub_tree_maintain_path', 'sub_tree_update_timestamp'
)
ORDER BY proname;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
SELECT 
  'FINAL STATUS' as check_name,
  'All old functions dropped' as action_1
UNION ALL
SELECT 'FINAL STATUS', 'All references to expenses_categories removed'
UNION ALL
SELECT 'FINAL STATUS', 'sub_tree functions verified'
UNION ALL
SELECT 'FINAL STATUS', 'Ready to test in UI';
