-- ============================================================================
-- FIX: Remove all references to old expenses_categories table
-- ============================================================================
-- The database was migrated from expenses_categories to sub_tree
-- But old migration files still exist and create functions/views that reference
-- the non-existent expenses_categories table
-- This causes: "relation public.expenses_categories does not exist"
-- ============================================================================

-- STEP 1: Drop all views that reference expenses_categories
-- ============================================================================
DROP VIEW IF EXISTS public.expenses_categories_full CASCADE;
DROP VIEW IF EXISTS public.v_expenses_categories_rollups CASCADE;
DROP VIEW IF EXISTS public.expenses_categories_with_accounts CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_expenses_categories_rollups CASCADE;

-- STEP 2: Drop all functions that reference expenses_categories
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_expenses_category CASCADE;
DROP FUNCTION IF EXISTS public.update_expenses_category CASCADE;
DROP FUNCTION IF EXISTS public.delete_expenses_category CASCADE;
DROP FUNCTION IF EXISTS public.get_expenses_categories_tree CASCADE;
DROP FUNCTION IF EXISTS public.expenses_categories_next_code CASCADE;
DROP FUNCTION IF EXISTS public.expenses_categories_biu_set_path_level CASCADE;
DROP FUNCTION IF EXISTS public._ec_label_from_code CASCADE;

-- STEP 3: Drop all triggers that reference expenses_categories
-- ============================================================================
DROP TRIGGER IF EXISTS trg_expenses_categories_biu ON public.sub_tree CASCADE;
DROP TRIGGER IF EXISTS trg_expenses_categories_touch ON public.sub_tree CASCADE;

-- STEP 4: Drop the old expenses_categories table if it exists
-- ============================================================================
DROP TABLE IF EXISTS public.expenses_categories CASCADE;

-- STEP 5: Verify sub_tree table exists and is correct
-- ============================================================================
-- Check that sub_tree table exists
SELECT 
  'Verification' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sub_tree')
    THEN '✅ sub_tree table EXISTS'
    ELSE '❌ sub_tree table MISSING'
  END as result;

-- STEP 6: Verify sub_tree views exist
-- ============================================================================
SELECT 
  'Verification' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'sub_tree_full')
    THEN '✅ sub_tree_full view EXISTS'
    ELSE '❌ sub_tree_full view MISSING'
  END as result
UNION ALL
SELECT 
  'Verification' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'sub_tree_full_v2')
    THEN '✅ sub_tree_full_v2 view EXISTS'
    ELSE '❌ sub_tree_full_v2 view MISSING'
  END as result;

-- STEP 7: Verify sub_tree RPC functions exist
-- ============================================================================
SELECT 
  'Verification' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_sub_tree' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '✅ create_sub_tree function EXISTS'
    ELSE '❌ create_sub_tree function MISSING'
  END as result
UNION ALL
SELECT 
  'Verification' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_sub_tree' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '✅ update_sub_tree function EXISTS'
    ELSE '❌ update_sub_tree function MISSING'
  END as result
UNION ALL
SELECT 
  'Verification' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_sub_tree' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '✅ delete_sub_tree function EXISTS'
    ELSE '❌ delete_sub_tree function MISSING'
  END as result
UNION ALL
SELECT 
  'Verification' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_sub_tree_next_code' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '✅ rpc_sub_tree_next_code function EXISTS'
    ELSE '❌ rpc_sub_tree_next_code function MISSING'
  END as result;

-- STEP 8: Verify no references to expenses_categories remain
-- ============================================================================
SELECT 
  'Final Check' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE pg_get_functiondef(oid) LIKE '%expenses_categories%' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '❌ Functions still reference expenses_categories'
    ELSE '✅ No functions reference expenses_categories'
  END as result
UNION ALL
SELECT 
  'Final Check' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND view_definition LIKE '%expenses_categories%')
    THEN '❌ Views still reference expenses_categories'
    ELSE '✅ No views reference expenses_categories'
  END as result
UNION ALL
SELECT 
  'Final Check' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses_categories')
    THEN '❌ expenses_categories table still exists'
    ELSE '✅ expenses_categories table removed'
  END as result;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script:
-- 1. ✅ Drops all views referencing expenses_categories
-- 2. ✅ Drops all functions referencing expenses_categories
-- 3. ✅ Drops all triggers referencing expenses_categories
-- 4. ✅ Drops the old expenses_categories table
-- 5. ✅ Verifies sub_tree table and functions exist
-- 6. ✅ Confirms no references to expenses_categories remain
--
-- After running this, the error "relation public.expenses_categories does not exist"
-- should be completely resolved.
-- ============================================================================
