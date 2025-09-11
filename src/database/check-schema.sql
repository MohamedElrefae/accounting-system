-- Database Schema Check
-- Run this first to verify your database schema before running balance verification

-- 1. Check if required tables exist
SELECT 
  table_name,
  table_type,
  CASE 
    WHEN table_name IN ('accounts', 'transactions') THEN '✅ Required'
    ELSE '📋 Additional'
  END as importance
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('accounts', 'transactions', 'projects', 'organizations')
ORDER BY 
  CASE WHEN table_name = 'accounts' THEN 1
       WHEN table_name = 'transactions' THEN 2
       ELSE 3 END;

-- 2. Check accounts table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('id', 'code', 'name', 'category', 'normal_balance') THEN '✅ Required for canonical balance'
    ELSE '📋 Additional info'
  END as canonical_importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'accounts'
ORDER BY ordinal_position;

-- 3. Check transactions table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('id', 'debit_account_id', 'credit_account_id', 'amount', 'entry_date', 'is_posted') THEN '✅ Required for canonical balance'
    ELSE '📋 Additional info'
  END as canonical_importance
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 4. Check if stored procedures exist
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'get_gl_account_summary' THEN '✅ Used by Trial Balance All Levels'
    WHEN routine_name = 'get_general_ledger_report' THEN '✅ Used by General Ledger'
    ELSE '📋 Other procedure'
  END as usage
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_gl_account_summary', 'get_general_ledger_report')
ORDER BY routine_name;

-- 5. Sample data check
SELECT 
  'Accounts with normal_balance set' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN normal_balance IS NOT NULL THEN 1 END) as records_with_normal_balance,
  ROUND(100.0 * COUNT(CASE WHEN normal_balance IS NOT NULL THEN 1 END) / COUNT(*), 2) as percentage_complete
FROM accounts
WHERE id IS NOT NULL

UNION ALL

SELECT 
  'Transactions with valid accounts' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL THEN 1 END) as records_with_valid_accounts,
  ROUND(100.0 * COUNT(CASE WHEN debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL THEN 1 END) / COUNT(*), 2) as percentage_complete
FROM transactions
WHERE id IS NOT NULL;

-- 6. Quick balance calculation test (small sample)
SELECT 
  'Quick Balance Test' as test_name,
  COUNT(DISTINCT a.id) as accounts_with_transactions,
  SUM(t.amount) as total_transaction_amount,
  MIN(t.entry_date) as earliest_transaction,
  MAX(t.entry_date) as latest_transaction
FROM accounts a
INNER JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
WHERE t.entry_date >= CURRENT_DATE - INTERVAL '365 days';  -- Last year of data
