# LINE-BASED APPROVAL SYSTEM - FINAL PLAN
## Transaction Approved When All Lines Approved

---

## 🎯 CORE CONCEPT

**Approval moves from transaction-level to line-level**:
- ✅ Each line has its own approval status
- ✅ Lines are approved independently
- ✅ Transaction is auto-approved when ALL lines approved
- ✅ Transaction can be posted when approved

---

## 📋 APPROVAL FLOW

```
LINE LEVEL:
Draft → Pending → Approved → (all lines approved)
                     ↓
TRANSACTION LEVEL:
Draft → Pending → Auto-Approved → Posted
```

### Key Rules
1. User creates transaction with lines (all draft)
2. User submits transaction → all lines become "pending"
3. Approver reviews and approves each line individually
4. When last line approved → transaction auto-approved
5. Approved transaction can be posted

---

## 🗄️ DATABASE SCHEMA

### TASK 1: Run This SQL

```sql
-- ================================================================
-- LINE-BASED APPROVAL SYSTEM
-- Transaction approved when all lines approved
-- ================================================================

BEGIN;

-- 1. Add line approval columns to transaction_lines
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  line_status VARCHAR(20) DEFAULT 'draft'
  CHECK (line_status IN ('draft', 'pending', 'approved', 'rejected', 'posted'));

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  submitted_for_approval_at TIMESTAMP;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  submitted_by UUID REFERENCES auth.users(id);

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
  review_notes TEXT;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  assigned_approver_id UUID REFERENCES auth.users(id);

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  approval_priority VARCHAR(20) DEFAULT 'normal'
  CHECK (approval_priority IN ('low', 'normal', 'high', 'urgent'));

-- 2. Update transactions table to track line-based approval
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS
  approval_method VARCHAR(20) DEFAULT 'line_based'
  CHECK (approval_method IN ('transaction_based', 'line_based'));

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS
  all_lines_approved BOOLEAN DEFAULT FALSE;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS
  lines_approved_count INTEGER DEFAULT 0;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS
  lines_total_count INTEGER DEFAULT 0;

-- 3. Create line approval inbox view
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
  
  -- Dimensions
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
LEFT JOIN glaccounts a ON tl.account_id = a.id
LEFT JOIN organizations o ON tl.org_id = o.id
LEFT JOIN projects p ON tl.project_id = p.id
LEFT JOIN cost_centers cc ON tl.cost_center_id = cc.id
LEFT JOIN auth.users u_submit ON tl.submitted_by = u_submit.id
WHERE tl.line_status = 'pending';

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_tx_lines_status 
  ON transaction_lines(line_status, assigned_approver_id);

CREATE INDEX IF NOT EXISTS idx_tx_lines_transaction_status 
  ON transaction_lines(transaction_id, line_status);

CREATE INDEX IF NOT EXISTS idx_tx_lines_pending_approver 
  ON transaction_lines(assigned_approver_id, line_status) 
  WHERE line_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_transactions_approval_status 
  ON transactions(all_lines_approved, status);

-- 5. Function: Submit transaction lines for approval
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
BEGIN
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
    -- Determine approver based on dimensions
    -- Priority: 1) Account manager, 2) Cost center manager, 3) Project manager, 4) Org manager
    SELECT COALESCE(
      (SELECT manager_id FROM glaccounts WHERE id = v_line.account_id),
      (SELECT manager_id FROM cost_centers WHERE id = v_line.cost_center_id),
      (SELECT manager_id FROM projects WHERE id = v_line.project_id),
      (SELECT manager_id FROM organizations WHERE id = v_line.org_id)
    ) INTO v_approver_id;
    
    -- Update line
    UPDATE transaction_lines
    SET 
      line_status = 'pending',
      submitted_for_approval_at = NOW(),
      submitted_by = p_submitted_by,
      assigned_approver_id = v_approver_id
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

-- 6. Function: Approve a line
CREATE OR REPLACE FUNCTION approve_line(
  p_line_id UUID,
  p_approved_by UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  transaction_approved BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_transaction_id UUID;
  v_total_lines INTEGER;
  v_approved_lines INTEGER;
  v_all_approved BOOLEAN;
BEGIN
  -- Get transaction ID
  SELECT transaction_id INTO v_transaction_id
  FROM transaction_lines
  WHERE id = p_line_id;
  
  IF v_transaction_id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Line not found'::TEXT;
    RETURN;
  END IF;
  
  -- Update line status
  UPDATE transaction_lines
  SET 
    line_status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW(),
    review_notes = p_notes
  WHERE id = p_line_id
    AND line_status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Line not in pending status'::TEXT;
    RETURN;
  END IF;
  
  -- Count approved vs total lines
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE line_status = 'approved')
  INTO v_total_lines, v_approved_lines
  FROM transaction_lines
  WHERE transaction_id = v_transaction_id;
  
  v_all_approved := (v_approved_lines = v_total_lines);
  
  -- Update transaction
  UPDATE transactions
  SET 
    lines_approved_count = v_approved_lines,
    all_lines_approved = v_all_approved,
    status = CASE WHEN v_all_approved THEN 'approved' ELSE 'pending' END
  WHERE id = v_transaction_id;
  
  -- Audit log
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    details, created_at
  ) VALUES (
    p_approved_by,
    'LINE_APPROVED',
    'transaction_line',
    p_line_id::TEXT,
    jsonb_build_object(
      'notes', p_notes,
      'transaction_id', v_transaction_id,
      'all_lines_approved', v_all_approved
    ),
    NOW()
  );
  
  -- If all lines approved, log transaction approval
  IF v_all_approved THEN
    INSERT INTO audit_logs (
      user_id, action, resource_type, resource_id,
      details, created_at
    ) VALUES (
      p_approved_by,
      'TRANSACTION_AUTO_APPROVED',
      'transaction',
      v_transaction_id::TEXT,
      jsonb_build_object(
        'reason', 'All lines approved',
        'total_lines', v_total_lines
      ),
      NOW()
    );
  END IF;
  
  RETURN QUERY SELECT 
    TRUE, 
    v_all_approved,
    CASE 
      WHEN v_all_approved THEN 'Line approved. Transaction fully approved!'
      ELSE format('Line approved. %s of %s lines approved', v_approved_lines, v_total_lines)
    END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function: Reject a line
CREATE OR REPLACE FUNCTION reject_line(
  p_line_id UUID,
  p_rejected_by UUID,
  p_reason TEXT
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Get transaction ID
  SELECT transaction_id INTO v_transaction_id
  FROM transaction_lines
  WHERE id = p_line_id;
  
  -- Update line
  UPDATE transaction_lines
  SET 
    line_status = 'rejected',
    rejected_by = p_rejected_by,
    rejected_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_line_id
    AND line_status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Line not in pending status'::TEXT;
    RETURN;
  END IF;
  
  -- Update transaction (rejected line means transaction needs revision)
  UPDATE transactions
  SET status = 'requires_revision'
  WHERE id = v_transaction_id;
  
  -- Audit log
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    details, created_at
  ) VALUES (
    p_rejected_by,
    'LINE_REJECTED',
    'transaction_line',
    p_line_id::TEXT,
    jsonb_build_object(
      'reason', p_reason,
      'transaction_id', v_transaction_id
    ),
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, 'Line rejected'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function: Get my line approval inbox
CREATE OR REPLACE FUNCTION get_my_line_approvals(
  p_user_id UUID
) RETURNS TABLE (
  line_id UUID,
  transaction_id UUID,
  entry_number VARCHAR,
  entry_date DATE,
  line_no INTEGER,
  account_code VARCHAR,
  account_name VARCHAR,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  description TEXT,
  org_name VARCHAR,
  project_name VARCHAR,
  cost_center_name VARCHAR,
  submitted_by_email VARCHAR,
  submitted_at TIMESTAMP,
  priority VARCHAR,
  hours_pending NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.line_id,
    v.transaction_id,
    v.entry_number,
    v.entry_date,
    v.line_no,
    v.account_code,
    v.account_name,
    v.debit_amount,
    v.credit_amount,
    v.line_description as description,
    v.org_name,
    v.project_name,
    v.cost_center_name,
    v.submitted_by_email,
    v.submitted_for_approval_at as submitted_at,
    v.approval_priority as priority,
    v.hours_pending
  FROM v_line_approval_inbox v
  WHERE v.assigned_approver_id = p_user_id
  ORDER BY 
    CASE v.approval_priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    v.submitted_for_approval_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function: Get transaction approval status
CREATE OR REPLACE FUNCTION get_transaction_approval_status(
  p_transaction_id UUID
) RETURNS TABLE (
  can_post BOOLEAN,
  status VARCHAR,
  total_lines INTEGER,
  approved_lines INTEGER,
  pending_lines INTEGER,
  rejected_lines INTEGER,
  approval_progress NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_total INTEGER;
  v_approved INTEGER;
  v_pending INTEGER;
  v_rejected INTEGER;
  v_status VARCHAR;
  v_can_post BOOLEAN;
BEGIN
  -- Get line counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE line_status = 'approved'),
    COUNT(*) FILTER (WHERE line_status = 'pending'),
    COUNT(*) FILTER (WHERE line_status = 'rejected')
  INTO v_total, v_approved, v_pending, v_rejected
  FROM transaction_lines
  WHERE transaction_id = p_transaction_id;
  
  -- Get transaction status
  SELECT t.status INTO v_status
  FROM transactions t
  WHERE t.id = p_transaction_id;
  
  v_can_post := (v_approved = v_total AND v_total > 0 AND v_status = 'approved');
  
  RETURN QUERY SELECT 
    v_can_post,
    v_status,
    v_total,
    v_approved,
    v_pending,
    v_rejected,
    CASE WHEN v_total > 0 THEN (v_approved::NUMERIC / v_total::NUMERIC * 100) ELSE 0 END,
    CASE 
      WHEN v_total = 0 THEN 'No lines found'
      WHEN v_rejected > 0 THEN format('%s lines rejected - needs revision', v_rejected)
      WHEN v_pending > 0 THEN format('%s of %s lines approved (%s%%)', v_approved, v_total, ROUND(v_approved::NUMERIC / v_total::NUMERIC * 100))
      WHEN v_approved = v_total THEN 'All lines approved - ready to post'
      ELSE 'Unknown status'
    END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger: Auto-update transaction when line status changes
CREATE OR REPLACE FUNCTION update_transaction_on_line_change()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_approved INTEGER;
BEGIN
  -- Count lines
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE line_status = 'approved')
  INTO v_total, v_approved
  FROM transaction_lines
  WHERE transaction_id = NEW.transaction_id;
  
  -- Update transaction
  UPDATE transactions
  SET 
    lines_total_count = v_total,
    lines_approved_count = v_approved,
    all_lines_approved = (v_approved = v_total),
    status = CASE 
      WHEN v_approved = v_total THEN 'approved'
      WHEN NEW.line_status = 'rejected' THEN 'requires_revision'
      ELSE status
    END
  WHERE id = NEW.transaction_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transaction_on_line_change_trigger
  AFTER UPDATE OF line_status ON transaction_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_on_line_change();

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION submit_transaction_for_line_approval TO authenticated;
GRANT EXECUTE ON FUNCTION approve_line TO authenticated;
GRANT EXECUTE ON FUNCTION reject_line TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_line_approvals TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_approval_status TO authenticated;
GRANT SELECT ON v_line_approval_inbox TO authenticated;

COMMIT;
```

### Verification
```sql
-- Check columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
AND column_name IN ('line_status', 'approved_by', 'assigned_approver_id');

-- Check transaction columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('approval_method', 'all_lines_approved', 'lines_approved_count');

-- Check view
SELECT table_name FROM information_schema.views 
WHERE table_name = 'v_line_approval_inbox';

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%line%';

-- Check trigger
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'update_transaction_on_line_change_trigger';
```

---

## 📝 SERVICE LAYER

Create `src/services/lineApprovalService.ts`:

```typescript
import { supabase } from '@/utils/supabase'
import { getCurrentUserId } from './transactions'

export interface LineApprovalInbox {
  line_id: string
  transaction_id: string
  entry_number: string
  entry_date: string
  line_no: number
  account_code: string
  account_name: string
  debit_amount: number
  credit_amount: number
  description: string
  org_name: string
  project_name: string
  cost_center_name: string
  submitted_by_email: string
  submitted_at: string
  priority: string
  hours_pending: number
}

export interface TransactionApprovalStatus {
  can_post: boolean
  status: string
  total_lines: number
  approved_lines: number
  pending_lines: number
  rejected_lines: number
  approval_progress: number
  message: string
}

// Submit transaction for line-based approval
export async function submitTransactionForLineApproval(
  transactionId: string
): Promise<{ success: boolean; lines_submitted: number; message: string }> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')
  
  const { data, error } = await supabase.rpc('submit_transaction_for_line_approval', {
    p_transaction_id: transactionId,
    p_submitted_by: userId
  })
  
  if (error) throw error
  return data[0]
}

// Get my line approval inbox
export async function getMyLineApprovals(): Promise<LineApprovalInbox[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []
  
  const { data, error } = await supabase.rpc('get_my_line_approvals', {
    p_user_id: userId
  })
  
  if (error) throw error
  return data || []
}

// Approve a line
export async function approveLine(
  lineId: string,
  notes?: string
): Promise<{ success: boolean; transaction_approved: boolean; message: string }> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')
  
  const { data, error } = await supabase.rpc('approve_line', {
    p_line_id: lineId,
    p_approved_by: userId,
    p_notes: notes || null
  })
  
  if (error) throw error
  return data[0]
}

// Reject a line
export async function rejectLine(
  lineId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')
  
  const { data, error } = await supabase.rpc('reject_line', {
    p_line_id: lineId,
    p_rejected_by: userId,
    p_reason: reason
  })
  
  if (error) throw error
  return data[0]
}

// Get transaction approval status
export async function getTransactionApprovalStatus(
  transactionId: string
): Promise<TransactionApprovalStatus> {
  const { data, error } = await supabase.rpc('get_transaction_approval_status', {
    p_transaction_id: transactionId
  })
  
  if (error) throw error
  return data[0]
}
```

---

## 🎯 INTEGRATION EXAMPLE

### In TransactionWizard or Submit Handler

```typescript
import { submitTransactionForLineApproval } from '@/services/lineApprovalService'

async function handleSubmitTransaction(transactionId: string) {
  try {
    // Submit for line-based approval
    const result = await submitTransactionForLineApproval(transactionId)
    
    if (result.success) {
      toast.success(`${result.lines_submitted} lines submitted for approval`)
      // Navigate to transactions list or approval inbox
    }
  } catch (error) {
    toast.error('Failed to submit for approval')
    console.error(error)
  }
}
```

### In Approval Inbox Component

```typescript
import { getMyLineApprovals, approveLine, rejectLine } from '@/services/lineApprovalService'

function LineApprovalInbox() {
  const [lines, setLines] = useState([])
  
  useEffect(() => {
    loadInbox()
  }, [])
  
  async function loadInbox() {
    const data = await getMyLineApprovals()
    setLines(data)
  }
  
  async function handleApprove(lineId: string) {
    const result = await approveLine(lineId, 'Approved')
    
    if (result.transaction_approved) {
      toast.success('Line approved! Transaction fully approved!')
    } else {
      toast.success(result.message)
    }
    
    loadInbox() // Refresh
  }
  
  async function handleReject(lineId: string, reason: string) {
    await rejectLine(lineId, reason)
    toast.info('Line rejected')
    loadInbox()
  }
  
  return (
    <div>
      {lines.map(line => (
        <LineApprovalCard 
          key={line.line_id}
          line={line}
          onApprove={() => handleApprove(line.line_id)}
          onReject={(reason) => handleReject(line.line_id, reason)}
        />
      ))}
    </div>
  )
}
```

---

## ✅ SUCCESS CRITERIA

```
✅ Lines have approval status (draft/pending/approved/rejected)
✅ Transaction auto-approved when all lines approved
✅ Approvers see line-level inbox
✅ Each line can be approved independently
✅ Transaction status reflects line approval progress
✅ Audit trail for all line approvals
✅ Trigger auto-updates transaction
✅ Can post when transaction approved
```

---

## 🚀 THIS IS THE CORRECT APPROACH

**Key Features**:
1. ✅ Approval at line level (not transaction)
2. ✅ Transaction approved automatically when all lines approved
3. ✅ Each line assigned to appropriate approver
4. ✅ Progress tracking (X of Y lines approved)
5. ✅ Trigger keeps transaction in sync
6. ✅ Clean audit trail
7. ✅ Simple, maintainable

**Ready to implement?** This is the final, correct plan! 🎯
