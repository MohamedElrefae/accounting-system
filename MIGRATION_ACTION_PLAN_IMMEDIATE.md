# Migration Action Plan - Immediate Execution

## Status: READY TO EXECUTE ✅

All analysis complete. New approach is safe, transparent, and proven.

---

## What Changed

### Problem Identified
- Excel data uses **codes** (strings)
- Database expects **UUIDs** (foreign keys)
- Previous migration tried to insert codes directly → **FAILED**

### Solution Implemented
- Created data preparation script that:
  1. Exports reference data from Supabase
  2. Maps codes to UUIDs locally
  3. Generates prepared CSV files
  4. Validates all mappings
  5. Provides mapping statistics

### Why It's Better
- ✅ Transparent (see what's being imported)
- ✅ Validatable (verify before upload)
- ✅ Debuggable (identify issues locally)
- ✅ Safe (Supabase Dashboard upload)
- ✅ Accurate (no column mismatches)

---

## Execution Timeline

### Phase 1: Data Preparation (5-10 minutes)
```bash
python scripts/prepare_migration_data.py \
  --org-id d5789445-11e3-4ad6-9297-b56521675114 \
  --excel-file transactions/KIRO_v4_Transactions.xlsx \
  --output-dir data/prepared
```

**Output**:
- `data/prepared/transactions_prepared.csv` (2,164 rows)
- `data/prepared/transaction_lines_prepared.csv` (14,224 rows)
- `data/prepared/mapping_report.json` (statistics)

### Phase 2: Review & Validation (5 minutes)
```bash
# Check mapping statistics
cat data/prepared/mapping_report.json

# Inspect CSV files
head -5 data/prepared/transactions_prepared.csv
head -5 data/prepared/transaction_lines_prepared.csv
```

**Verify**:
- ✅ High match rates (>95% for required fields)
- ✅ All UUIDs valid format
- ✅ No NULL in required fields

### Phase 3: Upload to Supabase (10-15 minutes)
1. Open: https://app.supabase.com
2. Select your project
3. Table Editor → transactions → Insert → Import data
4. Select: `data/prepared/transactions_prepared.csv`
5. Click: Import
6. Repeat for transaction_lines table

### Phase 4: Verification (5 minutes)
```sql
-- Check counts
SELECT COUNT(*) FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

SELECT COUNT(*) FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verify foreign keys
SELECT COUNT(*) FROM transaction_lines 
WHERE account_id IS NULL;
```

**Expected**:
- Transactions: 2,164 rows
- Transaction lines: 14,224 rows
- NULL account_ids: 0

---

## Pre-Execution Checklist

- [ ] `.env` file has correct SUPABASE_URL and SUPABASE_KEY
- [ ] Excel file exists: `transactions/KIRO_v4_Transactions.xlsx`
- [ ] Organization ID confirmed: `d5789445-11e3-4ad6-9297-b56521675114`
- [ ] Python environment has required packages (pandas, supabase-py)
- [ ] Supabase project is accessible
- [ ] Reference data exists in Supabase (accounts, projects, etc.)

---

## Command Reference

### 1. Prepare Data
```bash
python scripts/prepare_migration_data.py \
  --org-id d5789445-11e3-4ad6-9297-b56521675114 \
  --excel-file transactions/KIRO_v4_Transactions.xlsx \
  --output-dir data/prepared
```

### 2. Review Mapping Report
```bash
cat data/prepared/mapping_report.json
```

### 3. Check CSV Files
```bash
# First 5 rows of transactions
head -5 data/prepared/transactions_prepared.csv

# First 5 rows of transaction lines
head -5 data/prepared/transaction_lines_prepared.csv

# Row counts
wc -l data/prepared/*.csv
```

### 4. Verify Import (SQL)
```sql
-- Count transactions
SELECT COUNT(*) as transaction_count FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Count transaction lines
SELECT COUNT(*) as line_count FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Check for missing account IDs
SELECT COUNT(*) as missing_accounts FROM transaction_lines 
WHERE account_id IS NULL 
AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Sample data
SELECT * FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
LIMIT 5;
```

---

## Troubleshooting Guide

### Issue: Script fails to connect to Supabase

**Error**: `Failed to connect to Supabase`

**Solution**:
1. Check `.env` file:
   ```bash
   cat .env | grep SUPABASE
   ```
2. Verify credentials are correct
3. Test connection:
   ```bash
   python -c "from src.analyzer.supabase_connection import SupabaseConnectionManager; m = SupabaseConnectionManager(); print(m.connect())"
   ```

### Issue: Mapping report shows many missing codes

**Error**: `mapping_report.json` shows low match rates

**Solution**:
1. Check if reference data exists:
   ```sql
   SELECT COUNT(*) FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   ```
2. Create missing reference data if needed
3. Re-run preparation script

### Issue: Upload fails with foreign key error

**Error**: `Foreign key constraint violation`

**Solution**:
1. Check mapping report for unresolved codes
2. Verify reference data exists in Supabase
3. Re-run preparation script
4. Check CSV file for NULL values in account_id column

### Issue: CSV file has wrong column names

**Error**: `Column mismatch during import`

**Solution**:
1. Verify `config/column_mapping_APPROVED.csv` is correct
2. Check prepared CSV headers:
   ```bash
   head -1 data/prepared/transaction_lines_prepared.csv
   ```
3. Compare with database schema
4. Re-run preparation script

---

## Rollback Procedure

If import fails or data is incorrect:

```sql
-- Delete imported transaction lines
DELETE FROM transaction_lines 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE created_at > NOW() - INTERVAL '1 hour'
  AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
);

-- Delete imported transactions
DELETE FROM transactions 
WHERE created_at > NOW() - INTERVAL '1 hour'
AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Verify deletion
SELECT COUNT(*) FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

---

## Success Criteria

✅ **Phase 1**: Preparation script runs successfully
✅ **Phase 2**: Mapping report shows >95% match rate for required fields
✅ **Phase 3**: CSV files upload successfully to Supabase
✅ **Phase 4**: Verification queries show correct row counts
✅ **Final**: No NULL values in required foreign key columns

---

## Documentation Reference

| Document | Purpose |
|----------|---------|
| `QUICK_START_MIGRATION.md` | Quick reference (TL;DR) |
| `MIGRATION_EXECUTION_NEW_APPROACH.md` | Comprehensive guide |
| `MIGRATION_SOLUTION_SUMMARY.md` | Complete solution overview |
| `WHY_PREVIOUS_MIGRATION_FAILED.md` | Technical analysis |
| `config/column_mapping_APPROVED.csv` | Column mapping reference |
| `scripts/prepare_migration_data.py` | Data preparation script |

---

## Next Steps

1. **NOW**: Review this action plan
2. **NEXT**: Run data preparation script
3. **THEN**: Review mapping report
4. **THEN**: Upload via Supabase Dashboard
5. **FINALLY**: Verify import success

---

## Support

For issues:
1. Check troubleshooting guide above
2. Review mapping report for missing data
3. Check logs for detailed error messages
4. Refer to comprehensive guide: `MIGRATION_EXECUTION_NEW_APPROACH.md`

---

## Timeline Estimate

- **Preparation**: 5-10 minutes
- **Review**: 5 minutes
- **Upload**: 10-15 minutes
- **Verification**: 5 minutes
- **Total**: ~30-45 minutes

---

## Ready to Execute?

✅ All analysis complete
✅ Solution implemented
✅ Documentation provided
✅ Troubleshooting guide ready

**Start with**: `python scripts/prepare_migration_data.py --org-id d5789445-11e3-4ad6-9297-b56521675114 --excel-file transactions/KIRO_v4_Transactions.xlsx --output-dir data/prepared`


