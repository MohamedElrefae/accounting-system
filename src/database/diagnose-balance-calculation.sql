-- Balance Calculation Diagnostic Query
-- This query helps identify why the consistency check returned 0 accounts

-- Step 1: Check canonical balance calculation (simplified)
SELECT 
  'Step 1: Canonical Balance Calculation' as step_name,
  COUNT(*) as total_accounts,
  COUNT(CASE WHEN canonical_balance != 0 THEN 1 END) as accounts_with_balance
FROM (
  SELECT 
    a.id as account_id,
    a.code as account_code,
    a.name as account_name,
    a.category,
    a.normal_balance,
    
    -- Calculate natural amounts based on normal balance  
    SUM(CASE WHEN a.normal_balance = 'debit' AND t.debit_account_id = a.id THEN t.amount ELSE 0 END) +
    SUM(CASE WHEN a.normal_balance = 'debit' AND t.credit_account_id = a.id THEN -t.amount ELSE 0 END) +
    SUM(CASE WHEN a.normal_balance = 'credit' AND t.credit_account_id = a.id THEN t.amount ELSE 0 END) +
    SUM(CASE WHEN a.normal_balance = 'credit' AND t.debit_account_id = a.id THEN -t.amount ELSE 0 END) as canonical_balance
    
  FROM accounts a
  LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
    AND t.entry_date >= '2024-01-01'  -- Adjust date range as needed
    AND t.entry_date <= '2025-12-31'  -- Adjust date range as needed
    -- Temporarily removed posted filter to see all transactions
  GROUP BY a.id, a.code, a.name, a.category, a.normal_balance
) canonical_test

UNION ALL

-- Step 2: Check GL Summary function availability
SELECT 
  'Step 2: GL Summary Function Test' as step_name,
  COUNT(*) as total_accounts,
  COUNT(CASE WHEN (closing_debit > 0 OR closing_credit > 0) THEN 1 END) as accounts_with_balance
FROM (
  SELECT 
    account_id,
    COALESCE(closing_debit, 0) as closing_debit,
    COALESCE(closing_credit, 0) as closing_credit
  FROM get_gl_account_summary(
    '2024-01-01'::date,   -- Adjust date range as needed  
    '2025-12-31'::date,   -- Adjust date range as needed
    null,                 -- org_id
    null,                 -- project_id
    false,                -- posted_only = false to include all
    null,                 -- limit
    null                  -- offset
  )
) gl_test

UNION ALL

-- Step 3: Check account normal_balance field population
SELECT 
  'Step 3: Account Normal Balance Check' as step_name,
  COUNT(*) as total_accounts,
  COUNT(CASE WHEN normal_balance IS NOT NULL THEN 1 END) as accounts_with_normal_balance
FROM accounts

UNION ALL

-- Step 4: Check transaction date range
SELECT 
  'Step 4: Transaction Date Range' as step_name,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN entry_date BETWEEN '2024-01-01' AND '2025-12-31' THEN 1 END) as transactions_in_range
FROM transactions;

-- Detailed account analysis
SELECT 
  'Account Details' as analysis_type,
  a.code as account_code,
  a.name as account_name,
  a.category,
  a.normal_balance,
  COUNT(t.id) as transaction_count,
  SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END) as total_credits,
  
  -- Canonical balance calculation
  SUM(CASE WHEN a.normal_balance = 'debit' AND t.debit_account_id = a.id THEN t.amount ELSE 0 END) +
  SUM(CASE WHEN a.normal_balance = 'debit' AND t.credit_account_id = a.id THEN -t.amount ELSE 0 END) +
  SUM(CASE WHEN a.normal_balance = 'credit' AND t.credit_account_id = a.id THEN t.amount ELSE 0 END) +
  SUM(CASE WHEN a.normal_balance = 'credit' AND t.debit_account_id = a.id THEN -t.amount ELSE 0 END) as canonical_balance

FROM accounts a
LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
  AND t.entry_date >= '2024-01-01'  -- Adjust as needed
  AND t.entry_date <= '2025-12-31'  -- Adjust as needed
GROUP BY a.id, a.code, a.name, a.category, a.normal_balance
HAVING COUNT(t.id) > 0  -- Only show accounts with transactions
ORDER BY a.code;

-- GL Summary sample data
SELECT 
  'GL Summary Sample' as analysis_type,
  account_id,
  opening_debit,
  opening_credit,
  period_debits,
  period_credits,
  closing_debit,
  closing_credit
FROM get_gl_account_summary(
  '2024-01-01'::date,   -- Adjust as needed
  '2025-12-31'::date,   -- Adjust as needed
  null,                 -- org_id
  null,                 -- project_id
  false,                -- posted_only = false to see all
  10,                   -- limit to first 10 records
  null                  -- offset
)
ORDER BY account_id
LIMIT 10;
