# Migration Execution Steps - Complete Guide

## ✅ All Code Changes Applied

The following fixes have been implemented:
- ✅ Transaction grouping logic (groups 14,224 rows into 2,164 unique transactions)
- ✅ Column mapping updated (includes description column)
- ✅ Context-aware column mapping (entry_no vs entry_number)

---

## Step 1: Disable RLS in Supabase

Open Supabase SQL Editor and run:

```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines DISABLE ROW LEVEL SECURITY;
```

---

## Step 2: Clear Old Data (Optional - if retrying)

```sql
DELETE FROM transaction_lines;
DELETE FROM transactions;
```

---

## Step 3: Run Migration Command

Open PowerShell in your project directory and run:

```powershell
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

**What this does:**
- Validates Excel data
- Creates backup of existing data
- Groups 14,224 Excel rows into 2,164 unique transactions
- Inserts 2,164 transactions
- Inserts 14,224 transaction lines
- Generates migration report

**Expected output:**
```
Transactions: 2,164/2,164 succeeded
Transaction lines: 14,224/14,224 succeeded
Success rate: 100.0%
```

---

## Step 4: Re-enable RLS in Supabase

```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
```

---

## Step 5: Verify Results

Run these queries in Supabase SQL Editor:

```sql
-- Check transaction count (should be 2,164)
SELECT COUNT(*) as transaction_count FROM transactions 
WHERE org_id = '731a3a00-6fa6-4282-9bec-8b5a8678e127';

-- Check transaction lines count (should be 14,224)
SELECT COUNT(*) as line_count FROM transaction_lines 
WHERE org_id = '731a3a00-6fa6-4282-9bec-8b5a8678e127';

-- Sample transaction with lines
SELECT t.id, t.entry_number, t.entry_date, t.description, COUNT(tl.id) as line_count
FROM transactions t
LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.org_id = '731a3a00-6fa6-4282-9bec-8b5a8678e127'
GROUP BY t.id, t.entry_number, t.entry_date, t.description
LIMIT 5;
```

---

## Troubleshooting

### If migration fails with "description is null"
- Verify Excel file has a `description` column
- Check that all rows have a value in the description column

### If migration fails with RLS error
- Make sure you disabled RLS in Step 1
- Verify the org_id is correct: `731a3a00-6fa6-4282-9bec-8b5a8678e127`

### If transaction count is wrong
- Check the migration report in `reports/migration_report.md`
- Verify Excel data has correct entry_no and entry_date values

---

## Files Modified

- `migrate.py` - Added transaction grouping logic
- `config/column_mapping_APPROVED.csv` - Updated column mappings
- `src/executor/migration_executor.py` - Context-aware column mapping

---

## Status: ✅ READY TO EXECUTE

All code changes are complete and verified. Follow the steps above to execute the migration.

