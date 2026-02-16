# Migration Testing Action Guide

## Overview
The column mapping in `src/executor/migration_executor.py` has been corrected to match the ACTUAL Supabase schema. This guide shows you how to test the fix.

---

## What Was Fixed

### The Problem
Migration was failing with:
```
Could not find the 'entry_no' column of 'transactions' in the schema cache
```

### The Solution
Updated `_clean_record()` method to only insert valid columns:
- **Transactions table**: Only `entry_number`, `entry_date`, `org_id` (3 columns)
- **Transaction lines table**: All line-item columns (16 columns)

---

## Step 1: Validate Excel Data (Optional but Recommended)

```bash
python migrate.py validate
```

This will:
- Read the Excel file
- Check for data quality issues
- Generate a validation report
- NOT make any database changes

**Expected output:**
```
============================================================
VALIDATION SUMMARY
============================================================
Records validated: 14224
Errors: 0
Warnings: 0
Status: PASS
Report: reports/validation_report.json
============================================================
```

---

## Step 2: Test with Dry-Run Mode (RECOMMENDED FIRST)

```bash
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

This will:
- Read the Excel file
- Validate the data
- Show what would be migrated
- **NOT make any database changes**
- Generate reports

**Expected output:**
```
============================================================
MIGRATION PLAN
============================================================
Mode: DRY-RUN
Batch size: 100
Records to migrate: 14224
============================================================

============================================================
MIGRATION SUMMARY
============================================================
Mode: DRY-RUN
Transactions: 14224/14224 succeeded
Transaction lines: 14224/14224 succeeded
Total succeeded: 28448
Total failed: 0
Success rate: 100.0%
Report: reports/migration_report.md
Summary: reports/migration_summary.json
============================================================
```

**If you see this output, the fix is working! ✅**

---

## Step 3: Execute Migration (After Dry-Run Succeeds)

```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

This will:
- Create a backup of current data
- Validate the data
- Migrate transactions and transaction lines
- Generate reports

**When prompted:**
```
============================================================
MIGRATION PLAN
============================================================
Mode: EXECUTE
Batch size: 100
Records to migrate: 14224
Backup timestamp: 20260214_175417
============================================================

Continue with migration? (yes/no): 
```

Type `yes` or `y` and press Enter.

**Expected output:**
```
============================================================
MIGRATION SUMMARY
============================================================
Mode: EXECUTE
Transactions: 14224/14224 succeeded
Transaction lines: 14224/14224 succeeded
Total succeeded: 28448
Total failed: 0
Success rate: 100.0%
Report: reports/migration_report.md
Summary: reports/migration_summary.json
============================================================
```

---

## Troubleshooting

### Error: "Could not find the 'entry_no' column of 'transactions'"
This means the fix didn't apply correctly. Check:
1. File was saved: `src/executor/migration_executor.py`
2. Method `_clean_record()` has the corrected `valid_columns`
3. Restart Python/terminal to reload the module

### Error: "Failed to connect to Supabase"
Check:
1. `.env.local` file exists and has correct credentials
2. Supabase project `bgxknceshxxifwytalex` is accessible
3. Network connection is working

### Error: "Validation failed with X errors"
Run `python migrate.py validate` to see detailed errors in the Excel data.

### Error: "Migration cancelled by user"
This is normal if you typed `no` when prompted. Re-run the command and type `yes` to proceed.

---

## Verification Steps

### After Dry-Run
1. Check that success rate is 100%
2. Check that no errors are reported
3. Review `reports/migration_report.md` for details

### After Execute
1. Check that success rate is 100%
2. Check that no errors are reported
3. Verify in Supabase:
   - Open Supabase dashboard
   - Go to `transactions` table
   - Verify records have: `entry_number`, `entry_date`, `org_id`
   - Go to `transaction_lines` table
   - Verify records have all line-item columns

---

## Column Mapping Verification

### Transactions Table (Should have 3 columns)
```
entry_number  (from Excel: "entry no")
entry_date    (from Excel: "entry date")
org_id        (added by migration)
```

### Transaction Lines Table (Should have 16 columns)
```
entry_no
account_code
account_name
transaction_classification_code
classification_code
classification_name
project_code
project_name
work_analysis_code
work_analysis_name
sub_tree_code
sub_tree_name
debit_amount  (from Excel: "debit")
credit_amount (from Excel: "credit")
description   (from Excel: "notes")
org_id        (added by migration)
```

---

## Backup and Rollback

### Backup Location
Backups are created automatically before execute mode:
```
backups/pre_migration_YYYYMMDD_HHMMSS.json
```

### Rollback (if needed)
```bash
python migrate.py rollback --backup-timestamp 20260214_175417
```

Replace `20260214_175417` with the actual timestamp from the backup file.

---

## Reports Generated

### Migration Report
```
reports/migration_report.md
```
Contains detailed information about:
- Records migrated
- Errors encountered
- Data quality issues
- Column mapping used

### Migration Summary
```
reports/migration_summary.json
```
Contains JSON summary of:
- Total records processed
- Success/failure counts
- Batch details
- Timestamps

---

## Quick Command Reference

```bash
# Validate data
python migrate.py validate

# Create backup
python migrate.py backup

# Dry-run migration
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127

# Execute migration
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127

# Rollback from backup
python migrate.py rollback --backup-timestamp 20260214_175417
```

---

## Success Criteria

✅ Dry-run completes with 100% success rate
✅ No "Could not find column" errors
✅ Execute mode completes with 100% success rate
✅ Supabase records have correct columns
✅ All records have `org_id` set

---

## Next Steps

1. **Run dry-run**: `python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127`
2. **Verify output**: Check for 100% success rate
3. **Run execute**: `python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127`
4. **Verify in Supabase**: Check that records were inserted correctly
5. **Review reports**: Check `reports/migration_report.md` for details

---

## Status
✅ Fix applied to `src/executor/migration_executor.py`
✅ Column mapping corrected
✅ Ready for testing
