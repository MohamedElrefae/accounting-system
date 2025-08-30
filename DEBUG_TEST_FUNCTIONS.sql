-- ================================================
-- DEBUG TEST - Test Functions Directly
-- Run this to see what's wrong with the functions
-- ================================================

-- First, check if debug mode is actually enabled
SELECT 'DEBUG MODE CHECK:' as test, 
       CASE WHEN public.is_debug_mode() THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END as status;

-- Check if functions exist
SELECT 'FUNCTION EXISTS CHECK:' as test, routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%trial_balance%'
ORDER BY routine_name;

-- Test the main function with a random UUID (should work even with no data)
SELECT 'TESTING get_trial_balance_current_tx_enhanced:' as test;
SELECT * FROM public.get_trial_balance_current_tx_enhanced(
    gen_random_uuid()::UUID,
    'posted'::TEXT,
    NULL::UUID
) LIMIT 3;

-- Test the fallback function
SELECT 'TESTING get_trial_balance_current_tx:' as test;
SELECT * FROM public.get_trial_balance_current_tx(
    gen_random_uuid()::UUID,
    'posted'::TEXT
) LIMIT 3;

-- Check if we have any accounts data at all
SELECT 'ACCOUNTS COUNT:' as test, COUNT(*) as count FROM public.accounts;

-- Check if we have any transactions data
SELECT 'TRANSACTIONS COUNT:' as test, COUNT(*) as count FROM public.transactions;

-- Check if we have any journal entries data
SELECT 'JOURNAL ENTRIES COUNT:' as test, COUNT(*) as count FROM public.journal_entries;

-- Test with a real org_id if accounts exist
DO $$ 
DECLARE 
    test_org_id UUID;
BEGIN
    -- Get a real org_id from accounts if any exist
    SELECT DISTINCT org_id INTO test_org_id FROM public.accounts LIMIT 1;
    
    IF test_org_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with real org_id: %', test_org_id;
        
        -- Test the function with real org_id
        PERFORM * FROM public.get_trial_balance_current_tx_enhanced(
            test_org_id,
            'posted'::TEXT,
            NULL::UUID
        );
        
        RAISE NOTICE 'Function call succeeded with real org_id';
    ELSE
        RAISE NOTICE 'No accounts found - functions should still work with empty results';
    END IF;
END $$;

-- Show any recent errors in the log (if we can)
SELECT 'SCRIPT COMPLETED' as final_test;
