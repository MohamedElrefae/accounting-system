-- Simple diagnostic to understand the issue

-- 1. Check if accounts have org_id column
SELECT 'ACCOUNTS COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name LIKE '%org%';

-- 2. Check if transactions have org_id column  
SELECT 'TRANSACTIONS COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name LIKE '%org%';

-- 3. Test function without org_id filtering
SELECT 'TESTING FUNCTION DIRECTLY:' as info;
SELECT account_id, code, name, debit_amount, credit_amount
FROM get_trial_balance_current_tx_enhanced('any-org-id', 'posted') 
LIMIT 3;

-- 4. Check RLS policies
SELECT 'RLS STATUS:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('accounts', 'transactions');

-- 5. Check current user
SELECT 'CURRENT USER:' as info;
SELECT current_user, auth.uid();
