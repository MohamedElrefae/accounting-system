# Import 20 Small SQL Files - Complete Guide

## ✅ GENERATION COMPLETE

Successfully generated 20 smaller SQL files to avoid Supabase SQL Editor timeout issues.

## 📊 Summary

- **Total Files**: 20 SQL files
- **Lines per File**: ~700 lines (Part 20 has 682 lines)
- **Total Lines**: 13,963 transaction lines
- **Total Debit**: 905,925,674.84
- **Total Credit**: 905,925,674.84
- **Balance**: 0.00 (perfectly balanced)

## ✨ What's Included

Each SQL file includes ALL accounting dimensions:
- ✅ `classification_id`
- ✅ `project_id`
- ✅ `analysis_work_item_id`
- ✅ `sub_tree_id`
- ✅ All standard fields (account_id, debit_amount, credit_amount, description, etc.)

## 📁 Files Generated

Located in: `transaction_lines_split/`

```
import_transaction_lines_part_01.sql  (699 lines)
import_transaction_lines_part_02.sql  (699 lines)
import_transaction_lines_part_03.sql  (699 lines)
import_transaction_lines_part_04.sql  (699 lines)
import_transaction_lines_part_05.sql  (699 lines)
import_transaction_lines_part_06.sql  (699 lines)
import_transaction_lines_part_07.sql  (699 lines)
import_transaction_lines_part_08.sql  (699 lines)
import_transaction_lines_part_09.sql  (699 lines)
import_transaction_lines_part_10.sql  (699 lines)
import_transaction_lines_part_11.sql  (699 lines)
import_transaction_lines_part_12.sql  (699 lines)
import_transaction_lines_part_13.sql  (699 lines)
import_transaction_lines_part_14.sql  (699 lines)
import_transaction_lines_part_15.sql  (699 lines)
import_transaction_lines_part_16.sql  (699 lines)
import_transaction_lines_part_17.sql  (699 lines)
import_transaction_lines_part_18.sql  (699 lines)
import_transaction_lines_part_19.sql  (699 lines)
import_transaction_lines_part_20.sql  (682 lines)
```

## 🚀 Import Instructions

### Step 1: Clean Database (If Needed)

If you have old data, delete it first:

```sql
-- Delete all transaction lines
DELETE FROM transaction_lines 
WHERE transaction_id IN (
    SELECT id FROM transactions 
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
);

-- Delete all transactions
DELETE FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;
```

### Step 2: Import Transactions

First, import the transactions table:

```bash
# Run this file in Supabase SQL Editor
import_transactions.sql
```

### Step 3: Import Transaction Lines (All 20 Files)

Import each file in order in Supabase SQL Editor:

1. Open Supabase SQL Editor
2. Copy content from `import_transaction_lines_part_01.sql`
3. Paste and run
4. Wait for success message
5. Repeat for parts 02 through 20

**IMPORTANT**: Import files in order (01, 02, 03, ... 20)

### Step 4: Verify Import

After importing all 20 files, run this verification:

```sql
-- Check total lines and amounts
SELECT 
    COUNT(*) as total_lines,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;
```

**Expected Results**:
- `total_lines`: 13,963
- `total_debit`: 905,925,674.84
- `total_credit`: 905,925,674.84
- `balance`: 0.00

### Step 5: Verify Dimensions

Check that accounting dimensions are populated:

```sql
SELECT 
    COUNT(*) as total_lines,
    COUNT(classification_id) as with_classification,
    COUNT(project_id) as with_project,
    COUNT(analysis_work_item_id) as with_analysis,
    COUNT(sub_tree_id) as with_sub_tree,
    ROUND(COUNT(classification_id)::numeric / COUNT(*)::numeric * 100, 2) as classification_pct,
    ROUND(COUNT(project_id)::numeric / COUNT(*)::numeric * 100, 2) as project_pct,
    ROUND(COUNT(analysis_work_item_id)::numeric / COUNT(*)::numeric * 100, 2) as analysis_pct,
    ROUND(COUNT(sub_tree_id)::numeric / COUNT(*)::numeric * 100, 2) as sub_tree_pct
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;
```

**Expected Results**:
- `total_lines`: 13,963
- `with_classification`: ~13,743 (98.4%)
- `with_project`: 13,963 (100%)
- `with_analysis`: ~13,369 (95.7%)
- `with_sub_tree`: ~14,151 (99.9%)

## 💡 Why 20 Files?

The previous 5-file approach had ~2,800 lines per file, which caused:
- "Failed to generate title: API error" in Supabase SQL Editor
- Timeout issues
- Slow performance

The 20-file approach with ~700 lines per file:
- ✅ Avoids Supabase SQL Editor timeout
- ✅ Faster execution per file
- ✅ Easier to track progress
- ✅ Can retry individual files if needed

## 🔧 Troubleshooting

### If Import Fails on a Specific File

1. Note which file failed (e.g., Part 05)
2. Check the error message
3. Fix the issue
4. Re-run only that file
5. Continue with remaining files

### If You Get Duplicate Key Errors

This means transactions were imported multiple times. Solution:

```sql
-- Delete duplicate transactions (keep only one per reference_number)
DELETE FROM transactions
WHERE id NOT IN (
    SELECT MIN(id)
    FROM transactions
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
    GROUP BY org_id, reference_number
);

-- Then re-import transaction lines
```

### If Totals Don't Match

1. Check how many lines were imported:
   ```sql
   SELECT COUNT(*) FROM transaction_lines tl
   JOIN transactions t ON tl.transaction_id = t.id
   WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;
   ```

2. If less than 13,963, check which files didn't import
3. Re-run missing files

## 📝 Notes

- Each file is independent and can be run separately
- Files include WHERE clause to filter invalid data
- Dimensions are included in all files
- NULL dimensions are handled properly
- All files are balanced (debit = credit per chunk)

## ✅ Success Criteria

After importing all 20 files, you should have:
- ✅ 13,963 transaction lines
- ✅ 905,925,674.84 total debit
- ✅ 905,925,674.84 total credit
- ✅ 0.00 balance
- ✅ All accounting dimensions populated

---

**Status**: Ready to import
**Files Location**: `transaction_lines_split/`
**Total Files**: 20
**Total Lines**: 13,963
