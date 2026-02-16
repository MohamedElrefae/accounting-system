# ⚠️ IMMEDIATE ACTION REQUIRED - CLEANUP AND REIMPORT

## 🔍 PROBLEM IDENTIFIED

You have **old data** in the database:
- Current: 1,030 lines (unbalanced by -28,758)
- Expected after Part 01: 699 lines (balanced)

This means there's leftover data from previous import attempts.

## ✅ SOLUTION: Clean Up and Reimport

### Step 1: Diagnose Current State

Run this SQL in Supabase SQL Editor:

```sql
-- File: DIAGNOSE_AND_CLEANUP.sql (first 3 queries only)
```

This will show:
- How many lines currently exist
- If there are duplicates
- Dimension coverage

### Step 2: Clean Up Old Data

In the same file (`DIAGNOSE_AND_CLEANUP.sql`), uncomment the cleanup section:

```sql
DO $$
DECLARE
    v_deleted INTEGER;
BEGIN
    -- Delete transaction lines
    DELETE FROM transaction_lines tl
    USING transactions t
    WHERE tl.transaction_id = t.id
    AND t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'CLEANUP COMPLETE';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Deleted % transaction lines', v_deleted;
    RAISE NOTICE '';
    RAISE NOTICE 'You can now import the 20 SQL files';
    RAISE NOTICE '';
END $$;
```

Expected output:
```
CLEANUP COMPLETE
Deleted 1030 transaction lines
You can now import the 20 SQL files
```

### Step 3: Verify Cleanup

Run this query:
```sql
SELECT 
    COUNT(*) as remaining_lines
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

Expected result: `0` (zero lines)

### Step 4: Reimport All 20 Files

Now run all 20 files in order:

1. `import_transaction_lines_part_01.sql`
2. `import_transaction_lines_part_02.sql`
3. ... continue through ...
20. `import_transaction_lines_part_20.sql`

Each file will show:
```
PART 01/20 IMPORTED
Lines in this part: 699
Total lines so far: 699
```

After Part 01, you should see:
```
Total lines so far: 699
```

After Part 02, you should see:
```
Total lines so far: 1398
```

And so on...

### Step 5: Final Verification

After all 20 parts, run:
```sql
-- File: verify_all_imports.sql
```

Expected output:
```
FINAL IMPORT VERIFICATION
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

## 🎯 WHY THIS HAPPENED

The 1,030 lines you see are from a previous import attempt. The new Part 01 added 699 more lines on top of the existing data, but the verification query only counts lines from Part 01's transactions.

The cleanup removes ALL transaction lines for your organization, allowing you to start fresh with the correct data.

## 📋 QUICK CHECKLIST

- [ ] Run diagnostic queries (Step 1)
- [ ] Run cleanup (Step 2)
- [ ] Verify cleanup (Step 3)
- [ ] Import Part 01 (should show 699 lines)
- [ ] Import Parts 02-20
- [ ] Run final verification
- [ ] Check for "✅ ALL VERIFICATIONS PASSED"

## ⚠️ IMPORTANT NOTES

1. **Cleanup is safe**: It only deletes transaction_lines, not transactions
2. **Transactions remain**: Your 2,958 transactions are still there
3. **Dimensions remain**: All dimension tables (classifications, projects, etc.) are untouched
4. **Fresh start**: After cleanup, you'll have a clean slate for the correct import

---

**Status**: Action required - cleanup needed before reimport
**Files ready**: All 20 SQL files are correct and ready to use
