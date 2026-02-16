# Excel Data Migration Execution Guide

## Overview
The migration executor has been updated to accept and require the `--org-id` parameter. This is necessary because Row Level Security (RLS) policies in Supabase require all records to have an `org_id` field.

## Organization ID
**Organization ID**: `731a3a00-6fa6-4282-9bec-8b5a8678e127`

## Migration Commands

### 1. Validate Excel Data (No org_id required)
```bash
python migrate.py validate
```
This validates the Excel file without connecting to Supabase.

### 2. Create Backup (No org_id required)
```bash
python migrate.py backup
```
Creates a backup of current Supabase data before migration.

### 3. Dry-Run Migration (Test without writing to database)
```bash
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```
- Tests the migration process without writing to the database
- Validates data transformation and mapping
- Shows what would be inserted

### 4. Execute Migration (Write to database)
```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```
- Performs the actual migration
- Writes data to `transactions` and `transaction_lines` tables
- Requires user confirmation before proceeding
- Creates a backup before starting

### 5. Rollback from Backup
```bash
python migrate.py rollback --backup-timestamp 20260214_143022
```
Restores data from a previous backup (use the timestamp from the backup file).

## Parameter Details

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--mode` | No | `dry-run` (default) or `execute` |
| `--batch-size` | No | Number of records per batch (default: 100) |
| `--org-id` | **Yes** | Organization ID for RLS policies |

## Recommended Workflow

1. **Validate data first**:
   ```bash
   python migrate.py validate
   ```

2. **Create a backup**:
   ```bash
   python migrate.py backup
   ```

3. **Run dry-run to test**:
   ```bash
   python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
   ```

4. **Review the dry-run results** in `reports/migration_report.md`

5. **Execute the migration**:
   ```bash
   python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
   ```

## What Happens During Migration

### Transactions Table
- Reads transaction data from Excel
- Adds `org_id` field to each record (if not present)
- Inserts into `transactions` table in Supabase

### Transaction Lines Table
- Reads transaction line items from Excel
- Adds `org_id` field to each record (if not present)
- Inserts into `transaction_lines` table in Supabase

## Output Files

After migration, check these files:
- `reports/migration_report.md` - Detailed migration report
- `reports/migration_summary.json` - JSON summary of results
- `backups/pre_migration_*.json` - Backup file (created before execute mode)

## Troubleshooting

### Error: "Could not find the 'account_code' column"
This error indicates the `org_id` was not being passed. The fix has been applied - ensure you're using the updated `migrate.py` with the `--org-id` parameter.

### Error: "Failed to connect to Supabase"
Check your `.env.local` file:
- Verify `SUPABASE_URL` is correct
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Ensure you're using project `bgxknceshxxifwytalex`

### Migration fails with RLS errors
Ensure:
- The `org_id` parameter is provided
- The organization exists in the database
- RLS policies are properly configured

## Key Changes Made

1. **migrate.py**:
   - Added `--org-id` parameter (required)
   - Updated `migrate_command()` to pass `org_id` to executor
   - Updated examples in docstring and epilog

2. **migration_executor.py** (previously updated):
   - `__init__()` accepts `org_id` parameter
   - `_clean_record()` automatically adds `org_id` to records
   - `create_migration_executor()` accepts and passes `org_id`

## Next Steps

1. Run the dry-run migration to test
2. Review the migration report
3. Execute the migration when ready
4. Verify data in Supabase
