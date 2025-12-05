-- Check what assigned_approver_id is set to
SELECT 
  id,
  line_no,
  assigned_approver_id,
  line_status,
  submitted_by
FROM transaction_lines 
WHERE line_status = 'pending'
LIMIT 5;

-- Check the view directly
SELECT * FROM v_line_approval_inbox LIMIT 5;

-- Check current user
SELECT auth.uid() as current_user_id;
