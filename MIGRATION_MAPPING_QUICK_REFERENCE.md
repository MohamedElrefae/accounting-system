# Migration Mapping - Quick Reference

## Current Implementation Status

### ✅ FIXED: Transactions Table
**Only these 3 columns are inserted:**
```
Excel Column    →    Supabase Column
─────────────────────────────────────
entry no        →    entry_number
entry date      →    entry_date
(auto-added)    →    org_id
```

### ✅ CORRECT: Transaction Lines Table
**All these columns are inserted:**
```
Excel Column                          →    Supabase Column
──────────────────────────────────────────────────────────
entry no                              →    entry_no
account code                          →    account_code
account name                          →    account_name
transaction classification code       →    transaction_classification_code
classification code                   →    classification_code
classification name                   →    classification_name
project code                          →    project_code
project name                          →    project_name
work analysis code                    →    work_analysis_code
work analysis name                    →    work_analysis_name
sub_tree code                         →    sub_tree_code
sub_tree name                         →    sub_tree_name
debit                                 →    debit_amount
credit                                →    credit_amount
notes                                 →    description
(auto-added)                          →    org_id
```

---

## Key Changes Made

### Problem
The migration was failing with error:
```
Could not find the 'entry_no' column of 'transactions' in the schema cache
```

This happened because the `_clean_record()` method was trying to insert columns that don't exist in the actual Supabase schema.

### Solution
Updated `src/executor/migration_executor.py` - `_clean_record()` method:

**Changed the `valid_columns` dictionary from:**
```python
'transactions': {
    'entry_number', 'entry_date', 'description', 'reference_number', 'notes',
    'org_id', 'status', 'approval_status', 'project_id'  # ❌ WRONG - too many columns
}
```

**To:**
```python
'transactions': {
    'entry_number',  # From Excel: "entry no"
    'entry_date',    # From Excel: "entry date"
    'org_id'         # Added by migration (required for RLS)
}  # ✅ CORRECT - only 3 columns
```

---

## How to Run Migration

```bash
# Dry-run (test without making changes)
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127

# Execute (apply changes to database)
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

When prompted, type `yes` or `y` to confirm.

---

## Verification

The migration executor now:
1. ✅ Maps Excel column names to Supabase column names correctly
2. ✅ Filters columns based on the ACTUAL table schema
3. ✅ Only inserts valid columns for each table
4. ✅ Adds `org_id` to all records for RLS compliance
5. ✅ Handles data type conversions (datetime, numpy types, etc.)

---

## Files Modified
- `src/executor/migration_executor.py` - Updated `_clean_record()` method with correct column filtering
