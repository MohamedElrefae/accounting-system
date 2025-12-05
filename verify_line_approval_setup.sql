-- ================================================================
-- VERIFICATION QUERIES FOR LINE-BASED APPROVAL SYSTEM
-- Run these to confirm everything is set up correctly
-- ================================================================

-- 1. Check transaction_lines columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
AND column_name IN (
  'line_status', 
  'approved_by', 
  'assigned_approver_id',
  'submitted_for_approval_at',
  'rejection_reason',
  'approval_priority'
)
ORDER BY column_name;
-- Expected: 6 rows

-- 2. Check transactions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN (
  'status',
  'approval_method',
  'all_lines_approved',
  'lines_approved_count',
  'lines_total_count'
)
ORDER BY column_name;
-- Expected: 5 rows

-- 3. Check functions created
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN (
  'submit_transaction_for_line_approval',
  'approve_line',
  'reject_line',
  'get_my_line_approvals',
  'get_transaction_approval_status'
)
ORDER BY routine_name;
-- Expected: 5 rows

-- 4. Check view created
SELECT table_name, view_definition
FROM information_schema.views 
WHERE table_name = 'v_line_approval_inbox';
-- Expected: 1 row

-- 5. Check trigger created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'update_transaction_on_line_change_trigger';
-- Expected: 1 row

-- 6. Check indexes created
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE '%line%approval%' OR indexname LIKE '%tx_lines%'
ORDER BY indexname;
-- Expected: 4+ rows

-- ================================================================
-- ALL CHECKS PASSED? Great! System is ready to use.
-- ================================================================
