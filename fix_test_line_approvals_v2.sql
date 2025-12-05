-- Fix the assigned_approver_id using the actual user ID
UPDATE transaction_lines
SET assigned_approver_id = 'e84e1ac0-2240-4e37-b747-a01daa44ae4b'::uuid
WHERE line_status = 'pending'
  AND assigned_approver_id IS NULL;

-- Verify
SELECT 
  COUNT(*) as pending_lines,
  COUNT(DISTINCT assigned_approver_id) as approvers
FROM transaction_lines 
WHERE line_status = 'pending';

-- Test the function again
SELECT * FROM get_my_line_approvals('e84e1ac0-2240-4e37-b747-a01daa44ae4b'::uuid);
