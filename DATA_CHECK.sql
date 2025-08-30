-- QUICK DATA CHECK
-- Run this to see if you have accounts and transactions data

-- 1. Check accounts table
SELECT 'ACCOUNTS DATA:' as info;
SELECT 
    count(*) as total_accounts,
    count(DISTINCT code) as unique_codes
FROM accounts;

SELECT 'Sample accounts:' as info;
SELECT id, code, name FROM accounts LIMIT 5;

-- 2. Check transactions table  
SELECT 'TRANSACTIONS DATA:' as info;
SELECT 
    count(*) as total_transactions,
    count(*) FILTER (WHERE is_posted = true) as posted_transactions,
    count(*) FILTER (WHERE is_posted = false) as unposted_transactions
FROM transactions;

SELECT 'Sample transactions:' as info;
SELECT 
    id, 
    debit_account_id, 
    credit_account_id, 
    amount, 
    is_posted, 
    entry_date,
    description 
FROM transactions 
LIMIT 5;

-- 3. Test the main function directly
SELECT 'TESTING MAIN FUNCTION:' as info;
SELECT * FROM get_trial_balance_current_tx_enhanced('00000000-0000-0000-0000-000000000001', 'posted') LIMIT 10;

-- 4. Test with 'all' mode (including unposted)
SELECT 'TESTING WITH ALL MODE:' as info;
SELECT * FROM get_trial_balance_current_tx_enhanced('00000000-0000-0000-0000-000000000001', 'all') LIMIT 10;
