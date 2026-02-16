# Import Instructions - Ready to Execute

## ✅ All Files Generated and Ready

You've deleted the old data. Now import in this exact order:

---

## Step 1: Import Transactions (FIRST)

**File**: `import_transactions.sql`

Open this file in Supabase SQL Editor and run it.

**Expected Result**:
- 2,958 transactions imported
- Total debit: 905,925,674.84
- Total credit: 905,925,674.84
- Balance: 0.00

---

## Step 2: Import Transaction Lines (AFTER Transactions)

Run these 28 files in order in Supabase SQL Editor:

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

**Expected Result After All 28 Files**:
- 13,963 transaction lines imported
- Total debit: 905,925,674.84
- Total credit: 905,925,674.84
- Balance: 0.00

---

## Step 3: Verify Import

Run this SQL to verify everything is correct:

```sql
-- Check transactions
SELECT 
    'Transactions' as table_name,
    COUNT(*) as count,
    SUM(total_debit) as total_debit,
    SUM(total_credit) as total_credit,
    SUM(total_debit) - SUM(total_credit) as balance
FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 2,958 transactions, 905,925,674.84 debit/credit, 0.00 balance

-- Check transaction lines
SELECT 
    'Transaction Lines' as table_name,
    COUNT(*) as count,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 13,963 lines, 905,925,674.84 debit/credit, 0.00 balance

-- Check for orphaned lines (should be 0)
SELECT 
    COUNT(*) as orphaned_lines
FROM transaction_lines tl
LEFT JOIN transactions t ON tl.transaction_id = t.id
WHERE tl.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND t.id IS NULL;
-- Expected: 0 (no orphaned lines)
```

---

## Summary

**Files Ready**:
- ✅ `import_transactions.sql` - 2,958 transactions
- ✅ `transaction_lines_split/import_transaction_lines_part_01.sql` through `part_28.sql` - 13,963 lines

**Import Order**:
1. Transactions FIRST
2. Transaction Lines AFTER (all 28 files)
3. Verify totals

**Expected Final Result**:
- 2,958 transactions
- 13,963 transaction lines
- 905,925,674.84 balanced (debit = credit)
- All account IDs correctly mapped (21 account codes)

