# Transaction Line Items - Corrected Schema & Trigger Fix
**Date: 2025-10-21**  
**Status: Ready for Implementation**

---

## Overview of Changes

Your `transaction_line_items` table has evolved to use a hierarchical, flexible structure:
- **Removed**: `transaction_id` column (was causing migration issues)
- **Using instead**: `transaction_line_id` - links transaction line items to actual transactions
- **Hierarchical structure**: `sub_tree_id` replaces `expenses_category_id` for categorization
- **Catalog vs. Transaction Items**:
  - Catalog items: `transaction_line_id IS NULL` (templates/masters in the hierarchy)
  - Transaction items: `transaction_line_id IS NOT NULL` (actual items linked to transactions)

---

## Problem Fixed

### Issue 1: Incorrect Column Reference
**Before**: Triggers checked for `transaction_id` (which didn't exist)
```sql
IF NEW.transaction_id IS NULL THEN...  -- ❌ Column doesn't exist
```

**After**: Triggers now check for `transaction_line_id`
```sql
IF NEW.transaction_line_id IS NULL THEN...  -- ✅ Correct column
```

### Issue 2: Wrong Categorization Column
**Before**: API referenced `expenses_category_id` (old design)
**After**: Using `sub_tree_id` (hierarchical categorization)

### Issue 3: Array_Agg in Trigger
**Before**: Function tried to use `array_agg()` (aggregate function)
```sql
-- ❌ ERROR: aggregate functions not allowed in triggers
SELECT array_agg(...) FROM transaction_line_items WHERE ...
```

**After**: Using scalar aggregates `SUM()` and `COUNT()`
```sql
-- ✅ Correct: scalar functions work in triggers
SELECT SUM(total_amount), COUNT(*) FROM transaction_line_items WHERE ...
```

---

## Implementation Steps

### Step 1: Apply Comprehensive Fix
Run this script first to recreate all triggers with correct logic:

```bash
psql -U your_user -d your_db -f database/CORRECTED_COMPREHENSIVE_FIX.sql
```

**What this does:**
- Verifies `transaction_line_id` column exists
- Verifies `sub_tree_id` column exists  
- Drops all problematic triggers
- Recreates 4 corrected trigger functions:
  1. `fn_guard_selectable_leaf_tli()` - enforces leaf-item selectability
  2. `fn_unselect_parent_tli()` - cascading parent deselection
  3. `fn_tli_update_path()` - hierarchical path maintenance
  4. `update_transaction_line_items_summary()` - transaction summary updates (fixed)

### Step 2: Verify Fixes
Run diagnostic queries to confirm:

```bash
psql -U your_user -d your_db -f database/diagnose-migration-issues.sql
```

Expected output:
- ✅ 4 custom triggers present (trg_*, trigger_*)
- ✅ 4 related functions present
- ✅ No errors in function definitions
- ✅ All required columns present

### Step 3: Test with Sample Data
Run the corrected test script:

```bash
psql -U your_user -d your_db -f database/TEST_transaction_line_items_insert.sql
```

**Test sequence:**
1. Creates or finds existing transaction
2. Inserts line item #1 (100% quantity)
3. Verifies trigger updated transaction summary
4. Inserts line item #2 (90% = 10% discount)
5. Verifies summary recalculated correctly
6. Displays all line items for transaction
7. **ROLLBACKs** to clean up test data

**Expected results:**
```
using transaction_line_id: [UUID]
TEST 1: Line item inserted successfully!
TEST 2: Verifying transaction summary was updated...
has_line_items: true, line_items_count: 1, line_items_total: 5000.00
TEST 3: Second line item inserted!
TEST 4: Verifying updated transaction summary...
has_line_items: true, line_items_count: 2, line_items_total: 9500.00
TEST 5: Final line items...
```

### Step 4: Test from UI
1. Open transaction form in your application
2. Try adding line items
3. Verify calculations work: `Quantity × (Percentage/100) × Unit Price = Total`
4. Confirm transaction summary updates automatically

---

## Column Mapping Reference

### transaction_line_items Table Structure

| Column | Purpose | Type | Notes |
|--------|---------|------|-------|
| `id` | Primary key | UUID | Unique identifier |
| `transaction_line_id` | **NEW**: Links to transactions table | UUID | `NULL` for catalog items, `NOT NULL` for transaction items |
| `line_number` | Position in transaction | INT | For ordering line items |
| `item_code` | Item identifier | VARCHAR(50) | Used for catalog hierarchy |
| `item_name` / `item_name_ar` | Item display name | VARCHAR(255) | English and Arabic |
| `quantity` | Item quantity | NUMERIC | Must be ≥ 0 |
| `percentage` | **KEY**: Multiplier percentage | NUMERIC | 0-999.99% (100 = full) |
| `unit_price` | Price per unit | NUMERIC | Must be ≥ 0 |
| `unit_of_measure` | Unit type | VARCHAR(50) | piece, kg, m, m2, etc. |
| `total_amount` | Calculated total | NUMERIC | = quantity × (percentage/100) × unit_price |
| `sub_tree_id` | **REPLACED expenses_category_id** | UUID | Hierarchical categorization |
| `parent_id` | Hierarchy parent | UUID | For nested items |
| `level` | Hierarchy depth | INT | Level in tree (1 = root) |
| `path` | Hierarchy path | TEXT | Dot-separated path (e.g., "mat.concrete") |
| `is_selectable` | Catalog flag | BOOLEAN | Can this item be selected in UI? |
| `org_id` | Organization | UUID | Required for RLS/multi-tenancy |
| `created_at` / `updated_at` | Timestamps | TIMESTAMPTZ | Audit trail |

### Example Data Scenarios

**Scenario 1: Simple Purchase (100% quantity)**
```sql
INSERT INTO transaction_line_items (
  transaction_line_id, line_number, item_name, quantity, percentage, unit_price, total_amount
) VALUES (
  'txn-uuid', 1, 'Cement Bags', 100, 100.00, 50.00, 5000.00
);
-- Calculation: 100 × 1.00 × 50.00 = 5000.00 ✓
```

**Scenario 2: Partial Delivery (75% of ordered)**
```sql
INSERT INTO transaction_line_items (
  transaction_line_id, line_number, item_name, quantity, percentage, unit_price, total_amount
) VALUES (
  'txn-uuid', 1, 'Steel Bars', 1000, 75.00, 100.00, 75000.00
);
-- Calculation: 1000 × 0.75 × 100.00 = 75000.00 ✓
```

**Scenario 3: Bulk Discount (10% off = 90%)**
```sql
INSERT INTO transaction_line_items (
  transaction_line_id, line_number, item_name, quantity, percentage, unit_price, total_amount
) VALUES (
  'txn-uuid', 1, 'Lumber', 200, 90.00, 25.00, 4500.00
);
-- Calculation: 200 × 0.90 × 25.00 = 4500.00 ✓
```

---

## Trigger Function Details

### 1. Guard Selectable (fn_guard_selectable_leaf_tli)
- **When**: BEFORE INSERT/UPDATE
- **Purpose**: Ensure only leaf nodes (items with no children) can be selectable
- **Logic**: 
  ```
  IF (item is catalog) AND (item marked selectable) THEN
    IF (item has children) THEN
      RAISE ERROR "Only leaf items can be selectable"
    END IF
  END IF
  ```

### 2. Unselect Parent (fn_unselect_parent_tli)
- **When**: AFTER INSERT
- **Purpose**: Cascade deselection - if parent has children, it can't be selectable
- **Logic**:
  ```
  IF (new item is catalog) AND (new item has parent) THEN
    UPDATE parent SET is_selectable = FALSE
  END IF
  ```

### 3. Update Path (fn_tli_update_path)
- **When**: BEFORE INSERT/UPDATE
- **Purpose**: Maintain hierarchical path for fast querying
- **Logic**:
  ```
  IF (item is catalog):
    IF (no parent):
      path = lowercase(item_code)
      level = 1
    ELSE:
      parent_path = fetch parent path
      path = parent_path + "." + lowercase(item_code)
      level = parent.level + 1
    END IF
  END IF
  ```

### 4. Update Transaction Summary (update_transaction_line_items_summary)
- **When**: AFTER INSERT/UPDATE/DELETE
- **Purpose**: Recalculate transaction totals when line items change
- **Logic**:
  ```
  IF (changed item is transaction item - NOT catalog):
    UPDATE transaction:
      line_items_total = SUM(total_amount) for this transaction
      line_items_count = COUNT(*) for this transaction
      has_line_items = (count > 0)
      updated_at = NOW()
  END IF
  ```

---

## Files Provided

1. **CORRECTED_COMPREHENSIVE_FIX.sql**
   - Main fix script
   - Drops old triggers, recreates with correct logic
   - Uses `transaction_line_id` instead of `transaction_id`
   - Removes `array_agg`, uses scalar functions

2. **TEST_transaction_line_items_insert.sql**
   - Verification script
   - Tests trigger execution
   - Tests transaction summary updates
   - Auto-ROLLBACKs to preserve database

3. **diagnose-migration-issues.sql**
   - Diagnostic queries
   - Checks for remaining issues
   - Verifies column structure

---

## Troubleshooting

### Issue: "Column transaction_id does not exist"
**Cause**: Old schema still being referenced
**Fix**: Run `CORRECTED_COMPREHENSIVE_FIX.sql`

### Issue: Triggers not firing
**Cause**: Table might have RLS policies preventing updates
**Check**: 
```sql
SELECT * FROM pg_policies WHERE tablename = 'transaction_line_items';
```

### Issue: Total amounts not calculating
**Cause**: `total_amount` column is NULL or not being populated
**Fix**: Ensure you provide `total_amount` on INSERT:
```sql
INSERT INTO transaction_line_items (..., total_amount) 
VALUES (..., quantity * percentage/100 * unit_price);
```

### Issue: Transaction summary not updating
**Cause**: Trigger filter not matching (checking for wrong condition)
**Check**: Verify `transaction_line_id` is being set:
```sql
SELECT transaction_line_id, line_number FROM transaction_line_items LIMIT 5;
```

---

## Rollback Procedure

If something goes wrong, restore using this script:

```sql
BEGIN;

-- Restore old version (if needed)
DROP TRIGGER IF EXISTS trigger_update_transaction_summary ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.update_transaction_line_items_summary();

-- Recreate original version from backup
-- ... [your original function definition]

COMMIT;
```

---

## Next Steps

1. ✅ Run `CORRECTED_COMPREHENSIVE_FIX.sql`
2. ✅ Run `TEST_transaction_line_items_insert.sql`
3. ✅ Verify in UI by adding line items to a transaction
4. 📝 Update frontend components if using `expenses_category_id` (change to `sub_tree_id`)
5. 📝 Update any API endpoints that reference old columns

---

## API Updates Needed

If your API/frontend references old column names, update these:

**Before (Old)**:
```typescript
expensesCategoryId: string  // ❌ Old column
```

**After (New)**:
```typescript
subTreeId: string  // ✅ New column for hierarchical categorization
```

**Example API call**:
```typescript
POST /api/transactions/[transactionId]/line-items
{
  lineItems: [
    {
      itemName: "Cement",
      quantity: 100,
      percentage: 100,      // 100% = full quantity
      unitPrice: 50,
      unitOfMeasure: "bag",
      subTreeId: "uuid...", // Replaced from expensesCategoryId
      totalAmount: 5000     // Must be calculated correctly
    }
  ]
}
```

---

**Status**: Ready for deployment  
**Risk Level**: Low (using IF NOT EXISTS for safety)  
**Estimated Time**: 5-10 minutes to implement and test
