# Migration - Quick Command Reference

## Correct File Paths

**Excel File Location**: `transactions/KIRO_v4_Transactions.xlsx`
**Organization ID**: `d5789445-11e3-4ad6-9297-b56521675114`
**Output Directory**: `data/prepared`

---

## Execute Migration in 4 Steps

### Step 1: Prepare Data
```bash
python scripts/prepare_migration_data.py \
  --org-id d5789445-11e3-4ad6-9297-b56521675114 \
  --excel-file transactions/KIRO_v4_Transactions.xlsx \
  --output-dir data/prepared
```

**What it does**:
- Connects to Supabase
- Exports reference data (accounts, projects, classifications, etc.)
- Reads Excel file from `transactions/KIRO_v4_Transactions.xlsx`
- Maps codes to UUIDs
- Generates prepared CSV files
- Creates mapping statistics

**Output**:
- `data/prepared/transactions_prepared.csv` (2,164 rows)
- `data/prepared/transaction_lines_prepared.csv` (14,224 rows)
- `data/prepared/mapping_report.json` (statistics)

---

### Step 2: Review Mapping Report
```bash
cat data/prepared/mapping_report.json
```

**Check for**:
- ✅ High match rates (>95% for required fields)
- ✅ All UUIDs valid format
- ✅ No NULL in required fields

---

### Step 3: Inspect CSV Files
```bash
# Check transactions
head -5 data/prepared/transactions_prepared.csv

# Check transaction lines
head -5 data/prepared/transaction_lines_prepared.csv

# Count rows
wc -l data/prepared/*.csv
```

---

### Step 4: Upload via Supabase Dashboard

1. Open: https://app.supabase.com
2. Select your project
3. **For transactions table**:
   - Table Editor → transactions → Insert → Import data
   - Select: `data/prepared/transactions_prepared.csv`
   - Click: Import
4. **For transaction_lines table**:
   - Table Editor → transaction_lines → Insert → Import data
   - Select: `data/prepared/transaction_lines_prepared.csv`
   - Click: Import

---

### Step 5: Verify Import
```sql
-- Check transaction count
SELECT COUNT(*) FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 2,164

-- Check transaction lines count
SELECT COUNT(*) FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 14,224

-- Verify foreign keys
SELECT COUNT(*) FROM transaction_lines 
WHERE account_id IS NULL;
-- Expected: 0
```

---

## File Locations Summary

```
Project Root
├── transactions/
│   └── KIRO_v4_Transactions.xlsx ........... Excel source file
├── scripts/
│   └── prepare_migration_data.py .......... Data preparation script
├── config/
│   └── column_mapping_APPROVED.csv ........ Column mapping
└── data/
    └── prepared/ (created by script)
        ├── transactions_prepared.csv ...... Prepared transactions
        ├── transaction_lines_prepared.csv  Prepared transaction lines
        └── mapping_report.json ........... Mapping statistics
```

---

## Troubleshooting

### Script fails to connect
```bash
# Check .env file
cat .env | grep SUPABASE

# Verify credentials are correct
```

### Excel file not found
```bash
# Verify file exists
ls -la transactions/KIRO_v4_Transactions.xlsx

# Or on Windows
dir transactions\KIRO_v4_Transactions.xlsx
```

### Mapping report shows missing data
```sql
-- Check if reference data exists
SELECT COUNT(*) FROM accounts 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

SELECT COUNT(*) FROM projects 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

---

## Expected Results

✅ 2,164 unique transactions
✅ 14,224 transaction lines
✅ All foreign keys resolved
✅ No NULL values in required fields
✅ Data ready for use

---

## Documentation

- **Quick Start**: `START_HERE_MIGRATION_FIX.md`
- **Quick Reference**: `QUICK_START_MIGRATION.md`
- **Comprehensive Guide**: `MIGRATION_EXECUTION_NEW_APPROACH.md`
- **Execution Checklist**: `MIGRATION_ACTION_PLAN_IMMEDIATE.md`
- **Technical Analysis**: `WHY_PREVIOUS_MIGRATION_FAILED.md`

---

## Ready?

Run this command:
```bash
python scripts/prepare_migration_data.py \
  --org-id d5789445-11e3-4ad6-9297-b56521675114 \
  --excel-file transactions/KIRO_v4_Transactions.xlsx \
  --output-dir data/prepared
```

Then follow the steps above.

