-- ================================================================
-- DEBUG TRANSACTIONS INBOX
-- Check why transactions tab shows no data
-- ================================================================

-- 1. Check if function exists
SELECT 'Function exists:' as check;
SELECT COUNT(*) as count 
FROM pg_proc 
WHERE proname = 'get_transactions_with_pending_lines';

-- 2. Check current user
SELECT 'Current user:' as check, auth.uid() as user_id;

-- 3. Check pending lines directly
SELECT 'Pending lines:' as check;
SELECT 
  tl.id,
  tl.transaction_id,
  t.entry_number,
  tl.line_no,
  tl.line_status,
  tl.assigned_approver_id
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE tl.line_status = 'pending'
LIMIT 5;

-- 4. Test the function directly (replace with your user ID from step 2)
SELECT 'Function result:' as check;
-- SELECT * FROM get_transactions_with_pending_lines(auth.uid());

-- 5. Check if lines are assigned to you
SELECT 'Lines assigned to me:' as check;
SELECT COUNT(*) as count
FROM transaction_lines
WHERE line_status = 'pending' 
  AND assigned_approver_id = auth.uid();

-- 6. Group transactions manually
SELECT 'Transactions with pending lines (manual):' as check;
SELECT 
  t.id as transaction_id,
  t.entry_number,
  t.entry_date,
  t.description,
  t.status,
  COUNT(*) FILTER (WHERE tl.line_status = 'pending' AND tl.assigned_approver_id = auth.uid()) as pending_lines_count,
  COUNT(*) as total_lines_count
FROM transactions t
INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE tl.line_status = 'pending'
  AND tl.assigned_approver_id = auth.uid()
GROUP BY t.id, t.entry_number, t.entry_date, t.description, t.status;

-- ================================================================
-- EXPECTED RESULTS:
-- ================================================================
-- Step 1: Should show 1 (function exists)
-- Step 2: Should show your user ID (not null)
-- Step 3: Should show pending lines
-- Step 4: Should show transactions
-- Step 5: Should show count > 0
-- Step 6: Should show same transactions as step 4
