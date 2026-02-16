# Quick Start: Excel Data Migration

## TL;DR - Execute These Commands

```bash
# 1. Prepare data (resolves codes to UUIDs)
python scripts/prepare_migration_data.py \
  --org-id d5789445-11e3-4ad6-9297-b56521675114 \
  --excel-file transactions/KIRO_v4_Transactions.xlsx \
  --output-dir data/prepared

# 2. Review mapping report
cat data/prepared/mapping_report.json

# 3. Check prepared CSV files
head -5 data/prepared/transactions_prepared.csv
head -5 data/prepared/transaction_lines_prepared.csv
```

## Then: Upload via Supabase Dashboard

1. Go to: https://app.supabase.com
2. Select your project
3. Table Editor → transactions → Insert → Import data
4. Select: `data/prepared/transactions_prepared.csv`
5. Click: Import
6. Repeat for transaction_lines table with `data/prepared/transaction_lines_prepared.csv`

## Why This Approach?

- **Excel has codes** (strings like "ACC-001")
- **Database needs UUIDs** (foreign keys)
- **This script maps codes to UUIDs** automatically
- **Supabase Dashboard** handles the actual import safely

## Expected Results

- 2,164 unique transactions
- 14,224 transaction lines
- All foreign keys resolved
- Ready for import

## Troubleshooting

**Script fails to connect?**
- Check `.env` file has correct SUPABASE_URL and SUPABASE_KEY

**Mapping report shows missing data?**
- Check if reference data exists in Supabase
- Create missing accounts/projects first

**Upload fails?**
- Check mapping report for unresolved codes
- Verify column names in CSV match database schema

## Key Files

- **Preparation Script**: `scripts/prepare_migration_data.py`
- **Column Mapping**: `config/column_mapping_APPROVED.csv`
- **Full Guide**: `MIGRATION_EXECUTION_NEW_APPROACH.md`


