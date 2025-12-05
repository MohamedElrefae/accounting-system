-- ============================================================================
-- SUPABASE SQL: Transaction Edit System - Full Implementation
-- ============================================================================
-- This SQL implements the complete transaction edit system with:
-- - Draft/Submit functionality
-- - Edit request workflows
-- - Resubmission system
-- - Complete audit trail
-- ============================================================================

-- ============================================================================
-- PART 1: ALTER EXISTING TABLES
-- ============================================================================

-- 1.1: Add columns to transactions table for approval system
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected', 'revision_requested'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS edit_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS locked_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);

-- 1.2: Create indexes for approval status queries
CREATE INDEX IF NOT EXISTS idx_transactions_approval_status ON transactions(approval_status);
CREATE INDEX IF NOT EXISTS idx_transactions_is_posted ON transactions(is_posted);
CREATE INDEX IF NOT EXISTS idx_transactions_submitted_by ON transactions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_transactions_approved_by ON transactions(approved_by);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- ============================================================================
-- PART 2: CREATE NEW TABLES FOR EDIT REQUESTS
-- ============================================================================

-- 2.1: Edit Requests Table
CREATE TABLE IF NOT EXISTS edit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2: Create indexes for edit_requests
CREATE INDEX IF NOT EXISTS idx_edit_requests_transaction ON edit_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_edit_requests_requested_by ON edit_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_edit_requests_reviewed_by ON edit_requests(reviewed_by);

-- ============================================================================
-- PART 3: CREATE NEW TABLES FOR RESUBMISSIONS
-- ============================================================================

-- 3.1: Resubmissions Table
CREATE TABLE IF NOT EXISTS resubmissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  resubmitted_by UUID NOT NULL REFERENCES auth.users(id),
  resubmitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2: Create indexes for resubmissions
CREATE INDEX IF NOT EXISTS idx_resubmissions_transaction ON resubmissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_resubmissions_resubmitted_by ON resubmissions(resubmitted_by);

-- ============================================================================
-- PART 4: CREATE AUDIT LOG TABLE
-- ============================================================================

-- 4.1: Audit Log Table
CREATE TABLE IF NOT EXISTS transaction_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'edit', 'submit', 'approve', 'reject', 'resubmit', 'post', 'delete')),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_name TEXT,
  changes JSONB,
  previous_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2: Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_transaction ON transaction_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON transaction_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON transaction_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON transaction_audit_log(created_at);

-- ============================================================================
-- PART 5: CREATE FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- 5.1: Function to submit transaction for approval
CREATE OR REPLACE FUNCTION submit_transaction_for_approval(
  p_transaction_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_transaction RECORD;
BEGIN
  -- Get transaction
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;
  
  IF v_transaction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Check if already submitted
  IF v_transaction.approval_status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only draft transactions can be submitted');
  END IF;
  
  -- Update transaction status
  UPDATE transactions
  SET 
    approval_status = 'submitted',
    submitted_at = NOW(),
    submitted_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Create audit log
  INSERT INTO transaction_audit_log (transaction_id, action, actor_id, changes)
  VALUES (p_transaction_id, 'submit', p_user_id, jsonb_build_object('status', 'submitted'));
  
  RETURN jsonb_build_object('success', true, 'message', 'Transaction submitted for approval');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2: Function to approve transaction
CREATE OR REPLACE FUNCTION approve_transaction(
  p_transaction_id UUID,
  p_user_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_transaction RECORD;
BEGIN
  -- Get transaction
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;
  
  IF v_transaction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Check if can be approved
  IF v_transaction.approval_status NOT IN ('submitted', 'revision_requested') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction cannot be approved in current status');
  END IF;
  
  -- Update transaction status
  UPDATE transactions
  SET 
    approval_status = 'approved',
    approved_at = NOW(),
    approved_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Create audit log
  INSERT INTO transaction_audit_log (transaction_id, action, actor_id, changes)
  VALUES (p_transaction_id, 'approve', p_user_id, jsonb_build_object('note', p_note));
  
  RETURN jsonb_build_object('success', true, 'message', 'Transaction approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3: Function to reject transaction
CREATE OR REPLACE FUNCTION reject_transaction(
  p_transaction_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_transaction RECORD;
BEGIN
  -- Get transaction
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;
  
  IF v_transaction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Check if can be rejected
  IF v_transaction.approval_status NOT IN ('submitted', 'revision_requested') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction cannot be rejected in current status');
  END IF;
  
  -- Update transaction status
  UPDATE transactions
  SET 
    approval_status = 'rejected',
    rejection_reason = p_reason,
    rejected_at = NOW(),
    rejected_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Create audit log
  INSERT INTO transaction_audit_log (transaction_id, action, actor_id, changes)
  VALUES (p_transaction_id, 'reject', p_user_id, jsonb_build_object('reason', p_reason));
  
  RETURN jsonb_build_object('success', true, 'message', 'Transaction rejected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4: Function to request edit
CREATE OR REPLACE FUNCTION request_edit_for_transaction(
  p_transaction_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_transaction RECORD;
BEGIN
  -- Get transaction
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;
  
  IF v_transaction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Check if can request edit
  IF v_transaction.approval_status = 'draft' OR v_transaction.is_posted THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot request edit for this transaction');
  END IF;
  
  -- Create edit request
  INSERT INTO edit_requests (transaction_id, requested_by, reason)
  VALUES (p_transaction_id, p_user_id, p_reason);
  
  -- Create audit log
  INSERT INTO transaction_audit_log (transaction_id, action, actor_id, changes)
  VALUES (p_transaction_id, 'edit', p_user_id, jsonb_build_object('reason', p_reason));
  
  RETURN jsonb_build_object('success', true, 'message', 'Edit request created');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5: Function to approve edit request
CREATE OR REPLACE FUNCTION approve_edit_request(
  p_request_id UUID,
  p_user_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_transaction_id UUID;
BEGIN
  -- Get edit request
  SELECT * INTO v_request FROM edit_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Edit request not found');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Edit request is not pending');
  END IF;
  
  v_transaction_id := v_request.transaction_id;
  
  -- Update edit request
  UPDATE edit_requests
  SET 
    status = 'approved',
    reviewed_by = p_user_id,
    reviewed_at = NOW(),
    review_note = p_note
  WHERE id = p_request_id;
  
  -- Update transaction to allow editing
  UPDATE transactions
  SET 
    approval_status = 'revision_requested',
    edit_locked = FALSE,
    updated_at = NOW()
  WHERE id = v_transaction_id;
  
  -- Create audit log
  INSERT INTO transaction_audit_log (transaction_id, action, actor_id, changes)
  VALUES (v_transaction_id, 'edit', p_user_id, jsonb_build_object('edit_approved', true, 'note', p_note));
  
  RETURN jsonb_build_object('success', true, 'message', 'Edit request approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.6: Function to resubmit transaction
CREATE OR REPLACE FUNCTION resubmit_transaction(
  p_transaction_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_transaction RECORD;
  v_previous_status TEXT;
BEGIN
  -- Get transaction
  SELECT * INTO v_transaction FROM transactions WHERE id = p_transaction_id;
  
  IF v_transaction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Check if can resubmit
  IF v_transaction.approval_status NOT IN ('revision_requested', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction cannot be resubmitted in current status');
  END IF;
  
  v_previous_status := v_transaction.approval_status;
  
  -- Create resubmission record
  INSERT INTO resubmissions (transaction_id, resubmitted_by, previous_status, reason)
  VALUES (p_transaction_id, p_user_id, v_previous_status, p_reason);
  
  -- Update transaction status
  UPDATE transactions
  SET 
    approval_status = 'submitted',
    submitted_at = NOW(),
    submitted_by = p_user_id,
    edit_locked = FALSE,
    updated_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Create audit log
  INSERT INTO transaction_audit_log (transaction_id, action, actor_id, changes)
  VALUES (p_transaction_id, 'resubmit', p_user_id, jsonb_build_object('previous_status', v_previous_status, 'reason', p_reason));
  
  RETURN jsonb_build_object('success', true, 'message', 'Transaction resubmitted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- 6.1: Enable RLS on new tables
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resubmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_audit_log ENABLE ROW LEVEL SECURITY;

-- 6.2: Create RLS policies for edit_requests
CREATE POLICY "Users can view edit requests for their transactions" ON edit_requests
  FOR SELECT USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = edit_requests.transaction_id 
      AND transactions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create edit requests" ON edit_requests
  FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Approvers can update edit requests" ON edit_requests
  FOR UPDATE USING (
    reviewed_by = auth.uid() OR
    requested_by = auth.uid()
  );

-- 6.3: Create RLS policies for resubmissions
CREATE POLICY "Users can view resubmissions for their transactions" ON resubmissions
  FOR SELECT USING (
    resubmitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = resubmissions.transaction_id 
      AND transactions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create resubmissions" ON resubmissions
  FOR INSERT WITH CHECK (resubmitted_by = auth.uid());

-- 6.4: Create RLS policies for audit_log
CREATE POLICY "Users can view audit logs for their transactions" ON transaction_audit_log
  FOR SELECT USING (
    actor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = transaction_audit_log.transaction_id 
      AND transactions.created_by = auth.uid()
    )
  );

-- ============================================================================
-- PART 7: VERIFICATION QUERIES
-- ============================================================================

-- 7.1: Verify all tables created
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('edit_requests', 'resubmissions', 'transaction_audit_log') THEN 'NEW'
    ELSE 'EXISTING'
  END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('transactions', 'edit_requests', 'resubmissions', 'transaction_audit_log')
ORDER BY table_name;

-- 7.2: Verify all columns added to transactions table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN (
  'approval_status', 'is_posted', 'edit_locked', 'locked_reason', 'locked_by', 'locked_at',
  'submitted_at', 'submitted_by', 'approved_at', 'approved_by', 'rejection_reason', 'rejected_at', 'rejected_by'
)
ORDER BY column_name;

-- 7.3: Verify all indexes created
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (
  tablename IN ('transactions', 'edit_requests', 'resubmissions', 'transaction_audit_log')
  OR indexname LIKE 'idx_%'
)
ORDER BY tablename, indexname;

-- 7.4: Verify all functions created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'submit_transaction_for_approval',
  'approve_transaction',
  'reject_transaction',
  'request_edit_for_transaction',
  'approve_edit_request',
  'resubmit_transaction'
)
ORDER BY routine_name;

-- 7.5: Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('edit_requests', 'resubmissions', 'transaction_audit_log')
ORDER BY tablename, policyname;

-- ============================================================================
-- PART 8: TEST DATA QUERIES
-- ============================================================================

-- 8.1: Get all draft transactions
SELECT 
  id,
  entry_number,
  description,
  approval_status,
  created_by,
  created_at
FROM transactions 
WHERE approval_status = 'draft'
ORDER BY created_at DESC;

-- 8.2: Get all pending edit requests
SELECT 
  er.id,
  er.transaction_id,
  t.entry_number,
  er.reason,
  er.requested_by,
  er.requested_at,
  er.status
FROM edit_requests er
JOIN transactions t ON er.transaction_id = t.id
WHERE er.status = 'pending'
ORDER BY er.requested_at DESC;

-- 8.3: Get transaction approval history
SELECT 
  id,
  transaction_id,
  action,
  actor_id,
  actor_name,
  changes,
  created_at
FROM transaction_audit_log
WHERE transaction_id = 'YOUR_TRANSACTION_ID'
ORDER BY created_at DESC;

-- 8.4: Get resubmission history
SELECT 
  id,
  transaction_id,
  resubmitted_by,
  previous_status,
  reason,
  resubmitted_at
FROM resubmissions
WHERE transaction_id = 'YOUR_TRANSACTION_ID'
ORDER BY resubmitted_at DESC;

-- 8.5: Get transaction with full approval status
SELECT 
  t.id,
  t.entry_number,
  t.description,
  t.approval_status,
  t.is_posted,
  t.created_by,
  t.submitted_by,
  t.approved_by,
  t.rejected_by,
  t.submitted_at,
  t.approved_at,
  t.rejected_at,
  t.rejection_reason,
  COUNT(DISTINCT er.id) as pending_edit_requests,
  COUNT(DISTINCT r.id) as resubmission_count
FROM transactions t
LEFT JOIN edit_requests er ON t.id = er.transaction_id AND er.status = 'pending'
LEFT JOIN resubmissions r ON t.id = r.transaction_id
WHERE t.id = 'YOUR_TRANSACTION_ID'
GROUP BY t.id;

-- ============================================================================
-- PART 9: CLEANUP (if needed)
-- ============================================================================

-- To rollback all changes, uncomment and run:
/*
DROP TABLE IF EXISTS transaction_audit_log CASCADE;
DROP TABLE IF EXISTS resubmissions CASCADE;
DROP TABLE IF EXISTS edit_requests CASCADE;
DROP FUNCTION IF EXISTS resubmit_transaction CASCADE;
DROP FUNCTION IF EXISTS approve_edit_request CASCADE;
DROP FUNCTION IF EXISTS request_edit_for_transaction CASCADE;
DROP FUNCTION IF EXISTS reject_transaction CASCADE;
DROP FUNCTION IF EXISTS approve_transaction CASCADE;
DROP FUNCTION IF EXISTS submit_transaction_for_approval CASCADE;

ALTER TABLE transactions DROP COLUMN IF EXISTS approval_status;
ALTER TABLE transactions DROP COLUMN IF EXISTS is_posted;
ALTER TABLE transactions DROP COLUMN IF EXISTS edit_locked;
ALTER TABLE transactions DROP COLUMN IF EXISTS locked_reason;
ALTER TABLE transactions DROP COLUMN IF EXISTS locked_by;
ALTER TABLE transactions DROP COLUMN IF EXISTS locked_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS submitted_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS submitted_by;
ALTER TABLE transactions DROP COLUMN IF EXISTS approved_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS approved_by;
ALTER TABLE transactions DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE transactions DROP COLUMN IF EXISTS rejected_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS rejected_by;
*/

-- ============================================================================
-- END OF SQL SCRIPT
-- ============================================================================
