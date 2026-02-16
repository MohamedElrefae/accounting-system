# Migration Column Filtering Fix

## Problem Identified
The migration was failing with error: **"Could not find the 'account_code' column of 'transactions' in the schema cache"**

This occurred because the migration executor was trying to insert ALL columns from the Excel file into the `transactions` table, including columns that only belong to the `transaction_lines` table.

## Root Cause
According to the column mapping (`config/column_mapping_APPROVED.csv`):
- **transactions table** should only receive: `entry_no`, `entry_date`, `org_id`
- **transaction_lines table** should receive: `account_code`, `account_name`, `classification_code`, `project_code`, `work_analysis_code`, `sub_tree_code`, `debit`, `credit`, `notes`, and other line-item fields

The `_clean_record()` method was not filtering columns based on the target table, so it was trying to insert `account_code` into the `transactions` table, which doesn't have that column.

## Solution Implemented

### Updated `_clean_record()` Method
- Added `table_name` parameter to identify which table is being inserted into
- Added `valid_columns` dictionary that maps each table to its allowed columns
- Filters out columns that don't belong to the target table before insertion
- Still adds `org_id` to all records for RLS compliance

### Updated `_insert_batch()` Method
- Now passes `table_name` parameter to `_clean_record()` call
- Ensures proper column filtering for each table

## Column Mapping

### Transactions Table (Header Records)
- `entry_no` - Entry/Transaction Number
- `entry_date` - Entry Date
- `org_id` - Organization ID (added by migration)

### Transaction Lines Table (Line Item Records)
- `entry_no` - Links to transaction header
- `account_code` - Account Code
- `account_name` - Account Name
- `transaction_classification_code` - Transaction Classification
- `classification_code` - Classification Code
- `classification_name` - Classification Name
- `project_code` - Project Code
- `project_name` - Project Name
- `work_analysis_code` - Work Analysis Code
- `work_analysis_name` - Work Analysis Name
- `sub_tree_code` - Sub Tree Code
- `sub_tree_name` - Sub Tree Name
- `debit` - Debit Amount
- `credit` - Credit Amount
- `notes` - Notes
- `org_id` - Organization ID (added by migration)

## Testing the Fix

Run the migration again with:
```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

The migration should now:
1. Insert only `entry_no`, `entry_date`, and `org_id` into the `transactions` table
2. Insert all line-item columns (including `account_code`) into the `transaction_lines` table
3. Complete successfully without schema cache errors

## Files Modified
- `src/executor/migration_executor.py`:
  - Updated `_clean_record()` method with column filtering logic
  - Updated `_insert_batch()` method to pass `table_name` parameter
