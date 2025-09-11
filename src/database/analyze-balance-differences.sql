-- Analyze Balance Calculation Differences
-- This query compares the specific logic differences between canonical and GL Summary

-- Focus on the 2 accounts with actual activity
WITH target_accounts AS (
  SELECT unnest(ARRAY[
    '320e75cb-6de6-4e6d-beae-389a539dbcfa',
    '684b612a-e6d9-4a08-b7e9-77ddf2256a78'
  ]) as account_id
),

canonical_detailed AS (
  SELECT 
    a.id as account_id,
    a.code as account_code,
    a.name as account_name,
    a.category,
    a.normal_balance,
    
    -- Raw transaction totals
    SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END) as raw_debits,
    SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END) as raw_credits,
    
    -- Canonical balance calculation (natural balance)
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'debit' AND t.debit_account_id = a.id THEN t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'debit' AND t.credit_account_id = a.id THEN -t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'credit' AND t.credit_account_id = a.id THEN t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'credit' AND t.debit_account_id = a.id THEN -t.amount ELSE 0 END) as canonical_balance,
    
    -- Count of transactions for verification
    COUNT(t.id) as transaction_count
    
  FROM accounts a
  INNER JOIN target_accounts ta ON ta.account_id = a.id
  LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
    AND t.entry_date >= '2024-01-01'
    AND t.entry_date <= '2025-12-31'
  GROUP BY a.id, a.code, a.name, a.category, a.normal_balance
),

gl_detailed AS (
  SELECT 
    gls.account_id,
    gls.opening_debit,
    gls.opening_credit,
    gls.period_debits,
    gls.period_credits,
    gls.closing_debit,
    gls.closing_credit,
    
    -- Calculate what GL thinks the balance should be
    CASE 
      WHEN gls.closing_debit > 0 THEN gls.closing_debit
      WHEN gls.closing_credit > 0 THEN gls.closing_credit  
      ELSE 0
    END as gl_balance_amount,
    
    CASE 
      WHEN gls.closing_debit > 0 THEN 'debit'
      WHEN gls.closing_credit > 0 THEN 'credit'
      ELSE 'zero'
    END as gl_balance_side
    
  FROM get_gl_account_summary(
    '2024-01-01'::date,
    '2025-12-31'::date,
    null, null, false, null, null
  ) gls
  INNER JOIN target_accounts ta ON ta.account_id = gls.account_id
)

-- Compare the two approaches
SELECT 
  cd.account_code,
  cd.account_name,
  cd.category,
  cd.normal_balance as account_normal_balance,
  
  -- Canonical calculation details
  cd.raw_debits as canonical_raw_debits,
  cd.raw_credits as canonical_raw_credits,
  cd.canonical_balance as canonical_calculated_balance,
  ABS(cd.canonical_balance) as canonical_balance_abs,
  CASE WHEN cd.canonical_balance >= 0 THEN 'debit' ELSE 'credit' END as canonical_balance_side,
  
  -- GL Summary details  
  gld.period_debits as gl_period_debits,
  gld.period_credits as gl_period_credits,
  gld.closing_debit as gl_closing_debit,
  gld.closing_credit as gl_closing_credit,
  gld.gl_balance_amount,
  gld.gl_balance_side,
  
  -- Difference analysis
  cd.raw_debits - gld.period_debits as debit_difference,
  cd.raw_credits - gld.period_credits as credit_difference,
  
  -- Balance comparison
  CASE 
    WHEN cd.normal_balance = 'debit' THEN ABS(cd.canonical_balance) - gld.closing_debit
    WHEN cd.normal_balance = 'credit' THEN ABS(cd.canonical_balance) - gld.closing_credit
    ELSE ABS(cd.canonical_balance) - gld.gl_balance_amount
  END as balance_difference,
  
  cd.transaction_count
  
FROM canonical_detailed cd
FULL OUTER JOIN gl_detailed gld ON gld.account_id = cd.account_id
ORDER BY cd.account_code;

-- Show individual transactions for the most active account
SELECT 
  'Transaction Details for Account 320e75cb' as analysis_type,
  t.id as transaction_id,
  t.entry_date,
  t.amount,
  CASE WHEN t.debit_account_id = '320e75cb-6de6-4e6d-beae-389a539dbcfa' THEN 'DEBIT' ELSE 'CREDIT' END as transaction_side,
  t.description,
  t.is_posted
FROM transactions t
WHERE (
  t.debit_account_id = '320e75cb-6de6-4e6d-beae-389a539dbcfa' OR 
  t.credit_account_id = '320e75cb-6de6-4e6d-beae-389a539dbcfa'
)
AND t.entry_date >= '2024-01-01'
AND t.entry_date <= '2025-12-31'
ORDER BY t.entry_date, t.id
LIMIT 10;

-- Check account details
SELECT 
  'Account Details' as analysis_type,
  a.code,
  a.name,
  a.category,
  a.normal_balance,
  a.status,
  CASE 
    WHEN a.code LIKE '1%' THEN 'Assets (should be debit normal)'
    WHEN a.code LIKE '2%' THEN 'Liabilities (should be credit normal)'
    WHEN a.code LIKE '3%' THEN 'Equity (should be credit normal)'
    WHEN a.code LIKE '4%' THEN 'Revenue (should be credit normal)'
    WHEN a.code LIKE '5%' THEN 'Expenses (should be debit normal)'
    ELSE 'Unknown classification'
  END as expected_normal_balance
FROM accounts a
WHERE a.id IN (
  '320e75cb-6de6-4e6d-beae-389a539dbcfa',
  '684b612a-e6d9-4a08-b7e9-77ddf2256a78'
);
