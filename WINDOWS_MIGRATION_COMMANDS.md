# Windows Migration Commands

## Quick Start - Choose One Method

### Method 1: Batch File (Easiest)
```cmd
RUN_MIGRATION.bat
```

### Method 2: PowerShell Script
```powershell
.\RUN_MIGRATION.ps1
```

### Method 3: Direct Command (Copy & Paste)
```cmd
python scripts/prepare_migration_data.py --org-id d5789445-11e3-4ad6-9297-b56521675114 --excel-file transactions/KIRO_v4_Transactions.xlsx --output-dir data/prepared
```

---

## After Running the Script

### Step 1: Review Mapping Report
```cmd
type data\prepared\mapping_report.json
```

### Step 2: Check Prepared CSV Files
```cmd
REM Check transactions
type data\prepared\transactions_prepared.csv | more

REM Check transaction lines
type data\prepared\transaction_lines_prepared.csv | more

REM Count rows
dir data\prepared\*.csv
```

### Step 3: Upload via Supabase Dashboard
1. Open: https://app.supabase.com
2. Select your project
3. Table Editor → transactions → Insert → Import data
4. Select: `data/prepared/transactions_prepared.csv`
5. Click: Import
6. Repeat for transaction_lines table

### Step 4: Verify Import
```sql
-- Check transaction count
SELECT COUNT(*) FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 2,164

-- Check transaction lines count
SELECT COUNT(*) FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
-- Expected: 14,224
```

---

## Troubleshooting

### Script not found
Make sure you're in the project root directory:
```cmd
cd C:\5\accounting-systemr5
```

### Python not found
Install Python or add it to PATH:
```cmd
python --version
```

### Permission denied
Run Command Prompt as Administrator

### Excel file not found
Verify the file exists:
```cmd
dir transactions\KIRO_v4_Transactions.xlsx
```

---

## File Locations

```
C:\5\accounting-systemr5\
├── transactions\
│   └── KIRO_v4_Transactions.xlsx ........... Excel source
├── scripts\
│   └── prepare_migration_data.py .......... Script
├── config\
│   └── column_mapping_APPROVED.csv ........ Mapping
└── data\
    └── prepared\ (created by script)
        ├── transactions_prepared.csv ...... Output
        ├── transaction_lines_prepared.csv  Output
        └── mapping_report.json ........... Stats
```

---

## Expected Results

✅ 2,164 unique transactions
✅ 14,224 transaction lines
✅ All foreign keys resolved
✅ No NULL values in required fields

---

## Support

- **Quick Reference**: `MIGRATION_QUICK_COMMAND.md`
- **Full Guide**: `MIGRATION_EXECUTION_NEW_APPROACH.md`
- **Troubleshooting**: `MIGRATION_ACTION_PLAN_IMMEDIATE.md`

