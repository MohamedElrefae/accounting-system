-- Test script for the corrected account functions
-- Run this after executing fix-account-function-corrected.sql

-- 1. Check that we now have only one version of each function
SELECT 
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('account_insert_child', 'account_update')
AND n.nspname = 'public'
ORDER BY p.proname;

-- 2. Check the enum values that should be used
SELECT 'account_category values:' as info, enumlabel as value
FROM pg_enum 
WHERE enumtypid = 'public.account_category'::regtype
ORDER BY enumsortorder
UNION ALL
SELECT 'account_status values:', enumlabel
FROM pg_enum 
WHERE enumtypid = 'public.account_status'::regtype
ORDER BY enumsortorder;

-- 3. Test the function (UNCOMMENT and modify the UUID to match your org_id to test)
/*
-- Test account_insert_child function
SELECT public.account_insert_child(
    '4cbba543-eb9c-4f32-9c77-155201f7e145'::uuid,  -- p_org_id (use your actual org_id)
    NULL::uuid,                                      -- p_parent_id (NULL for root account)
    'TEST001',                                       -- p_code
    'Test Account',                                  -- p_name
    'حساب تجريبي',                                   -- p_name_ar
    'asset'::public.account_category,                -- p_account_type (cast to enum)
    1,                                               -- p_level
    'active'::public.account_status                  -- p_status (cast to enum)
) as test_result;

-- Clean up the test account (uncomment to remove test data)
-- DELETE FROM public.accounts WHERE code = 'TEST001' AND org_id = '4cbba543-eb9c-4f32-9c77-155201f7e145';
*/
