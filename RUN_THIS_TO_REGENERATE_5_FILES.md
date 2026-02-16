# Regenerate SQL Files - 5 Parts Only

## Quick Command

Run this command in your terminal:

```bash
python regenerate_sql_files_5_parts.py
```

## What This Does

1. Reads `transaction_lines.csv` (14,161 rows)
2. Filters out invalid rows (198 zero-amount rows)
3. Generates **5 SQL files** instead of 28:
   - Part 01: ~2,793 lines
   - Part 02: ~2,793 lines
   - Part 03: ~2,793 lines
   - Part 04: ~2,793 lines
   - Part 05: ~2,791 lines
4. Verifies totals match expected values

## Expected Output

```
=== CSV LOADED ===
Total rows in CSV: 14,161
Total debit in CSV: 905,925,674.84
Total credit in CSV: 905,925,674.84

=== FILTERING INVALID ROWS ===
Rows with NULL account_id: 0
Rows with all-zeros UUID: 0
Rows with zero debit AND credit: 198

Total filtered out: 198 rows
Valid rows remaining: 13,963

=== GENERATING 5 SQL FILES ===
✓ Part 01: 2,793 lines | Debit: xxx | Credit: xxx
✓ Part 02: 2,793 lines | Debit: xxx | Credit: xxx
✓ Part 03: 2,793 lines | Debit: xxx | Credit: xxx
✓ Part 04: 2,793 lines | Debit: xxx | Credit: xxx
✓ Part 05: 2,791 lines | Debit: xxx | Credit: xxx

=== FINAL VERIFICATION ===
✅ Line count correct: 13,963
✅ Debit total correct: 905,925,674.84
✅ Credit total correct: 905,925,674.84
✅ Balanced: 0.00

✅ ALL VERIFICATIONS PASSED
```

## Files Generated

After running, you'll have these files in `transaction_lines_split/`:

1. `import_transaction_lines_part_01.sql`
2. `import_transaction_lines_part_02.sql`
3. `import_transaction_lines_part_03.sql`
4. `import_transaction_lines_part_04.sql`
5. `import_transaction_lines_part_05.sql`

## Import Order

After generation, import in this order:

1. **First**: `import_transactions.sql` (2,958 transactions)
2. **Then**: All 5 transaction_lines files in order (01 through 05)

## Verification After Import

```sql
-- Check transaction lines
SELECT 
    COUNT(*) as count,
    SUM(debit_amount) as total_debit,
    SUM(credit_amount) as total_credit,
    SUM(debit_amount) - SUM(credit_amount) as balance
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 13,963 | 905,925,674.84 | 905,925,674.84 | 0.00
```

## If You See Errors

The script will stop and show exactly what's wrong:
- ❌ Line count mismatch
- ❌ Debit total mismatch
- ❌ Credit total mismatch
- ❌ Unbalanced totals

All checks must pass (✅) before files are generated.

---

**Ready to run**: `python regenerate_sql_files_5_parts.py`
