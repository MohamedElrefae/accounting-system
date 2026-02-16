# Clean Import Action Plan

## Current Status

✅ **Part 30 syntax error FIXED**
- Removed 63 invalid rows (387-449) with zero amounts and invalid account IDs
- Fixed duplicate closing sections
- File now has correct structure with `row_num` column and WHERE clause

## Problem Summary

The database currently has **23,196 lines** instead of the expected **14,161 lines** because:
1. SQL files were run multiple times
2. The line_no fix prevented constraint violations but allowed duplicate imports to stack
3. Each re-run added more lines with different line numbers

## Solution: Clean Import

### Step 1: Verify Current State (BEFORE deletion)

Run `VERIFY_BEFORE_IMPORT.sql` to document current state:

```sql
-- This will show:
-- - Current line count (should be 23,196)
-- - Current balance totals (will be inflated)
-- - Transactions count (should be 2,962)
-- - Duplicate line numbers (should be 0)
-- - Transactions with/without lines
```

### Step 2: Delete All Transaction Lines

```sql
-- Delete all existing transaction lines for this organization
DELETE FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verify deletion
SELECT COUNT(*) FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Should return: 0
```

### Step 3: Import All 30 Files in Sequence

Run each file ONCE in order:

```
1. import_transaction_lines_part_01.sql
2. import_transaction_lines_part_02.sql
3. import_transaction_lines_part_03.sql
...
30. import_transaction_lines_part_30.sql (NOW FIXED)
```

**IMPORTANT**: 
- Run each file only ONCE
- Wait for each file to complete before running the next
- Do NOT re-run any file if it succeeds

### Step 4: Verify Import Results

Run `VERIFY_IMPORT_COMPLETE.sql`:

```sql
-- 1. Check total lines imported
SELECT COUNT(*) as total_lines
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: ~14,161 lines

-- 2. Check balance totals
SELECT 
    SUM(debit_amount) as total_debits,
    SUM(credit_amount) as total_credits,
    SUM(debit_amount) - SUM(credit_amount) as difference
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: Both should sum to ~905,925,674.8 (balanced)

-- 3. Check transactions coverage
SELECT 
    COUNT(DISTINCT transaction_id) as transactions_with_lines
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 2,962 transactions

-- 4. Check for any transactions without lines
SELECT COUNT(*) as transactions_without_lines
FROM transactions t
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
AND NOT EXISTS (
    SELECT 1 FROM transaction_lines tl 
    WHERE tl.transaction_id = t.id
);
-- Expected: 0 (all transactions should have lines)

-- 5. Check for duplicate line numbers
SELECT 
    transaction_id, 
    line_no, 
    COUNT(*) as duplicate_count
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY transaction_id, line_no
HAVING COUNT(*) > 1;
-- Expected: No rows (no duplicates)
```

## Expected Results

| Metric | Expected Value | Notes |
|--------|---------------|-------|
| Total Lines | ~14,161 | Exact count from Excel source |
| Total Debits | 905,925,674.8 | Should match Excel |
| Total Credits | 905,925,674.8 | Should match Excel |
| Balance Difference | 0 | Perfectly balanced |
| Transactions with Lines | 2,962 | All transactions |
| Transactions without Lines | 0 | None |
| Duplicate Line Numbers | 0 | None |

## Files Ready for Import

All 30 files are now ready:
- ✅ Part 01-29: Already had correct structure
- ✅ Part 30: **NOW FIXED** (syntax error resolved)

## What Was Fixed in Part 30

1. **Removed invalid data**: 63 rows (387-449) with:
   - `txn_ref = '0'` (invalid transaction reference)
   - `account_id = '00000000-0000-0000-0000-000000000000'` (invalid account)
   - Both debit and credit = 0.00 (zero amounts)

2. **Fixed duplicate closing sections**:
   - Removed first closing with OLD column list (missing `row_num`)
   - Kept correct closing with NEW column list (including `row_num`)

3. **Added WHERE clause** to filter any remaining invalid data:
   ```sql
   WHERE NOT (temp_lines.debit_amount = 0 AND temp_lines.credit_amount = 0)
     AND temp_lines.account_id IS NOT NULL
     AND temp_lines.account_id != '00000000-0000-0000-0000-000000000000'
   ```

## Next Action

**Run `VERIFY_BEFORE_IMPORT.sql` first** to document the current state, then proceed with the clean import.
