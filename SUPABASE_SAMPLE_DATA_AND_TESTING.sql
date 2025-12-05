-- ============================================================================
-- SUPABASE SAMPLE DATA & TESTING SCRIPT
-- ============================================================================
-- This script creates sample data for testing the transaction edit system
-- Run this AFTER running SUPABASE_TRANSACTION_EDIT_SYSTEM_SQL.sql
-- ============================================================================

-- ============================================================================
-- PART 1: GET YOUR USER ID AND ORG ID
-- ============================================================================

-- 1.1: Get current user ID (run this first to get your user ID)
SELECT auth.uid() as current_user_id;

-- 1.2: Get existing organizations
SELECT id, name FROM organizations LIMIT 5;

-- 1.3: Get existing projects
SELECT id, name FROM projects LIMIT 5;

-- Store these values - you'll need them for the sample data below
-- Replace 'YOUR_USER_ID' with the actual user ID from auth.uid()
-- Replace 'YOUR_ORG_ID' with an actual organization ID
-- Replace 'YOUR_PROJECT_ID' with an actual project ID (can be NULL)

-- ============================================================================
-- PART 2: CREATE SAMPLE TRANSACTIONS
-- ============================================================================

-- 2.1: Create a DRAFT transaction (for testing Save as Draft)
INSERT INTO transactions (
  entry_number,
  entry_date,
  description,
  org_id,
  project_id,
  approval_status,
  created_by,
  created_at,
  updated_at
) VALUES (
  'DRAFT-001',
  CURRENT_DATE,
  'Sample Draft Transaction - Can be edited',
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM projects LIMIT 1),
  'draft',
  auth.uid(),
  NOW(),
  NOW()
) RETURNING id as draft_transaction_id, entry_number, approval_status;

-- 2.2: Create a SUBMITTED transaction (for testing approval workflow)
INSERT INTO transactions (
  entry_number,
  entry_date,
  description,
  org_id,
  project_id,
  approval_status,
  created_by,
  submitted_by,
  submitted_at,
  created_at,
  updated_at
) VALUES (
  'SUBMITTED-001',
  CURRENT_DATE,
  'Sample Submitted Transaction - Awaiting approval',
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM projects LIMIT 1),
  'submitted',
  auth.uid(),
  auth.uid(),
  NOW(),
  NOW(),
  NOW()
) RETURNING id as submitted_transaction_id, entry_number, approval_status;

-- 2.3: Create an APPROVED transaction (for testing edit requests)
INSERT INTO transactions (
  entry_number,
  entry_date,
  description,
  org_id,
  project_id,
  approval_status,
  created_by,
  submitted_by,
  submitted_at,
  approved_by,
  approved_at,
  created_at,
  updated_at
) VALUES (
  'APPROVED-001',
  CURRENT_DATE,
  'Sample Approved Transaction - Can request edit',
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM projects LIMIT 1),
  'approved',
  auth.uid(),
  auth.uid(),
  NOW() - INTERVAL '1 day',
  auth.uid(),
  NOW(),
  NOW() - INTERVAL '1 day',
  NOW()
) RETURNING id as approved_transaction_id, entry_number, approval_status;

-- 2.4: Create a REJECTED transaction (for testing resubmit)
INSERT INTO transactions (
  entry_number,
  entry_date,
  description,
  org_id,
  project_id,
  approval_status,
  created_by,
  submitted_by,
  submitted_at,
  rejected_by,
  rejected_at,
  rejection_reason,
  created_at,
  updated_at
) VALUES (
  'REJECTED-001',
  CURRENT_DATE,
  'Sample Rejected Transaction - Can be resubmitted',
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM projects LIMIT 1),
  'rejected',
  auth.uid(),
  auth.uid(),
  NOW() - INTERVAL '2 days',
  auth.uid(),
  NOW() - INTERVAL '1 day',
  'Amount is incorrect. Please review and resubmit.',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
) RETURNING id as rejected_transaction_id, entry_number, approval_status;

-- 2.5: Create a REVISION_REQUESTED transaction (for testing edit after approval)
INSERT INTO transactions (
  entry_number,
  entry_date,
  description,
  org_id,
  project_id,
  approval_status,
  created_by,
  submitted_by,
  submitted_at,
  approved_by,
  approved_at,
  created_at,
  updated_at
) VALUES (
  'REVISION-001',
  CURRENT_DATE,
  'Sample Revision Requested Transaction - Can be edited',
  (SELECT id FROM organizations LIMIT 1),
  (SELECT id FROM projects LIMIT 1),
  'revision_requested',
  auth.uid(),
  auth.uid(),
  NOW() - INTERVAL '2 days',
  auth.uid(),
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
) RETURNING id as revision_transaction_id, entry_number, approval_status;

-- ============================================================================
-- PART 3: VERIFICATION QUERIES - RUN THESE TO VERIFY SAMPLE DATA
-- ============================================================================

-- 3.1: View all sample transactions
SELECT 
  id,
  entry_number,
  description,
  approval_status,
  created_by,
  submitted_by,
  approved_by,
  rejected_by,
  created_at
FROM transactions 
WHERE entry_number LIKE '%DRAFT%' 
   OR entry_number LIKE '%SUBMITTED%'
   OR entry_number LIKE '%APPROVED%'
   OR entry_number LIKE '%REJECTED%'
   OR entry_number LIKE '%REVISION%'
ORDER BY created_at DESC;

-- 3.2: Count sample transactions by status
SELECT 
  approval_status,
  COUNT(*) as count
FROM transactions 
WHERE entry_number LIKE '%DRAFT%' 
   OR entry_number LIKE '%SUBMITTED%'
   OR entry_number LIKE '%APPROVED%'
   OR entry_number LIKE '%REJECTED%'
   OR entry_number LIKE '%REVISION%'
GROUP BY approval_status
ORDER BY approval_status;

-- 3.3: View transaction details with full audit info
SELECT 
  id,
  entry_number,
  approval_status,
  is_posted,
  created_by,
  created_at,
  submitted_by,
  submitted_at,
  approved_by,
  approved_at,
  rejected_by,
  rejected_at,
  rejection_reason
FROM transactions 
WHERE entry_number LIKE '%DRAFT%' 
   OR entry_number LIKE '%SUBMITTED%'
   OR entry_number LIKE '%APPROVED%'
   OR entry_number LIKE '%REJECTED%'
   OR entry_number LIKE '%REVISION%'
ORDER BY created_at DESC;

-- ============================================================================
-- PART 4: TEST WORKFLOWS WITH SAMPLE DATA
-- ============================================================================

-- 4.1: Get a draft transaction ID for testing
-- Copy the ID from the result and use it in the queries below
SELECT id, entry_number, approval_status 
FROM transactions 
WHERE entry_number = 'DRAFT-001'
LIMIT 1;

-- 4.2: Test SUBMIT FOR APPROVAL workflow
-- Replace 'DRAFT-001' with actual transaction ID
SELECT submit_transaction_for_approval(
  (SELECT id FROM transactions WHERE entry_number = 'DRAFT-001' LIMIT 1),
  auth.uid()
);

-- Verify status changed to SUBMITTED
SELECT id, entry_number, approval_status, submitted_at, submitted_by 
FROM transactions 
WHERE entry_number = 'DRAFT-001';

-- 4.3: Test APPROVE workflow
-- Replace 'SUBMITTED-001' with actual transaction ID
SELECT approve_transaction(
  (SELECT id FROM transactions WHERE entry_number = 'SUBMITTED-001' LIMIT 1),
  auth.uid(),
  'Looks good, approved'
);

-- Verify status changed to APPROVED
SELECT id, entry_number, approval_status, approved_at, approved_by 
FROM transactions 
WHERE entry_number = 'SUBMITTED-001';

-- 4.4: Test REQUEST EDIT workflow
-- Replace 'APPROVED-001' with actual transaction ID
SELECT request_edit_for_transaction(
  (SELECT id FROM transactions WHERE entry_number = 'APPROVED-001' LIMIT 1),
  auth.uid(),
  'Need to fix the description and amount'
);

-- Verify edit request created
SELECT id, transaction_id, reason, status, requested_at 
FROM edit_requests 
WHERE transaction_id = (SELECT id FROM transactions WHERE entry_number = 'APPROVED-001' LIMIT 1);

-- 4.5: Test APPROVE EDIT REQUEST workflow
-- Get the edit request ID from above query
SELECT approve_edit_request(
  (SELECT id FROM edit_requests WHERE transaction_id = (SELECT id FROM transactions WHERE entry_number = 'APPROVED-001' LIMIT 1) LIMIT 1),
  auth.uid(),
  'Approved for editing'
);

-- Verify transaction status changed to REVISION_REQUESTED
SELECT id, entry_number, approval_status, edit_locked 
FROM transactions 
WHERE entry_number = 'APPROVED-001';

-- 4.6: Test RESUBMIT workflow
-- Replace 'REJECTED-001' with actual transaction ID
SELECT resubmit_transaction(
  (SELECT id FROM transactions WHERE entry_number = 'REJECTED-001' LIMIT 1),
  auth.uid(),
  'Fixed the amount as requested'
);

-- Verify status changed back to SUBMITTED
SELECT id, entry_number, approval_status, submitted_at 
FROM transactions 
WHERE entry_number = 'REJECTED-001';

-- Verify resubmission record created
SELECT id, transaction_id, previous_status, reason, resubmitted_at 
FROM resubmissions 
WHERE transaction_id = (SELECT id FROM transactions WHERE entry_number = 'REJECTED-001' LIMIT 1);

-- ============================================================================
-- PART 5: VIEW AUDIT TRAIL
-- ============================================================================

-- 5.1: View audit log for a specific transaction
SELECT 
  id,
  action,
  actor_id,
  actor_name,
  changes,
  created_at
FROM transaction_audit_log
WHERE transaction_id = (SELECT id FROM transactions WHERE entry_number = 'DRAFT-001' LIMIT 1)
ORDER BY created_at DESC;

-- 5.2: View all audit logs for sample transactions
SELECT 
  transaction_id,
  action,
  actor_id,
  actor_name,
  changes,
  created_at
FROM transaction_audit_log
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%'
)
ORDER BY created_at DESC;

-- ============================================================================
-- PART 6: COMPREHENSIVE STATUS REPORT
-- ============================================================================

-- 6.1: Get complete status for all sample transactions
SELECT 
  t.id,
  t.entry_number,
  t.approval_status,
  t.is_posted,
  t.created_by,
  t.created_at,
  t.submitted_by,
  t.submitted_at,
  t.approved_by,
  t.approved_at,
  t.rejected_by,
  t.rejected_at,
  t.rejection_reason,
  COUNT(DISTINCT er.id) as pending_edit_requests,
  COUNT(DISTINCT r.id) as resubmission_count,
  COUNT(DISTINCT al.id) as audit_log_entries
FROM transactions t
LEFT JOIN edit_requests er ON t.id = er.transaction_id AND er.status = 'pending'
LEFT JOIN resubmissions r ON t.id = r.transaction_id
LEFT JOIN transaction_audit_log al ON t.id = al.transaction_id
WHERE t.entry_number LIKE '%DRAFT%' 
   OR t.entry_number LIKE '%SUBMITTED%'
   OR t.entry_number LIKE '%APPROVED%'
   OR t.entry_number LIKE '%REJECTED%'
   OR t.entry_number LIKE '%REVISION%'
GROUP BY t.id
ORDER BY t.created_at DESC;

-- 6.2: Summary statistics
SELECT 
  'Total Sample Transactions' as metric,
  COUNT(*) as value
FROM transactions 
WHERE entry_number LIKE '%DRAFT%' 
   OR entry_number LIKE '%SUBMITTED%'
   OR entry_number LIKE '%APPROVED%'
   OR entry_number LIKE '%REJECTED%'
   OR entry_number LIKE '%REVISION%'

UNION ALL

SELECT 
  'Draft Transactions',
  COUNT(*)
FROM transactions 
WHERE approval_status = 'draft'
  AND (entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%')

UNION ALL

SELECT 
  'Submitted Transactions',
  COUNT(*)
FROM transactions 
WHERE approval_status = 'submitted'
  AND (entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%')

UNION ALL

SELECT 
  'Approved Transactions',
  COUNT(*)
FROM transactions 
WHERE approval_status = 'approved'
  AND (entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%')

UNION ALL

SELECT 
  'Rejected Transactions',
  COUNT(*)
FROM transactions 
WHERE approval_status = 'rejected'
  AND (entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%')

UNION ALL

SELECT 
  'Revision Requested Transactions',
  COUNT(*)
FROM transactions 
WHERE approval_status = 'revision_requested'
  AND (entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%')

UNION ALL

SELECT 
  'Total Edit Requests',
  COUNT(*)
FROM edit_requests

UNION ALL

SELECT 
  'Pending Edit Requests',
  COUNT(*)
FROM edit_requests 
WHERE status = 'pending'

UNION ALL

SELECT 
  'Total Resubmissions',
  COUNT(*)
FROM resubmissions

UNION ALL

SELECT 
  'Total Audit Log Entries',
  COUNT(*)
FROM transaction_audit_log;

-- ============================================================================
-- PART 7: CLEANUP (if needed)
-- ============================================================================

-- To delete all sample data, uncomment and run:
/*
DELETE FROM transaction_audit_log 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%'
);

DELETE FROM edit_requests 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%'
);

DELETE FROM resubmissions 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE entry_number LIKE '%DRAFT%' 
     OR entry_number LIKE '%SUBMITTED%'
     OR entry_number LIKE '%APPROVED%'
     OR entry_number LIKE '%REJECTED%'
     OR entry_number LIKE '%REVISION%'
);

DELETE FROM transactions 
WHERE entry_number LIKE '%DRAFT%' 
   OR entry_number LIKE '%SUBMITTED%'
   OR entry_number LIKE '%APPROVED%'
   OR entry_number LIKE '%REJECTED%'
   OR entry_number LIKE '%REVISION%';
*/

-- ============================================================================
-- END OF SAMPLE DATA SCRIPT
-- ============================================================================
