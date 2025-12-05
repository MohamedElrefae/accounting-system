# ENTERPRISE LINE-LEVEL APPROVAL SYSTEM
## Final Implementation Plan - Production Ready

---

## 🎯 MISSION

Implement line-level approval system for construction accounting that ensures:
- Every transaction line is reviewed and approved
- Data accuracy through multi-stage approval (draft → approved → posted)
- Line-level granularity for better control
- Backward compatible with existing transaction status

---

## 📋 REQUIREMENTS CLARIFIED

### Approval Trigger
✅ **ALL transactions require approval** (not threshold-based)
- Draft transactions created by users
- Each line must be approved
- Transaction posts only when all lines approved

### Approval Routing
✅ **Line-level approvers**:
- Account owner/manager approves GL account usage
- Cost center manager approves cost center charges
- Project manager approves project expenses
- Finance team approves overall transaction

### Status Flow
```
DRAFT → PENDING_APPROVAL → APPROVED → POSTED
  ↓           ↓                ↓
REJECTED  REQUIRES_REVISION  VOIDED
```

### Approval Granularity
✅ **One approval request per line** covering all dimensions
- Simpler than dimension-by-dimension
- Faster approval process
- Clear responsibility

---

## 🗄️ DATABASE SCHEMA (REVISED)

### TASK 1: Run This SQL (30 minutes)

```sql
-- ================================================================
-- LINE-LEVEL APPROVAL SYSTEM - PRODUCTION READY
-- ================================================================

BEGIN;

-- 1. Add line-level approval columns to transaction_lines
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  line_status VARCHAR(20) DEFAULT 'draft'
  CHECK (line_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'requires_revision', 'posted'));

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  approval_required BOOLEAN DEFAULT TRUE;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  approved_by UUID REFERENCES auth.users(id);

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  approved_at TIMESTAMP;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  rejected_by UUID REFERENCES auth.users(id);

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  rejected_at TIMESTAMP;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  rejection_reason TEXT;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  revision_notes TEXT;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  revision_count SMALLINT DEFAULT 0;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  submitted_for_approval_at TIMESTAMP;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  submitted_by UUID REFERENCES auth.users(id);

-- 2. Create line approval requests table
CREATE TABLE IF NOT EXISTS transaction_line_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  line_id UUID NOT NULL REFERENCES transaction_lines(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  
  -- Approval routing
  assigned_to_user_id UUID REFERENCES auth.users(id),
  assigned_to_role_id INTEGER REFERENCES roles(id),
  assigned_by UUID REFERENCES auth.users(id),
  
  -- Line details for approval context
  account_id UUID NOT NULL,
  account_code VARCHAR(50),
  account_name VARCHAR(255),
  debit_amount NUMERIC(18, 4) DEFAULT 0,
  credit_amount NUMERIC(18, 4) DEFAULT 0,
  description TEXT,
  
  -- Dimensions for context
  org_id UUID REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  work_item_id UUID,
  classification_id UUID,
  
  -- Approval status
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'requires_revision', 'cancelled')),
  
  -- Approval action
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- Metadata
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(transaction_id, line_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tx_lines_status 
  ON transaction_lines(transaction_id, line_status);

CREATE INDEX IF NOT EXISTS idx_tx_lines_approval_required 
  ON transaction_lines(approval_required, line_status) 
  WHERE approval_required = TRUE;

CREATE INDEX IF NOT EXISTS idx_line_approval_requests_assigned 
  ON transaction_line_approval_requests(assigned_to_user_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_line_approval_requests_transaction 
  ON transaction_line_approval_requests(transaction_id, status);

-- 4. Extend audit_logs for line-level tracking
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS
  line_id UUID;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS
  line_no INTEGER;

CREATE INDEX IF NOT EXISTS idx_audit_logs_line 
  ON audit_logs(line_id) WHERE line_id IS NOT NULL;

-- 5. Function: Submit transaction lines for approval
CREATE OR REPLACE FUNCTION submit_transaction_lines_for_approval(
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
BEGIN
  -- Count lines
  SELECT COUNT(*) INTO v_line_count
  FROM transaction_lines
  WHERE transaction_id = p_transaction_id
    AND line_status = 'draft';
  
  IF v_line_count = 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'No draft lines to submit'::TEXT;
    RETURN;
  END IF;
  
  -- Update lines to pending_approval
  UPDATE transaction_lines
  SET 
    line_status = 'pending_approval',
    submitted_for_approval_at = NOW(),
    submitted_by = p_submitted_by
  WHERE transaction_id = p_transaction_id
    AND line_status = 'draft';
  
  -- Create approval requests for each line
  FOR v_line IN 
    SELECT * FROM transaction_lines 
    WHERE transaction_id = p_transaction_id 
      AND line_status = 'pending_approval'
  LOOP
    -- Determine approver (simplified - can be enhanced)
    -- Priority: 1) Account owner, 2) Cost center manager, 3) Project manager, 4) Finance role
    SELECT COALESCE(
      (SELECT responsible_user_id FROM glaccounts WHERE id = v_line.account_id),
      (SELECT manager_id FROM cost_centers WHERE id = v_line.cost_center_id),
      (SELECT manager_id FROM projects WHERE id = v_line.project_id),
      (SELECT id FROM auth.users WHERE email LIKE '%finance%' LIMIT 1)
    ) INTO v_approver_id;
    
    INSERT INTO transaction_line_approval_requests (
      transaction_id, line_id, line_no,
      account_id, account_code, account_name,
      debit_amount, credit_amount, description,
      org_id, project_id, cost_center_id,
      assigned_to_user_id, assigned_by,
      status, created_at
    )
    SELECT 
      v_line.transaction_id,
      v_line.id,
      v_line.line_no,
      v_line.account_id,
      a.code,
      a.name,
      v_line.debit_amount,
      v_line.credit_amount,
      v_line.description,
      v_line.org_id,
      v_line.project_id,
      v_line.cost_center_id,
      v_approver_id,
      p_submitted_by,
      'pending',
      NOW()
    FROM glaccounts a
    WHERE a.id = v_line.account_id;
    
    -- Audit log
    INSERT INTO audit_logs (
      user_id, action, resource_type, resource_id,
      line_id, line_no, details, created_at
    ) VALUES (
      p_submitted_by,
      'LINE_SUBMITTED_FOR_APPROVAL',
      'transaction_line',
      v_line.id::TEXT,
      v_line.id,
      v_line.line_no,
      jsonb_build_object(
        'transaction_id', v_line.transaction_id,
        'account_id', v_line.account_id,
        'amount', COALESCE(v_line.debit_amount, v_line.credit_amount)
      ),
      NOW()
    );
  END LOOP;
  
  RETURN QUERY SELECT TRUE, v_line_count, 
    format('%s lines submitted for approval', v_line_count)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function: Approve line
CREATE OR REPLACE FUNCTION approve_transaction_line(
  p_line_id UUID,
  p_approved_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Update approval request
  UPDATE transaction_line_approval_requests
  SET 
    status = 'approved',
    reviewed_by = p_approved_by,
    reviewed_at = NOW(),
    review_notes = p_notes,
    updated_at = NOW()
  WHERE line_id = p_line_id
    AND status = 'pending'
  RETURNING id INTO v_request_id;
  
  IF v_request_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No pending approval request found'::TEXT;
    RETURN;
  END IF;
  
  -- Update line status
  UPDATE transaction_lines
  SET 
    line_status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW()
  WHERE id = p_line_id;
  
  -- Audit log
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    line_id, details, created_at
  ) VALUES (
    p_approved_by,
    'LINE_APPROVED',
    'transaction_line',
    p_line_id::TEXT,
    p_line_id,
    jsonb_build_object('notes', p_notes),
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, 'Line approved successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function: Reject line
CREATE OR REPLACE FUNCTION reject_transaction_line(
  p_line_id UUID,
  p_rejected_by UUID,
  p_reason TEXT
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Update approval request
  UPDATE transaction_line_approval_requests
  SET 
    status = 'rejected',
    reviewed_by = p_rejected_by,
    reviewed_at = NOW(),
    review_notes = p_reason,
    updated_at = NOW()
  WHERE line_id = p_line_id
    AND status = 'pending';
  
  -- Update line status
  UPDATE transaction_lines
  SET 
    line_status = 'rejected',
    rejected_by = p_rejected_by,
    rejected_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_line_id;
  
  -- Audit log
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    line_id, details, created_at
  ) VALUES (
    p_rejected_by,
    'LINE_REJECTED',
    'transaction_line',
    p_line_id::TEXT,
    p_line_id,
    jsonb_build_object('reason', p_reason),
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, 'Line rejected'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function: Check if transaction can be posted
CREATE OR REPLACE FUNCTION can_post_transaction(
  p_transaction_id UUID
) RETURNS TABLE (
  can_post BOOLEAN,
  total_lines INTEGER,
  approved_lines INTEGER,
  pending_lines INTEGER,
  rejected_lines INTEGER,
  message TEXT
) AS $$
DECLARE
  v_total INTEGER;
  v_approved INTEGER;
  v_pending INTEGER;
  v_rejected INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE line_status = 'approved'),
    COUNT(*) FILTER (WHERE line_status IN ('draft', 'pending_approval', 'requires_revision')),
    COUNT(*) FILTER (WHERE line_status = 'rejected')
  INTO v_total, v_approved, v_pending, v_rejected
  FROM transaction_lines
  WHERE transaction_id = p_transaction_id;
  
  RETURN QUERY SELECT 
    (v_approved = v_total AND v_total > 0),
    v_total,
    v_approved,
    v_pending,
    v_rejected,
    CASE 
      WHEN v_total = 0 THEN 'No lines found'
      WHEN v_rejected > 0 THEN format('%s lines rejected', v_rejected)
      WHEN v_pending > 0 THEN format('%s lines pending approval', v_pending)
      WHEN v_approved = v_total THEN 'All lines approved - ready to post'
      ELSE 'Cannot post'
    END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 9. Function: Get my approval inbox
CREATE OR REPLACE FUNCTION get_my_line_approval_inbox(
  p_user_id UUID
) RETURNS TABLE (
  request_id UUID,
  transaction_id UUID,
  line_id UUID,
  line_no INTEGER,
  account_code VARCHAR,
  account_name VARCHAR,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  description TEXT,
  project_name VARCHAR,
  cost_center_name VARCHAR,
  submitted_by_email VARCHAR,
  submitted_at TIMESTAMP,
  priority VARCHAR,
  due_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.transaction_id,
    r.line_id,
    r.line_no,
    r.account_code,
    r.account_name,
    r.debit_amount,
    r.credit_amount,
    r.description,
    p.name AS project_name,
    cc.name AS cost_center_name,
    u.email AS submitted_by_email,
    r.created_at AS submitted_at,
    r.priority,
    r.due_date
  FROM transaction_line_approval_requests r
  LEFT JOIN projects p ON r.project_id = p.id
  LEFT JOIN cost_centers cc ON r.cost_center_id = cc.id
  LEFT JOIN auth.users u ON r.assigned_by = u.id
  WHERE r.assigned_to_user_id = p_user_id
    AND r.status = 'pending'
  ORDER BY 
    CASE r.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION submit_transaction_lines_for_approval TO authenticated;
GRANT EXECUTE ON FUNCTION approve_transaction_line TO authenticated;
GRANT EXECUTE ON FUNCTION reject_transaction_line TO authenticated;
GRANT EXECUTE ON FUNCTION can_post_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_line_approval_inbox TO authenticated;

COMMIT;
```

### Verification SQL
```sql
-- Check columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
  AND column_name IN ('line_status', 'approval_required', 'approved_by');

-- Check table created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'transaction_line_approval_requests';

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%transaction_line%';
```

---

## 📝 NEXT STEPS

I'll create the service layer and React hooks in the next response.

**Please confirm this approach before I continue**:
1. ✅ Line-level approval (one request per line)
2. ✅ All transactions require approval
3. ✅ Status: draft → pending → approved → posted
4. ✅ Approver determined by account/cost center/project ownership

**Ready to proceed with Task 2 (Service Layer)?**
