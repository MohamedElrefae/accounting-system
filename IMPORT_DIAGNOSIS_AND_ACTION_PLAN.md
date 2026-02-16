# Transaction Lines Import - Diagnosis & Action Plan

## Verification Results Summary

### ❌ Critical Issues Found

| Issue | Expected | Actual | Status |
|-------|----------|--------|--------|
| **Total Lines** | 13,500-13,700 | **23,196** | ❌ 70% MORE than expected |
| **Balance** | Debits ≈ Credits | **16.96M difference** | ❌ UNBALANCED |
| **Transactions without lines** | 0 | **80** | ⚠️ Some transactions missing lines |
| **Duplicate line numbers** | 0 | **0** | ✅ No duplicates (good!) |

### ✅ Good News

- **No duplicate line_no**: The unique constraint is working correctly
- **Line numbers are sequential**: Range 1-874 is reasonable
- **Most transactions have lines**: 2,882 out of 2,962 (97%)

## Root Cause Analysis

The data shows **23,196 lines** instead of **13,516 expected**. This is **9,680 extra lines** (71.6% more).

### Most Likely Cause: Multiple Import Runs

The fix was applied, but the import was run multiple times:

1. **First run**: Parts 01-30 imported ~13,500 lines
2. **Second run**: Parts 01-30 imported another ~9,680 lines (some filtered out)

The line_no fix prevented duplicate key errors, but it allowed the same data to be imported multiple times with different line numbers.

### Why No Duplicates?

The new line_no calculation:
```sql
COALESCE(
    (SELECT MAX(line_no) FROM transaction_lines WHERE transaction_id = t.id),
    0
) + temp_lines.row_num as line_no
```

This means:
- First import: line_no = 1, 2, 3, 4...
- Second import: line_no = 5, 6, 7, 8... (continues from max)

So the same transaction got lines imported twice, but with different line numbers!

### Why Unbalanced?

The 16.96M imbalance suggests:
- Some files were run more times than others
- OR the filtering (zero amounts, invalid accounts) affected debits/credits differently

## Recommended Action: CLEAN SLATE

### Step 1: Delete All Transaction Lines

```sql
-- Delete all transaction lines for this organization
DELETE FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verify deletion
SELECT COUNT(*) FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Should return: 0
```

### Step 2: Re-Import All 30 Files (ONE TIME ONLY)

Run each file ONCE in Supabase SQL Editor, in order:

1. `import_transaction_lines_part_01.sql`
2. `import_transaction_lines_part_02.sql`
3. `import_transaction_lines_part_03.sql`
4. ... continue through ...
30. `import_transaction_lines_part_30.sql`

**IMPORTANT**: 
- Run each file ONLY ONCE
- Wait for each file to complete before running the next
- Do NOT re-run any file if it succeeds

### Step 3: Verify Final Import

After all 30 files complete, run this verification:

```sql
SELECT 
    COUNT(*) as total_lines,
    COUNT(DISTINCT transaction_id) as transactions_with_lines,
    SUM(debit_amount) as total_debits,
    SUM(credit_amount) as total_credits,
    ABS(SUM(debit_amount) - SUM(credit_amount)) as balance_diff,
    CASE 
        WHEN ABS(SUM(debit_amount) - SUM(credit_amount)) < 1.00
        THEN '✅ BALANCED' 
        ELSE '❌ UNBALANCED' 
    END as status
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

**Expected Results**:
- total_lines: 13,500-13,700
- transactions_with_lines: ~2,900-2,962
- balance_diff: < 1.00
- status: ✅ BALANCED

## Why This Happened

Timeline of events:

1. ✅ Part 01 ran successfully (old code, no line_no fix)
2. ❌ Part 02 failed with duplicate key error
3. ✅ Fix applied to all 30 files
4. ❓ **All 30 files were run again** (including Part 01)
5. Result: Data imported twice, with different line numbers

## Prevention for Future

To prevent this in the future:

1. **Always delete before re-importing**: If an import fails partway, delete all lines and start fresh
2. **Track which files completed**: Keep a checklist of which parts succeeded
3. **Use transactions**: Wrap imports in BEGIN/COMMIT blocks (though Supabase SQL Editor doesn't support this well)

## Current State

Your database has:
- ✅ 2,962 transactions (correct)
- ❌ 23,196 transaction lines (should be ~13,500)
- ❌ Unbalanced by 16.96M
- ⚠️ 80 transactions without lines (likely had only invalid lines)

## Next Steps

1. **Delete all transaction lines** (Step 1 above)
2. **Re-import all 30 files ONCE** (Step 2 above)
3. **Verify the results** (Step 3 above)
4. **Report back** with the verification results

## Expected Final State

After clean import:
- Transaction lines: 13,500-13,700
- Transactions with lines: ~2,900-2,962
- Transactions without lines: ~60-80 (those with only invalid data)
- Balance: ✅ BALANCED (difference < 1.00)
- Debits ≈ Credits: Both around 500M-600M (not 1B+)

## Files Ready

All 30 SQL files in `transaction_lines_split/` are fixed and ready:
- ✅ Column list includes `row_num`
- ✅ WHERE clause filters zero amounts
- ✅ WHERE clause filters invalid account_ids  
- ✅ line_no calculation handles existing lines
- ✅ No duplicate key errors will occur

Just need a clean, single-pass import.
