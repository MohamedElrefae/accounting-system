-- ================================================================
-- QUICK TEST - Approval Workflow
-- Simple test to verify the system is working
-- ================================================================

-- 1. Check current user (should NOT be null when logged in)
SELECT 'Step 1: Current User' as test;
SELECT auth.uid() as current_user_id;

-- 2. Check if we have draft transactions
SELECT 'Step 2: Draft Transactions' as test;
SELECT 
  id,
  entry_number,
  status,
  (SELECT COUNT(*) FROM transaction_lines WHERE transaction_id = t.id) as line_count
FROM transactions t
WHERE status = 'draft' OR status IS NULL
ORDER BY created_at DESC
LIMIT 3;

-- 3. Test submit function with a draft transaction
-- REPLACE 'YOUR_TRANSACTION_ID' with an ID from step 2
/*
SELECT 'Step 3: Submit Transaction' as test;
SELECT * FROM submit_transaction_for_line_approval(
  'YOUR_TRANSACTION_ID'::UUID,
  auth.uid()
);
*/

-- 4. Check if lines are now pending
/*
SELECT 'Step 4: Check Pending Lines' as test;
SELECT 
  id,
  line_no,
  line_status,
  assigned_approver_id,
  submitted_for_approval_at
FROM transaction_lines
WHERE transaction_id = 'YOUR_TRANSACTION_ID'::UUID;
*/

-- 5. Check inbox
SELECT 'Step 5: My Inbox' as test;
SELECT * FROM get_my_line_approvals(auth.uid());

-- 6. Check view directly
SELECT 'Step 6: View Data' as test;
SELECT 
  line_id,
  entry_number,
  line_no,
  account_code,
  debit_amount,
  credit_amount,
  assigned_approver_id
FROM v_line_approval_inbox
LIMIT 5;

-- ================================================================
-- EXPECTED RESULTS:
-- ================================================================
-- Step 1: Should show your user ID (not null)
-- Step 2: Should show draft transactions with lines
-- Step 3: Should return success=true, lines_submitted=2 (or however many lines)
-- Step 4: Should show lines with status='pending'
-- Step 5: Should show the lines you just submitted (since you're the approver)
-- Step 6: Should show the same lines from the view
