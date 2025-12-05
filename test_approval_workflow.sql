-- ================================================================
-- TEST APPROVAL WORKFLOW
-- Quick test script to verify the approval system is working
-- ================================================================

-- STEP 1: Check if migration was applied
SELECT 'Checking view...' as step;
SELECT COUNT(*) as view_exists 
FROM information_schema.views 
WHERE table_name = 'v_line_approval_inbox';

SELECT 'Checking function...' as step;
SELECT COUNT(*) as function_exists 
FROM pg_proc 
WHERE proname = 'submit_transaction_for_line_approval';

-- STEP 2: Check current user
SELECT 'Current user:' as step, auth.uid() as user_id;

-- STEP 3: Check existing pending lines
SELECT 'Existing pending lines:' as step;
SELECT 
  tl.id,
  tl.transaction_id,
  t.entry_number,
  tl.line_no,
  tl.line_status,
  tl.assigned_approver_id,
  tl.submitted_for_approval_at
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE tl.line_status = 'pending'
ORDER BY tl.submitted_for_approval_at DESC
LIMIT 10;

-- STEP 4: Check inbox view
SELECT 'Inbox view data:' as step;
SELECT * FROM v_line_approval_inbox LIMIT 5;

-- STEP 5: Check my assigned lines
SELECT 'My assigned lines:' as step;
SELECT * FROM get_my_line_approvals(auth.uid());

-- STEP 6: Check draft transactions (ready to submit)
SELECT 'Draft transactions with lines:' as step;
SELECT 
  t.id,
  t.entry_number,
  t.status,
  COUNT(tl.id) as line_count,
  COUNT(tl.id) FILTER (WHERE tl.line_status = 'draft') as draft_lines
FROM transactions t
LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.status = 'draft' OR t.status IS NULL
GROUP BY t.id, t.entry_number, t.status
HAVING COUNT(tl.id) > 0
ORDER BY t.created_at DESC
LIMIT 5;

-- STEP 7: Check organizations (approvers will fallback to submitter if no manager)
SELECT 'Organizations:' as step;
SELECT 
  o.id,
  o.name,
  o.code
FROM organizations o
LIMIT 5;

-- ================================================================
-- MANUAL TEST WORKFLOW
-- ================================================================

-- UNCOMMENT AND RUN THESE STEPS TO TEST:

-- 1. Create test transaction
/*
INSERT INTO transactions (entry_number, entry_date, description, org_id)
VALUES ('TEST-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'), CURRENT_DATE, 'Test Approval Workflow', 
  (SELECT id FROM organizations LIMIT 1))
RETURNING id, entry_number;
-- Copy the returned ID for next steps
*/

-- 2. Add test lines (replace TRANSACTION_ID with ID from step 1)
/*
INSERT INTO transaction_lines (transaction_id, line_no, account_id, debit_amount, credit_amount, description)
VALUES 
  ('TRANSACTION_ID', 1, (SELECT id FROM accounts WHERE is_postable = true LIMIT 1), 1000, 0, 'Test debit line'),
  ('TRANSACTION_ID', 2, (SELECT id FROM accounts WHERE is_postable = true LIMIT 1 OFFSET 1), 0, 1000, 'Test credit line')
RETURNING id, line_no, line_status;
*/

-- 3. Submit for approval (replace TRANSACTION_ID)
/*
SELECT * FROM submit_transaction_for_line_approval('TRANSACTION_ID', auth.uid());
*/

-- 4. Check lines are now pending
/*
SELECT id, line_no, line_status, assigned_approver_id, submitted_for_approval_at
FROM transaction_lines
WHERE transaction_id = 'TRANSACTION_ID';
*/

-- 5. Check inbox
/*
SELECT * FROM get_my_line_approvals(auth.uid());
*/

-- 6. Approve first line (replace LINE_ID)
/*
SELECT * FROM approve_line('LINE_ID', auth.uid(), 'Test approval');
*/

-- 7. Approve second line (replace LINE_ID)
/*
SELECT * FROM approve_line('LINE_ID', auth.uid(), 'Test approval');
*/

-- 8. Check transaction is now approved
/*
SELECT id, entry_number, status, all_lines_approved, lines_approved_count, lines_total_count
FROM transactions
WHERE id = 'TRANSACTION_ID';
*/

-- 9. Cleanup (optional - replace TRANSACTION_ID)
/*
DELETE FROM transaction_lines WHERE transaction_id = 'TRANSACTION_ID';
DELETE FROM transactions WHERE id = 'TRANSACTION_ID';
*/
