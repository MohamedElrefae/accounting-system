# 📋 STEP-BY-STEP FIX GUIDE

## 🎯 GOAL
Fix duplicate transactions and successfully import 13,963 transaction lines with dimensions.

---

## STEP 1: Fix Duplicate Transactions

### Action
Open Supabase SQL Editor and run: **`FIX_DUPLICATE_TRANSACTIONS_FINAL.sql`**

### What You'll See

**First Query** - Shows sample duplicates:
```
| issue                  | reference_number | duplicate_count | transaction_ids                    |
|------------------------|------------------|-----------------|-------------------------------------|
| Duplicate Transactions | 10               | 2               | {uuid1, uuid2}                     |
| Duplicate Transactions | 12               | 2               | {uuid3, uuid4}                     |
| Duplicate Transactions | 14               | 2               | {uuid5, uuid6}                     |
...
```

**Second Query** - Deletes duplicates:
```
=========================================
DUPLICATE TRANSACTIONS CLEANUP
=========================================
Deleted duplicate transactions: 797
Kept unique transactions: 2,161

Now you can import transaction_lines
```

**Third Query** - Verifies cleanup:
```
| status        | total_transactions | unique_references | remaining_duplicates |
|---------------|-------------------|-------------------|---------------------|
| After Cleanup | 2,161             | 2,161             | 0                   |
```

### ✅ Success Criteria
- Deleted: 797 transactions
- Kept: 2,161 transactions
- Remaining duplicates: 0

---

## STEP 2: Delete All Transaction Lines

### Action
Run this SQL:

```sql
-- Delete all transaction lines
DELETE FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verify deletion
SELECT COUNT(*) as remaining_lines 
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

### What You'll See
```
| remaining_lines |
|----------------|
| 0              |
```

### ✅ Success Criteria
- Remaining lines: 0

---

## STEP 3: Import Transaction Lines (Part 01)

### Action
Run: **`transaction_lines_split/import_transaction_lines_part_01.sql`**

### What You'll See

**Progress Message**:
```
=========================================
PART 1/20 IMPORTED
=========================================
Lines in this part: 699
Total lines so far: 699
```

### ✅ Success Criteria
- Lines in this part: **699** (NOT 1,030!)
- Total lines so far: 699

### ❌ If You See 1,030 Lines
**STOP!** This means duplicates still exist. Go back to Step 1.

---

## STEP 4: Import Remaining Parts (02-20)

### Action
Run each file in order:
- `import_transaction_lines_part_02.sql`
- `import_transaction_lines_part_03.sql`
- ... (continue through)
- `import_transaction_lines_part_20.sql`

### What You'll See (Example Part 02)
```
=========================================
PART 2/20 IMPORTED
=========================================
Lines in this part: 699
Total lines so far: 1,398
```

### Progress Tracking
| Part | Lines in Part | Total So Far |
|------|--------------|--------------|
| 01   | 699          | 699          |
| 02   | 699          | 1,398        |
| 03   | 699          | 2,097        |
| 04   | 699          | 2,796        |
| 05   | 699          | 3,495        |
| ...  | ...          | ...          |
| 20   | 682          | 13,963       |

---

## STEP 5: Final Verification

### Action
Run: **`transaction_lines_split/verify_all_imports.sql`**

### What You'll See
```
=========================================
FINAL IMPORT VERIFICATION
=========================================
Total lines: 13963
Total debit: 905925674.84
Total credit: 905925674.84
Balance: 0.00

Dimension Coverage:
  Classification: 13743 (98.4%)
  Project: 13963 (100.0%)
  Analysis: 13369 (95.7%)
  Sub-tree: 13963 (100.0%)

✅ ALL VERIFICATIONS PASSED
```

### ✅ Success Criteria
- Total lines: 13,963
- Balance: 0.00
- All verifications passed

---

## 🔍 TROUBLESHOOTING

### Problem: Part 01 shows 1,030 lines instead of 699

**Cause**: Duplicate transactions still exist

**Solution**: 
1. Delete all transaction_lines again
2. Re-run `FIX_DUPLICATE_TRANSACTIONS_FINAL.sql`
3. Verify you see "Deleted: 797, Kept: 2,161"
4. Start over from Part 01

### Problem: Balance is not 0.00

**Cause**: Some parts were skipped or run multiple times

**Solution**:
1. Delete all transaction_lines
2. Check transactions count (should be 2,161)
3. Import all 20 parts again in order
4. Don't skip any parts

### Problem: Dimension coverage is 0%

**Cause**: Dimension tables are empty or codes don't match

**Solution**:
1. Check dimension tables have data:
   ```sql
   SELECT COUNT(*) FROM transaction_classifications WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   SELECT COUNT(*) FROM projects WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   SELECT COUNT(*) FROM analysis_work_items WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   SELECT COUNT(*) FROM sub_tree WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   ```
2. If counts are 0, you need to populate dimension tables first

---

## 📊 EXPECTED TIMELINE

- Step 1 (Fix duplicates): 1 minute
- Step 2 (Delete lines): 10 seconds
- Step 3 (Part 01): 30 seconds
- Step 4 (Parts 02-20): 10-15 minutes (30-45 seconds per file)
- Step 5 (Verification): 10 seconds

**Total time**: ~15-20 minutes

---

## 🎉 SUCCESS!

When you see "✅ ALL VERIFICATIONS PASSED", your import is complete!

You now have:
- 13,963 transaction lines
- All 4 dimensions properly mapped
- Perfectly balanced transactions
- Ready to use in your app

---

**Created**: 2026-02-16
**Status**: Ready to execute
**Next**: Run Step 1 - `FIX_DUPLICATE_TRANSACTIONS_FINAL.sql`
