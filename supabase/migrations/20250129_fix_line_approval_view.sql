-- ================================================================
-- FIX LINE APPROVAL VIEW
-- Fix org_id reference and ensure proper data flow
-- Migration: 20250129_fix_line_approval_view
-- ================================================================

BEGIN;

-- 1. Drop and recreate the view with correct org_id reference
DROP VIEW IF EXISTS v_line_approval_inbox;

CREATE OR REPLACE VIEW v_line_approval_inbox AS
SELECT 
  tl.id as line_id,
  tl.transaction_id,
  t.entry_number,
  t.entry_date,
  t.description as transaction_description,
  tl.line_no,
  tl.line_status,
  tl.approval_priority,
  
  -- Account details
  a.code as account_code,
  a.name as account_name,
  tl.debit_amount,
  tl.credit_amount,
  tl.description as line_description,
  
  -- Dimensions (org_id comes from transaction, not line)
  o.name as org_name,
  p.name as project_name,
  cc.name as cost_center_name,
  
  -- Approval details
  tl.assigned_approver_id,
  tl.submitted_by,
  tl.submitted_for_approval_at,
  tl.review_notes,
  
  -- Submitter info
  u_submit.email as submitted_by_email,
  
  -- Age
  EXTRACT(EPOCH FROM (NOW() - tl.submitted_for_approval_at))/3600 as hours_pending
  
FROM transaction_lines tl
INNER JOIN transactions t ON tl.transaction_id = t.id
LEFT JOIN accounts a ON tl.account_id = a.id
LEFT JOIN organizations o ON t.org_id = o.id  -- Fixed: use t.org_id instead of tl.org_id
LEFT JOIN projects p ON tl.project_id = p.id
LEFT JOIN cost_centers cc ON tl.cost_center_id = cc.id
LEFT JOIN auth.users u_submit ON tl.submitted_by = u_submit.id
WHERE tl.line_status = 'pending';

-- 2. Drop and recreate submit function to handle cases where no approver is assigned
DROP FUNCTION IF EXISTS submit_transaction_for_line_approval(UUID, UUID);

CREATE OR REPLACE FUNCTION submit_transaction_for_line_approval(
  p_transaction_id UUID,
  p_submitted_by UUID
) RETURNS TABLE (
  success BOOLEAN,
  lines_submitted INTEGER,
  message TEXT
) AS $$
DECLARE
  v_line_count INTEGER;
  v_line RECORD;
  v_approver_id UUID;
  v_org_id UUID;
BEGIN
  -- Get org_id from transaction
  SELECT org_id INTO v_org_id
  FROM transactions
  WHERE id = p_transaction_id;
  
  -- Count draft lines
  SELECT COUNT(*) INTO v_line_count
  FROM transaction_lines
  WHERE transaction_id = p_transaction_id
    AND line_status = 'draft';
  
  IF v_line_count = 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'No draft lines to submit'::TEXT;
    RETURN;
  END IF;
  
  -- Update transaction
  UPDATE transactions
  SET 
    status = 'pending',
    approval_method = 'line_based',
    lines_total_count = v_line_count,
    lines_approved_count = 0,
    all_lines_approved = FALSE
  WHERE id = p_transaction_id;
  
  -- Update all draft lines to pending and assign approvers
  FOR v_line IN 
    SELECT * FROM transaction_lines 
    WHERE transaction_id = p_transaction_id 
      AND line_status = 'draft'
  LOOP
    -- Assign approver: Use submitter for now (can be enhanced later with approval routing)
    v_approver_id := p_submitted_by;
    
    -- Update line
    UPDATE transaction_lines
    SET 
      line_status = 'pending',
      submitted_for_approval_at = NOW(),
      submitted_by = p_submitted_by,
      assigned_approver_id = v_approver_id,
      approval_priority = COALESCE(approval_priority, 'normal')
    WHERE id = v_line.id;
    
    -- Audit log
    INSERT INTO audit_logs (
      user_id, action, resource_type, resource_id,
      details, created_at
    ) VALUES (
      p_submitted_by,
      'LINE_SUBMITTED_FOR_APPROVAL',
      'transaction_line',
      v_line.id::TEXT,
      jsonb_build_object(
        'transaction_id', p_transaction_id,
        'line_no', v_line.line_no,
        'assigned_to', v_approver_id
      ),
      NOW()
    );
  END LOOP;
  
  -- Audit log for transaction
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    details, created_at
  ) VALUES (
    p_submitted_by,
    'TRANSACTION_SUBMITTED_LINE_APPROVAL',
    'transaction',
    p_transaction_id::TEXT,
    jsonb_build_object('lines_count', v_line_count),
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, v_line_count, 
    format('%s lines submitted for approval', v_line_count)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT SELECT ON v_line_approval_inbox TO authenticated;
GRANT EXECUTE ON FUNCTION submit_transaction_for_line_approval TO authenticated;

COMMIT;
