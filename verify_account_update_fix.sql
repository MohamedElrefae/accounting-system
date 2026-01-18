-- Verification script for account_update function fix
-- This script tests the account_update function to ensure it works correctly

-- Test 1: Check that the function exists with correct signature
SELECT 
    'Function signature check' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS'
        ELSE 'FAIL'
    END as result,
    COUNT(*) as function_count
FROM pg_proc 
WHERE proname = 'account_update' 
AND pronamespace = 'public'::regnamespace
AND proargtypes::text = 'uuid uuid text text text account_category integer account_status';

-- Test 2: Check that account_category enum exists
SELECT 
    'account_category enum check' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS'
        ELSE 'FAIL'
    END as result,
    COUNT(*) as enum_values_count
FROM pg_enum 
WHERE enumtypid = 'public.account_category'::regtype;

-- Test 3: Check that account_status enum exists  
SELECT 
    'account_status enum check' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS'
        ELSE 'FAIL'
    END as result,
    COUNT(*) as enum_values_count
FROM pg_enum 
WHERE enumtypid = 'public.account_status'::regtype;

-- Test 4: Show available enum values for reference
SELECT 
    'account_category values' as info,
    enumlabel as value,
    enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = 'public.account_category'::regtype
ORDER BY enumsortorder;

SELECT 
    'account_status values' as info,
    enumlabel as value,
    enumsortorder as sort_order
FROM pg_enum 
WHERE enumtypid = 'public.account_status'::regtype
ORDER BY enumsortorder;

-- Test 5: Sample test call (commented out - uncomment to test with actual data)
/*
-- WARNING: This will actually update an account. Uncomment only for testing with real data
-- Replace the UUIDs with actual values from your database
DO $$
DECLARE
    test_result json;
BEGIN
    -- Test the function with sample data
    SELECT public.account_update(
        'your-org-id-uuid',  -- Replace with actual org_id
        'your-account-id-uuid', -- Replace with actual account_id  
        'TEST001',
        'Test Account',
        'حساب تجريبي',
        'asset'::public.account_category,
        1,
        'active'::public.account_status
    ) INTO test_result;
    
    RAISE NOTICE 'Account update test result: %', test_result;
END $$;
*/
