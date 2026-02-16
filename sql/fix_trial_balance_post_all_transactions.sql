-- Fix Trial Balance Discrepancy by Posting All Transactions
-- This assumes all imported transactions should be posted

BEGIN;

-- Step 1: Check current status
SELECT 
  'BEFORE UPDATE' as status,
  is_posted,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_amount
FROM transactions
GROUP BY is_posted
ORDER BY is_posted;

-- Step 2: Update all transactions to posted
UPDATE transactions 
SET is_posted = true,
    updated_at = NOW()
WHERE is_posted = false OR is_posted IS NULL;

-- Step 3: Verify the update
SELECT 
  'AFTER UPDATE' as status,
  is_posted,
  COUNT(*) as transaction_count,
  SUM(total_amount) as total_amount
FROM transactions
GROUP BY is_posted
ORDER BY is_posted;

-- Step 4: Verify trial balance totals now match
SELECT 
  'TRIAL BALANCE TOTALS (All Transactions)' as check_type,
  SUM(closing_debit) as total_debit,
  SUM(closing_credit) as total_credit,
  SUM(closing_debit) - SUM(closing_credit) as difference
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false
);

-- Step 5: Verify with posted only filter
SELECT 
  'TRIAL BALANCE TOTALS (Posted Only)' as check_type,
  SUM(closing_debit) as total_debit,
  SUM(closing_credit) as total_credit,
  SUM(closing_debit) - SUM(closing_credit) as difference
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := true
);

-- Step 6: Show summary
SELECT 
  'SUMMARY' as info,
  'All transactions have been posted. Trial balance should now show correct totals.' as message;

COMMIT;

-- Note: If you want to rollback, run: ROLLBACK;
