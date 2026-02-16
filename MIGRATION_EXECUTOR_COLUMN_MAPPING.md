# Migration Executor Column Mapping - ACTUAL SUPABASE SCHEMA

## Overview
This document shows the ACTUAL column mapping implemented in `src/executor/migration_executor.py` for both the `transactions` and `transaction_lines` tables.

---

## Transactions Table Mapping

### Excel → Supabase Column Mapping
| Excel Column | Supabase Column | Notes |
|---|---|---|
| `entry no` | `entry_number` | **CRITICAL**: Maps to `entry_number`, NOT `entry_no` |
| `entry date` | `entry_date` | Transaction date |
| *(none)* | `org_id` | Added by migration (required for RLS) |

### Valid Columns for Insertion
The `transactions` table only accepts these columns from Excel data:
- `entry_number` (mapped from "entry no")
- `entry_date` (mapped from "entry date")
- `org_id` (added by migration)

### Auto-Managed Columns (NOT inserted)
These columns are managed by Supabase and should NOT be included in inserts:
- `id` - Auto-generated primary key
- `created_at` - Auto-set to NOW()
- `updated_at` - Auto-set to NOW()
- `created_by` - Set by trigger/application
- `updated_by` - Set by trigger/application

---

## Transaction Lines Table Mapping

### Excel → Supabase Column Mapping
| Excel Column | Supabase Column | Notes |
|---|---|---|
| `entry no` | `entry_no` | Links to transaction header |
| `account code` | `account_code` | Account code |
| `account name` | `account_name` | Account name |
| `transaction classification code` | `transaction_classification_code` | Transaction classification |
| `classification code` | `classification_code` | Classification code |
| `classification name` | `classification_name` | Classification name |
| `project code` | `project_code` | Project code |
| `project name` | `project_name` | Project name |
| `work analysis code` | `work_analysis_code` | Work analysis code |
| `work analysis name` | `work_analysis_name` | Work analysis name |
| `sub_tree code` | `sub_tree_code` | Sub tree code |
| `sub_tree name` | `sub_tree_name` | Sub tree name |
| `debit` | `debit_amount` | Debit amount |
| `credit` | `credit_amount` | Credit amount |
| `notes` | `description` | Notes/description |
| *(none)* | `org_id` | Added by migration (required for RLS) |

### Valid Columns for Insertion
The `transaction_lines` table accepts these columns from Excel data:
- `entry_no` (mapped from "entry no")
- `account_code` (mapped from "account code")
- `account_name` (mapped from "account name")
- `transaction_classification_code` (mapped from "transaction classification code")
- `classification_code` (mapped from "classification code")
- `classification_name` (mapped from "classification name")
- `project_code` (mapped from "project code")
- `project_name` (mapped from "project name")
- `work_analysis_code` (mapped from "work analysis code")
- `work_analysis_name` (mapped from "work analysis name")
- `sub_tree_code` (mapped from "sub_tree code")
- `sub_tree_name` (mapped from "sub_tree name")
- `debit_amount` (mapped from "debit")
- `credit_amount` (mapped from "credit")
- `description` (mapped from "notes")
- `org_id` (added by migration)

### Auto-Managed Columns (NOT inserted)
These columns are managed by Supabase and should NOT be included in inserts:
- `id` - Auto-generated primary key
- `created_at` - Auto-set to NOW()
- `updated_at` - Auto-set to NOW()
- `created_by` - Set by trigger/application
- `updated_by` - Set by trigger/application

---

## Column Filtering Logic

### For `transactions` table:
1. Read all columns from Excel
2. Map column names using `column_mapping` dictionary
3. **Filter to ONLY these columns**: `entry_number`, `entry_date`, `org_id`
4. All other columns are discarded
5. Insert into `transactions` table

### For `transaction_lines` table:
1. Read all columns from Excel
2. Map column names using `column_mapping` dictionary
3. **Filter to ONLY these columns**: All line-item columns listed above
4. All other columns are discarded
5. Insert into `transaction_lines` table

---

## RLS (Row Level Security) Requirement

Both tables have RLS policies that require:
- User must be a member of the organization (`org_id`)
- User can only see/modify records for their organization
- **The `org_id` field is CRITICAL for RLS to work correctly**

All records MUST include the `org_id` field set to: `731a3a00-6fa6-4282-9bec-8b5a8678e127`

---

## Implementation Details

### Location
File: `src/executor/migration_executor.py`
Method: `MigrationExecutor._clean_record()`

### How It Works
1. **Column Mapping**: Excel column names are mapped to Supabase column names using the `column_mapping` dictionary
2. **Column Filtering**: Only columns in `valid_columns[table_name]` are kept
3. **Data Cleaning**: 
   - NaN values are removed
   - Datetime objects are converted to ISO format strings
   - NumPy types are converted to Python types
4. **RLS Compliance**: `org_id` is automatically added if not present

### Key Fix Applied
The previous implementation had incorrect `valid_columns` that included columns not in the actual Supabase schema. This has been corrected to match the ACTUAL schema:

**Before (WRONG):**
```python
'transactions': {
    'entry_number', 'entry_date', 'description', 'reference_number', 'notes',
    'org_id', 'status', 'approval_status', 'project_id'
}
```

**After (CORRECT):**
```python
'transactions': {
    'entry_number',  # From Excel: "entry no"
    'entry_date',    # From Excel: "entry date"
    'org_id'         # Added by migration (required for RLS)
}
```

---

## Testing the Migration

To test the migration with the corrected column mapping:

```bash
# Dry-run mode (no database changes)
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127

# Execute mode (applies changes to database)
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

---

## Status
✅ Column mapping corrected to match ACTUAL Supabase schema
✅ `transactions` table now only accepts: `entry_number`, `entry_date`, `org_id`
✅ `transaction_lines` table accepts all line-item columns
✅ RLS compliance ensured with `org_id` field
