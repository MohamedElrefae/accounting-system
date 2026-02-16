# Production Deployment Guide: Excel Data Migration to Supabase

**Date**: February 14, 2026  
**Status**: Ready for Production  
**System**: Excel Data Migration to Supabase

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Step 1: Environment Setup](#step-1-environment-setup)
3. [Step 2: Verify Dependencies](#step-2-verify-dependencies)
4. [Step 3: Prepare Excel File](#step-3-prepare-excel-file)
5. [Step 4: Run Dry-Run Mode](#step-4-run-dry-run-mode)
6. [Step 5: Review Dry-Run Results](#step-5-review-dry-run-results)
7. [Step 6: Create Backup](#step-6-create-backup)
8. [Step 7: Execute Migration](#step-7-execute-migration)
9. [Step 8: Verify Migration](#step-8-verify-migration)
10. [Step 9: Post-Migration Validation](#step-9-post-migration-validation)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Procedures](#rollback-procedures)

---

## Pre-Deployment Checklist

Before starting, verify all items are complete:

- [ ] All 56 tests passing (unit + integration)
- [ ] Phase 0 discovery complete
- [ ] All 21 account codes mapped (100%)
- [ ] Unbalanced transactions strategy decided
- [ ] Column mappings approved
- [ ] Excel file prepared and validated
- [ ] Supabase credentials available
- [ ] Python 3.8+ installed
- [ ] All dependencies installed
- [ ] Backup location identified
- [ ] Team notified of migration window

---

## Step 1: Environment Setup

### 1.1 Verify Python Installation

```bash
python --version
```

Expected output: `Python 3.8.0` or higher

### 1.2 Create Virtual Environment (Optional but Recommended)

```bash
python -m venv venv
```

Activate virtual environment:
- **Windows**: `venv\Scripts\activate`
- **macOS/Linux**: `source venv/bin/activate`

### 1.3 Install Dependencies

```bash
pip install -r requirements.txt
```

Verify installation:
```bash
pip list | grep -E "supabase|pandas|openpyxl"
```

### 1.4 Configure Environment Variables

Create `.env` file in project root:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Excel File Path
EXCEL_FILE_PATH=c:\path\to\your\excel\file.xlsx

# Migration Configuration
BATCH_SIZE=100
LOG_LEVEL=INFO

# Backup Configuration
BACKUP_DIR=./backups
```

**Important**: Never commit `.env` to version control!

### 1.5 Verify Environment Variables

```bash
python -c "import os; print('SUPABASE_URL:', os.getenv('SUPABASE_URL')); print('EXCEL_FILE_PATH:', os.getenv('EXCEL_FILE_PATH'))"
```

---

## Step 2: Verify Dependencies

### 2.1 Test Supabase Connection

```bash
python -c "
from src.analyzer.supabase_connection import SupabaseConnectionManager
manager = SupabaseConnectionManager()
if manager.test_connection():
    print('✓ Supabase connection successful')
else:
    print('✗ Supabase connection failed')
"
```

### 2.2 Verify Excel File

```bash
python -c "
from src.analyzer.excel_reader import ExcelReader
import os

excel_path = os.getenv('EXCEL_FILE_PATH')
reader = ExcelReader(excel_path, {})
print(f'✓ Excel file found: {excel_path}')
print(f'✓ File size: {os.path.getsize(excel_path) / 1024 / 1024:.2f} MB')
"
```

### 2.3 Run All Tests

```bash
python -m pytest tests/ -v --tb=short
```

Expected output: `56 passed`

---

## Step 3: Prepare Excel File

### 3.1 Verify Excel Structure

The Excel file must have:
- Sheet name: `transactions ` (with trailing space)
- 18 columns with Arabic headers
- Data starting from row 1 (after headers)
- Columns: fiscal_year, month, entry_no, entry_date, account_code, account_name, etc.

### 3.2 Validate Data Quality

```bash
python scripts/phase0_task02_excel_structure.py
```

This will generate: `reports/excel_structure.json`

### 3.3 Check for Issues

Review the generated report:
```bash
cat reports/excel_structure.json
```

Look for:
- Missing columns
- Data type mismatches
- Null values in required fields

---

## Step 4: Run Dry-Run Mode

### 4.1 Execute Dry-Run

```bash
python migrate.py --mode dry-run --batch-size 100
```

This will:
- NOT write to database
- Simulate the entire migration
- Generate detailed logs
- Create a dry-run report

### 4.2 Monitor Progress

Watch the console output for:
- Progress bars
- Record counts
- Any warnings or errors
- Estimated completion time

### 4.3 Check Dry-Run Results

```bash
cat reports/migration_report.json
```

Expected output includes:
- Records processed
- Records succeeded
- Records failed
- Execution time
- Any errors encountered

---

## Step 5: Review Dry-Run Results

### 5.1 Verify Record Counts

```bash
python -c "
import json
with open('reports/migration_report.json') as f:
    report = json.load(f)
    print(f'Transactions processed: {report[\"transactions\"][\"records_processed\"]}')
    print(f'Transactions succeeded: {report[\"transactions\"][\"records_succeeded\"]}')
    print(f'Transaction lines processed: {report[\"transaction_lines\"][\"records_processed\"]}')
    print(f'Transaction lines succeeded: {report[\"transaction_lines\"][\"records_succeeded\"]}')
"
```

### 5.2 Check for Errors

```bash
python -c "
import json
with open('reports/migration_report.json') as f:
    report = json.load(f)
    if report['transactions']['records_failed'] > 0:
        print('⚠ Transactions with errors:')
        for error in report['transactions']['errors'][:5]:
            print(f'  - {error}')
    if report['transaction_lines']['records_failed'] > 0:
        print('⚠ Transaction lines with errors:')
        for error in report['transaction_lines']['errors'][:5]:
            print(f'  - {error}')
"
```

### 5.3 Review Validation Report

```bash
cat reports/validation_errors.csv
```

Check for:
- Required field violations
- Data type mismatches
- Account code issues
- Balance problems

### 5.4 Get User Approval

**STOP HERE** - Do not proceed until:
- [ ] Dry-run completed successfully
- [ ] Record counts verified
- [ ] No critical errors
- [ ] User has reviewed and approved results
- [ ] Team lead has signed off

---

## Step 6: Create Backup

### 6.1 Create Pre-Migration Backup

```bash
python migrate.py --mode backup
```

This will:
- Export current Supabase data
- Save to `backups/pre_migration_TIMESTAMP.json`
- Verify backup is readable
- Display backup location

### 6.2 Verify Backup

```bash
python -c "
import json
import os
from pathlib import Path

backup_dir = Path('backups')
latest_backup = max(backup_dir.glob('pre_migration_*.json'), key=os.path.getctime)
with open(latest_backup) as f:
    backup = json.load(f)
    print(f'✓ Backup created: {latest_backup}')
    print(f'✓ Transactions in backup: {len(backup.get(\"transactions\", []))}')
    print(f'✓ Transaction lines in backup: {len(backup.get(\"transaction_lines\", []))}')
"
```

### 6.3 Store Backup Location

Save the backup file path for potential rollback:
```
Backup Location: backups/pre_migration_TIMESTAMP.json
```

---

## Step 7: Execute Migration

### 7.1 Start Migration

```bash
python migrate.py --mode execute --batch-size 100
```

This will:
- Write data to Supabase
- Show real-time progress
- Log all operations
- Generate migration report

### 7.2 Monitor Execution

Watch for:
- Progress bars advancing
- No critical errors
- Reasonable execution time
- Completion message

### 7.3 Expected Output

```
Starting migration in EXECUTE mode...
Batch size: 100
Dry-run: False

Creating backup...
✓ Backup created: backups/pre_migration_2026-02-14_10-30-45.json

Migrating transactions...
[████████████████████████████████████████] 100%
✓ Transactions migrated: 2,164 records

Migrating transaction lines...
[████████████████████████████████████████] 100%
✓ Transaction lines migrated: 14,224 records

Migration completed successfully!
Total execution time: 45 seconds
```

---

## Step 8: Verify Migration

### 8.1 Run Verification Engine

```bash
python migrate.py --mode verify
```

This will:
- Compare record counts
- Validate referential integrity
- Check sample data
- Verify account mappings
- Generate verification report

### 8.2 Review Verification Report

```bash
cat reports/verification_report.json
```

Expected output:
```json
{
  "record_count_check": {
    "status": "PASS",
    "excel_records": 14224,
    "supabase_records": 14224,
    "match": true
  },
  "referential_integrity_check": {
    "status": "PASS",
    "orphaned_lines": 0
  },
  "sample_data_check": {
    "status": "PASS",
    "samples_checked": 100,
    "matches": 100
  },
  "account_mapping_check": {
    "status": "PASS",
    "unmapped_codes": 0
  }
}
```

### 8.3 Verify in Supabase Console

1. Go to Supabase dashboard
2. Navigate to SQL Editor
3. Run verification queries:

```sql
-- Check transaction count
SELECT COUNT(*) as transaction_count FROM transactions;

-- Check transaction line count
SELECT COUNT(*) as line_count FROM transaction_lines;

-- Check for orphaned lines
SELECT COUNT(*) as orphaned_count 
FROM transaction_lines tl
WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.id = tl.transaction_id);

-- Check account mappings
SELECT COUNT(DISTINCT account_id) as unique_accounts FROM transaction_lines;
```

---

## Step 9: Post-Migration Validation

### 9.1 Generate Executive Summary

```bash
python -c "
import json
from datetime import datetime

with open('reports/migration_report.json') as f:
    report = json.load(f)

print('=' * 60)
print('MIGRATION EXECUTION SUMMARY')
print('=' * 60)
print(f'Date: {datetime.now().strftime(\"%Y-%m-%d %H:%M:%S\")}')
print(f'Status: SUCCESS')
print()
print('TRANSACTIONS:')
print(f'  Processed: {report[\"transactions\"][\"records_processed\"]:,}')
print(f'  Succeeded: {report[\"transactions\"][\"records_succeeded\"]:,}')
print(f'  Failed: {report[\"transactions\"][\"records_failed\"]}')
print()
print('TRANSACTION LINES:')
print(f'  Processed: {report[\"transaction_lines\"][\"records_processed\"]:,}')
print(f'  Succeeded: {report[\"transaction_lines\"][\"records_succeeded\"]:,}')
print(f'  Failed: {report[\"transaction_lines\"][\"records_failed\"]}')
print()
print(f'Execution Time: {report[\"execution_time_seconds\"]:.2f} seconds')
print('=' * 60)
"
```

### 9.2 Validate Business Logic

```bash
python -c "
from src.executor.verification_engine import VerificationEngine
import os

engine = VerificationEngine()

# Check transaction balance
print('Checking transaction balance...')
balance_check = engine.verify_transaction_balance()
print(f'✓ Balanced transactions: {balance_check[\"balanced_count\"]}')
print(f'✓ Unbalanced transactions: {balance_check[\"unbalanced_count\"]}')

# Check account codes
print('Checking account codes...')
account_check = engine.verify_account_codes()
print(f'✓ Valid account codes: {account_check[\"valid_count\"]}')
print(f'✓ Invalid account codes: {account_check[\"invalid_count\"]}')
"
```

### 9.3 Document Migration

Create migration completion document:

```bash
cat > MIGRATION_COMPLETION_REPORT.md << 'EOF'
# Migration Completion Report

**Date**: $(date)
**Status**: SUCCESS
**System**: Excel Data Migration to Supabase

## Summary
- Transactions migrated: 2,164
- Transaction lines migrated: 14,224
- Execution time: XX seconds
- Backup location: backups/pre_migration_TIMESTAMP.json

## Verification Results
- Record count check: PASS
- Referential integrity: PASS
- Sample data comparison: PASS
- Account mapping verification: PASS

## Sign-off
- [ ] Data analyst approved
- [ ] Database administrator approved
- [ ] Finance manager approved
- [ ] IT manager approved

EOF
```

---

## Troubleshooting

### Issue: Supabase Connection Failed

**Symptoms**: `Error: Failed to connect to Supabase`

**Solution**:
1. Verify SUPABASE_URL is correct
2. Verify SUPABASE_KEY is valid
3. Check internet connection
4. Verify Supabase project is active

```bash
python -c "
import os
print('SUPABASE_URL:', os.getenv('SUPABASE_URL'))
print('SUPABASE_KEY:', os.getenv('SUPABASE_KEY')[:10] + '...')
"
```

### Issue: Excel File Not Found

**Symptoms**: `Error: Excel file not found`

**Solution**:
1. Verify file path in .env
2. Check file exists: `ls -la /path/to/file.xlsx`
3. Verify file permissions
4. Check file is not corrupted

```bash
python -c "
import os
path = os.getenv('EXCEL_FILE_PATH')
if os.path.exists(path):
    print(f'✓ File exists: {path}')
    print(f'✓ File size: {os.path.getsize(path)} bytes')
else:
    print(f'✗ File not found: {path}')
"
```

### Issue: Account Code Mapping Failed

**Symptoms**: `Error: Unmapped account codes found`

**Solution**:
1. Review unmapped codes report
2. Verify all 21 codes are in Supabase
3. Check legacy_code field values
4. Run account code verification:

```bash
python scripts/phase0_task04_account_codes.py
```

### Issue: Transaction Balance Errors

**Symptoms**: `Error: Unbalanced transactions detected`

**Solution**:
1. Review unbalanced transactions report
2. Decide on handling strategy:
   - Fix in Excel and re-run
   - Approve override with documentation
3. Update configuration if needed

### Issue: Migration Timeout

**Symptoms**: `Error: Migration exceeded timeout`

**Solution**:
1. Reduce batch size: `--batch-size 50`
2. Check Supabase performance
3. Check network connection
4. Try again with smaller dataset

---

## Rollback Procedures

### Rollback Scenario 1: Pre-Migration Rollback

If issues found during dry-run, simply don't execute migration.

### Rollback Scenario 2: Post-Migration Rollback

If issues found after migration:

```bash
python migrate.py --mode rollback --backup-file backups/pre_migration_TIMESTAMP.json
```

This will:
- Delete all migrated records
- Restore from backup
- Verify restoration
- Generate rollback report

### Rollback Verification

```bash
python -c "
import json
with open('reports/rollback_report.json') as f:
    report = json.load(f)
    print(f'Rollback status: {report[\"status\"]}')
    print(f'Records restored: {report[\"records_restored\"]}')
    print(f'Verification: {report[\"verification_status\"]}')
"
```

### Manual Rollback (If Automated Fails)

1. Connect to Supabase SQL Editor
2. Run:

```sql
-- Delete migrated transaction lines
DELETE FROM transaction_lines 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Delete migrated transactions
DELETE FROM transactions 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Verify deletion
SELECT COUNT(*) FROM transactions;
SELECT COUNT(*) FROM transaction_lines;
```

---

## Post-Deployment Tasks

### 1. Archive Reports

```bash
mkdir -p archives/migration_$(date +%Y%m%d_%H%M%S)
cp reports/* archives/migration_$(date +%Y%m%d_%H%M%S)/
cp MIGRATION_COMPLETION_REPORT.md archives/migration_$(date +%Y%m%d_%H%M%S)/
```

### 2. Update Documentation

- [ ] Update README with migration date
- [ ] Document any issues encountered
- [ ] Record lessons learned
- [ ] Update runbooks

### 3. Notify Stakeholders

- [ ] Send completion email
- [ ] Share verification report
- [ ] Provide access to new data
- [ ] Schedule training if needed

### 4. Monitor System

- [ ] Watch Supabase logs for errors
- [ ] Monitor query performance
- [ ] Check for data anomalies
- [ ] Verify user access

---

## Success Criteria

Migration is successful when:

✅ All 56 tests pass  
✅ Dry-run completes without errors  
✅ Backup created and verified  
✅ Migration executes successfully  
✅ Record counts match (2,164 transactions, 14,224 lines)  
✅ Verification engine passes all checks  
✅ No orphaned transaction lines  
✅ All account codes mapped correctly  
✅ Transaction balance verified  
✅ Sample data matches source  

---

## Support & Escalation

### For Technical Issues
- Check logs: `logs/migration_*.log`
- Review troubleshooting section above
- Contact database administrator

### For Data Issues
- Review validation report: `reports/validation_errors.csv`
- Check data profiling: `reports/data_profile.json`
- Contact data analyst

### For Emergency Rollback
- Execute rollback procedure immediately
- Notify all stakeholders
- Document incident
- Schedule post-mortem

---

## Quick Reference Commands

```bash
# Setup
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values

# Verify
python -m pytest tests/ -v

# Dry-run
python migrate.py --mode dry-run

# Backup
python migrate.py --mode backup

# Execute
python migrate.py --mode execute

# Verify
python migrate.py --mode verify

# Rollback
python migrate.py --mode rollback --backup-file backups/pre_migration_TIMESTAMP.json
```

---

**Document Version**: 1.0  
**Last Updated**: February 14, 2026  
**Status**: Ready for Production
