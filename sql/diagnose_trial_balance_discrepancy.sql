-- Diagnose Trial Balance Discrepancy
-- User reports: Data transfer shows 905,925,674.84 for both debit and credit
-- But trial balance reports show 204,937,398.11 for both

-- Step 1: Check raw transaction_lines totals (what was imported)
SELECT 
  'Raw Transaction Lines Totals' as check_type,
  COUNT(*) as line_count,
  SUM(COALESCE(debit_amount, 0)) as total_debit,
  SUM(COALESCE(credit_amount, 0)) as total_credit,
  SUM(COALESCE(debit_amount, 0)) - SUM(COALESCE(credit_amount, 0)) as difference
FROM transaction_lines;

-- Step 2: Check transaction_lines with transaction join (what the function uses)
SELECT 
  'Transaction Lines with Transactions' as check_type,
  COUNT(*) as line_count,
  SUM(COALESCE(tl.debit_amount, 0)) as total_debit,
  SUM(COALESCE(tl.credit_amount, 0)) as total_credit,
  SUM(COALESCE(tl.debit_amount, 0)) - SUM(COALESCE(tl.credit_amount, 0)) as difference
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE tl.account_id IS NOT NULL;

-- Step 3: Check with posted filter
SELECT 
  'Posted Transactions Only' as check_type,
  COUNT(*) as line_count,
  SUM(COALESCE(tl.debit_amount, 0)) as total_debit,
  SUM(COALESCE(tl.credit_amount, 0)) as total_credit,
  SUM(COALESCE(tl.debit_amount, 0)) - SUM(COALESCE(tl.credit_amount, 0)) as difference
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE tl.account_id IS NOT NULL
  AND t.is_posted = TRUE;

-- Step 4: Check what the GL summary function returns
SELECT 
  'GL Summary Function Result' as check_type,
  COUNT(*) as account_count,
  SUM(closing_debit) as total_closing_debit,
  SUM(closing_credit) as total_closing_credit,
  SUM(closing_debit) - SUM(closing_credit) as difference
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false
);

-- Step 5: Check with posted only
SELECT 
  'GL Summary Function (Posted Only)' as check_type,
  COUNT(*) as account_count,
  SUM(closing_debit) as total_closing_debit,
  SUM(closing_credit) as total_closing_credit,
  SUM(closing_debit) - SUM(closing_credit) as difference
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := true
);

-- Step 6: Check transaction status distribution
SELECT 
  'Transaction Status Distribution' as check_type,
  t.is_posted,
  COUNT(DISTINCT t.id) as transaction_count,
  COUNT(tl.id) as line_count,
  SUM(COALESCE(tl.debit_amount, 0)) as total_debit,
  SUM(COALESCE(tl.credit_amount, 0)) as total_credit
FROM transactions t
LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
GROUP BY t.is_posted
ORDER BY t.is_posted;

-- Step 7: Check if there are transactions without lines
SELECT 
  'Transactions Without Lines' as check_type,
  COUNT(*) as count
FROM transactions t
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_lines tl WHERE tl.transaction_id = t.id
);

-- Step 8: Check if there are lines without accounts
SELECT 
  'Lines Without Accounts' as check_type,
  COUNT(*) as count,
  SUM(COALESCE(debit_amount, 0)) as total_debit,
  SUM(COALESCE(credit_amount, 0)) as total_credit
FROM transaction_lines
WHERE account_id IS NULL;

-- Step 9: Sample some accounts to see their balances
SELECT 
  'Sample Account Balances' as check_type,
  account_code,
  account_name_ar,
  closing_debit,
  closing_credit,
  period_debits,
  period_credits,
  opening_debit,
  opening_credit
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false
)
ORDER BY closing_debit + closing_credit DESC
LIMIT 10;

-- Step 10: Check for duplicate transactions
SELECT 
  'Duplicate Transaction Check' as check_type,
  reference_number,
  entry_date,
  COUNT(*) as duplicate_count,
  SUM(total_amount) as total_amount_sum
FROM transactions
GROUP BY reference_number, entry_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;
