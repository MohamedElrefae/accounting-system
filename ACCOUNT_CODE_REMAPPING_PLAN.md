# Account Code Remapping Plan

## Problem
- `transaction_lines_prepared.csv` contains `account_id` values that are legacy codes
- These legacy codes don't match the new mapped codes in Supabase `accounts` table
- This breaks the account mapping functionality

## Solution
Remap all account codes in `transaction_lines_prepared.csv` using the mapping from `accounts_rows.csv`

## Mapping Logic

### Source Files
1. **accounts_rows.csv** - Contains the mapping:
   - `legacy_code` = old account code (what's currently in transaction_lines_prepared)
   - `code` = new mapped code (what should be in transaction_lines_prepared)

2. **transaction_lines_prepared.csv** - Transaction data:
   - `account_id` column currently has legacy codes
   - Needs to be replaced with new mapped codes

### Mapping Process
```
For each row in transaction_lines_prepared.csv:
  1. Get account_id (legacy code)
  2. Look up in accounts_rows.csv mapping
  3. Replace with new code
  4. Write to output file
```

## Execution Steps

### Step 1: Run the remapping script
```powershell
python scripts/remap_transaction_account_codes.py
```

### Step 2: Review the output
- Script creates: `transaction_lines_prepared_remapped.csv`
- Shows statistics:
  - Total rows processed
  - Rows successfully remapped
  - Rows with unmapped codes (if any)
  - Empty account_id rows

### Step 3: Verify the mapping
Compare sample rows from both files to ensure correctness

### Step 4: Replace the original file
Once verified, replace the original with the remapped version:
```powershell
Copy-Item "C:\5\accounting-systemr5\data\prepared\transaction_lines_prepared_remapped.csv" `
          "C:\5\accounting-systemr5\data\prepared\transaction_lines_prepared.csv" -Force
```

## Example Mapping

| Legacy Code (old) | New Code (mapped) | Meaning |
|---|---|---|
| 13111 | 12113 | Customer deposits |
| 131 | 12101 | Cash |
| 221 | 22201 | Advance payments |
| 21 | 3000 | Equity |

## Expected Results
- All transaction line items will reference the correct new account codes
- Account mapping in Supabase will work correctly
- Reports and queries will match transactions to the right accounts

## Rollback Plan
If issues occur, keep the original `transaction_lines_prepared.csv` as backup
