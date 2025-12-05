-- Test the get_my_line_approvals function
-- Replace with your actual user ID
SELECT * FROM get_my_line_approvals('e84e1ac0-2240-4e37-b747-a01daa44ae4b'::uuid);

-- Also check the view
SELECT * FROM v_line_approval_inbox LIMIT 5;

-- Check if there are any pending lines
SELECT COUNT(*) as pending_lines FROM transaction_lines WHERE line_status = 'pending';
