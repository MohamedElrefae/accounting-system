-- TRIAL BALANCE DEBUG SCRIPT
-- Run this in Supabase SQL Editor to diagnose trial balance issues

-- 1. Check if trial balance function exists
SELECT 
    routine_name,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%trial_balance%'
AND routine_schema = 'public';

-- 2. Check accounts table structure and data
SELECT 'ACCOUNTS TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'ACCOUNTS SAMPLE DATA:' as info;
SELECT 
    id,
    code,
    name,
    category,
    parent_id,
    is_active
FROM accounts 
LIMIT 10;

SELECT 'ACCOUNTS COUNT BY CATEGORY:' as info;
SELECT 
    category,
    COUNT(*) as count
FROM accounts 
GROUP BY category;

-- 3. Check transactions table structure and data
SELECT 'TRANSACTIONS TABLE STRUCTURE:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'TRANSACTIONS SAMPLE DATA:' as info;
SELECT 
    id,
    debit_account_id,
    credit_account_id,
    amount,
    is_posted,
    entry_date,
    description
FROM transactions 
WHERE is_posted = true
LIMIT 5;

SELECT 'TRANSACTIONS COUNT:' as info;
SELECT 
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE is_posted = true) as posted_transactions,
    COUNT(*) FILTER (WHERE is_posted = false) as unposted_transactions
FROM transactions;

-- 4. Test trial balance function manually
SELECT 'TESTING TRIAL BALANCE FUNCTION:' as info;

-- Test with current date
SELECT * FROM get_trial_balance(CURRENT_DATE, 1, 1);

-- Test with a past date to ensure we get historical data
SELECT * FROM get_trial_balance('2020-01-01'::date, 1, 1);

-- 5. Manual trial balance calculation to verify logic
SELECT 'MANUAL TRIAL BALANCE CALCULATION:' as info;
WITH account_balances AS (
    SELECT 
        a.id,
        a.code,
        a.name,
        a.category,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as total_debits,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as total_credits
    FROM accounts a
    LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND t.is_posted = true
        AND t.entry_date <= CURRENT_DATE
    WHERE a.is_active = true
    GROUP BY a.id, a.code, a.name, a.category
)
SELECT 
    code,
    name,
    category,
    total_debits,
    total_credits,
    (total_debits - total_credits) as balance
FROM account_balances
WHERE (total_debits - total_credits) != 0
ORDER BY code;

-- 6. Check RLS policies
SELECT 'RLS POLICIES:' as info;
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('accounts', 'transactions');

-- 7. Check current user and organization context
SELECT 'CURRENT USER CONTEXT:' as info;
SELECT 
    auth.uid() as current_user_id,
    current_user,
    current_database(),
    current_schema();
