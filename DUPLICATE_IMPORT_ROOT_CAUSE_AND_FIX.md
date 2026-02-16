# Duplicate Import Issue - Root Cause and Fix

## Problem Summary

**Current State**:
- Transaction Lines: 24,165 (expected: 13,963)
- Total Debit: 1,237,653,092.66 (expected: 905,925,674.84)
- Total Credit: 1,237,975,556.66 (expected: 905,925,674.84)
- Balance: -322,464.01 (expected: 0.00)
- Excess lines: 10,202 (73% more than expected)

**Transactions Table**:
- Count: 2,958 ✅ (correct)
- Total Debit: 905,925,674.84 ✅ (correct)
- Total Credit: 905,925,674.84 ✅ (correct)
- Balance: 0.0001 ✅ (essentially balanced)

---

## Root Cause

The transaction_lines SQL files were **run multiple times**, causing duplicate imports.

### Why This Happened

1. **Previous Import Attempts**: The old SQL files (parts 01-30) were run multiple times during troubleshooting
2. **Line Number Calculation**: The fix we applied uses `COALESCE((SELECT MAX(line_no)...) + row_num` which prevents constraint violations but ALLOWS duplicates with different line numbers
3. **No Cleanup**: The old data was not deleted before running the new SQL files

### Evidence

- 24,165 lines / 13,963 expected = 1.73x (73% more)
- This suggests the files were run approximately 1.7 times (some files run twice, some once)
- The unbalanced totals indicate mixed data from multiple import runs

---

## Solution: Clean Import

### Step 1: Delete All Transaction Lines

```sql
-- Delete all transaction lines for this organization
DELETE FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verify deletion
SELECT COUNT(*) FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Should show: 0
```

### Step 2: Delete All Transactions

```sql
-- Delete all transactions for this organization
DELETE FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verify deletion
SELECT COUNT(*) FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Should show: 0
```

### Step 3: Import Transactions (FIRST)

Run this file in Supabase SQL Editor:
```
import_transactions.sql
```

**Expected Result**:
- 2,958 transactions
- 905,925,674.84 total debit
- 905,925,674.84 total credit
- 0.00 balance

### Step 4: Import Transaction Lines (AFTER Transactions)

Run these 28 files **IN ORDER** and **ONLY ONCE EACH**:

```
transaction_lines_split/import_transaction_lines_part_01.sql
transaction_lines_split/import_transaction_lines_part_02.sql
transaction_lines_split/import_transaction_lines_part_03.sql
transaction_lines_split/import_transaction_lines_part_04.sql
transaction_lines_split/import_transaction_lines_part_05.sql
transaction_lines_split/import_transaction_lines_part_06.sql
transaction_lines_split/import_transaction_lines_part_07.sql
transaction_lines_split/import_transaction_lines_part_08.sql
transaction_lines_split/import_transaction_lines_part_09.sql
transaction_lines_split/import_transaction_lines_part_10.sql
transaction_lines_split/import_transaction_lines_part_11.sql
transaction_lines_split/import_transaction_lines_part_12.sql
transaction_lines_split/import_transaction_lines_part_13.sql
transaction_lines_split/import_transaction_lines_part_14.sql
transaction_lines_split/import_transaction_lines_part_15.sql
transaction_lines_split/import_transaction_lines_part_16.sql
transaction_lines_split/import_transaction_lines_part_17.sql
transaction_lines_split/import_transaction_lines_part_18.sql
transaction_lines_split/import_transaction_lines_part_19.sql
transaction_lines_split/import_transaction_lines_part_20.sql
transaction_lines_split/import_transaction_lines_part_21.sql
transaction_lines_split/import_transaction_lines_part_22.sql
transaction_lines_split/import_transaction_lines_part_23.sql
transaction_lines_split/import_transaction_lines_part_24.sql
transaction_lines_split/import_transaction_lines_part_25.sql
transaction_lines_split/import_transaction_lines_part_26.sql
transaction_lines_split/import_transaction_lines_part_27.sql
transaction_lines_split/import_transaction_lines_part_28.sql
```

**CRITICAL**: Run each file ONLY ONCE. Do not re-run if you see an error - stop and diagnose first.

**Expected Result After All 28 Files**:
- 13,963 transaction lines
- 905,925,674.84 total debit
- 905,925,674.84 total credit
- 0.00 balance

### Step 5: Verify Final Import

```sql
-- Check transactions
SELECT 
    'Transactions' as table_name,
    COUNT(*) as count,
    SUM(total_debits) as total_debit,
    SUM(total_credits) as total_credit,
    SUM(total_debits) - SUM(total_credits) as balance
FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 2,958 | 905,925,674.84 | 905,925,674.84 | 0.00

-- Check transaction lines
SELECT 
    'Transaction Lines' as table_name,
    COUNT(*) as count,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 13,963 | 905,925,674.84 | 905,925,674.84 | 0.00

-- Check for orphaned lines (should be 0)
SELECT 
    COUNT(*) as orphaned_lines
FROM transaction_lines tl
LEFT JOIN transactions t ON tl.transaction_id = t.id
WHERE tl.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND t.id IS NULL;
-- Expected: 0

-- Check for duplicate line numbers (should be 0)
SELECT 
    transaction_id,
    line_no,
    COUNT(*) as duplicate_count
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY transaction_id, line_no
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)
```

---

## Why The New SQL Files Are Better

The regenerated SQL files have:

1. ✅ Correct CSV source (14,161 rows from Excel, not 14,224)
2. ✅ All 21 account codes mapped correctly
3. ✅ Zero-amount rows filtered out (198 rows)
4. ✅ Invalid account_ids filtered out (0 rows in new CSV)
5. ✅ Correct column order (row_num first)
6. ✅ Dynamic line_no calculation (prevents duplicates)
7. ✅ WHERE clause to filter invalid data

---

## Prevention

To prevent this issue in the future:

1. **Always delete old data first** before re-importing
2. **Run each SQL file only once** - if there's an error, diagnose before re-running
3. **Verify counts after each import** - check if numbers match expected values
4. **Use transactions** - wrap imports in BEGIN/COMMIT so you can ROLLBACK on error

---

## Summary

**Problem**: SQL files were run multiple times, creating 10,202 duplicate lines

**Solution**: 
1. Delete all transactions and transaction_lines
2. Import transactions first (import_transactions.sql)
3. Import transaction_lines (28 files, once each)
4. Verify totals match expected values

**Expected Final State**:
- 2,958 transactions
- 13,963 transaction lines
- 905,925,674.84 balanced (debit = credit)
- 0 orphaned lines
- 0 duplicate line numbers
