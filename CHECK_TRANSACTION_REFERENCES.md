# Transaction Lines Import - Diagnostic Check

## Issue
The import SQL ran successfully but imported 0 lines. This means the JOIN couldn't find matching transactions.

## Root Cause
The `reference_number` values in the temp table ('1', '2', '3', etc.) don't match the actual `reference_number` values in the `transactions` table.

## Solution

Run this query in Supabase to see what transaction reference numbers actually exist:

```sql
SELECT 
    reference_number,
    transaction_date,
    description,
    id
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY reference_number
LIMIT 20;
```

This will show you the actual reference numbers that were imported from the transactions CSV.

## Next Steps

Once you see the actual reference numbers, you have two options:

### Option 1: Update the CSV file
Update the `transaction_lines.csv` file so the transaction reference column matches the actual reference numbers from the transactions table.

### Option 2: Use transaction IDs directly
If the transaction reference numbers are UUIDs or don't match, we can modify the import script to join on transaction_date + description or use a mapping table.

## Current Status
✅ All SQL syntax is correct
✅ All type castings are working
✅ NULLIF handling for empty UUIDs is working
❌ Transaction reference numbers don't match between transactions and transaction_lines

The import files are technically ready - they just need the correct transaction reference values.
