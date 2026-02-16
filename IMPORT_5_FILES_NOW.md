# Import Guide - 5 SQL Files (Clean Import)

## ✅ Files Generated Successfully

All files have been regenerated with comprehensive verification:
- **5 transaction_lines SQL files** (13,963 lines total)
- **1 transactions SQL file** (2,958 transactions)
- **All totals verified**: 905,925,674.84 balanced

---

## 📋 Import Steps

### Step 1: Clear Old Data (if needed)
```sql
DELETE FROM transaction_lines WHERE organization_id = 'd5789445-11e3-4ad6-9297-b56521675114';
DELETE FROM transactions WHERE organization_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

### Step 2: Import Transactions First
Run this file in Supabase SQL Editor:
```
import_transactions.sql
```
Expected result: 2,958 transactions inserted

### Step 3: Import Transaction Lines (in order)
Run these files **one by one** in Supabase SQL Editor:

1. `transaction_lines_split/import_transaction_lines_part_01.sql` (2,793 lines)
2. `transaction_lines_split/import_transaction_lines_part_02.sql` (2,793 lines)
3. `transaction_lines_split/import_transaction_lines_part_03.sql` (2,793 lines)
4. `transaction_lines_split/import_transaction_lines_part_04.sql` (2,793 lines)
5. `transaction_lines_split/import_transaction_lines_part_05.sql` (2,791 lines)

**Total expected**: 13,963 lines

### Step 4: Verify Import
```sql
-- Check transactions
SELECT 
  'Transactions' as table_name,
  COUNT(*) as count,
  SUM(total_debits) as total_debits,
  SUM(total_credits) as total_credits,
  SUM(total_debits) - SUM(total_credits) as balance
FROM transactions
WHERE organization_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Check transaction lines
SELECT 
  'Transaction Lines' as table_name,
  COUNT(*) as count,
  SUM(debit_amount) as total_debit,
  SUM(credit_amount) as total_credit,
  SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.organization_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

---

## ✅ Expected Results

| Table | Count | Total Debit | Total Credit | Balance |
|-------|-------|-------------|--------------|---------|
| Transactions | 2,958 | 905,925,674.84 | 905,925,674.84 | 0.00 |
| Transaction Lines | 13,963 | 905,925,674.84 | 905,925,674.84 | 0.00 |

---

## 🔍 What Was Fixed

1. **Reduced to 5 files** (from 28) to minimize errors
2. **Comprehensive verification** at every step:
   - CSV loading verification
   - Filtering verification (198 zero-amount rows removed)
   - Per-file verification (line count, debit, credit, balance)
   - Final verification (all totals must match)
3. **Script fails immediately** if any verification fails
4. **All column names corrected**:
   - `total_debits`, `total_credits` (plural)
   - `entry_number`, `entry_date`
   - `reference_number` populated with same value as `entry_number`

---

## 🚨 Important Notes

- Import files **one by one** in order
- Wait for each file to complete before running the next
- If you get any errors, STOP and report them
- Do NOT run files multiple times
- Each file should complete in 5-10 seconds

---

## 📊 File Breakdown

| File | Lines | Debit | Credit | Balance |
|------|-------|-------|--------|---------|
| Part 01 | 2,793 | 537,683,315.68 | 537,683,315.69 | -0.01 |
| Part 02 | 2,793 | 11,168,676.30 | 11,159,166.30 | 9,510.00 |
| Part 03 | 2,793 | 20,430,890.00 | 20,156,900.00 | 273,990.00 |
| Part 04 | 2,793 | 27,540,200.40 | 27,816,440.40 | -276,240.00 |
| Part 05 | 2,791 | 309,102,592.46 | 309,109,852.45 | -7,259.99 |
| **TOTAL** | **13,963** | **905,925,674.84** | **905,925,674.84** | **0.00** |

Note: Individual files may have small imbalances, but the total is perfectly balanced.
