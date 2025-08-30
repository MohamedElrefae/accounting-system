-- ================================================
-- DIAGNOSE REAL ISSUE - See what's actually wrong
-- This will show us the real table structure and test functions
-- ================================================

-- 1. Check if debug functions exist
SELECT 'DEBUG FUNCTIONS CHECK:' as test;
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_debug_mode', 'enable_debug_mode', 'disable_debug_mode');

-- 2. Show actual transactions table structure
SELECT 'TRANSACTIONS TABLE STRUCTURE:' as test;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 3. Show actual accounts table structure  
SELECT 'ACCOUNTS TABLE STRUCTURE:' as test;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'accounts'
ORDER BY ordinal_position;

-- 4. Check if tables have any data
SELECT 'DATA CHECK:' as test;
SELECT 'accounts' as table_name, COUNT(*) as count FROM public.accounts
UNION ALL
SELECT 'transactions' as table_name, COUNT(*) as count FROM public.transactions;

-- 5. Try to test the function directly to see the exact error
SELECT 'TESTING FUNCTION DIRECTLY:' as test;

-- Create a minimal function that should work regardless of table structure
CREATE OR REPLACE FUNCTION public.test_simple_function()
RETURNS TEXT AS $$
BEGIN
    RETURN 'Function works!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the simple function
SELECT public.test_simple_function() as simple_test;

-- Now try to test with accounts table
DO $$
DECLARE
    test_result TEXT;
    error_msg TEXT;
BEGIN
    BEGIN
        -- Try a simple query on accounts
        SELECT 'Accounts table accessible' INTO test_result;
        PERFORM COUNT(*) FROM public.accounts;
        RAISE NOTICE 'SUCCESS: %', test_result;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'ACCOUNTS ERROR: %', error_msg;
    END;
    
    BEGIN
        -- Try a simple query on transactions  
        SELECT 'Transactions table accessible' INTO test_result;
        PERFORM COUNT(*) FROM public.transactions;
        RAISE NOTICE 'SUCCESS: %', test_result;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'TRANSACTIONS ERROR: %', error_msg;
    END;
    
    BEGIN
        -- Try to join accounts and transactions
        PERFORM COUNT(*) 
        FROM public.accounts a
        LEFT JOIN public.transactions t ON a.id = t.account_id;
        RAISE NOTICE 'SUCCESS: Join works with account_id';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE 'JOIN ERROR: %', error_msg;
    END;
END $$;

-- Show what columns actually exist in your key tables
SELECT 'FINAL DIAGNOSIS - SHOW REAL COLUMNS:' as final_test;
SELECT 
    'transactions' as table_name,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transactions'
UNION ALL
SELECT 
    'accounts' as table_name,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'accounts';
