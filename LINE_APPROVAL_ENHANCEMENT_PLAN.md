# LINE-LEVEL APPROVAL ENHANCEMENT
## Integrating with Existing Transaction Approval System

---

## 🎯 MISSION

**Enhance** existing transaction approval system with line-level granularity while keeping current workflow intact.

---

## 📋 CURRENT SYSTEM (WORKING - DO NOT BREAK)

### Existing Transaction Approval Flow
```
CREATE → SUBMIT → REVIEW → APPROVE/REVISE → POST
```

### Existing Tables (Keep As-Is)
- ✅ `approval_workflows` - Working
- ✅ `approval_steps` - Working  
- ✅ `approval_requests` - Working
- ✅ `approval_actions` - Working
- ✅ `audit_logs` - Working

### Existing Functions (Keep Using)
- ✅ `fn_create_approval_request()` - Keep
- ✅ `list_approval_inbox_v2()` - Keep
- ✅ `can_user_approve_request()` - Keep
- ✅ `review_request()` - Keep

---

## 🎯 NEW REQUIREMENT

**Add line-level detail to existing approval system**:
- Transaction approval stays at transaction level
- Add line-level tracking for audit/review
- Show which lines need attention during approval
- Allow line-by-line comments during review
- Track line-level changes/revisions

---

## 🗄️ DATABASE ENHANCEMENT (MINIMAL CHANGES)

### TASK 1: Add Line Tracking to Existing System

```sql
-- ================================================================
-- LINE-LEVEL TRACKING ENHANCEMENT
-- Integrates with existing approval_requests system
-- ================================================================

BEGIN;

-- 1. Add line-level columns to transaction_lines (for tracking only)
ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  needs_review BOOLEAN DEFAULT FALSE;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  review_notes TEXT;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  reviewed_by UUID REFERENCES auth.users(id);

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  reviewed_at TIMESTAMP;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  revision_count SMALLINT DEFAULT 0;

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  last_modified_by UUID REFERENCES auth.users(id);

ALTER TABLE transaction_lines ADD COLUMN IF NOT EXISTS
  last_modified_at TIMESTAMP;

-- 2. Create line review comments table (linked to existing approval_requests)
CREATE TABLE IF NOT EXISTS transaction_line_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  line_id UUID NOT NULL REFERENCES transaction_lines(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  
  -- Review details
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id),
  review_type VARCHAR(20) DEFAULT 'comment'
    CHECK (review_type IN ('comment', 'flag', 'approve', 'request_change')),
  comment TEXT,
  
  -- Line snapshot at review time
  account_id UUID,
  debit_amount NUMERIC(18, 4),
  credit_amount NUMERIC(18, 4),
  description TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(approval_request_id, line_id, reviewer_user_id, created_at)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_tx_lines_needs_review 
  ON transaction_lines(transaction_id, needs_review) 
  WHERE needs_review = TRUE;

CREATE INDEX IF NOT EXISTS idx_line_reviews_approval 
  ON transaction_line_reviews(approval_request_id, line_id);

CREATE INDEX IF NOT EXISTS idx_line_reviews_transaction 
  ON transaction_line_reviews(transaction_id);

-- 4. Extend audit_logs for line tracking (already has line_id from previous migration)
CREATE INDEX IF NOT EXISTS idx_audit_logs_line_id 
  ON audit_logs(line_id) WHERE line_id IS NOT NULL;

-- 5. Function: Flag lines that need review during approval
CREATE OR REPLACE FUNCTION flag_lines_for_review(
  p_transaction_id UUID,
  p_line_ids UUID[],
  p_flagged_by UUID
) RETURNS TABLE (
  success BOOLEAN,
  lines_flagged INTEGER,
  message TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE transaction_lines
  SET 
    needs_review = TRUE,
    last_modified_by = p_flagged_by,
    last_modified_at = NOW()
  WHERE transaction_id = p_transaction_id
    AND id = ANY(p_line_ids);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Audit log
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    details, created_at
  ) VALUES (
    p_flagged_by,
    'LINES_FLAGGED_FOR_REVIEW',
    'transaction',
    p_transaction_id::TEXT,
    jsonb_build_object(
      'line_count', v_count,
      'line_ids', p_line_ids
    ),
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, v_count, 
    format('%s lines flagged for review', v_count)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function: Add line review comment (during existing approval process)
CREATE OR REPLACE FUNCTION add_line_review_comment(
  p_approval_request_id UUID,
  p_line_id UUID,
  p_reviewer_user_id UUID,
  p_comment TEXT,
  p_review_type VARCHAR DEFAULT 'comment'
) RETURNS TABLE (
  success BOOLEAN,
  review_id UUID,
  message TEXT
) AS $$
DECLARE
  v_transaction_id UUID;
  v_line_no INTEGER;
  v_review_id UUID;
BEGIN
  -- Get transaction and line details
  SELECT tl.transaction_id, tl.line_no
  INTO v_transaction_id, v_line_no
  FROM transaction_lines tl
  WHERE tl.id = p_line_id;
  
  IF v_transaction_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Line not found'::TEXT;
    RETURN;
  END IF;
  
  -- Insert review comment
  INSERT INTO transaction_line_reviews (
    approval_request_id,
    transaction_id,
    line_id,
    line_no,
    reviewer_user_id,
    review_type,
    comment,
    account_id,
    debit_amount,
    credit_amount,
    description,
    created_at
  )
  SELECT 
    p_approval_request_id,
    v_transaction_id,
    p_line_id,
    v_line_no,
    p_reviewer_user_id,
    p_review_type,
    p_comment,
    tl.account_id,
    tl.debit_amount,
    tl.credit_amount,
    tl.description,
    NOW()
  FROM transaction_lines tl
  WHERE tl.id = p_line_id
  RETURNING id INTO v_review_id;
  
  -- Update line if requesting change
  IF p_review_type = 'request_change' THEN
    UPDATE transaction_lines
    SET 
      needs_review = TRUE,
      review_notes = p_comment,
      reviewed_by = p_reviewer_user_id,
      reviewed_at = NOW()
    WHERE id = p_line_id;
  END IF;
  
  -- Audit log
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id,
    line_id, details, created_at
  ) VALUES (
    p_reviewer_user_id,
    'LINE_REVIEW_ADDED',
    'transaction_line',
    p_line_id::TEXT,
    p_line_id,
    jsonb_build_object(
      'review_type', p_review_type,
      'comment', p_comment
    ),
    NOW()
  );
  
  RETURN QUERY SELECT TRUE, v_review_id, 'Review comment added'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function: Get line reviews for approval request
CREATE OR REPLACE FUNCTION get_line_reviews_for_approval(
  p_approval_request_id UUID
) RETURNS TABLE (
  line_id UUID,
  line_no INTEGER,
  account_code VARCHAR,
  account_name VARCHAR,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  review_count BIGINT,
  has_change_requests BOOLEAN,
  latest_comment TEXT,
  latest_reviewer_email VARCHAR,
  latest_review_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  WITH line_review_summary AS (
    SELECT 
      lr.line_id,
      lr.line_no,
      COUNT(*) as review_count,
      BOOL_OR(lr.review_type = 'request_change') as has_change_requests,
      (ARRAY_AGG(lr.comment ORDER BY lr.created_at DESC))[1] as latest_comment,
      (ARRAY_AGG(u.email ORDER BY lr.created_at DESC))[1] as latest_reviewer_email,
      MAX(lr.created_at) as latest_review_at
    FROM transaction_line_reviews lr
    LEFT JOIN auth.users u ON lr.reviewer_user_id = u.id
    WHERE lr.approval_request_id = p_approval_request_id
    GROUP BY lr.line_id, lr.line_no
  )
  SELECT 
    tl.id as line_id,
    tl.line_no,
    a.code as account_code,
    a.name as account_name,
    tl.debit_amount,
    tl.credit_amount,
    COALESCE(lrs.review_count, 0),
    COALESCE(lrs.has_change_requests, FALSE),
    lrs.latest_comment,
    lrs.latest_reviewer_email,
    lrs.latest_review_at
  FROM transaction_lines tl
  LEFT JOIN glaccounts a ON tl.account_id = a.id
  LEFT JOIN line_review_summary lrs ON tl.id = lrs.line_id
  WHERE tl.transaction_id = (
    SELECT target_id::UUID 
    FROM approval_requests 
    WHERE id = p_approval_request_id
  )
  ORDER BY tl.line_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function: Check if transaction lines have unresolved reviews
CREATE OR REPLACE FUNCTION check_lines_review_status(
  p_transaction_id UUID
) RETURNS TABLE (
  all_lines_reviewed BOOLEAN,
  total_lines INTEGER,
  lines_needing_review INTEGER,
  lines_with_comments INTEGER,
  lines_with_change_requests INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (COUNT(*) FILTER (WHERE needs_review = TRUE) = 0) as all_lines_reviewed,
    COUNT(*)::INTEGER as total_lines,
    COUNT(*) FILTER (WHERE needs_review = TRUE)::INTEGER as lines_needing_review,
    COUNT(DISTINCT CASE WHEN review_notes IS NOT NULL THEN id END)::INTEGER as lines_with_comments,
    COUNT(*) FILTER (WHERE needs_review = TRUE AND review_notes IS NOT NULL)::INTEGER as lines_with_change_requests
  FROM transaction_lines
  WHERE transaction_id = p_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger: Track line modifications
CREATE OR REPLACE FUNCTION track_line_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment revision count if amounts or account changed
  IF (OLD.debit_amount IS DISTINCT FROM NEW.debit_amount) OR
     (OLD.credit_amount IS DISTINCT FROM NEW.credit_amount) OR
     (OLD.account_id IS DISTINCT FROM NEW.account_id) THEN
    
    NEW.revision_count := COALESCE(OLD.revision_count, 0) + 1;
    NEW.last_modified_at := NOW();
    
    -- If line was previously reviewed, flag for re-review
    IF OLD.reviewed_at IS NOT NULL THEN
      NEW.needs_review := TRUE;
      NEW.review_notes := 'Line modified after review - needs re-review';
    END IF;
    
    -- Audit log
    INSERT INTO audit_logs (
      user_id, action, resource_type, resource_id,
      line_id, old_values, new_values, created_at
    ) VALUES (
      NEW.last_modified_by,
      'LINE_MODIFIED',
      'transaction_line',
      NEW.id::TEXT,
      NEW.id,
      jsonb_build_object(
        'debit_amount', OLD.debit_amount,
        'credit_amount', OLD.credit_amount,
        'account_id', OLD.account_id
      ),
      jsonb_build_object(
        'debit_amount', NEW.debit_amount,
        'credit_amount', NEW.credit_amount,
        'account_id', NEW.account_id
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_line_modification_trigger
  BEFORE UPDATE ON transaction_lines
  FOR EACH ROW
  EXECUTE FUNCTION track_line_modification();

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION flag_lines_for_review TO authenticated;
GRANT EXECUTE ON FUNCTION add_line_review_comment TO authenticated;
GRANT EXECUTE ON FUNCTION get_line_reviews_for_approval TO authenticated;
GRANT EXECUTE ON FUNCTION check_lines_review_status TO authenticated;

COMMIT;
```

### Verification SQL
```sql
-- Check columns added
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
  AND column_name IN ('needs_review', 'review_notes', 'reviewed_by');

-- Check table created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'transaction_line_reviews';

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%line%review%';

-- Check trigger
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'track_line_modification_trigger';
```

---

## 📝 INTEGRATION WITH EXISTING APPROVAL FLOW

### How It Works Together

**1. Transaction Creation (Unchanged)**
```typescript
// User creates transaction with lines
const transaction = await createTransaction(data)
const lines = await createTransactionLines(transaction.id, lineData)
```

**2. Submit for Approval (Enhanced)**
```typescript
// Use EXISTING function
const approvalRequest = await fn_create_approval_request(
  org_id,
  'transactions',
  transaction.id,
  user_id
)

// NEW: Optionally flag specific lines for review
if (complexLines.length > 0) {
  await flag_lines_for_review(
    transaction.id,
    complexLines.map(l => l.id),
    user_id
  )
}
```

**3. Approval Review (Enhanced)**
```typescript
// Use EXISTING approval inbox
const inbox = await list_approval_inbox_v2(user_id)

// NEW: Get line-level details for review
const lineReviews = await get_line_reviews_for_approval(request_id)

// NEW: Add line-specific comments during review
await add_line_review_comment(
  request_id,
  line_id,
  reviewer_id,
  "Please verify this amount",
  'request_change'
)

// Use EXISTING approval action
await review_request(request_id, 'approve', notes)
```

**4. Handle Revisions (Enhanced)**
```typescript
// User modifies lines based on feedback
await updateTransactionLine(line_id, newData)

// Trigger automatically:
// - Increments revision_count
// - Flags needs_review if previously reviewed
// - Logs to audit_logs

// Resubmit using EXISTING flow
await fn_create_approval_request(...)
```

---

## 🎯 KEY BENEFITS

### ✅ Keeps Existing System Working
- Transaction-level approval workflow unchanged
- All existing functions still work
- No breaking changes to current UI

### ✅ Adds Line-Level Visibility
- Reviewers can see which lines need attention
- Line-by-line comments during approval
- Track line modifications and revisions

### ✅ Better Audit Trail
- Line-level change tracking
- Review history per line
- Modification count per line

### ✅ Flexible Enhancement
- Can be adopted gradually
- Optional line flagging
- Works with or without line reviews

---

## 📊 NEXT STEPS

### TASK 2: Service Layer Enhancement

Create `src/services/lineReviewService.ts`:

```typescript
import { supabase } from '@/utils/supabase'

export async function flagLinesForReview(
  transactionId: string,
  lineIds: string[],
  userId: string
) {
  const { data, error } = await supabase.rpc('flag_lines_for_review', {
    p_transaction_id: transactionId,
    p_line_ids: lineIds,
    p_flagged_by: userId
  })
  
  if (error) throw error
  return data[0]
}

export async function addLineReviewComment(
  approvalRequestId: string,
  lineId: string,
  userId: string,
  comment: string,
  reviewType: 'comment' | 'flag' | 'approve' | 'request_change' = 'comment'
) {
  const { data, error } = await supabase.rpc('add_line_review_comment', {
    p_approval_request_id: approvalRequestId,
    p_line_id: lineId,
    p_reviewer_user_id: userId,
    p_comment: comment,
    p_review_type: reviewType
  })
  
  if (error) throw error
  return data[0]
}

export async function getLineReviewsForApproval(approvalRequestId: string) {
  const { data, error } = await supabase.rpc('get_line_reviews_for_approval', {
    p_approval_request_id: approvalRequestId
  })
  
  if (error) throw error
  return data
}

export async function checkLinesReviewStatus(transactionId: string) {
  const { data, error } = await supabase.rpc('check_lines_review_status', {
    p_transaction_id: transactionId
  })
  
  if (error) throw error
  return data[0]
}
```

### TASK 3: React Hook

Create `src/hooks/useLineReviews.ts`:

```typescript
import { useState, useEffect } from 'react'
import { 
  getLineReviewsForApproval,
  addLineReviewComment,
  checkLinesReviewStatus 
} from '@/services/lineReviewService'

export function useLineReviews(approvalRequestId: string | null) {
  const [lineReviews, setLineReviews] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!approvalRequestId) return
    
    setLoading(true)
    getLineReviewsForApproval(approvalRequestId)
      .then(setLineReviews)
      .finally(() => setLoading(false))
  }, [approvalRequestId])
  
  const addComment = async (
    lineId: string, 
    comment: string, 
    reviewType: string
  ) => {
    if (!approvalRequestId) return
    
    await addLineReviewComment(
      approvalRequestId,
      lineId,
      userId, // from context
      comment,
      reviewType
    )
    
    // Refresh
    const updated = await getLineReviewsForApproval(approvalRequestId)
    setLineReviews(updated)
  }
  
  return { lineReviews, loading, addComment }
}
```

---

## ✅ SUCCESS CRITERIA

```
✅ Existing approval workflow still works
✅ Transaction-level approval unchanged
✅ Line-level tracking added
✅ Review comments per line
✅ Modification tracking works
✅ Audit trail enhanced
✅ No breaking changes
✅ Backward compatible
```

---

## 🚀 READY TO IMPLEMENT?

This plan:
- ✅ Keeps your working approval system
- ✅ Adds line-level enhancements
- ✅ No breaking changes
- ✅ Gradual adoption possible
- ✅ Better audit trail
- ✅ Flexible and extensible

**Shall I proceed with creating the service layer and React hooks?**
