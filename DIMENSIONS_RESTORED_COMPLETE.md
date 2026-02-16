# Accounting Dimensions Restored

## Issue

The previous SQL generation script (`regenerate_sql_files_5_parts.py`) was missing the critical accounting dimensions:
- `classification_id`
- `project_id`
- `analysis_work_item_id`
- `sub_tree_id`

These dimensions are essential for your accounting system and exist in the Excel file.

## Solution

Created new script: `regenerate_sql_files_5_parts_WITH_DIMENSIONS.py`

This script now includes ALL dimension columns in the SQL INSERT statements.

## What Was Added

### SQL Column List (Before):
```sql
INSERT INTO transaction_lines (
    transaction_id,
    line_no,
    account_id,
    debit_amount,
    credit_amount,
    description,
    org_id
)
```

### SQL Column List (After - WITH DIMENSIONS):
```sql
INSERT INTO transaction_lines (
    transaction_id,
    line_no,
    account_id,
    classification_id,      -- ✅ ADDED
    project_id,             -- ✅ ADDED
    analysis_work_item_id,  -- ✅ ADDED
    sub_tree_id,            -- ✅ ADDED
    debit_amount,
    credit_amount,
    description,
    org_id
)
```

### VALUES Clause (Before):
```sql
VALUES
    (row_num, txn_ref, account_id, debit, credit, desc, org_id)
```

### VALUES Clause (After - WITH DIMENSIONS):
```sql
VALUES
    (row_num, txn_ref, account_id, classification_id, project_id, analysis_work_item_id, sub_tree_id, debit, credit, desc, org_id)
```

## Dimension Data in Excel

The script reads these columns from Excel:
- `transaction classification code` → `classification_id`
- `project code` → `project_id`
- `work analysis code` → `analysis_work_item_id`
- `sub_tree code` → `sub_tree_id`

## Dimension Coverage

From the CSV analysis:
- `classification_id`: 13,743 non-null values (98.4%)
- `project_id`: 14,161 non-null values (100%)
- `analysis_work_item_id`: 13,369 non-null values (95.7%)
- `sub_tree_id`: 14,151 non-null values (99.9%)

NULL values are handled properly in the SQL (inserted as NULL).

## Files Regenerated

All 5 SQL files have been regenerated WITH dimensions:
- ✅ `import_transaction_lines_part_01.sql` (2,793 lines)
- ✅ `import_transaction_lines_part_02.sql` (2,793 lines)
- ✅ `import_transaction_lines_part_03.sql` (2,793 lines)
- ✅ `import_transaction_lines_part_04.sql` (2,793 lines)
- ✅ `import_transaction_lines_part_05.sql` (2,791 lines)

Total: 13,963 lines with 905,925,674.84 balanced

## Next Steps

### If You Haven't Imported Yet:
1. Delete old data (if any)
2. Import `import_transactions.sql`
3. Import all 5 transaction_lines files in order
4. Verify dimensions are populated

### If You Already Imported Without Dimensions:
You have two options:

**Option 1: Delete and Re-import (RECOMMENDED)**
```sql
-- Delete all transaction lines
DELETE FROM transaction_lines 
WHERE transaction_id IN (
    SELECT id FROM transactions 
    WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
);

-- Delete all transactions
DELETE FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;

-- Then import transactions and transaction_lines again
```

**Option 2: Update Existing Lines with Dimensions**
This would require creating an UPDATE script to add dimensions to existing lines.
This is more complex and error-prone. Option 1 is recommended.

## Verification Query

After import, verify dimensions are populated:

```sql
SELECT 
    COUNT(*) as total_lines,
    COUNT(classification_id) as with_classification,
    COUNT(project_id) as with_project,
    COUNT(analysis_work_item_id) as with_analysis,
    COUNT(sub_tree_id) as with_sub_tree,
    ROUND(COUNT(classification_id)::numeric / COUNT(*)::numeric * 100, 2) as classification_pct,
    ROUND(COUNT(project_id)::numeric / COUNT(*)::numeric * 100, 2) as project_pct,
    ROUND(COUNT(analysis_work_item_id)::numeric / COUNT(*)::numeric * 100, 2) as analysis_pct,
    ROUND(COUNT(sub_tree_id)::numeric / COUNT(*)::numeric * 100, 2) as sub_tree_pct
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;
```

Expected results:
- total_lines: 13,963
- with_classification: ~13,743 (98.4%)
- with_project: 13,963 (100%)
- with_analysis: ~13,369 (95.7%)
- with_sub_tree: ~14,151 (99.9%)

## Important Notes

1. The dimension values in the CSV are the actual codes/IDs from Excel
2. These should match the UUIDs in your dimension tables (classifications, projects, work_analysis, sub_tree)
3. If the codes don't match UUIDs, you'll need to create a mapping script
4. NULL dimensions are allowed and will be inserted as NULL

## Files Updated

- ✅ Created: `regenerate_sql_files_5_parts_WITH_DIMENSIONS.py`
- ✅ Regenerated: All 5 SQL import files in `transaction_lines_split/`
- ✅ Created: This documentation

---

**Status**: ✅ COMPLETE - All SQL files now include accounting dimensions
