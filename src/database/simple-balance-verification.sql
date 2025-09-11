-- Simplified Balance Consistency Verification
-- This version removes restrictive filters and works with your actual data structure

WITH canonical_balances AS (
  -- Canonical balance calculation (matches your getAccountBalances service)
  SELECT 
    a.id as account_id,
    a.code as account_code, 
    a.name as account_name,
    a.category,
    COALESCE(a.normal_balance, 'debit') as normal_balance, -- Default to debit if null
    
    -- Calculate natural amounts based on normal balance  
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'debit' AND t.debit_account_id = a.id THEN t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'debit' AND t.credit_account_id = a.id THEN -t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'credit' AND t.credit_account_id = a.id THEN t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'credit' AND t.debit_account_id = a.id THEN -t.amount ELSE 0 END) as canonical_balance,
    
    -- Raw debit/credit totals for reference
    SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END) as total_credits
    
  FROM accounts a
  LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
    AND t.entry_date >= '2024-01-01'  -- Use your actual date range
    AND t.entry_date <= '2025-12-31'  -- Use your actual date range
    -- Removed posted_only filter for broader testing
  GROUP BY a.id, a.code, a.name, a.category, a.normal_balance
  HAVING SUM(CASE WHEN t.debit_account_id = a.id OR t.credit_account_id = a.id THEN 1 ELSE 0 END) > 0 -- Only accounts with transactions
),

gl_summary AS (
  -- GL Summary data (if available)
  SELECT 
    account_id,
    COALESCE(closing_debit, 0) as closing_debit,
    COALESCE(closing_credit, 0) as closing_credit,
    COALESCE(period_debits, 0) as period_debits,
    COALESCE(period_credits, 0) as period_credits
  FROM get_gl_account_summary(
    '2024-01-01'::date,   -- Use your actual date range
    '2025-12-31'::date,   -- Use your actual date range
    null,                 -- org_id
    null,                 -- project_id
    false,                -- posted_only = false to include all transactions
    null,                 -- limit
    null                  -- offset
  )
)

-- Main comparison query
SELECT 
  cb.account_code,
  cb.account_name,
  cb.category,
  cb.normal_balance,
  
  -- Canonical balance (with sign preserved)
  cb.canonical_balance,
  -- Also show absolute value for comparison
  ABS(cb.canonical_balance) as canonical_balance_abs,
  
  -- GL summary balances
  gls.closing_debit as gl_closing_debit,
  gls.closing_credit as gl_closing_credit,
  
  -- Raw transaction totals for debugging
  cb.total_debits,
  cb.total_credits,
  
  -- Simple balance difference calculation
  CASE 
    WHEN cb.normal_balance = 'debit' THEN 
      ABS(cb.canonical_balance) - gls.closing_debit
    ELSE 
      ABS(cb.canonical_balance) - gls.closing_credit
  END as balance_difference,
  
  -- Status check
  CASE 
    WHEN gls.account_id IS NULL THEN '📋 No GL Summary Data'
    WHEN ABS(
      CASE 
        WHEN cb.normal_balance = 'debit' THEN 
          ABS(cb.canonical_balance) - gls.closing_debit
        ELSE 
          ABS(cb.canonical_balance) - gls.closing_credit
      END
    ) <= 0.01 THEN '✅ CONSISTENT'
    ELSE '⚠️ DISCREPANCY'
  END as status
  
FROM canonical_balances cb
LEFT JOIN gl_summary gls ON gls.account_id = cb.account_id
-- Show all accounts with transactions (no balance filtering)
ORDER BY cb.account_code;

-- Summary statistics
WITH canonical_balances AS (
  SELECT 
    a.id as account_id,
    a.code as account_code, 
    COALESCE(a.normal_balance, 'debit') as normal_balance,
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'debit' AND t.debit_account_id = a.id THEN t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'debit' AND t.credit_account_id = a.id THEN -t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'credit' AND t.credit_account_id = a.id THEN t.amount ELSE 0 END) +
    SUM(CASE WHEN COALESCE(a.normal_balance, 'debit') = 'credit' AND t.debit_account_id = a.id THEN -t.amount ELSE 0 END) as canonical_balance
  FROM accounts a
  LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
    AND t.entry_date >= '2024-01-01'
    AND t.entry_date <= '2025-12-31'
  GROUP BY a.id, a.code, a.normal_balance
  HAVING SUM(CASE WHEN t.debit_account_id = a.id OR t.credit_account_id = a.id THEN 1 ELSE 0 END) > 0
),
gl_summary AS (
  SELECT account_id, COALESCE(closing_debit, 0) as closing_debit, COALESCE(closing_credit, 0) as closing_credit
  FROM get_gl_account_summary('2024-01-01'::date, '2025-12-31'::date, null, null, false, null, null)
)

SELECT 
  'Balance Consistency Summary' as report_title,
  COUNT(cb.account_id) as total_accounts_tested,
  COUNT(gls.account_id) as accounts_in_gl_summary,
  COUNT(CASE 
    WHEN gls.account_id IS NOT NULL AND ABS(
      CASE 
        WHEN cb.normal_balance = 'debit' THEN ABS(cb.canonical_balance) - gls.closing_debit
        ELSE ABS(cb.canonical_balance) - gls.closing_credit
      END
    ) <= 0.01 THEN 1 
  END) as consistent_accounts,
  COUNT(CASE 
    WHEN gls.account_id IS NOT NULL AND ABS(
      CASE 
        WHEN cb.normal_balance = 'debit' THEN ABS(cb.canonical_balance) - gls.closing_debit
        ELSE ABS(cb.canonical_balance) - gls.closing_credit
      END
    ) > 0.01 THEN 1 
  END) as discrepant_accounts,
  CASE 
    WHEN COUNT(gls.account_id) = 0 THEN 'No GL Summary data available'
    ELSE ROUND(
      100.0 * COUNT(CASE 
        WHEN gls.account_id IS NOT NULL AND ABS(
          CASE 
            WHEN cb.normal_balance = 'debit' THEN ABS(cb.canonical_balance) - gls.closing_debit
            ELSE ABS(cb.canonical_balance) - gls.closing_credit
          END
        ) <= 0.01 THEN 1 
      END) / NULLIF(COUNT(gls.account_id), 0), 2
    ) || '%'
  END as consistency_percentage

FROM canonical_balances cb
LEFT JOIN gl_summary gls ON gls.account_id = cb.account_id;
