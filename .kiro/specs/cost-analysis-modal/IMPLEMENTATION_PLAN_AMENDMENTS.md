# Pre-Execution Review: Implementation Plan Corrections
## Cost Analysis Modal — Consultant-Approved Amendments

**Date**: March 1, 2026  
**Status**: ✅ APPROVED FOR EXECUTION — With Mandatory Amendments  
**Prepared By**: Software Architecture Consultant  
**For**: AI Agent (Implementation Agent)  

> ⚠️ READ THIS ENTIRE DOCUMENT BEFORE WRITING A SINGLE LINE OF CODE  
> This document overrides, corrects, and supplements the original Implementation Plan.  
> All 8 amendments below are confirmed by the project owner and must be applied.

---

## Confirmed Decisions

| Decision | Answer | Impact |
|----------|--------|--------|
| Architecture | Path B: Catalog-Based Item Analysis | ✅ Proceed as planned |
| Negative quantity/unit_price allowed | **YES — Drop DB constraints** | ⚠️ Affects Task 1, 2.3, DB schema |
| RTL support | Full Arabic RTL required | ⚠️ Must be set up BEFORE components |
| Calculation model | total_amount ≠ net_amount (both needed) | ✅ No change |
| Approval lock source | `transaction_lines.approval_status` | ✅ No change |
| Concurrency | Manual merge via existing offline sync | ✅ No change |
| Audit trail | Line-level only | ✅ No change |
| Data migration | None — new data only | ✅ No change |

---

## Amendment #1 🔴 CRITICAL
### Add Task 0: Pre-Flight Database Verification (NEW TASK — INSERT BEFORE TASK 1)

**Why**: The system is already running in production. Task 1 creates database functions and  
RLS policies — but without first checking what already exists, the agent risks overwriting  
live policies, conflicting with existing triggers, or duplicating functions.

**INSERT this as the very first task:**

```
Task 0: Pre-Flight Database Verification
  DO NOT create anything yet. Run verification queries only.

  0.1 Check existing RLS policies:
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'transaction_line_items';

  0.2 Check existing triggers:
    SELECT tgname, tgtype, tgenabled
    FROM pg_trigger
    WHERE tgrelid = 'transaction_line_items'::regclass;

  0.3 Check existing functions:
    SELECT proname, prosrc
    FROM pg_proc
    WHERE proname IN (
      'can_edit_transaction_line',
      'replace_line_items_atomic',
      'fn_calculate_tli_adjustments'
    );

  0.4 Check existing indexes:
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'transaction_line_items';

  0.5 Check existing constraints on transaction_line_items:
    SELECT conname, contype, consrc
    FROM pg_constraint
    WHERE conrelid = 'transaction_line_items'::regclass;

  0.6 Verify line_items catalog is accessible:
    SELECT COUNT(*) FROM line_items WHERE is_active = true LIMIT 1;

  0.7 Verify adjustment_types table is accessible:
    SELECT COUNT(*) FROM adjustment_types LIMIT 1;

  0.8 Verify transaction_lines has approval_status column:
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'transaction_lines'
      AND column_name = 'approval_status';

  AFTER running all checks:
  - Report findings to user
  - If any function/policy already exists: use CREATE OR REPLACE (not CREATE)
  - If indexes already exist: use CREATE INDEX IF NOT EXISTS
  - WAIT for user confirmation before proceeding to Task 1
```

---

## Amendment #2 🔴 CRITICAL
### Fix Trigger Code — DO NOT Write to `total_amount` GENERATED ALWAYS Column

**Why**: `total_amount` is defined as `GENERATED ALWAYS AS (...) STORED` in the schema.  
PostgreSQL will throw an error if any trigger attempts to set `NEW.total_amount`.  
The trigger code in the original engineering plan is **incorrect** and will cause insert failures.

**In Task 1, when creating/verifying `fn_calculate_tli_adjustments`, use ONLY this version:**

```sql
-- CORRECT trigger function
-- DO NOT set NEW.total_amount — it is a GENERATED ALWAYS column
-- The DB computes it automatically. Use it as read-only input.

CREATE OR REPLACE FUNCTION fn_calculate_tli_adjustments()
RETURNS TRIGGER AS $$
BEGIN
  -- total_amount is already computed by GENERATED ALWAYS column
  -- Read it as input for adjustment calculations

  -- Calculate addition amount
  IF NEW.addition_percentage IS NOT NULL THEN
    NEW.addition_amount := NEW.total_amount * (NEW.addition_percentage / 100.0);
  ELSE
    NEW.addition_amount := 0;
  END IF;

  -- Calculate deduction amount
  IF NEW.deduction_percentage IS NOT NULL THEN
    NEW.deduction_amount := NEW.total_amount * (NEW.deduction_percentage / 100.0);
  ELSE
    NEW.deduction_amount := 0;
  END IF;

  -- Net amount = base + additions - deductions
  NEW.net_amount := NEW.total_amount + NEW.addition_amount - NEW.deduction_amount;

  -- Update timestamp
  NEW.updated_at := CURRENT_TIMESTAMP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Trigger binding (use IF NOT EXISTS pattern):**
```sql
DROP TRIGGER IF EXISTS zz_trigger_calculate_adjustments 
  ON transaction_line_items;

CREATE TRIGGER zz_trigger_calculate_adjustments
  BEFORE INSERT OR UPDATE ON transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_tli_adjustments();
```

---

## Amendment #3 🔴 CRITICAL
### Move RTL Setup BEFORE Component Building (Reorder Tasks 11.1, 11.2, 11.5)

**Why**: Building all components LTR-first then retrofitting RTL causes:
- Rework of padding/margin CSS in every component
- Table column order bugs (drag handles on wrong side in Arabic)
- Dropdown alignment issues in LineItemSelector
- Missed RTL fixes in nested elements

**New Task Order:**

```
ORIGINAL ORDER (WRONG):
  Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → ... → Task 11 RTL

CORRECT ORDER:
  [NEW] Task 2.5: RTL Foundation (insert between Task 2 and Task 3)
    - Execute Task 11.1: Set up RTL theme (rtl.ts, emotion cache, font families)
    - Execute Task 11.2: Update App.tsx with CacheProvider and dir attribute
    - Execute Task 11.5: Add translation keys (en.json and ar.json)
    - Verify theme switches correctly between LTR and RTL
    - THEN proceed to Task 3 (build components with RTL already active)

  Task 11.3 (CSS logical properties): Apply as each component is built, not later
  Task 11.4 (NumberDisplay component): Build alongside TotalsSummary (Task 7)
  Task 11.6 (RTL tests): Merge into component tests (Tasks 3.4, 4.4, 7.3), not standalone
```

**CSS Rules to Apply in EVERY component from the start:**
```css
/* USE THESE (RTL-safe logical properties) */
margin-inline-start: 16px;   /* instead of margin-left */
margin-inline-end: 16px;     /* instead of margin-right */
padding-inline-start: 8px;   /* instead of padding-left */
padding-inline-end: 8px;     /* instead of padding-right */
text-align: start;            /* instead of text-align: left */
border-inline-start: ...;    /* instead of border-left */

/* NEVER USE these directional properties in new components */
/* margin-left, margin-right, padding-left, padding-right */
/* text-align: left, float: left, left: 0 (in positioned elements) */
```

**Number Display Rule (apply from Task 3 onwards):**
```tsx
// Keep numbers LTR even in Arabic RTL layout
// Use this for ALL numeric values in the modal
<Box component="span" dir="ltr" sx={{ display: 'inline-block' }}>
  {value.toFixed(2)}
</Box>
```

---

## Amendment #4 🟡 IMPORTANT
### Drop Negative Value Constraints (Project Owner Confirmed: Option B)

**Decision**: Allow negative `quantity` and `unit_price` directly.  
This enables adjustment entries (returns, reversals, credits) without needing workarounds.

**In Task 1, ADD these SQL statements:**

```sql
-- Drop existing constraints that block negative values
-- Run ONLY if confirmed by Task 0 verification that they exist

ALTER TABLE transaction_line_items 
  DROP CONSTRAINT IF EXISTS transaction_line_items_quantity_check;

ALTER TABLE transaction_line_items 
  DROP CONSTRAINT IF EXISTS transaction_line_items_unit_price_check;

-- Keep percentage constraint (0-999.99 is still a valid business rule)
-- Do NOT drop: transaction_line_items_percentage_check
```

**In Task 2.3, update `validateLineItem()` accordingly:**

```typescript
// CORRECT validation — no min-value constraints on quantity or unit_price
export function validateLineItem(item: Partial<TransactionLineItem>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Only check that values are numeric (not empty/NaN)
  if (item.quantity !== undefined && isNaN(item.quantity)) {
    errors.push('Quantity must be a numeric value')
  }

  if (item.unit_price !== undefined && isNaN(item.unit_price)) {
    errors.push('Unit price must be a numeric value')
  }

  // Percentage still has business constraints
  if (item.percentage !== undefined) {
    if (isNaN(item.percentage) || item.percentage < -999.99 || item.percentage > 999.99) {
      errors.push('Percentage must be a numeric value between -999.99 and 999.99')
    }
  }

  // addition_percentage and deduction_percentage: numeric only
  if (item.addition_percentage !== undefined 
      && item.addition_percentage !== null 
      && isNaN(item.addition_percentage)) {
    errors.push('Addition percentage must be numeric')
  }

  if (item.deduction_percentage !== undefined 
      && item.deduction_percentage !== null 
      && isNaN(item.deduction_percentage)) {
    errors.push('Deduction percentage must be numeric')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
```

**In Task 3 (UI), update numeric inputs to allow negative values:**
```tsx
// Quantity and unit_price inputs: remove min={0} constraint
<TextField
  type="number"
  value={item.quantity}
  onChange={(e) => onUpdateItem(index, { quantity: parseFloat(e.target.value) })}
  // DO NOT add inputProps={{ min: 0 }}
  // Negative values are valid
/>
```

---

## Amendment #5 🟡 IMPORTANT
### Pause Before Task 12 — Confirm Offline Sync Manager API

**Why**: Task 12 says "integrate with existing offline sync manager" but the agent does  
not know the internal API of your existing system. If the agent guesses the interface,  
it will write incompatible code that silently fails or errors at runtime.

**MANDATORY PAUSE RULE for the Agent:**

```
BEFORE starting Task 12, STOP and ask the user:

  1. "What is the file path of the existing offline sync manager?"
     (Example: src/services/offlineSync.ts, src/hooks/useOfflineSync.ts)

  2. "What is the method signature to queue an operation?"
     (Example: syncManager.queue({ type, table, data }))

  3. "Is there an existing service that already uses offline sync 
     that I can use as a pattern to follow?"
     (Example: look at how transaction-lines.ts does it)

  4. "What is the IndexedDB store name used for queued operations?"

DO NOT implement Task 12 until the user answers these questions.
DO NOT create a fake offline sync interface.
```

---

## Amendment #6 🟡 IMPORTANT
### Confirm DnD Library Before Task 4 — Do Not Introduce New Dependencies

**Why**: `react-beautiful-dnd` (used in the plan) is officially unmaintained since 2022  
and has known bugs with React 18 StrictMode. The recommended replacement is `@dnd-kit`.

**MANDATORY CHECK for the Agent before Task 4:**

```
Before implementing drag-and-drop in Task 4, check:

  1. Run: grep -r "react-beautiful-dnd\|@dnd-kit\|react-dnd" package.json

  2. If react-beautiful-dnd is already installed:
     → Use it for consistency (do not add a second DnD library)
     → BUT add this wrapper to fix React 18 StrictMode issues:
       <React.StrictMode> issues require using StrictModeDroppable pattern
       Reference: https://github.com/atlassian/react-beautiful-dnd/issues/2399

  3. If @dnd-kit is already installed:
     → Use @dnd-kit/sortable — it is React 18 compatible and actively maintained

  4. If neither is installed:
     → Install @dnd-kit: npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
     → Do NOT install react-beautiful-dnd (deprecated)

  5. Report to user which library was found/chosen before implementing.
```

---

## Amendment #7 🟠 SEQUENCING
### Add Intermediate Checkpoints After Tasks 1, 2, and 4

**Why**: The first checkpoint (Task 10) comes after 9 major tasks — too large a batch  
to debug if something is wrong. Add these lightweight verification points:

```
AFTER Task 1 — Database Checkpoint:
  - Run Task 0 queries again to confirm all functions/policies created
  - Test can_edit_transaction_line() with a known approved line ID
  - Test can_edit_transaction_line() with a known draft line ID
  - Manually call replace_line_items_atomic() with 1 test item via SQL
  - Confirm trigger fires and net_amount is calculated
  - Confirm negative quantity insert succeeds (constraint dropped)
  - Ask user to confirm before proceeding to Task 2

AFTER Task 2 — Service Layer Checkpoint:
  - Run unit tests from Task 2.4 (these are NOT optional — see Amendment #8)
  - Confirm getLineItems() returns data with line_item joined
  - Confirm canEditTransactionLine() returns correct boolean
  - Confirm calculateTotals() output matches manual calculation
  - Ask user to confirm before proceeding to Task 3

AFTER Task 4 — Component Checkpoint:
  - Render ItemsTable in isolation (Storybook or test page)
  - Confirm drag-drop reorders items
  - Confirm RTL layout is correct (drag handle on left in LTR, right in RTL)
  - Confirm read-only mode disables all inputs
  - Ask user to confirm before proceeding to Tasks 5-8
```

---

## Amendment #8 🟠 SEQUENCING
### Promote Core Tests From Optional to Required

**Why**: Tests marked `*` (optional) in the plan include the service layer and  
integration tests. Skipping these means bugs introduced in early phases will only  
surface at E2E testing (Tasks 15-16), making them very expensive to diagnose and fix.

**Updated Test Priority Classification:**

```
🔴 REQUIRED (NOT optional — do not skip):
  Task 2.4  — Service layer unit tests
  Task 3.4  — Modal component tests (core behavior only)
  Task 9.4  — Integration tests with TransactionWizard

🟡 RECOMMENDED (skip only for urgent MVP, re-add in next sprint):
  Task 4.4  — ItemsTable tests
  Task 6.3  — AdditionDeductionPanel tests
  Task 7.3  — TotalsSummary tests

🟢 DEFERRABLE (post-MVP — do not block release):
  Task 5.3  — LineItemSelector tests
  Task 8    — UnsavedChangesDialog (covered by modal tests in 3.4)
  Task 12.3 — Offline sync tests
  Task 13.3 — Mobile responsiveness tests
  Task 15.1 — Database integration tests (verify manually)
  Task 16.1 — Performance tests
  Task 17.2 — Accessibility tests
```

---

## Corrected Task Execution Order

```
ORIGINAL PLAN ORDER → CORRECTED ORDER
─────────────────────────────────────────────────────
[NEW]  Task 0:    Pre-flight DB verification
       Task 1:    Database functions + RLS + DROP constraints
                  ↳ [CHECKPOINT: Verify DB, test functions]
       Task 2.1:  Service CRUD
       Task 2.2:  Catalog functions
       Task 2.3:  Calculations + validation (with negative values)
       Task 2.4:  ✅ REQUIRED unit tests
                  ↳ [CHECKPOINT: All service tests pass]
[NEW]  Task 2.5:  RTL Foundation (theme + App.tsx + translations)
       Task 3.1:  Modal structure (built RTL-aware from start)
       Task 3.2:  Modal features
       Task 3.3:  Data loading/saving
       Task 3.4:  ✅ REQUIRED modal tests
       Task 4.1:  ItemsTable (with RTL logical CSS)
       Task 4.2:  Drag-drop (use confirmed DnD library)
       Task 4.3:  Row actions + expandable panels
       Task 4.4:  Recommended tests
                  ↳ [CHECKPOINT: Render check + RTL check]
[NEW]  Task 4.5:  Build NumberDisplay component (RTL-safe numbers)
       Task 5.1:  LineItemSelector
       Task 5.2:  Catalog filtering
       Task 6.1:  AdditionDeductionPanel
       Task 6.2:  Percentage inputs
       Task 7.1:  TotalsSummary (uses NumberDisplay from 4.5)
       Task 7.2:  Real-time updates
       Task 8:    UnsavedChangesDialog
       Task 9.1:  Wizard button + badge
       Task 9.2:  Wizard state management
       Task 9.3:  Render modal in wizard
       Task 9.4:  ✅ REQUIRED integration tests
                  ↳ [CHECKPOINT 10: Full feature works end-to-end]
       Task 11.3: Audit all components for logical CSS (any missed)
       Task 11.6: RTL tests (merged into prior component tests)
       Task 12:   Offline sync (PAUSE — ask user for API first)
       Task 13:   Mobile responsiveness
                  ↳ [CHECKPOINT 14]
       Task 15:   Integration + E2E tests
       Task 16:   Performance optimization
       Task 17:   Accessibility
       Task 18:   Final checkpoint + deployment prep
```

---

## Quick Reference: Key Rules for Agent

### ✅ Always Do
- Run Task 0 verification BEFORE any SQL changes
- Use `CREATE OR REPLACE` for functions (never plain `CREATE`)
- Use `CREATE INDEX IF NOT EXISTS` for indexes
- Use `DROP CONSTRAINT IF EXISTS` before adding constraints
- Use CSS logical properties in all new components
- Wrap all number displays in `dir="ltr"` span
- Ask user before starting Task 12 (offline sync API)
- Confirm DnD library before starting Task 4
- Report checkpoint results to user before advancing

### ❌ Never Do
- Write `NEW.total_amount :=` inside any trigger (GENERATED ALWAYS)
- Add `min={0}` to quantity or unit_price input fields
- Add `inputProps={{ min: 0 }}` to quantity or unit_price
- Add `CHECK (quantity >= 0)` or `CHECK (unit_price >= 0)` constraints
- Use `margin-left`, `padding-left` etc. in new component CSS
- Install `react-beautiful-dnd` if not already in the project
- Skip Tasks 2.4, 3.4, 9.4 tests — they are required
- Implement offline sync without confirmed API from user

---

## Files to Create (Complete List)

### New Files
```
src/
├── services/
│   └── transaction-line-items.ts          [Task 2]
├── components/
│   └── Transactions/
│       ├── CostAnalysisModal.tsx           [Task 3]
│       └── CostAnalysis/
│           ├── ItemsTable.tsx              [Task 4]
│           ├── LineItemSelector.tsx        [Task 5]
│           ├── AdditionDeductionPanel.tsx  [Task 6]
│           ├── TotalsSummary.tsx           [Task 7]
│           ├── UnsavedChangesDialog.tsx    [Task 8]
│           └── NumberDisplay.tsx          [Task 4.5 NEW]
└── theme/
    └── rtl.ts                             [Task 2.5 / 11.1]
```

### Modified Files
```
src/App.tsx                                [Task 2.5 / 11.2]
src/components/Transactions/
    TransactionWizard.tsx                  [Task 9]
public/locales/en/translation.json        [Task 2.5 / 11.5]
public/locales/ar/translation.json        [Task 2.5 / 11.5]
```

### Database Objects
```
SQL Functions (NEW):
  can_edit_transaction_line(UUID) → BOOLEAN
  replace_line_items_atomic(UUID, JSONB) → JSONB

SQL Trigger (REPLACE existing):
  fn_calculate_tli_adjustments() — corrected version
  zz_trigger_calculate_adjustments — recreate after function update

SQL Constraints (DROP):
  transaction_line_items_quantity_check
  transaction_line_items_unit_price_check

SQL Policies (CREATE OR REPLACE):
  View policy  — org-based access
  Insert policy — org + approval status check
  Update policy — org + approval status check
  Delete policy — org + approval status check

SQL Indexes (CREATE IF NOT EXISTS):
  idx_tli_transaction_line_id
  idx_tli_line_item_id
```

---

## Document Control

**Version**: 1.1  
**Date**: March 1, 2026  
**Status**: ✅ Project Owner Approved  
**Supersedes**: Original Implementation Plan (task list only)  
**Companion Documents**:
  - `COST_ANALYSIS_MODAL_ENGINEERING_PLAN.md` (original engineering plan)
  - `requirements.md` (feature requirements)
  - `SOFTWARE_CONSULTANT_REVIEW_AND_DESIGN.md` (full design document)

**Approval**:
- [x] Software Consultant: ✅ Approved
- [x] Project Owner: ✅ Approved (negative values: Option B confirmed)
- [ ] Technical Lead: Pending
- [ ] QA Lead: Pending

---

**END OF AMENDMENTS DOCUMENT**  
**The agent must acknowledge all 8 amendments before beginning Task 0.**
