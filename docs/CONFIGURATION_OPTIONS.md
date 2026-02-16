# Configuration Options: Excel Data Migration to Supabase

## Overview

This document describes all configuration options for the Excel to Supabase migration tool.

## Environment Variables (.env)

The `.env` file contains all configuration settings. Copy `.env.example` to `.env` and edit with your values.

### Required Configuration

#### SUPABASE_URL

**Description**: The URL of your Supabase project

**Format**: `https://your-project.supabase.co`

**Example**:
```env
SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
```

**How to find**:
1. Go to Supabase dashboard
2. Click on your project
3. Go to Settings → API
4. Copy the "Project URL"

---

#### SUPABASE_KEY

**Description**: The anonymous API key for your Supabase project

**Format**: Long alphanumeric string

**Example**:
```env
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to find**:
1. Go to Supabase dashboard
2. Click on your project
3. Go to Settings → API
4. Copy the "anon public" key (NOT the service_role key)

**Security Note**: Never share this key or commit it to version control.

---

#### EXCEL_FILE_PATH

**Description**: Path to the Excel file to migrate

**Format**: Relative or absolute file path

**Examples**:
```env
# Relative path (from project root)
EXCEL_FILE_PATH=يومية الحدائق من البداية كاملة .xlsx

# Absolute path (Windows)
EXCEL_FILE_PATH=C:\Users\YourName\Documents\يومية الحدائق من البداية كاملة .xlsx

# Absolute path (macOS/Linux)
EXCEL_FILE_PATH=/Users/YourName/Documents/يومية الحدائق من البداية كاملة .xlsx
```

**Requirements**:
- File must exist and be readable
- File must be in `.xlsx` format
- File must not be open in Excel
- File must have sheet named `transactions ` (with trailing space)

---

### Optional Configuration

#### LOG_LEVEL

**Description**: Logging verbosity level

**Valid Values**:
- `DEBUG` - Very detailed, includes all operations
- `INFO` - General information about progress (default)
- `WARNING` - Only warnings and errors
- `ERROR` - Only errors
- `CRITICAL` - Only critical errors

**Default**: `INFO`

**Example**:
```env
LOG_LEVEL=DEBUG
```

**When to use**:
- `DEBUG` - Troubleshooting issues, detailed analysis
- `INFO` - Normal operation, production migrations
- `WARNING` - Minimal output, focus on issues
- `ERROR` - Only show errors
- `CRITICAL` - Only show critical errors

---

#### BATCH_SIZE

**Description**: Number of records to insert per batch

**Valid Values**: Integer between 1 and 1000

**Default**: 100

**Example**:
```env
BATCH_SIZE=100
```

**Recommendations**:
- **50**: Slower but uses less memory, better for slow networks
- **100**: Balanced (default)
- **500**: Faster but uses more memory, better for fast networks
- **1000**: Very fast but high memory usage

**Performance Impact**:
- Smaller batches: Slower migration, lower memory usage
- Larger batches: Faster migration, higher memory usage

---

#### DATABASE_TIMEOUT

**Description**: Connection timeout in seconds

**Valid Values**: Integer between 5 and 300

**Default**: 30

**Example**:
```env
DATABASE_TIMEOUT=30
```

**When to adjust**:
- Increase if experiencing timeout errors
- Decrease if connections hang too long

---

#### RETRY_ATTEMPTS

**Description**: Number of times to retry failed operations

**Valid Values**: Integer between 1 and 10

**Default**: 3

**Example**:
```env
RETRY_ATTEMPTS=3
```

**When to adjust**:
- Increase for unreliable networks
- Decrease for fast networks

---

#### RETRY_DELAY

**Description**: Delay in seconds between retry attempts

**Valid Values**: Integer between 1 and 60

**Default**: 5

**Example**:
```env
RETRY_DELAY=5
```

**When to adjust**:
- Increase if Supabase needs more time to recover
- Decrease for faster retries

---

## Command-Line Options

### Migration Commands

#### `--mode`

**Description**: Migration execution mode

**Valid Values**:
- `dry-run` - Simulate without database writes (default)
- `execute` - Execute actual migration

**Default**: `dry-run`

**Example**:
```bash
python migrate.py --mode dry-run
python migrate.py --mode execute
```

**Usage**:
- Always use `dry-run` first to verify the migration plan
- Use `execute` only after reviewing dry-run results

---

#### `--batch-size`

**Description**: Number of records per batch (overrides .env setting)

**Valid Values**: Integer between 1 and 1000

**Default**: 100 (or value from .env)

**Example**:
```bash
python migrate.py --mode execute --batch-size 50
python migrate.py --mode execute --batch-size 500
```

**Usage**:
- Command-line value overrides .env value
- Useful for testing different batch sizes

---

#### `--backup-timestamp`

**Description**: Timestamp of backup to restore (for rollback)

**Format**: `YYYYMMDD_HHMMSS`

**Example**:
```bash
python migrate.py rollback --backup-timestamp 20260213_121500
```

**How to find**:
- Check `backups/` directory for available backups
- Backup filename: `pre_migration_YYYYMMDD_HHMMSS.json`
- Use the timestamp part (after `pre_migration_`)

---

### Analysis Commands

#### `schema`

**Description**: Analyze Supabase schema

**Example**:
```bash
python analyze.py schema
```

**Output**:
- `reports/supabase_schema.json`
- `reports/supabase_schema.md`

---

#### `excel`

**Description**: Analyze Excel structure

**Example**:
```bash
python analyze.py excel
```

**Output**:
- `reports/excel_structure.json`
- `reports/excel_structure.md`

---

#### `compare`

**Description**: Compare Excel and Supabase structures

**Example**:
```bash
python analyze.py compare
```

**Output**:
- `reports/comparison_report.json`
- `reports/comparison_report.md`

---

#### `accounts`

**Description**: Build account code mappings

**Example**:
```bash
python analyze.py accounts
```

**Output**:
- `config/account_mapping.csv`
- `reports/account_mapping.json`

---

#### `all`

**Description**: Run all analysis tasks

**Example**:
```bash
python analyze.py all
```

**Output**: All analysis reports

---

## Configuration Files

### Column Mapping (config/column_mapping_APPROVED.csv)

**Description**: Maps Excel columns to Supabase fields

**Format**: CSV with columns:
- `Excel_Column` - Column name in Excel (Arabic)
- `English_Name` - English translation
- `Supabase_Table` - Target table in Supabase
- `Supabase_Column` - Target column in Supabase
- `Data_Type` - Data type (integer, text, decimal, etc.)

**Example**:
```csv
Excel_Column,English_Name,Supabase_Table,Supabase_Column,Data_Type
العام المالى,fiscal_year,transactions,fiscal_year,integer
الشهر,month,transactions,month,integer
entry no,entry_no,transactions,reference_number,text
entry date,entry_date,transactions,transaction_date,date
account code,account_code,transaction_lines,account_id,uuid
مدين,debit,transaction_lines,debit_amount,decimal
دائن,credit,transaction_lines,credit_amount,decimal
```

**Usage**:
- Used during migration to map Excel data to Supabase
- Generated during analysis phase
- Should be reviewed and approved before migration

---

### Account Mapping (config/account_mapping.csv)

**Description**: Maps Excel account codes to Supabase account IDs

**Format**: CSV with columns:
- `excel_code` - Account code from Excel
- `legacy_code` - Legacy code in Supabase
- `account_id` - UUID of account in Supabase
- `account_name` - Account name
- `mapped` - true/false indicating if mapping was found

**Example**:
```csv
excel_code,legacy_code,account_id,account_name,mapped
134,134,550e8400-e29b-41d4-a716-446655440000,Customer Accounts,true
135,135,550e8400-e29b-41d4-a716-446655440001,Supplier Accounts,true
```

**Usage**:
- Generated during account mapping analysis
- Used during migration to link transaction lines to accounts
- If any codes are unmapped (mapped=false), must be resolved before migration

---

## Advanced Configuration

### Logging Configuration

Logs are stored in `logs/` directory with timestamps.

**Log file naming**: `migration_YYYYMMDD_HHMMSS.log`

**Log format**:
```
2026-02-13 12:00:00 - MigrationCLI - INFO - Starting migration...
```

**Log levels in order of verbosity**:
1. DEBUG (most verbose)
2. INFO
3. WARNING
4. ERROR
5. CRITICAL (least verbose)

---

### Database Connection

**Connection parameters** (from .env):
- `SUPABASE_URL` - Database URL
- `SUPABASE_KEY` - API key
- `DATABASE_TIMEOUT` - Connection timeout
- `RETRY_ATTEMPTS` - Number of retries
- `RETRY_DELAY` - Delay between retries

**Connection pooling**:
- Connections are reused across operations
- Automatically closed after migration

---

### Performance Tuning

**For slow networks**:
```env
BATCH_SIZE=50
DATABASE_TIMEOUT=60
RETRY_ATTEMPTS=5
RETRY_DELAY=10
```

**For fast networks**:
```env
BATCH_SIZE=500
DATABASE_TIMEOUT=15
RETRY_ATTEMPTS=2
RETRY_DELAY=2
```

**For large datasets**:
```env
BATCH_SIZE=100
LOG_LEVEL=WARNING
```

**For debugging**:
```env
BATCH_SIZE=50
LOG_LEVEL=DEBUG
```

---

## Configuration Examples

### Example 1: Basic Setup

```env
SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXCEL_FILE_PATH=يومية الحدائق من البداية كاملة .xlsx
LOG_LEVEL=INFO
BATCH_SIZE=100
```

### Example 2: Slow Network

```env
SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXCEL_FILE_PATH=يومية الحدائق من البداية كاملة .xlsx
LOG_LEVEL=INFO
BATCH_SIZE=50
DATABASE_TIMEOUT=60
RETRY_ATTEMPTS=5
RETRY_DELAY=10
```

### Example 3: Debugging

```env
SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXCEL_FILE_PATH=يومية الحدائق من البداية كاملة .xlsx
LOG_LEVEL=DEBUG
BATCH_SIZE=50
DATABASE_TIMEOUT=30
RETRY_ATTEMPTS=3
RETRY_DELAY=5
```

### Example 4: Production

```env
SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXCEL_FILE_PATH=/absolute/path/to/يومية الحدائق من البداية كاملة .xlsx
LOG_LEVEL=INFO
BATCH_SIZE=200
DATABASE_TIMEOUT=30
RETRY_ATTEMPTS=3
RETRY_DELAY=5
```

---

## Validation

### Configuration Validation

The system validates configuration on startup:

```bash
# Test configuration
python -c "from src.services.supabase_connection import SupabaseConnectionManager; cm = SupabaseConnectionManager(); print('✓ OK' if cm.test_connection() else '✗ Failed')"
```

### Common Configuration Errors

**Error**: `SUPABASE_URL not found in environment`
- **Solution**: Add `SUPABASE_URL` to `.env`

**Error**: `SUPABASE_KEY not found in environment`
- **Solution**: Add `SUPABASE_KEY` to `.env`

**Error**: `EXCEL_FILE_PATH not found in environment`
- **Solution**: Add `EXCEL_FILE_PATH` to `.env`

**Error**: `Failed to connect to Supabase`
- **Solution**: Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct

**Error**: `Excel file not found`
- **Solution**: Verify `EXCEL_FILE_PATH` is correct and file exists

---

## Best Practices

1. **Use absolute paths** for Excel file in production
2. **Keep backups** of `.env` file (without credentials)
3. **Use appropriate batch size** for your network
4. **Enable DEBUG logging** when troubleshooting
5. **Document configuration changes** for audit trail
6. **Test configuration** before production migration
7. **Use environment variables** for sensitive data
8. **Never commit `.env`** to version control

---

## Troubleshooting Configuration

### Configuration Not Being Read

```bash
# Verify .env file exists
ls -la .env

# Verify .env is in project root
pwd
```

### Configuration Values Not Applied

```bash
# Check if virtual environment is activated
which python

# Reinstall dependencies
pip install -r requirements.txt

# Restart terminal/IDE
```

### Invalid Configuration Values

```bash
# Validate configuration
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('SUPABASE_URL'))"
```

