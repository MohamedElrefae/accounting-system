# Current Approval System Analysis

## 📊 CURRENT STATE

### Existing Tables (Confirmed)
1. **approval_workflows** - Workflow definitions
   - Fields: id, org_id, name, target_table, is_active, created_at
   - Target: 'transactions' only

2. **approval_steps** - Sequential approval steps
   - Fields: id, workflow_id, step_order, name, approver_type, approver_role_id, approver_user_id, required_approvals, is_final
   - Approver types: 'role' | 'user' | 'org_manager'

3. **approval_requests** - Active approval requests
   - Fields: id, target_table, target_id, org_id, workflow_id, current_step_order, status, submitted_by, submitted_at, meta

4. **approval_actions** - Approval history
   - Fields: id, request_id, step_order, action, reason, actor_user_id, created_at
   - Actions: 'approve' | 'reject' | 'request_changes' | 'comment'

5. **audit_logs** - Audit trail
   - Fields: user_id, action, resource_type, resource_id, old_values, new_values, details, entity_type, entity_id

### Existing Data Model
- **transactions** table (header)
- **transaction_lines** table (line items)
  - Current fields: transaction_id, line_no, account_id, debit_amount, credit_amount, description
  - Dimensions: org_id, project_id, cost_center_id, work_item_id, analysis_work_item_id, classification_id, sub_tree_id

### Current Approval Flow
1. Transaction-level only (no line-level approvals)
2. Workflow selected by org_id
3. Sequential steps (Finance → Manager → CFO)
4. RPC functions: `list_approval_inbox_v2`, `can_user_approve_request`, `review_request`

## 🎯 REQUIREMENTS FROM PROMPT

The original prompt requests:
- **Multi-dimensional line-level approvals**
- Detect when GL accounts, cost centers, or projects differ between lines
- Create separate approval requests for each dimension
- Each dimension approved independently
- Transaction posts only when ALL dimensions approved

## ⚠️ CRITICAL QUESTIONS FOR VERIFICATION

### Question 1: Approval Granularity
**Current prompt assumes**: Different GL accounts/cost centers/projects between lines trigger approvals

**Reality check**: In double-entry accounting, EVERY transaction has different accounts (debit vs credit). This would mean:
- ✅ Line 1: Debit Cash, Credit Revenue → **2 different accounts = approval needed?**
- ✅ Line 2: Debit Expense, Credit Cash → **2 different accounts = approval needed?**

**Is this the intended behavior?** Or should approvals trigger based on:
- A) Account **categories** crossing (e.g., Asset → Liability)
- B) **Specific high-risk accounts** (e.g., Cash, Bank accounts)
- C) **Amount thresholds** (e.g., > $10,000)
- D) **Cross-organizational** transactions (different org_ids)
- E) Something else?

### Question 2: Who Approves What?
**Current system**: Approvers defined at workflow level (role/user/org_manager)

**New requirement**: "Each dimension can be approved independently"

**Who approves each dimension?**
- GL Account dimension → Account owner? Finance manager?
- Cost Center dimension → Cost center manager?
- Project dimension → Project manager?

**Do we need**:
- New fields on `glaccounts` table: `responsible_user_id`, `requires_approval`?
- New fields on `cost_centers` table: `manager_user_id`, `requires_approval`?
- New fields on `projects` table: `manager_user_id`, `requires_approval`?

### Question 3: Backward Compatibility
**Current transactions**: Already using transaction-level approvals

**Migration strategy**:
- A) Keep both systems (transaction-level + line-level)?
- B) Replace transaction-level with line-level?
- C) Line-level only for new transactions?

### Question 4: Approval Logic
**Scenario**: 3-line transaction
- Line 1: Debit GL-1001 (Cash), CC-01, Project-A
- Line 2: Credit GL-2001 (Revenue), CC-01, Project-A  
- Line 3: Credit GL-3001 (Tax), CC-02, Project-B

**How many approval requests?**
- Option A: 5 requests (3 GL accounts + 2 cost centers + 2 projects)
- Option B: 3 requests (1 per line, covering all dimensions)
- Option C: 2 requests (CC-02 and Project-B are different from Line 1)

## 📋 RECOMMENDED APPROACH

Based on analysis, I recommend **clarifying requirements** before implementation:

### Simplified Approach (Recommended)
**Trigger approvals when**:
1. Transaction crosses organizational boundaries (different org_ids)
2. High-risk accounts involved (configurable list)
3. Amount exceeds threshold (per account/cost center/project)
4. Specific account categories require approval (e.g., Cash, Bank)

**Approval routing**:
- Use existing workflow system
- Add dimension-aware routing (e.g., if project_id present, route to project manager)
- Keep transaction-level approval (simpler UX)

### Enterprise Approach (Complex)
**If truly need line-level multi-dimensional**:
1. Add approval configuration to dimension tables
2. Create line-level approval requests
3. Build approval matrix UI
4. Handle partial approvals
5. Complex state management

## 🚦 NEXT STEPS

**Please confirm**:
1. ✅ What triggers an approval? (see Question 1)
2. ✅ Who approves each dimension? (see Question 2)
3. ✅ Keep transaction-level approvals? (see Question 3)
4. ✅ How many approval requests per transaction? (see Question 4)

**Then I will provide**:
- Revised database schema
- Updated service layer
- React hooks
- Migration strategy
- Testing plan
