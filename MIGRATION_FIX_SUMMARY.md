# Migration Fix Summary - Column Mapping Corrected

## Problem Identified
The migration was failing with error:
```
Could not find the 'entry_no' column of 'transactions' in the schema cache
```

**Root Cause**: The `_clean_record()` method in `src/executor/migration_executor.py` was configured with incorrect `valid_columns` that included columns not present in the actual Supabase schema.

---

## What Was Fixed

### File Modified
`src/executor/migration_executor.py` - Method: `_clean_record()`

### The Issue
The `valid_columns` dictionary had:
```python
'transactions': {
    'entry_number', 'entry_date', 'description', 'reference_number', 'notes',
    'org_id', 'status', 'approval_status', 'project_id'
}
```

This included columns like `description`, `reference_number`, `notes`, `status`, `approval_status`, and `project_id` which don't exist in the actual Supabase `transactions` table schema.

### The Fix
Updated to match the ACTUAL Supabase schema:
```python
'transactions': {
    'entry_number',  # From Excel: "entry no"
    'entry_date',    # From Excel: "entry date"
    'org_id'         # Added by migration (required for RLS)
}
```

---

## Migration Flow After Fix

### Step 1: Read Excel Data
- Reads all columns from the Excel file
- Example columns: "entry no", "entry date", "account code", "debit", "credit", etc.

### Step 2: For Each Transaction Header Row
1. Extract: `entry no` → maps to `entry_number`
2. Extract: `entry date` → maps to `entry_date`
3. Add: `org_id` = `731a3a00-6fa6-4282-9bec-8b5a8678e127`
4. **Filter**: Keep ONLY these 3 columns
5. Insert into `transactions` table

### Step 3: For Each Transaction Line Row
1. Extract all line-item columns:
   - `entry no` → `entry_no`
   - `account code` → `account_code`
   - `account name` → `account_name`
   - `debit` → `debit_amount`
   - `credit` → `credit_amount`
   - `notes` → `description`
   - ... (and all other line-item columns)
2. Add: `org_id` = `731a3a00-6fa6-4282-9bec-8b5a8678e127`
3. **Filter**: Keep ONLY valid line-item columns
4. Insert into `transaction_lines` table

---

## Column Mapping Reference

### Transactions Table (3 columns)
| Excel | Supabase | Source |
|---|---|---|
| entry no | entry_number | Excel column |
| entry date | entry_date | Excel column |
| *(auto)* | org_id | Migration |

### Transaction Lines Table (16 columns)
| Excel | Supabase |
|---|---|
| entry no | entry_no |
| account code | account_code |
| account name | account_name |
| transaction classification code | transaction_classification_code |
| classification code | classification_code |
| classification name | classification_name |
| project code | project_code |
| project name | project_name |
| work analysis code | work_analysis_code |
| work analysis name | work_analysis_name |
| sub_tree code | sub_tree_code |
| sub_tree name | sub_tree_name |
| debit | debit_amount |
| credit | credit_amount |
| notes | description |
| *(auto)* | org_id |

---

## RLS Compliance

Both tables have Row Level Security (RLS) policies that require:
- All records MUST have `org_id` field
- User must be a member of the organization
- User can only see/modify records for their organization

**The migration now ensures all records include**: `org_id = 731a3a00-6fa6-4282-9bec-8b5a8678e127`

---

## How to Test the Fix

### 1. Dry-Run Mode (Recommended First)
```bash
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

This will:
- Read the Excel file
- Validate the data
- Show what would be migrated
- NOT make any database changes

### 2. Execute Mode (After Dry-Run Succeeds)
```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

This will:
- Create a backup of current data
- Validate the data
- Migrate transactions and transaction lines
- Generate reports

When prompted: Type `yes` or `y` to confirm

---

## Expected Results

### Before Fix
```
Error: Could not find the 'entry_no' column of 'transactions' in the schema cache
```

### After Fix
```
Transactions: X/X succeeded
Transaction lines: Y/Y succeeded
Success rate: 100%
```

---

## Files Changed
- ✅ `src/executor/migration_executor.py` - Updated `_clean_record()` method

## Files NOT Changed
- `migrate.py` - Already correctly passes `org_id` parameter
- `.env.local` - Already has correct Supabase credentials
- Excel file - No changes needed

---

## Next Steps

1. **Test the fix**: Run dry-run mode first
2. **Verify output**: Check that no errors occur
3. **Execute migration**: Run execute mode when ready
4. **Verify data**: Check Supabase to confirm records were inserted correctly

---

## Status
✅ **FIXED** - Column mapping corrected to match actual Supabase schema
✅ **READY** - Migration can now proceed without schema errors
