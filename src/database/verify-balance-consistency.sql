-- Balance Calculation Consistency Verification
-- This query verifies that different balance calculation methods produce consistent results

-- Test canonical balance calculation (used by Balance Sheet, P&L, and updated Trial Balance Original)
WITH canonical_balances AS (
  -- Canonical balance calculation logic (matches getAccountBalances service)
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
    SUM(CASE WHEN a.normal_balance = 'credit' AND t.debit_account_id = a.id THEN -t.amount ELSE 0 END) as canonical_balance,
    
    -- Raw debit/credit totals for comparison
    SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END) as total_credits
    
  FROM accounts a
  LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
    AND t.entry_date >= '2024-01-01'  -- Replace with actual date range
    AND t.entry_date <= '2024-12-31'  -- Replace with actual date range
    AND t.is_posted = true            -- Adjust based on posted_only filter
  GROUP BY a.id, a.code, a.name, a.category, a.normal_balance
),

-- Compare with GL Summary (used by Trial Balance All Levels)
gl_summary AS (
  SELECT 
    account_id,
    closing_debit,
    closing_credit,
    period_debits,
    period_credits
  FROM get_gl_account_summary(
    '2024-01-01'::date,   -- Replace with actual date_from
    '2024-12-31'::date,   -- Replace with actual date_to
    null,                 -- org_id
    null,                 -- project_id
    true,                 -- posted_only
    null,                 -- limit
    null                  -- offset
  )
)

-- Final comparison query
SELECT 
  cb.account_code,
  cb.account_name,
  cb.category,
  cb.normal_balance,
  
  -- Canonical balance (positive value)
  ABS(cb.canonical_balance) as canonical_balance,
  
  -- GL summary balances
  COALESCE(gls.closing_debit, 0) as gl_closing_debit,
  COALESCE(gls.closing_credit, 0) as gl_closing_credit,
  
  -- Comparison: canonical vs GL summary
  CASE 
    WHEN cb.normal_balance = 'debit' THEN 
      ABS(cb.canonical_balance) - COALESCE(gls.closing_debit, 0)
    ELSE 
      ABS(cb.canonical_balance) - COALESCE(gls.closing_credit, 0)
  END as balance_difference,
  
  -- Flag discrepancies
  CASE 
    WHEN ABS(
      CASE 
        WHEN cb.normal_balance = 'debit' THEN 
          ABS(cb.canonical_balance) - COALESCE(gls.closing_debit, 0)
        ELSE 
          ABS(cb.canonical_balance) - COALESCE(gls.closing_credit, 0)
      END
    ) > 0.01 THEN '⚠️ DISCREPANCY'
    ELSE '✅ CONSISTENT'
  END as status
  
FROM canonical_balances cb
LEFT JOIN gl_summary gls ON gls.account_id = cb.account_id
WHERE cb.canonical_balance != 0 OR gls.closing_debit != 0 OR gls.closing_credit != 0
ORDER BY cb.account_code;
