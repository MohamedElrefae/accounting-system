# Excel to Supabase Migration CLI - Quick Reference

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Verify installation
python migrate.py --help
```

## Commands

### 1. Validate Data
Validates Excel data without making any changes.

```bash
python migrate.py validate
```

**Output:**
- Validation report: `reports/validation_report.json`
- Console summary with error/warning counts
- Exit code: 0 (pass) or 1 (fail)

---

### 2. Create Backup
Creates a backup of current Supabase data before migration.

```bash
python migrate.py backup
```

**Output:**
- Backup file: `backups/pre_migration_{TIMESTAMP}.json`
- Console confirmation with timestamp
- Exit code: 0 (success) or 1 (failure)

---

### 3. Dry-Run Migration
Simulates migration without writing to database.

```bash
python migrate.py --mode dry-run --batch-size 100
```

**Options:**
- `--mode dry-run` - Simulate without database writes (default)
- `--batch-size 100` - Records per batch (default: 100)

**Output:**
- Migration report: `reports/migration_report.md`
- Summary JSON: `reports/migration_summary.json`
- Console progress and statistics
- Exit code: 0 (success) or 1 (failure)

---

### 4. Execute Migration
Performs actual migration with backup and user confirmation.

```bash
python migrate.py --mode execute --batch-size 100
```

**Options:**
- `--mode execute` - Write to database
- `--batch-size 100` - Records per batch (default: 100)

**Workflow:**
1. Validates data
2. Creates backup
3. Displays migration plan
4. Asks for user confirmation
5. Executes migration
6. Generates reports

**Output:**
- Backup file: `backups/pre_migration_{TIMESTAMP}.json`
- Migration report: `reports/migration_report.md`
- Summary JSON: `reports/migration_summary.json`
- Console progress and statistics
- Exit code: 0 (success) or 1 (failure)

---

### 5. Rollback Migration
Restores data from backup after migration.

```bash
python migrate.py rollback --backup-timestamp 20260213_143022
```

**Options:**
- `--backup-timestamp YYYYMMDD_HHMMSS` - Backup timestamp (required)

**Workflow:**
1. Locates backup file
2. Asks for user confirmation
3. Restores data from backup
4. Verifies restoration

**Output:**
- Console confirmation
- Exit code: 0 (success) or 1 (failure)

---

## Typical Workflow

### Step 1: Validate
```bash
python migrate.py validate
# Review reports/validation_report.json
# Fix any errors in Excel if needed
```

### Step 2: Dry-Run
```bash
python migrate.py --mode dry-run --batch-size 100
# Review reports/migration_report.md
# Verify success rate is 100%
```

### Step 3: Execute
```bash
python migrate.py --mode execute --batch-size 100
# Confirm when prompted
# Monitor progress
# Review reports/migration_summary.json
```

### Step 4: Verify (if needed)
```bash
# Check data in Supabase
# If issues found, rollback:
python migrate.py rollback --backup-timestamp 20260213_143022
```

---

## Output Files

### Reports Directory
```
reports/
├── validation_report.json      # Validation results
├── migration_report.md         # Detailed migration report
└── migration_summary.json      # Migration statistics
```

### Backups Directory
```
backups/
└── pre_migration_20260213_143022.json  # Backup before migration
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Failure (check console output for details) |

---

## Troubleshooting

### Validation Fails
```bash
# Check validation report
cat reports/validation_report.json

# Fix errors in Excel
# Re-run validation
python migrate.py validate
```

### Migration Fails
```bash
# Check migration report
cat reports/migration_report.md

# Rollback if needed
python migrate.py rollback --backup-timestamp 20260213_143022

# Fix issues and retry
python migrate.py --mode dry-run
```

### Backup Not Found
```bash
# List available backups
ls backups/

# Use correct timestamp
python migrate.py rollback --backup-timestamp 20260213_143022
```

---

## Performance Tips

1. **Batch Size**: Adjust based on memory
   - Smaller batches (50): Lower memory, slower
   - Larger batches (200): Higher memory, faster
   - Default (100): Good balance

2. **Dry-Run First**: Always test before execute
   - Validates all steps
   - Identifies issues early
   - No risk to data

3. **Monitor Progress**: Watch console output
   - Shows batch progress
   - Indicates any errors
   - Displays final statistics

---

## Support

For issues or questions:
1. Check console output for error messages
2. Review generated reports
3. Check logs in reports/ directory
4. Rollback if needed and retry

---

## Examples

### Example 1: Quick Validation
```bash
$ python migrate.py validate
============================================================
VALIDATION SUMMARY
============================================================
Records validated: 14224
Errors: 0
Warnings: 5
Status: ✓ PASS
Report: reports/validation_report.json
============================================================
```

### Example 2: Safe Dry-Run
```bash
$ python migrate.py --mode dry-run --batch-size 100
Step 1/4: Validating data...
✓ Validation passed
Step 2/4: Skipping backup (dry-run mode)
Step 3/4: Displaying migration plan...
Step 4/4: Executing migration...
============================================================
MIGRATION SUMMARY
============================================================
Mode: DRY-RUN
Transactions: 2164/2164 succeeded
Transaction lines: 14224/14224 succeeded
Success rate: 100.0%
============================================================
```

### Example 3: Production Migration
```bash
$ python migrate.py --mode execute --batch-size 100
[... validation and backup steps ...]
Continue with migration? (yes/no): yes
[... migration execution ...]
============================================================
MIGRATION SUMMARY
============================================================
Mode: EXECUTE
Transactions: 2164/2164 succeeded
Transaction lines: 14224/14224 succeeded
Success rate: 100.0%
============================================================
```
