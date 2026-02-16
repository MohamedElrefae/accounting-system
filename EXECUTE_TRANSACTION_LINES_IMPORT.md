# Execute Transaction Lines Import - Ready to Run

## Status: ✅ ALL FILES READY

All 30 SQL files have been fixed and are ready to execute in Supabase SQL Editor.

## Quick Summary

- **Total Files**: 30 (part_01.sql through part_30.sql)
- **Total Records**: ~14,225 transaction lines
- **Records per File**: ~475 lines each
- **Location**: `transaction_lines_split/` folder

## All Applied Fixes

✅ Added `line_no` column with ROW_NUMBER() for sequential numbering
✅ Fixed UUID casting with NULLIF for empty strings
✅ Added numeric casting for debit_amount and credit_amount
✅ Fixed transaction reference type casting (::text)
✅ Added row numbers in VALUES for proper ordering

## Execution Instructions

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Execute Files Sequentially

Copy and paste each file's content into the SQL Editor and run them **in order**:

```
1. import_transaction_lines_part_01.sql
2. import_transaction_lines_part_02.sql
3. import_transaction_lines_part_03.sql
... (continue through all 30 files)
30. import_transaction_lines_part_30.sql
```

### Step 3: Monitor Progress

After each file execution, you should see:
- Success message with number of rows inserted
- Each file should import approximately 475 transaction lines

### Step 4: Verify Total Import

After completing all 30 files, run this verification query:

```sql
SELECT 
    COUNT(*) as total_lines_imported,
    COUNT(DISTINCT transaction_id) as unique_transactions,
    SUM(debit_amount) as total_debits,
    SUM(credit_amount) as total_credits
FROM transaction_lines
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;
```

Expected results:
- **total_lines_imported**: ~14,225
- **total_debits** should equal **total_credits** (balanced accounting)

## File Structure Example

Each file follows this structure:

```sql
INSERT INTO transaction_lines (
    transaction_id,
    line_no,
    account_id,
    classification_id,
    project_id,
    analysis_work_item_id,
    sub_tree_id,
    debit_amount,
    credit_amount,
    description,
    notes,
    org_id
)
SELECT 
    t.id as transaction_id,
    ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY (SELECT NULL)) as line_no,
    NULLIF(temp_lines.account_id_text, '')::uuid as account_id,
    NULLIF(temp_lines.classification_id_text, '')::uuid as classification_id,
    NULLIF(temp_lines.project_id_text, '')::uuid as project_id,
    NULLIF(temp_lines.analysis_work_item_id_text, '')::uuid as analysis_work_item_id,
    NULLIF(temp_lines.sub_tree_id_text, '')::uuid as sub_tree_id,
    temp_lines.debit_amount::numeric,
    temp_lines.credit_amount::numeric,
    temp_lines.description,
    temp_lines.notes,
    NULLIF(temp_lines.org_id_text, '')::uuid as org_id
FROM (
    VALUES
    (row_num, transaction_ref, account_id, ..., org_id),
    ...
) AS temp_lines(row_num, transaction_ref, account_id_text, ...)
JOIN transactions t ON t.reference_number = temp_lines.transaction_ref::text 
    AND t.org_id = NULLIF(temp_lines.org_id_text, '')::uuid;
```

## Troubleshooting

### If you get "0 rows imported"
- Check that transactions exist with matching reference numbers
- Verify org_id matches: `d5789445-11e3-4ad6-9297-b56521675114`

### If you get UUID casting errors
- This should not happen - all files have been fixed with NULLIF
- If it does, report which file number failed

### If you get numeric casting errors
- This should not happen - all amount fields have ::numeric casting
- If it does, report which file number failed

## Next Steps After Import

1. Verify the import with the verification query above
2. Check that debits equal credits (accounting balance)
3. Spot-check a few transactions to ensure lines are correctly linked
4. Test the transaction display in your application

## Files Location

All files are in: `transaction_lines_split/`

```
transaction_lines_split/
├── import_transaction_lines_part_01.sql
├── import_transaction_lines_part_02.sql
├── import_transaction_lines_part_03.sql
├── ...
└── import_transaction_lines_part_30.sql
```

---

**Ready to execute!** Start with part_01.sql and work through all 30 files sequentially.
