# Root Cause: Duplicate Transactions

## What Happened

You imported Part 01 and got 4,107 lines instead of 2,793. This is because:

1. **`import_transactions.sql` was run MULTIPLE TIMES**
2. This created DUPLICATE transaction records with the same `reference_number`
3. When `import_transaction_lines_part_01.sql` runs, it JOINs on `reference_number`:
   ```sql
   JOIN transactions t ON t.reference_number = temp_lines.txn_ref
   ```
4. If there are 2 transactions with `reference_number='1'`, it creates lines for BOTH
5. Result: ~1.47x more lines than expected (4,107 / 2,793 = 1.47)

## Why This Happened

The `import_transactions.sql` file does NOT have a conflict resolution clause. It should have:
```sql
ON CONFLICT (organization_id, reference_number) DO NOTHING
```

But it doesn't, so running it multiple times creates duplicates.

## Solution

### Option 1: Clean Up and Re-import (RECOMMENDED)

1. **Delete all data**:
   ```sql
   DELETE FROM transaction_lines 
   WHERE transaction_id IN (
       SELECT id FROM transactions 
       WHERE organization_id = 'd5789445-11e3-4ad6-9297-b56521675114'
   );
   
   DELETE FROM transactions 
   WHERE organization_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   ```

2. **Import transactions ONCE**:
   - Run `import_transactions.sql` (ONLY ONCE)
   - Verify: Should have 2,958 transactions

3. **Import transaction lines in order**:
   - Run Part 01 through Part 05 (one by one)
   - Verify: Should have 13,963 lines

### Option 2: Remove Duplicates (If you want to keep existing data)

1. **Run diagnostic**:
   ```sql
   -- See DIAGNOSE_DUPLICATE_LINES_ISSUE.sql
   ```

2. **Remove duplicates**:
   ```sql
   -- See FIX_DUPLICATE_TRANSACTIONS.sql
   ```

## Prevention

I will regenerate `import_transactions.sql` with proper conflict handling:
```sql
INSERT INTO transactions (...)
VALUES (...)
ON CONFLICT (organization_id, reference_number) DO NOTHING;
```

This ensures running it multiple times won't create duplicates.

## Expected Results After Fix

| Table | Count | Total Debit | Total Credit | Balance |
|-------|-------|-------------|--------------|---------|
| Transactions | 2,958 | 905,925,674.84 | 905,925,674.84 | 0.00 |
| Transaction Lines | 13,963 | 905,925,674.84 | 905,925,674.84 | 0.00 |

## Action Required

1. Run `DIAGNOSE_DUPLICATE_LINES_ISSUE.sql` to confirm duplicates
2. Choose Option 1 (clean re-import) or Option 2 (remove duplicates)
3. I will regenerate `import_transactions.sql` with conflict handling
