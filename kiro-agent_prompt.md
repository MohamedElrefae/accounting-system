# WINDSURF/CLINE AGENT EXECUTION PROMPT
## Copy-Paste Ready for Your AI Agent

---

## 🎯 MISSION

Implement a multi-dimensional line-level approval system for a React + Supabase construction accounting app that supports flexible approvals across GL accounts, cost centers, and projects.

---

## 📋 CONTEXT

**Current State:**
- Existing transaction-level approvals (Finance → Manager → CFO)
- Transaction has multiple lines
- Previous migration attempted org-level only

**New Requirement:**
- Replace org-only approvals with dimension-based approvals
- Detect when GL accounts, cost centers, or projects differ
- Create approval requests for each dimension
- Each dimension can be approved independently
- Transaction posts only when ALL dimensions approved

**Tech Stack:**
- Supabase (PostgreSQL backend)
- React + TypeScript (frontend)
- Existing: approvalworkflows, approvalrequests, auditlogs tables

---

## 🛠️ TASKS (Execute in Order)

### TASK 1: Database Schema Migration (30 minutes)

**Location:** Your Supabase SQL Editor

**Action:**
1. Run the SQL script below exactly as written
2. After each ALTER TABLE, verify success (no errors)
3. Verify functions created: `SELECT COUNT(*) FROM information_schema.routines WHERE routine_name IN ('get_line_approval_rules', 'check_all_line_approvals_complete');`

**SQL Script:**
```sql
-- ================================================================
-- MULTI-DIMENSIONAL LINE APPROVAL SCHEMA
-- ================================================================

-- 1. Drop old org column if exists
ALTER TABLE transactionlines DROP COLUMN IF EXISTS responsible_org_id CASCADE;

-- 2. Add multi-dimensional columns
ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  responsible_gl_account_id UUID REFERENCES glaccounts(id);

ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  responsible_cost_center_id UUID REFERENCES costcenters(id);

ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  responsible_project_id UUID REFERENCES projects(id);

ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  approval_required BOOLEAN DEFAULT FALSE;

ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  approval_context JSONB DEFAULT '{}'::jsonb;

-- 3. Add approval status columns (same as before)
ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  line_approval_status VARCHAR(20) DEFAULT 'auto_approved'
  CHECK (line_approval_status IN ('auto_approved', 'pending', 'approved', 'rejected', 'requires_revision'));

ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  line_approved_by UUID REFERENCES auth.users(id);

ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  line_approved_at TIMESTAMP;

ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  line_edited_at TIMESTAMP;

ALTER TABLE transactionlines ADD COLUMN IF NOT EXISTS
  line_edit_count SMALLINT DEFAULT 0;

-- 4. Create approval requests table
DROP TABLE IF EXISTS transaction_line_approvalrequests CASCADE;

CREATE TABLE transaction_line_approvalrequests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  line_id UUID NOT NULL REFERENCES transactionlines(id) ON DELETE CASCADE,
  approval_request_id UUID REFERENCES approvalrequests(id) ON DELETE CASCADE,
  
  approval_dimension VARCHAR(50) NOT NULL,
  dimension_id UUID NOT NULL,
  dimension_name VARCHAR(255),
  
  responsible_role VARCHAR(50),
  responsible_user_id UUID REFERENCES auth.users(id),
  responsible_org_id UUID REFERENCES organizations(id),
  
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'requires_revision')),
  
  amount_requested NUMERIC(18, 4),
  amount_approved NUMERIC(18, 4),
  
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  revision_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(transaction_id, line_id, approval_dimension, dimension_id)
);

-- 5. Create indexes
CREATE INDEX idx_tx_line_approvals_dimension 
  ON transaction_line_approvalrequests(approval_dimension, dimension_id, status);

CREATE INDEX idx_tx_line_approvals_responsible 
  ON transaction_line_approvalrequests(responsible_user_id, status);

CREATE INDEX idx_transactionlines_approval_required 
  ON transactionlines(transaction_id, approval_required, line_approval_status);

-- 6. Extend auditlogs for line context
ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS
  line_id UUID REFERENCES transactionlines(id) ON DELETE SET NULL;

ALTER TABLE auditlogs ADD COLUMN IF NOT EXISTS
  approval_context JSONB;

-- 7. SQL FUNCTION: Get approval rules for a line
CREATE OR REPLACE FUNCTION get_line_approval_rules(
  p_debit_gl_id UUID,
  p_credit_gl_id UUID,
  p_debit_cost_center_id UUID,
  p_credit_cost_center_id UUID,
  p_debit_project_id UUID,
  p_credit_project_id UUID
) RETURNS TABLE (
  requires_approval BOOLEAN,
  approval_dimensions TEXT[],
  reason TEXT
) AS $$
DECLARE
  v_dimensions TEXT[] := ARRAY[]::TEXT[];
  v_requires_approval BOOLEAN := FALSE;
BEGIN
  IF p_debit_gl_id IS DISTINCT FROM p_credit_gl_id THEN
    v_dimensions := array_append(v_dimensions, 'gl_account');
    v_requires_approval := TRUE;
  END IF;
  
  IF p_debit_cost_center_id IS DISTINCT FROM p_credit_cost_center_id THEN
    v_dimensions := array_append(v_dimensions, 'cost_center');
    v_requires_approval := TRUE;
  END IF;
  
  IF p_debit_project_id IS DISTINCT FROM p_credit_project_id THEN
    v_dimensions := array_append(v_dimensions, 'project');
    v_requires_approval := TRUE;
  END IF;
  
  RETURN QUERY SELECT 
    v_requires_approval,
    v_dimensions,
    CASE 
      WHEN v_requires_approval THEN 'Line requires approval for: ' || array_to_string(v_dimensions, ', ')
      ELSE 'No approval required (all dimensions match)'
    END;
END;
$$ LANGUAGE plpgsql;

-- 8. SQL FUNCTION: Check all approvals complete
CREATE OR REPLACE FUNCTION check_all_line_approvals_complete(
  p_transaction_id UUID
) RETURNS TABLE (
  can_post BOOLEAN,
  total_approvals_needed INT,
  approvals_completed INT,
  approvals_pending INT,
  pending_dimensions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH approval_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
      COUNT(*) FILTER (WHERE status IN ('approved', 'auto_approved')) AS approved_count,
      COUNT(*) AS total_count,
      ARRAY_AGG(DISTINCT approval_dimension ORDER BY approval_dimension) 
        FILTER (WHERE status = 'pending') AS pending_dims
    FROM transaction_line_approvalrequests
    WHERE transaction_id = p_transaction_id
  )
  SELECT
    (COALESCE(pending_count, 0) = 0) AS can_post,
    COALESCE(total_count, 0),
    COALESCE(approved_count, 0),
    COALESCE(pending_count, 0),
    COALESCE(pending_dims, ARRAY[]::TEXT[])
  FROM approval_stats;
END;
$$ LANGUAGE plpgsql;

-- 9. Done
COMMIT;
```

**Verification After Task 1:**
```sql
-- Check columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'transactionlines' 
AND column_name IN ('responsible_gl_account_id', 'approval_required', 'approval_context');
-- Expected: 3 rows

-- Check table created
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_line_approvalrequests');
-- Expected: true

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('get_line_approval_rules', 'check_all_line_approvals_complete');
-- Expected: 2 rows
```

---

### TASK 2: Create Service Layer (1.5 hours)

**File:** `src/services/transactionLineApprovalService.ts`

**Action:**
1. Create the file
2. Copy entire code below
3. Fix any import errors (check paths to supabase client)
4. Ensure all 8 functions are exported
5. TypeScript should compile without errors

**Code:**

[INSERT FULL CODE FROM Part 3 of agent_implementation_plan.md - The transactionLineApprovalService.ts section]

**Verification:**
```bash
npm run build  # Should compile with no errors
```

---

### TASK 3: Create React Hook (1 hour)

**File:** `src/hooks/useMultiDimensionalApprovals.ts`

**Action:**
1. Create the file
2. Copy code below
3. Fix import paths to match your project
4. Should export one default hook function

**Code:**

[INSERT FULL CODE FROM Part 4 of agent_implementation_plan.md - The useMultiDimensionalApprovals.ts section]

**Verification:**
```bash
npm run build  # Should compile
```

---

### TASK 4: Update Transaction Submit Logic (1 hour)

**File:** Where you handle transaction creation/submission

**Action:**
Find the code that:
1. Creates transaction
2. Creates transaction lines
3. Submits for approval

**Add:**
```typescript
import { 
  shouldUseLineApproval, 
  createLineApprovalWorkflow,
  buildLineApprovalContext 
} from '@/services/transactionLineApprovalService';

// After creating lines, before submitting for approval:
async function submitTransaction(transactionId: string, userId: string) {
  try {
    // Get all lines
    const { data: lines } = await supabase
      .from('transactionlines')
      .select('*')
      .eq('transaction_id', transactionId);

    // Create approval workflow for each line that needs it
    for (const line of lines) {
      const context = await buildLineApprovalContext(line);
      
      if (context.requires_approval) {
        const result = await createLineApprovalWorkflow(
          transactionId,
          line.id,
          line,
          userId
        );
        
        if (!result.success) {
          throw new Error(`Failed to create approval workflow: ${result.error}`);
        }
      }
    }

    // Now submit to existing transaction approval workflow
    // (call your existing submitTransactionForApproval function)
    return await submitTransactionForApproval(transactionId, userId);
    
  } catch (error) {
    console.error('Submit error:', error);
    return { success: false, error: error.message };
  }
}
```

---

### TASK 5: Testing (1.5 hours)

**Create these test transactions:**

**Test 1: No Approval Needed**
```
Line 1: Debit GL-1001, CC-01, Project A
Line 2: Credit GL-1001, CC-01, Project A

Expected:
- approval_required = FALSE for both
- line_approval_status = 'auto_approved'
- No approval requests created
```

**Test 2: GL Account Approval**
```
Line 1: Debit GL-1001, CC-01
Line 2: Credit GL-2001, CC-01

Expected:
- 1 approval request created (dimension='gl_account')
- responsible_user_id = GL-2001 owner
- status = 'pending'
```

**Test 3: Multi-Dimensional**
```
Line 1: Debit GL-1001, CC-01, Project-A
Line 2: Credit GL-2001, CC-02, Project-B

Expected:
- 3 approval requests created
- approval_dimensions: ['gl_account', 'cost_center', 'project']
- Each dimension separate approval request
```

**Test 4: Amount Update**
```
1. Create line that's approved
2. Update line amount
3. Re-query

Expected:
- All approvals reset to 'pending'
- line_edit_count incremented
- Audit log shows LINE_AMOUNT_UPDATED
```

**Test 5: Check Can Post**
```
After all approvals:
SELECT * FROM check_all_line_approvals_complete('<transaction-id>');

Expected:
- can_post = TRUE
- approvals_pending = 0
- pending_dimensions = []
```

---

## ✅ SUCCESS CRITERIA

After completing all 5 tasks:

```
✅ Database: All columns exist, functions created, no errors
✅ Service: File created, all 8 functions exported, compiles
✅ Hook: File created, exports useMultiDimensionalApprovals, compiles
✅ Integration: Transaction submit logic updated
✅ Testing: All 5 test scenarios pass
✅ Audit: All actions logged to auditlogs
✅ No TypeScript errors
✅ No SQL errors
```

---

## 🚨 IMPORTANT CONSTRAINTS

1. **SQL**: Use EXACT code provided, don't modify
2. **IF NOT EXISTS**: All ALTER TABLE must use IF NOT EXISTS
3. **Foreign Keys**: Must reference existing tables in schema
4. **No Breaking Changes**: Existing approvals must continue working
5. **Backward Compatible**: Same-dimension lines should auto_approve
6. **Error Handling**: All functions must handle null values gracefully

---

## 📊 EXPECTED OUTPUT

After successful execution:

**In Database:**
- 10 new columns on transactionlines
- 1 new table: transaction_line_approvalrequests
- 2 new SQL functions
- 3 new indexes
- Extended auditlogs with line_id

**In Code:**
- 1 service file (600 lines)
- 1 React hook (100 lines)
- 1 updated submit function (+10 lines)

**In Supabase:**
- Sample approval requests created
- Audit trail populated
- All functions callable

---

## 📝 REFERENCES

If you need more details:
- Schema logic: See database relationships in Part 2
- Service functions: All documented in Part 3
- React integration: See Part 4
- Testing scenarios: See Part 8

---

## 🎬 START HERE

1. Copy this entire prompt
2. Open Supabase SQL Editor
3. Run Task 1 SQL (verify all succeed)
4. Create service file (Task 2)
5. Create hook file (Task 3)
6. Update submit logic (Task 4)
7. Run tests (Task 5)
8. Report results

---

## QUESTIONS?

If compilation errors:
- Check import paths
- Verify table/column names match your schema
- Ensure auth.users exists

If SQL errors:
- Check foreign key references
- Verify glaccounts, costcenters, projects tables exist
- Check schema is 'public'

If test failures:
- Verify data exists in dimension tables
- Check approval rules logic
- Verify responsible_user_id is set on dimensions

---

**Ready? Let's go! 🚀**
