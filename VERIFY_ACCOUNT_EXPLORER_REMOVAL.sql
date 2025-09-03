-- VERIFY_ACCOUNT_EXPLORER_REMOVAL.sql
-- Script to verify that Account Explorer database functions have been successfully removed
-- This should return empty results if the cleanup was successful

-- Check if get_account_children_with_balances function exists
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_account_children_with_balances';

-- Check if verify_account_gl_summary function exists  
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'verify_account_gl_summary';

-- If both queries return empty results, the cleanup was successful
