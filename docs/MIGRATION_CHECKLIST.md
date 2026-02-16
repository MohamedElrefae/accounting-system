# Migration Checklist: Excel Data Migration to Supabase

## Pre-Migration Checklist

Use this checklist to ensure everything is ready before executing the migration.

### Environment Setup

- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file created with correct credentials
- [ ] Supabase URL verified in `.env`
- [ ] Supabase API key verified in `.env`
- [ ] Excel file path verified in `.env`
- [ ] Excel file exists and is readable
- [ ] Network connectivity verified (can reach Supabase)

### Data Preparation

- [ ] Excel file is in `.xlsx` format (not `.xls` or `.csv`)
- [ ] Excel file has sheet named `transactions ` (with trailing space)
- [ ] Excel file has all 18 required columns
- [ ] Excel file headers are in row 0 (Arabic headers)
- [ ] Excel file data starts from row 1
- [ ] Excel file is closed (not open in Excel)
- [ ] Excel file has no unsaved changes

### Analysis Phase

- [ ] Run: `python analyze.py schema`
  - [ ] Supabase schema analysis completed
  - [ ] `reports/supabase_schema.json` generated
  - [ ] `reports/supabase_schema.md` generated

- [ ] Run: `python analyze.py excel`
  - [ ] Excel structure analysis completed
  - [ ] `reports/excel_structure.json` generated
  - [ ] `reports/excel_structure.md` generated

- [ ] Run: `python analyze.py compare`
  - [ ] Structure comparison completed
  - [ ] `reports/comparison_report.json` generated
  - [ ] `reports/comparison_report.md` generated
  - [ ] Review comparison for mismatches

- [ ] Run: `python analyze.py accounts`
  - [ ] Account code mapping completed
  - [ ] `config/account_mapping.csv` generated
  - [ ] All 21 account codes mapped (100%)
  - [ ] No unmapped codes found
  - [ ] `reports/account_mapping.json` generated

### Data Validation

- [ ] Run: `python migrate.py validate`
  - [ ] Validation completed successfully
  - [ ] `reports/validation_report.json` generated
  - [ ] Review validation report for errors
  - [ ] All ERROR-level issues resolved
  - [ ] WARNING-level issues reviewed and accepted

### Backup Verification

- [ ] Run: `python migrate.py backup`
  - [ ] Backup created successfully
  - [ ] Backup file exists in `backups/` directory
  - [ ] Backup file is readable
  - [ ] Backup timestamp noted: `_________________`

### Dry-Run Execution

- [ ] Run: `python migrate.py --mode dry-run --batch-size 100`
  - [ ] Dry-run completed successfully
  - [ ] `reports/migration_report.md` generated
  - [ ] `reports/migration_summary.json` generated
  - [ ] Review migration plan
  - [ ] Verify record counts match Excel
  - [ ] Verify success rate is 100%
  - [ ] No errors in dry-run report

### Pre-Execution Review

- [ ] Review all generated reports:
  - [ ] `reports/supabase_schema.md`
  - [ ] `reports/excel_structure.md`
  - [ ] `reports/comparison_report.md`
  - [ ] `reports/account_mapping.json`
  - [ ] `reports/validation_report.json`
  - [ ] `reports/migration_report.md`

- [ ] Verify data integrity:
  - [ ] All account codes mapped
  - [ ] All required fields present
  - [ ] No validation errors
  - [ ] Dry-run success rate 100%

- [ ] Verify backup:
  - [ ] Backup file exists
  - [ ] Backup file is readable
  - [ ] Backup timestamp recorded

- [ ] Get approval:
  - [ ] Manager/supervisor reviewed reports
  - [ ] Manager/supervisor approved migration
  - [ ] Approval documented with date/time

---

## Migration Execution Checklist

### Pre-Execution

- [ ] All pre-migration checklist items completed
- [ ] Backup created and verified
- [ ] Dry-run executed and reviewed
- [ ] All stakeholders notified
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback procedure reviewed and ready

### Execution

- [ ] Run: `python migrate.py --mode execute --batch-size 100`
  - [ ] Migration started
  - [ ] Backup created automatically
  - [ ] Migration plan displayed
  - [ ] User confirmed migration (typed "yes")
  - [ ] Migration in progress...
  - [ ] Transactions migrated
  - [ ] Transaction lines migrated
  - [ ] Migration completed

### Post-Execution

- [ ] Migration completed successfully
- [ ] `reports/migration_report.md` generated
- [ ] `reports/migration_summary.json` generated
- [ ] Review migration report:
  - [ ] All transactions migrated
  - [ ] All transaction lines migrated
  - [ ] Success rate is 100%
  - [ ] No failed records
  - [ ] Execution time noted: `_________________`

---

## Post-Migration Verification Checklist

### Immediate Verification (Within 1 hour)

- [ ] Check Supabase dashboard:
  - [ ] transactions table has new records
  - [ ] transaction_lines table has new records
  - [ ] Record counts match Excel file

- [ ] Verify data integrity:
  - [ ] Sample records match Excel data
  - [ ] Account codes are correct
  - [ ] Dates are correct
  - [ ] Amounts are correct

- [ ] Check for errors:
  - [ ] No duplicate records
  - [ ] No missing records
  - [ ] No corrupted data

### Detailed Verification (Within 24 hours)

- [ ] Run verification queries:
  ```sql
  -- Check record counts
  SELECT COUNT(*) FROM transactions;
  SELECT COUNT(*) FROM transaction_lines;
  
  -- Check for duplicates
  SELECT reference_number, COUNT(*) FROM transactions GROUP BY reference_number HAVING COUNT(*) > 1;
  
  -- Check referential integrity
  SELECT COUNT(*) FROM transaction_lines WHERE transaction_id NOT IN (SELECT id FROM transactions);
  
  -- Check account codes
  SELECT COUNT(DISTINCT account_id) FROM transaction_lines;
  ```

- [ ] Verify business logic:
  - [ ] Transaction totals are correct (debit = credit)
  - [ ] Account balances are correct
  - [ ] Period totals are correct

- [ ] Check application functionality:
  - [ ] Reports display correctly
  - [ ] Filters work correctly
  - [ ] Exports work correctly

### Sign-Off

- [ ] All verification checks passed
- [ ] No issues found
- [ ] Migration successful
- [ ] Manager/supervisor sign-off obtained
- [ ] Migration documented:
  - [ ] Date: `_________________`
  - [ ] Time: `_________________`
  - [ ] Records migrated: `_________________`
  - [ ] Success rate: `_________________`
  - [ ] Issues encountered: `_________________`
  - [ ] Resolution: `_________________`

---

## Rollback Checklist

Use this checklist if you need to rollback the migration.

### Decision to Rollback

- [ ] Issue identified that requires rollback
- [ ] Issue severity assessed
- [ ] Rollback decision approved by manager
- [ ] Backup verified to exist
- [ ] Backup timestamp noted: `_________________`

### Rollback Execution

- [ ] Run: `python migrate.py rollback --backup-timestamp <timestamp>`
  - [ ] Rollback confirmation displayed
  - [ ] User confirmed rollback (typed "yes")
  - [ ] Rollback in progress...
  - [ ] Rollback completed successfully

### Post-Rollback Verification

- [ ] Check Supabase dashboard:
  - [ ] Migrated records removed
  - [ ] Original data restored
  - [ ] Record counts match pre-migration state

- [ ] Verify data integrity:
  - [ ] No data loss
  - [ ] All original records present
  - [ ] No corrupted data

### Root Cause Analysis

- [ ] Issue documented:
  - [ ] Issue description: `_________________`
  - [ ] Error message: `_________________`
  - [ ] Affected records: `_________________`

- [ ] Root cause identified:
  - [ ] Root cause: `_________________`
  - [ ] Contributing factors: `_________________`

- [ ] Corrective actions planned:
  - [ ] Action 1: `_________________`
  - [ ] Action 2: `_________________`
  - [ ] Action 3: `_________________`

### Retry Migration

- [ ] Corrective actions completed
- [ ] Data fixed in Excel (if needed)
- [ ] Validation re-run: `python migrate.py validate`
- [ ] Dry-run re-run: `python migrate.py --mode dry-run`
- [ ] Dry-run results reviewed
- [ ] Migration re-executed: `python migrate.py --mode execute`

---

## Configuration Options

### Batch Size

The `--batch-size` parameter controls how many records are inserted per batch.

- **Default**: 100 records per batch
- **Smaller** (50): Slower but uses less memory, better for slow networks
- **Larger** (500): Faster but uses more memory, better for fast networks

**Recommendation**: Start with 100, adjust based on performance.

```bash
# Smaller batch size
python migrate.py --mode execute --batch-size 50

# Larger batch size
python migrate.py --mode execute --batch-size 500
```

### Log Level

The `LOG_LEVEL` in `.env` controls logging verbosity.

- **DEBUG**: Very detailed, includes all operations
- **INFO**: General information about progress (default)
- **WARNING**: Only warnings and errors
- **ERROR**: Only errors
- **CRITICAL**: Only critical errors

**Recommendation**: Use INFO for normal operation, DEBUG for troubleshooting.

```env
LOG_LEVEL=DEBUG
```

---

## Troubleshooting During Migration

### If Migration Hangs

1. Wait 5 minutes - Network may be slow
2. Check network connectivity
3. Check Supabase status
4. Press Ctrl+C to stop
5. Rollback if needed
6. Retry with smaller batch size

### If Migration Fails

1. Check error message
2. Review logs in `logs/` directory
3. Check `reports/migration_report.md`
4. Rollback if needed
5. Fix issues
6. Retry migration

### If Rollback Fails

1. Check backup file exists
2. Verify backup timestamp
3. Check Supabase connectivity
4. Contact Supabase support if needed

---

## Documentation

### Reports Generated

- `reports/supabase_schema.json` - Supabase schema (JSON)
- `reports/supabase_schema.md` - Supabase schema (Markdown)
- `reports/excel_structure.json` - Excel structure (JSON)
- `reports/excel_structure.md` - Excel structure (Markdown)
- `reports/comparison_report.json` - Structure comparison (JSON)
- `reports/comparison_report.md` - Structure comparison (Markdown)
- `reports/account_mapping.json` - Account mappings (JSON)
- `reports/validation_report.json` - Validation results (JSON)
- `reports/migration_report.md` - Migration summary (Markdown)
- `reports/migration_summary.json` - Migration statistics (JSON)

### Logs Generated

- `logs/migration_YYYYMMDD_HHMMSS.log` - Migration execution log
- `logs/analysis_YYYYMMDD_HHMMSS.log` - Analysis execution log

### Backups Generated

- `backups/pre_migration_YYYYMMDD_HHMMSS.json` - Pre-migration backup

---

## Sign-Off

### Migration Completed Successfully

- [ ] All checklist items completed
- [ ] All verification checks passed
- [ ] No issues found
- [ ] Migration approved for production

**Executed by**: `_________________` (Name)

**Date**: `_________________`

**Time**: `_________________`

**Signature**: `_________________`

**Manager approval**: `_________________` (Name)

**Manager signature**: `_________________`

---

## Notes

Use this section to document any issues, decisions, or notes about the migration:

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

