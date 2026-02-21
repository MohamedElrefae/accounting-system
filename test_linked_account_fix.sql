-- ============================================================================
-- TEST LINKED ACCOUNT FIX
-- ============================================================================
-- This script tests whether the linked account field is now working correctly

-- Test 1: Check if RPC function handles linked_account_id properly
SELECT 'Testing RPC update_sub_tree with linked_account_id' as test_section;

-- Test update with a valid linked_account_id (replace with actual UUID from your accounts table)
-- SELECT public.update_sub_tree(
--   p_id := 'YOUR_SUB_TREE_ID_HERE'::uuid,
--   p_linked_account_id := 'YOUR_ACCOUNT_ID_HERE'::uuid,
--   p_clear_linked_account := false
-- );

-- Test 2: Check if RPC function can clear linked account
SELECT 'Testing RPC update_sub_tree with p_clear_linked_account=true' as test_section;

-- Test clear linked account
-- SELECT public.update_sub_tree(
--   p_id := 'YOUR_SUB_TREE_ID_HERE'::uuid,
--   p_clear_linked_account := true
-- );

-- Test 3: Verify current state of sub_tree records
SELECT 
  id,
  code,
  description,
  linked_account_id,
  updated_at,
  CASE 
    WHEN linked_account_id IS NULL THEN '❌ Not linked'
    ELSE '✅ Linked'
  END as linked_status
FROM public.sub_tree 
WHERE id = 'f37aeb47-fdad-4335-9a04-e3fb75393cf6'
ORDER BY updated_at DESC;

-- ============================================================================
-- INSTRUCTIONS FOR TESTING
-- ============================================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Replace YOUR_SUB_TREE_ID_HERE with an actual sub_tree ID
-- 3. Replace YOUR_ACCOUNT_ID_HERE with an actual account ID
-- 4. Check if the RPC calls execute without errors
-- 5. Verify the linked_status column shows correct results
-- 
-- Expected Results:
-- - RPC calls should execute without errors
-- - linked_status should show '✅ Linked' when account is linked
-- - linked_status should show '❌ Not linked' when account is cleared
-- ============================================================================
