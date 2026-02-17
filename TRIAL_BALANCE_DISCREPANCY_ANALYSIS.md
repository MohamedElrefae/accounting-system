# Trial Balance Discrepancy Analysis

## Problem Statement

After data migration, there is a discrepancy between:
- **Verified Import Data**: 905,925,674.84 (both debit and credit)
- **Trial Balance Reports**: 204,937,398.11 (both debit and credit)

**Difference**: 700,988,276.73 (77.4% of data is missing from reports!)

## Root Cause Analysis

### Possible Causes

1. **Posted vs Draft Transactions**
   - The import may have created transactions with `is_posted = false`
   - Trial balance might be filtering to show only posted transactions
   - This is the MOST LIKELY cause

2. **Date Range Filtering**
   - Trial balance reports may have date filters applied
   - Some transactions might be outside the selected date range

3. **Organization/Project Filtering**
   - Transactions might belong to different organizations
   - Current scope might be filtering out some data

4. **Account Filtering**
   - Some transaction lines might have `account_id = NULL`
   - These would be excluded from the GL summary function

5. **Duplicate Detection**
   - System might be deduplicating transactions
   - Check if there are duplicate reference numbers

## Diagnostic Steps

Run the diagnostic SQL to identify the issue:

```bash
# In Supabase SQL Editor, run:
sql/diagnose_trial_balance_discrepancy.sql
```

This will show:
1. Raw transaction_lines totals (what was imported)
2. Transaction lines with transaction join (what function uses)
3. Posted transactions only
4. GL summary function results
5. Transaction status distribution
6. Missing data analysis

## Expected Findings

Based on the 77.4% discrepancy, the most likely scenario is:

```
Total Imported: 905,925,674.84
Posted Only:    204,937,398.11 (22.6%)
Draft:          700,988,276.73 (77.4%)
```

This suggests that **77.4% of transactions are in draft status**.

## Solutions

### Solution 1: Update Transaction Status (Recommended)

If all imported transactions should be posted:

```sql
-- Update all transactions to posted status
UPDATE transactions 
SET is_posted = true
WHERE is_posted = false OR is_posted IS NULL;

-- Verify the update
SELECT 
  is_posted,
  COUNT(*) as count,
  SUM(total_amount) as total_amount
FROM transactions
GROUP BY is_posted;
```

### Solution 2: Change Report Filter

If you want to see all transactions (including drafts):

1. In Trial Balance report, toggle the "Posted Only" filter to OFF
2. In Trial Balance All Levels, set `postedOnly` to `false`

### Solution 3: Selective Posting

If you want to review and post transactions selectively:

```sql
-- Post transactions by date range
UPDATE transactions 
SET is_posted = true
WHERE entry_date BETWEEN '2024-01-01' AND '2024-12-31'
  AND (is_posted = false OR is_posted IS NULL);

-- Post transactions by reference pattern
UPDATE transactions 
SET is_posted = true
WHERE reference_number LIKE 'IMP-%'
  AND (is_posted = false OR is_posted IS NULL);
```

## Adding Totals to Reports

You asked about adding total debit and credit to the current final balance. Here's the recommendation:

### Current Report Structure
```
Account Name    | Debit Balance | Credit Balance
----------------|---------------|---------------
Account 1       | 1,000         | 0
Account 2       | 0             | 500
----------------|---------------|---------------
Total           | 1,000         | 500
```

### Recommended Enhanced Structure
```
Account Name    | Opening | Period Debit | Period Credit | Closing Debit | Closing Credit
----------------|---------|--------------|---------------|---------------|---------------
Account 1       | 0       | 1,500        | 500           | 1,000         | 0
Account 2       | 0       | 200          | 700           | 0             | 500
----------------|---------|--------------|---------------|---------------|---------------
Total           | 0       | 1,700        | 1,200         | 1,000         | 500
```

This shows:
- **Opening Balance**: Balance at start of period
- **Period Debit**: Total debits during period
- **Period Credit**: Total credits during period  
- **Closing Debit**: Final debit balance
- **Closing Credit**: Final credit balance

### Implementation

The data is already available in the `get_gl_account_summary_filtered` function:
- `opening_debit` and `opening_credit`
- `period_debits` and `period_credits`
- `closing_debit` and `closing_credit`

To add this to the reports:

1. **Trial Balance Original** (`src/pages/Reports/TrialBalanceOriginal.tsx`):
   - Currently shows only `closing_debit` and `closing_credit`
   - Can add columns for `period_debits` and `period_credits`

2. **Trial Balance All Levels** (`src/pages/Reports/TrialBalanceAllLevels.tsx`):
   - Already has all the data in the `amounts` object
   - Just needs UI columns added

## Verification Query

After applying the fix, verify the totals match:

```sql
-- This should show 905,925,674.84 for both debit and credit
SELECT 
  SUM(closing_debit) as total_debit,
  SUM(closing_credit) as total_credit,
  SUM(closing_debit) - SUM(closing_credit) as difference
FROM get_gl_account_summary_filtered(
  p_date_from := NULL,
  p_date_to := NULL,
  p_org_id := NULL,
  p_project_id := NULL,
  p_posted_only := false  -- Set to false to include all transactions
);
```

## Next Steps

1. **Run Diagnostic**: Execute `sql/diagnose_trial_balance_discrepancy.sql`
2. **Identify Root Cause**: Review the diagnostic results
3. **Apply Fix**: Based on findings, apply appropriate solution
4. **Verify**: Confirm totals match expected values
5. **Enhance Reports**: Add period debit/credit columns if desired

## Questions to Answer

1. Should all imported transactions be posted? (Yes/No)
2. Do you want to see draft transactions in reports? (Yes/No)
3. Do you want to add period debit/credit columns to reports? (Yes/No)
4. Are there specific date ranges or filters applied in the reports?

Please run the diagnostic SQL and share the results so we can confirm the root cause and apply the correct fix.
