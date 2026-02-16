# Excel Data Migration - New Approach (Safe & Transparent)

## Overview

This document describes the **recommended approach** for migrating Excel data to Supabase. The key insight is that Excel data uses **codes** (strings) but the database expects **UUIDs** with foreign key relationships.

**Status**: Ready to execute

---

## Why the New Approach?

### Previous Approach Issues
- ❌ Column mapping alone insufficient (codes ≠ UUIDs)
- ❌ Foreign key constraints fail silently
- ❌ Hard to debug missing reference data
- ❌ No visibility into what's being imported

### New Approach Benefits
- ✅ **Transparent**: See exactly what data is being imported
- ✅ **Validatable**: Verify mappings before upload
- ✅ **Debuggable**: Identify missing reference data
- ✅ **Safe**: Supabase dashboard provides visual feedback
- ✅ **Accurate**: No column name mismatches

---

## Architecture

```
Excel File
    ↓
[1] Read & Validate
    ↓
[2] Export Reference Data (Supabase)
    ├─ accounts (code → id)
    ├─ projects (code → id)
    ├─ classifications (code → id)
    ├─ work_items (code → id)
    ├─ analysis_work_items (code → id)
    ├─ cost_centers (code → id)
    └─ sub_trees (code → id)
    ↓
[3] Prepare Local CSV Files
    ├─ transactions_prepared.csv (with org_id)
    └─ transaction_lines_prepared.csv (with resolved UUIDs)
    ↓
[4] Validate Prepared Data
    ├─ All foreign keys resolve
    ├─ No NULL in required fields
    └─ Amounts are valid
    ↓
[5] Upload via Supabase Dashboard
    ├─ transactions_prepared.csv → transactions table
    └─ transaction_lines_prepared.csv → transaction_lines table
```

---

## Step-by-Step Execution

### Step 1: Prepare Environment

```bash
# Ensure .env has correct credentials
cat .env | grep SUPABASE

# Verify org_id is correct
echo "Organization ID: d5789445-11e3-4ad6-9297-b56521675114"
```

### Step 2: Run Data Preparation Script

```bash
python scripts/prepare_migration_data.py \
  --org-id d5789445-11e3-4ad6-9297-b56521675114 \
  --excel-file transactions/KIRO_v4_Transactions.xlsx \
  --output-dir data/prepared
```

**What this does:**
1. Connects to Supabase
2. Exports all reference data (accounts, projects, etc.)
3. Reads Excel file
4. Maps codes to UUIDs
5. Generates prepared CSV files
6. Validates all mappings
7. Creates mapping report

**Expected output:**
```
data/prepared/
├── transactions_prepared.csv
├── transaction_lines_prepared.csv
└── mapping_report.json
```

### Step 3: Review Mapping Report

```bash
cat data/prepared/mapping_report.json
```

**Look for:**
- ✅ High match rates (>95% for required fields)
- ⚠️ Missing codes (investigate if critical)
- ✅ All required fields resolved

**Example report:**
```json
{
  "accounts": {
    "total": 14224,
    "matched": 14200,
    "missing": ["ACC-999", "ACC-1000"]
  },
  "projects": {
    "total": 8500,
    "matched": 8500,
    "missing": []
  }
}
```

### Step 4: Inspect Prepared CSV Files

```bash
# Check transactions
head -5 data/prepared/transactions_prepared.csv

# Check transaction lines
head -5 data/prepared/transaction_lines_prepared.csv
```

**Verify:**
- ✅ Column names match database schema
- ✅ UUIDs are valid format
- ✅ No NULL values in required fields
- ✅ Amounts are numeric

### Step 5: Upload via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project
   - Navigate to: SQL Editor

2. **Upload transactions_prepared.csv**
   - Go to: Table Editor → transactions
   - Click: "Insert" → "Import data"
   - Select: `data/prepared/transactions_prepared.csv`
   - Review: Column mapping
   - Click: "Import"

3. **Upload transaction_lines_prepared.csv**
   - Go to: Table Editor → transaction_lines
   - Click: "Insert" → "Import data"
   - Select: `data/prepared/transaction_lines_prepared.csv`
   - Review: Column mapping
   - Click: "Import"

4. **Verify Import**
   - Check row counts
   - Spot-check data
   - Verify foreign keys

---

## Data Schema Reference

### Transactions Table
```
entry_number (string) - Entry/transaction number
entry_date (date) - Entry date
description (string) - Transaction description
org_id (uuid) - Organization ID
```

### Transaction Lines Table
```
account_id (uuid) - Foreign key to accounts
debit_amount (numeric 15,4) - Debit amount
credit_amount (numeric 15,4) - Credit amount
description (string) - Line description
project_id (uuid, nullable) - Foreign key to projects
classification_id (uuid, nullable) - Foreign key to transaction_classification
work_item_id (uuid, nullable) - Foreign key to work_items
analysis_work_item_id (uuid, nullable) - Foreign key to analysis_work_items
cost_center_id (uuid, nullable) - Foreign key to cost_centers
sub_tree_id (uuid, nullable) - Foreign key to sub_tree
org_id (uuid) - Organization ID
```

---

## Troubleshooting

### Issue: "Missing reference data"

**Symptom**: Mapping report shows many missing codes

**Solution**:
1. Check if reference data exists in Supabase
2. Create missing reference data first
3. Re-run preparation script

```sql
-- Check accounts
SELECT code, COUNT(*) FROM accounts 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY code;
```

### Issue: "Foreign key constraint violation"

**Symptom**: Upload fails with FK error

**Solution**:
1. Check mapping report for missing UUIDs
2. Verify reference data exists
3. Re-run preparation script

### Issue: "Column mismatch"

**Symptom**: Upload fails with column error

**Solution**:
1. Verify CSV column names match database schema
2. Check `config/column_mapping_APPROVED.csv`
3. Re-run preparation script

---

## Rollback Plan

If import fails or data is incorrect:

1. **Identify affected records**
   ```sql
   SELECT COUNT(*) FROM transactions 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   ```

2. **Delete imported records**
   ```sql
   DELETE FROM transaction_lines 
   WHERE transaction_id IN (
     SELECT id FROM transactions 
     WHERE created_at > NOW() - INTERVAL '1 hour'
     AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
   );
   
   DELETE FROM transactions 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   ```

3. **Fix data and re-run preparation**

---

## Success Criteria

✅ All transactions imported successfully
✅ All transaction lines imported successfully
✅ Foreign key constraints satisfied
✅ Data matches Excel source
✅ No NULL values in required fields
✅ Amounts balance correctly

---

## Next Steps

1. Run data preparation script
2. Review mapping report
3. Inspect prepared CSV files
4. Upload via Supabase Dashboard
5. Verify import success
6. Run validation queries

---

## Files Reference

- **Preparation Script**: `scripts/prepare_migration_data.py`
- **Column Mapping**: `config/column_mapping_APPROVED.csv`
- **Excel Source**: `transactions/KIRO_v4_Transactions.xlsx`
- **Output Directory**: `data/prepared/`

---

## Support

For issues or questions:
1. Check mapping report for missing data
2. Verify reference data in Supabase
3. Review troubleshooting section
4. Check logs for detailed error messages


