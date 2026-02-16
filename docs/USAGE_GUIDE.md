# Usage Guide: Excel Data Migration to Supabase

## Overview

This guide provides examples for each CLI command and explains how to use the migration tool.

## Quick Start

### 1. Analyze Your Data

```bash
# Run all analysis tasks
python analyze.py all

# Or run individual analysis tasks
python analyze.py schema          # Analyze Supabase schema
python analyze.py excel           # Analyze Excel structure
python analyze.py compare         # Compare structures
python analyze.py accounts        # Build account mappings
```

### 2. Validate Data

```bash
# Validate Excel data without migration
python migrate.py validate
```

### 3. Create Backup

```bash
# Create backup of current Supabase data
python migrate.py backup
```

### 4. Execute Migration

```bash
# Dry-run (simulate without database writes)
python migrate.py --mode dry-run --batch-size 100

# Execute migration (writes to database)
python migrate.py --mode execute --batch-size 100
```

### 5. Verify Results

After migration, check the generated reports in `reports/` directory.

---

## Detailed Command Reference

### Analysis Commands

#### `python analyze.py schema`

Analyzes the Supabase database schema and generates reports.

**What it does:**
- Connects to Supabase
- Retrieves schema for transactions, transaction_lines, and accounts tables
- Documents all columns, data types, and relationships
- Generates JSON and Markdown reports

**Output files:**
- `reports/supabase_schema.json` - Machine-readable schema
- `reports/supabase_schema.md` - Human-readable schema documentation

**Example:**
```bash
$ python analyze.py schema
2026-02-13 10:30:45 - AnalysisCLI - INFO - Starting Supabase schema analysis...
2026-02-13 10:30:46 - AnalysisCLI - INFO - ✓ Connected to Supabase
2026-02-13 10:30:47 - AnalysisCLI - INFO - ✓ Schema analysis complete

============================================================
SUPABASE SCHEMA ANALYSIS
============================================================
Tables analyzed: 3
Relationships found: 5
JSON report: reports/supabase_schema.json
Markdown report: reports/supabase_schema.md
============================================================
```

---

#### `python analyze.py excel`

Analyzes the Excel file structure and content.

**What it does:**
- Opens and reads the Excel file
- Identifies all sheets, columns, and data types
- Analyzes data quality (null values, unique values)
- Generates structure reports

**Output files:**
- `reports/excel_structure.json` - Machine-readable structure
- `reports/excel_structure.md` - Human-readable structure documentation

**Example:**
```bash
$ python analyze.py excel
2026-02-13 10:35:20 - AnalysisCLI - INFO - Starting Excel structure analysis...
2026-02-13 10:35:21 - AnalysisCLI - INFO - ✓ Loaded 14224 records from Excel

============================================================
EXCEL STRUCTURE ANALYSIS
============================================================
Total records: 14224
Total columns: 18
Columns: fiscal_year, month, entry_no, entry_date, account_code...
JSON report: reports/excel_structure.json
Markdown report: reports/excel_structure.md
============================================================
```

---

#### `python analyze.py compare`

Compares Excel and Supabase structures to identify mappings.

**Prerequisites:**
- Must run `python analyze.py schema` first
- Must run `python analyze.py excel` first

**What it does:**
- Compares Excel columns with Supabase fields
- Identifies matching fields
- Flags mismatches and missing fields
- Documents table dependencies

**Output files:**
- `reports/comparison_report.json` - Machine-readable comparison
- `reports/comparison_report.md` - Human-readable comparison

**Example:**
```bash
$ python analyze.py compare
2026-02-13 10:40:15 - AnalysisCLI - INFO - Starting structure comparison...

============================================================
STRUCTURE COMPARISON
============================================================
Matching fields: 16
Mismatches: 2
Missing in Supabase: 0
JSON report: reports/comparison_report.json
Markdown report: reports/comparison_report.md
============================================================
```

---

#### `python analyze.py accounts`

Builds account code mappings from Excel to Supabase.

**What it does:**
- Extracts unique account codes from Excel
- Queries Supabase for matching legacy_code values
- Creates mapping table (Excel code → Supabase account ID)
- Identifies unmapped codes for manual resolution

**Output files:**
- `config/account_mapping.csv` - Account code mappings
- `reports/account_mapping.json` - JSON format mappings

**Example:**
```bash
$ python analyze.py accounts
2026-02-13 10:45:30 - AnalysisCLI - INFO - Starting account code mapping...
2026-02-13 10:45:31 - AnalysisCLI - INFO - Found 21 unique account codes

============================================================
ACCOUNT CODE MAPPING
============================================================
Total unique codes: 21
Mapped: 21
Unmapped: 0
CSV report: config/account_mapping.csv
JSON report: reports/account_mapping.json
============================================================
```

---

#### `python analyze.py all`

Runs all analysis tasks in sequence.

**What it does:**
- Runs schema analysis
- Runs Excel analysis
- Runs comparison
- Runs account mapping
- Generates summary

**Example:**
```bash
$ python analyze.py all
2026-02-13 11:00:00 - AnalysisCLI - INFO - Running all analysis tasks...

============================================================
Running task: schema
============================================================
...

============================================================
Running task: excel
============================================================
...

============================================================
ANALYSIS COMPLETE
============================================================
Total tasks: 4
Successful: 4
Failed: 0
============================================================
```

---

### Migration Commands

#### `python migrate.py validate`

Validates Excel data without performing migration.

**What it does:**
- Reads Excel file
- Runs all validation rules
- Checks for required fields, data types, ranges
- Validates account codes exist in Supabase
- Generates validation report

**Output files:**
- `reports/validation_report.json` - Detailed validation results

**Example:**
```bash
$ python migrate.py validate
2026-02-13 12:00:00 - MigrationCLI - INFO - Starting validation...
2026-02-13 12:00:01 - MigrationCLI - INFO - Loaded 14224 records from Excel
2026-02-13 12:00:05 - MigrationCLI - INFO - Validation passed

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

---

#### `python migrate.py backup`

Creates a backup of current Supabase data before migration.

**What it does:**
- Connects to Supabase
- Exports all transactions and transaction_lines
- Saves backup to JSON file with timestamp
- Verifies backup is readable

**Output files:**
- `backups/pre_migration_YYYYMMDD_HHMMSS.json` - Backup file

**Example:**
```bash
$ python migrate.py backup
2026-02-13 12:05:00 - MigrationCLI - INFO - Starting backup...

============================================================
BACKUP SUCCESSFUL
============================================================
Backup file: backups/pre_migration_20260213_120500.json
Timestamp: 20260213_120500
============================================================
```

---

#### `python migrate.py --mode dry-run --batch-size 100`

Simulates migration without writing to database.

**What it does:**
- Validates all data
- Simulates batch inserts
- Generates migration report
- Shows what would be migrated
- Does NOT write to database

**Parameters:**
- `--mode dry-run` - Simulation mode (default)
- `--batch-size 100` - Records per batch (default: 100)

**Output files:**
- `reports/migration_report.md` - Migration summary
- `reports/migration_summary.json` - JSON summary

**Example:**
```bash
$ python migrate.py --mode dry-run --batch-size 100
2026-02-13 12:10:00 - MigrationCLI - INFO - Starting migration in dry-run mode...
2026-02-13 12:10:01 - MigrationCLI - INFO - Step 1/4: Validating data...
2026-02-13 12:10:05 - MigrationCLI - INFO - ✓ Validation passed
2026-02-13 12:10:05 - MigrationCLI - INFO - Step 2/4: Skipping backup (dry-run mode)
2026-02-13 12:10:05 - MigrationCLI - INFO - Step 3/4: Displaying migration plan...

============================================================
MIGRATION PLAN
============================================================
Mode: DRY-RUN
Batch size: 100
Records to migrate: 14224
============================================================

2026-02-13 12:10:05 - MigrationCLI - INFO - Step 4/4: Executing migration...

============================================================
MIGRATION SUMMARY
============================================================
Mode: DRY-RUN
Transactions: 2164/2164 succeeded
Transaction lines: 14224/14224 succeeded
Total succeeded: 16388
Total failed: 0
Success rate: 100.0%
Report: reports/migration_report.md
Summary: reports/migration_summary.json
============================================================
```

---

#### `python migrate.py --mode execute --batch-size 100`

Executes actual migration to Supabase database.

**What it does:**
- Validates all data
- Creates backup of current data
- Displays migration plan
- Requires user confirmation
- Migrates transactions and transaction_lines
- Generates migration report
- Writes to database

**Parameters:**
- `--mode execute` - Execute mode (writes to database)
- `--batch-size 100` - Records per batch (default: 100)

**Important**: Always run dry-run first to verify the migration plan.

**Example:**
```bash
$ python migrate.py --mode execute --batch-size 100
2026-02-13 12:15:00 - MigrationCLI - INFO - Starting migration in execute mode...
2026-02-13 12:15:01 - MigrationCLI - INFO - Step 1/4: Validating data...
2026-02-13 12:15:05 - MigrationCLI - INFO - ✓ Validation passed
2026-02-13 12:15:05 - MigrationCLI - INFO - Step 2/4: Creating backup...
2026-02-13 12:15:10 - MigrationCLI - INFO - ✓ Backup created: backups/pre_migration_20260213_121500.json
2026-02-13 12:15:10 - MigrationCLI - INFO - Step 3/4: Displaying migration plan...

============================================================
MIGRATION PLAN
============================================================
Mode: EXECUTE
Batch size: 100
Records to migrate: 14224
Backup timestamp: 20260213_121500
============================================================

Continue with migration? (yes/no): yes

2026-02-13 12:15:15 - MigrationCLI - INFO - Step 4/4: Executing migration...
2026-02-13 12:15:20 - MigrationCLI - INFO - Migrating transactions...
2026-02-13 12:15:25 - MigrationCLI - INFO - Transactions: 2164/2164 succeeded
2026-02-13 12:15:30 - MigrationCLI - INFO - Migrating transaction lines...
2026-02-13 12:15:45 - MigrationCLI - INFO - Transaction lines: 14224/14224 succeeded

============================================================
MIGRATION SUMMARY
============================================================
Mode: EXECUTE
Transactions: 2164/2164 succeeded
Transaction lines: 14224/14224 succeeded
Total succeeded: 16388
Total failed: 0
Success rate: 100.0%
Report: reports/migration_report.md
Summary: reports/migration_summary.json
============================================================
```

---

#### `python migrate.py rollback --backup-timestamp 20260213_121500`

Rolls back migration from a backup.

**What it does:**
- Locates backup file by timestamp
- Requires user confirmation
- Deletes migrated records
- Restores data from backup
- Verifies restoration

**Parameters:**
- `--backup-timestamp YYYYMMDD_HHMMSS` - Backup timestamp (required)

**Example:**
```bash
$ python migrate.py rollback --backup-timestamp 20260213_121500
2026-02-13 12:20:00 - MigrationCLI - INFO - Starting rollback from backup: 20260213_121500

============================================================
ROLLBACK CONFIRMATION
============================================================
Backup file: backups/pre_migration_20260213_121500.json
This will restore data from the backup.
Continue with rollback? (yes/no): yes

============================================================
ROLLBACK SUCCESSFUL
============================================================
Message: Rollback completed successfully
============================================================
```

---

## Typical Workflow

### Complete Migration Workflow

```bash
# Step 1: Run all analysis
python analyze.py all

# Step 2: Validate data
python migrate.py validate

# Step 3: Create backup
python migrate.py backup

# Step 4: Dry-run migration
python migrate.py --mode dry-run --batch-size 100

# Step 5: Review dry-run results
# Check reports/migration_report.md and reports/migration_summary.json

# Step 6: Execute migration
python migrate.py --mode execute --batch-size 100

# Step 7: Verify results
# Check reports/migration_report.md for success confirmation
```

### If Migration Fails

```bash
# Step 1: Check error logs
# Review logs/ directory for error details

# Step 2: Rollback if needed
python migrate.py rollback --backup-timestamp <timestamp>

# Step 3: Fix issues
# Refer to TROUBLESHOOTING_GUIDE.md

# Step 4: Retry migration
python migrate.py --mode dry-run --batch-size 100
python migrate.py --mode execute --batch-size 100
```

---

## Output Files

### Reports Directory

Generated reports are saved in `reports/`:

- `supabase_schema.json` / `.md` - Supabase schema documentation
- `excel_structure.json` / `.md` - Excel file structure
- `comparison_report.json` / `.md` - Structure comparison
- `account_mapping.json` - Account code mappings
- `validation_report.json` - Data validation results
- `migration_report.md` - Migration execution summary
- `migration_summary.json` - Migration statistics

### Backups Directory

Backups are saved in `backups/`:

- `pre_migration_YYYYMMDD_HHMMSS.json` - Pre-migration backup

### Logs Directory

Logs are saved in `logs/`:

- `migration_YYYYMMDD_HHMMSS.log` - Migration execution log
- `analysis_YYYYMMDD_HHMMSS.log` - Analysis execution log

---

## Tips and Best Practices

1. **Always run dry-run first** - Verify the migration plan before executing
2. **Review reports** - Check generated reports for warnings and issues
3. **Keep backups** - Backups are automatically created before migration
4. **Monitor logs** - Check log files for detailed execution information
5. **Validate data** - Run validation before migration to catch issues early
6. **Use appropriate batch size** - Adjust batch size based on network latency
7. **Document changes** - Keep records of migration timestamps and results

