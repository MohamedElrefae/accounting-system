-- Fix the assigned_approver_id for pending lines
UPDATE transaction_lines
SET assigned_approver_id = auth.uid()
WHERE line_status = 'pending'
  AND assigned_approver_id IS NULL;

-- Verify
SELECT 
  COUNT(*) as pending_lines,
  COUNT(DISTINCT assigned_approver_id) as approvers
FROM transaction_lines 
WHERE line_status = 'pending';

-- Test the function again
SELECT * FROM get_my_line_approvals(auth.uid());
