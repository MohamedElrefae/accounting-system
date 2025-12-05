# Transaction System Refactor - Complete Brief for AI Planning

**Date:** January 29, 2025  
**Purpose:** Generate detailed implementation plan for refactoring transaction system  
**Target:** Perplexity AI / Planning Agent

---

## EXECUTIVE SUMMARY

### The Problem
Our accounting application has **two coexisting transaction models**:
1. **Legacy Single-Row:** One transaction = one debit account + one credit account + one amount
2. **New Multi-Line:** One transaction = header + multiple lines (proper double-entry)

**Current Issue:** Users create transactions with the new multi-line wizard but edit them with the legacy single-row form, making it impossible to properly edit multi-line transactions.

### The Goal
Completely migrate to the multi-line model by:
1. Converting all existing single-row data to multi-line format
2. Refactoring the edit UI to support multi-line transactions
3. Removing legacy code and database fields

---

## DATABASE SCHEMA

### Legacy Model (DEPRECATED)

**transactions table - Legacy fields:**
```typescript
debit_account_id: UUID | null  // LEGACY - First account
credit_account_id: UUID | null // LEGACY - Second account  
amount: NUMERIC | null         // LEGACY - Transaction amount
```

**How it worked:**
- Simple two-account transactions only
- One row = complete transaction
- No support for complex journal entries

### New Model (CURRENT)

**transactions table - Header:**
```typescript
// Core fields
id: UUID (PRIMARY KEY)
entry_number: VARCHAR (UNIQUE) // Auto: JE-YYYYMM-NNNN
entry_date: DATE (NOT NULL)
description: TEXT (NOT NULL, min 3 chars)
description_ar: TEXT | null
reference_number: VARCHAR | null
notes: TEXT | null
notes_ar: TEXT | null

// Organization & Project
org_id: UUID | null (REQUIRED for new transactions)
project_id: UUID | null

// Posting
is_posted: BOOLEAN (DEFAULT false)
posted_at: TIMESTAMP | null
posted_by: UUID | null

// Approval Workflow
approval_status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested' | 'cancelled'
submitted_at: TIMESTAMP | null
submitted_by: UUID | null
reviewed_at: TIMESTAMP | null
reviewed_by: UUID | null
review_action: VARCHAR | null
review_reason: TEXT | null

// Aggregates (computed from lines)
has_line_items: BOOLEAN
line_items_count: INTEGER | null
line_items_total: NUMERIC | null
total_debits: NUMERIC | null
total_credits: NUMERIC | null

// Legacy fields (KEEP for now, will deprecate)
debit_account_id: UUID | null
credit_account_id: UUID | null
amount: NUMERIC | null

// Dimensions (header-level, optional)
classification_id: UUID | null
sub_tree_id: UUID | null
work_item_id: UUID | null
analysis_work_item_id: UUID | null
cost_center_id: UUID | null

// Audit
created_by: UUID | null
created_at: TIMESTAMP (DEFAULT NOW())
updated_at: TIMESTAMP (DEFAULT NOW())
```

**transaction_lines table - Detail lines:**
```typescript
id: UUID (PRIMARY KEY)
transaction_id: UUID (NOT NULL, FK → transactions.id ON DELETE CASCADE)
line_no: INTEGER (NOT NULL) // Sequence: 1, 2, 3...
account_id: UUID (NOT NULL, FK → accounts.id)
debit_amount: NUMERIC(15,2) (DEFAULT 0, >= 0)
credit_amount: NUMERIC(15,2) (DEFAULT 0, >= 0)
description: TEXT | null

// Line-level dimensions
org_id: UUID | null
project_id: UUID | null
cost_center_id: UUID | null
work_item_id: UUID | null
analysis_work_item_id: UUID | null
classification_id: UUID | null
sub_tree_id: UUID | null // expenses_category

// Line-level approval
line_status: 'draft' | 'pending' | 'approved' | 'rejected' | null
assigned_approver_id: UUID | null
approved_by: UUID | null
approved_at: TIMESTAMP | null
rejected_by: UUID | null
rejected_at: TIMESTAMP | null
rejection_reason: TEXT | null

// Audit
created_at: TIMESTAMP (DEFAULT NOW())
updated_at: TIMESTAMP (DEFAULT NOW())

// Constraints
UNIQUE (transaction_id, line_no)
CHECK: (debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0)
CHECK: debit_amount >= 0 AND credit_amount >= 0
```

**Business Rules:**
1. Minimum 2 lines per transaction
2. XOR rule: Each line has EITHER debit OR credit (not both, not neither)
3. Balance rule: SUM(debits) = SUM(credits) for each transaction
4. Cannot edit/delete if posted
5. Line-level approval workflow supported

---

## SERVICE LAYER

### Legacy Services (TO BE DEPRECATED)

**File:** `src/services/transactions.ts`

```typescript
// LEGACY - Creates single-row transaction
async function createTransaction(input: CreateTransactionInput): Promise<TransactionRecord>

interface CreateTransactionInput {
  entry_number: string
  entry_date: string
  description: string
  debit_account_id: string  // LEGACY
  credit_account_id: string // LEGACY
  amount: number            // LEGACY
  reference_number?: string
  notes?: string
  org_id?: string
  project_id?: string
  // ... other dimensions
}
```

**Business Logic:**
- Validates debit != credit account
- Validates amount > 0
- Auto-generates entry_number
- Inserts into `transactions` table with legacy fields populated

### New Services (CURRENT)

```typescript
// NEW - Creates header + lines
async function createTransactionWithLines(input: CreateTransactionWithLinesInput): Promise<TransactionRecord>

interface CreateTransactionWithLinesInput {
  // Header
  entry_date: string
  description: string
  description_ar?: string | null
  reference_number?: string | null
  notes?: string | null
  notes_ar?: string | null
  project_id?: string | null
  org_id?: string | null // REQUIRED
  
  // Lines
  lines: TxLineInput[]
}

interface TxLineInput {
  line_no: number
  account_id: string
  debit_amount?: number
  credit_amount?: number
  description?: string | null
  // Line-level dimensions
  org_id?: string | null
  project_id?: string | null
  cost_center_id?: string | null
  work_item_id?: string | null
  analysis_work_item_id?: string | null
  classification_id?: string | null
  sub_tree_id?: string | null
}
```

**Business Logic:**
1. Validates description (min 3 chars)
2. Validates org_id required
3. Validates minimum 2 lines
4. Validates XOR rule per line
5. Validates balance (total debits = total credits)
6. Auto-generates entry_number
7. Creates header (legacy fields = NULL)
8. Creates lines
9. Rollback header if lines fail

**File:** `src/services/transaction-lines.ts`

```typescript
// Replace all lines for a transaction
async function replaceTransactionLines(transactionId: string, lines: TxLineInput[])

// Add single line
async function addTransactionLine(transactionId: string, line: TxLineInput)

// Get all lines
async function getTransactionLines(transactionId: string): Promise<TxLine[]>
```

---

## UI COMPONENTS

### Legacy Component (NEEDS REFACTOR)

**Component:** `UnifiedTransactionDetailsPanel`  
**File:** `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx`  
**Status:** ❌ Uses legacy single-row model in edit mode

**Current Behavior:**
- View mode: Shows transaction details + read-only lines table
- Edit mode: Uses `UnifiedCRUDForm` with legacy fields:
  - Debit Account dropdown
  - Credit Account dropdown
  - Amount input
- Cannot edit lines
- Cannot add/remove lines

**What it should do:**
- View mode: Same (keep as-is)
- Edit mode: Support multi-line editing like `TransactionWizard`
  - Show editable lines grid
  - Add/remove lines
  - Balance validation
  - Line-level dimensions

### New Component (WORKING CORRECTLY)

**Component:** `TransactionWizard`  
**File:** `src/components/Transactions/TransactionWizard.tsx`  
**Status:** ✅ Uses new multi-line model

**Features:**
- 3-step wizard: Basic Info → Lines → Review
- Line editor with grid
- Add/remove lines
- Column configuration (show/hide dimensions)
- Balance validation
- Keyboard shortcuts
- Draft save support

**This is the reference implementation** for how edit mode should work.

---

## FIELD MAPPING

### Migration Logic

**For each legacy transaction:**

```sql
-- Legacy transaction
SELECT 
  id,
  debit_account_id,  -- Account 1
  credit_account_id, -- Account 2
  amount,            -- Amount
  org_id, project_id, cost_center_id, ...
FROM transactions
WHERE debit_account_id IS NOT NULL
  AND credit_account_id IS NOT NULL
  AND amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transaction_lines 
    WHERE transaction_id = transactions.id
  );
```

**Convert to:**

```sql
-- Line 1 (Debit)
INSERT INTO transaction_lines (
  transaction_id, line_no, account_id,
  debit_amount, credit_amount,
  description, org_id, project_id, ...
) VALUES (
  [transaction.id], 1, [debit_account_id],
  [amount], 0,
  'Migrated - Debit', [org_id], [project_id], ...
);

-- Line 2 (Credit)
INSERT INTO transaction_lines (
  transaction_id, line_no, account_id,
  debit_amount, credit_amount,
  description, org_id, project_id, ...
) VALUES (
  [transaction.id], 2, [credit_account_id],
  0, [amount],
  'Migrated - Credit', [org_id], [project_id], ...
);

-- Update header
UPDATE transactions SET
  has_line_items = true,
  line_items_count = 2,
  total_debits = amount,
  total_credits = amount,
  debit_account_id = NULL,
  credit_account_id = NULL,
  amount = NULL
WHERE id = [transaction.id];
```

---

## CURRENT USAGE

### Where Legacy Model is Used
1. ❌ `UnifiedTransactionDetailsPanel` - Edit mode
2. ❌ `TransactionFormConfig` - Form configuration
3. ❌ `createTransaction()` service function
4. ⚠️ Database: Legacy columns still exist

### Where New Model is Used
1. ✅ `TransactionWizard` - Create new transactions
2. ✅ `createTransactionWithLines()` - Service function
3. ✅ `transaction_lines` table - Stores lines
4. ✅ `TransactionLinesTable` - Displays lines

### Mixed Usage Problem
- User creates transaction with `TransactionWizard` (multi-line) ✅
- User clicks to edit → Opens `UnifiedTransactionDetailsPanel` (legacy) ❌
- Edit form shows legacy fields, cannot edit lines ❌
- **Result:** Cannot properly edit multi-line transactions

---

## RISKS & CONSTRAINTS

### HIGH RISK 🔥
1. **Data Loss:** If legacy fields removed before migration
2. **Breaking Changes:** Existing workflows may break
3. **Report Compatibility:** Reports may use legacy fields

### MEDIUM RISK 🟡
1. **UI Consistency:** Need to match wizard UX
2. **Performance:** Line queries may be slower
3. **Validation:** Complex balance rules

### LOW RISK 🟢
1. **Service Layer:** Well-structured
2. **Component Reuse:** Can reuse wizard patterns
3. **Testing:** Good test coverage exists

### Constraints
- Cannot break existing posted transactions
- Must maintain approval workflow
- Must support line-level approval
- Must maintain audit trail
- Must support RTL (Arabic) interface

---

## WHAT WE NEED FROM YOU (PERPLEXITY)

### Generate a detailed implementation plan that includes:

1. **Data Migration Strategy**
   - Complete SQL migration script
   - Validation queries
   - Rollback procedures
   - Testing approach

2. **UI Refactor Design**
   - How to refactor `UnifiedTransactionDetailsPanel`
   - Should we reuse `TransactionWizard` components or create new?
   - Inline editing vs modal editing?
   - How to handle large transactions (>10 lines)?

3. **Service Layer Updates**
   - How to deprecate `createTransaction()`
   - How to update `updateTransaction()`
   - Validation strategy

4. **Implementation Phases**
   - Week-by-week breakdown
   - Dependencies between tasks
   - Parallel vs sequential work

5. **Testing Strategy**
   - Unit tests
   - Integration tests
   - E2E tests
   - Performance tests

6. **Deployment Strategy**
   - Incremental rollout
   - Feature flags?
   - Rollback plan
   - Monitoring

7. **Risk Mitigation**
   - How to handle each identified risk
   - Contingency plans

8. **Technical Decisions**
   - Edit UI: Wizard-style steps vs inline grid?
   - Line editor: Modal vs inline?
   - Real-time validation vs on-save?
   - Auto-save drafts?
   - Undo/redo support?

---

## TECHNICAL STACK

- **Frontend:** React + TypeScript + Material-UI
- **Backend:** Supabase (PostgreSQL)
- **State Management:** React hooks
- **Forms:** Custom `UnifiedCRUDForm` component
- **Language:** Bilingual (English + Arabic RTL)

---

## SUCCESS CRITERIA

1. ✅ All transactions have lines in `transaction_lines` table
2. ✅ Edit mode supports multi-line transactions
3. ✅ No usage of legacy fields in new code
4. ✅ Balance validation works correctly
5. ✅ Approval workflow functions properly
6. ✅ No data loss
7. ✅ Performance acceptable (<2s for 50-line transaction)
8. ✅ Positive user feedback

---

## TIMELINE EXPECTATION

- **Total Duration:** 6-8 weeks
- **Phase 1 (Migration):** 1-2 weeks
- **Phase 2 (UI Refactor):** 2-3 weeks
- **Phase 3 (Testing):** 1-2 weeks
- **Phase 4 (Deployment):** 1-2 weeks

---

## ADDITIONAL CONTEXT

### Existing Patterns to Follow
- `TransactionWizard` - Reference for multi-line editing
- `ApprovalWorkflowManager` - Reference for approval UI
- `EnhancedLineReviewModal` - Reference for line-level actions
- `UnifiedCRUDForm` - Generic form component (can be reused)

### Recent Changes
- Just completed approval system refactor (removed legacy approval components)
- Modern approval system uses `ApprovalWorkflowManager` + `EnhancedLineReviewModal`
- Line-level approval workflow is functional

---

## QUESTION FOR PERPLEXITY

**Please generate a comprehensive, step-by-step implementation plan that:**
1. Minimizes risk
2. Allows incremental deployment
3. Maintains backward compatibility during transition
4. Provides clear technical decisions with rationale
5. Includes code examples where helpful
6. Considers the bilingual (EN/AR) RTL interface
7. Accounts for the existing approval workflow
8. Provides realistic time estimates
9. Includes testing strategy
10. Provides rollback procedures

**Focus on practical, actionable steps that a development team can execute immediately.**

---

**Document Status:** Ready for AI Planning  
**Next Step:** Generate implementation plan  
**Format:** Detailed markdown with code examples
