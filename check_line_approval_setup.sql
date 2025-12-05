-- Check if the view exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.views 
  WHERE table_name = 'v_line_approval_inbox'
) as view_exists;

-- Check the function signature
SELECT 
  routine_name,
  data_type,
  parameter_name
FROM information_schema.parameters
WHERE routine_name = 'get_my_line_approvals'
ORDER BY ordinal_position;

-- Check if there are any transaction_lines with pending status
SELECT COUNT(*) as pending_count FROM transaction_lines WHERE line_status = 'pending';

-- Check if there are any transactions
SELECT COUNT(*) as total_transactions FROM transactions;

-- Check if there are any transaction_lines
SELECT COUNT(*) as total_lines FROM transaction_lines;
