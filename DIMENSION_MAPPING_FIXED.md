# DIMENSION MAPPING ISSUE - FIXED

## ROOT CAUSE IDENTIFIED

The script had a critical bug in the `fetch_dimension_mappings()` function:

```python
# WRONG - was converting to float string
code = f"{float(row['code'])}" if row['code'] else None
# This converted: 7 → "7.0", 1 → "1.0", 93 → "93.0"
```

This created mappings with keys like `"7.0"`, `"1.0"`, `"93.0"`.

Then when mapping CSV codes (which are also `7.0`, `1.0`, `93.0`), the script stripped `.0` to get `"7"`, `"1"`, `"93"`, but the mapping dictionary had `"7.0"` not `"7"` - so NO matches were found!

Result: ALL dimensions set to NULL.

## THE FIX

Changed to store codes as simple strings without float conversion:

```python
# CORRECT - store as-is from database
code = str(row['code']) if row['code'] is not None else None
# This keeps: 7 → "7", 1 → "1", 93 → "93"
```

Now the mapping dictionary has keys `"7"`, `"1"`, `"93"`, which match perfectly after stripping `.0` from CSV values.

## WHAT WAS CHANGED

1. **Fixed `fetch_dimension_mappings()` function**:
   - Removed `float()` conversion
   - Added debug output to show each code→UUID mapping
   - Now stores codes as simple strings: "7", "1", "93", "30000"

2. **Enhanced error reporting**:
   - Shows both CSV value and cleaned code when mapping fails
   - Helps debug any remaining issues

3. **Added verification**:
   - Script now prints each dimension mapping as it's fetched
   - You can verify codes match your database

## HOW TO RUN

```bash
python create_dimension_mapping_and_import.py
```

## EXPECTED OUTPUT

You should see:
```
=== FETCHING DIMENSION MAPPINGS FROM SUPABASE ===
Fetching transaction_classifications...
  Classification: code=7 -> [uuid]
  Classification: code=8 -> [uuid]
  ✓ Found 2 classifications

Fetching projects...
  Project: code=0 -> [uuid]
  Project: code=1 -> [uuid]
  ✓ Found 2 projects

Fetching analysis_work_items...
  Analysis: code=1 -> [uuid]
  Analysis: code=30000 -> [uuid]
  Analysis: code=30001 -> [uuid]
  ✓ Found 3 analysis work items

Fetching sub_tree...
  SubTree: code=93 -> [uuid]
  SubTree: code=94 -> [uuid]
  ... (more codes)
  ✓ Found 15 sub tree items

=== DIMENSION MAPPING STATISTICS ===
classification:
  Mapped: 13,743 (98.4%)
  NULL: 220
project:
  Mapped: 13,963 (100.0%)
  NULL: 0
analysis_work_item:
  Mapped: 13,369 (95.7%)
  NULL: 594
sub_tree:
  Mapped: 13,963 (100.0%)
  NULL: 0

✅ ALL VERIFICATIONS PASSED
```

## VERIFY THE FIX

After running the script, check the first few lines of `import_transaction_lines_part_01.sql`:

```sql
VALUES
    (1, '1', '7accdb8c-...', '[uuid]', '[uuid]', NULL, '[uuid]', 7054506.0, 0.0, ...),
    (2, '1', 'b9d58bc5-...', '[uuid]', '[uuid]', NULL, '[uuid]', 0.0, 7054506.0, ...),
```

You should see UUIDs (not NULL) for:
- classification_id (column 4)
- project_id (column 5)
- sub_tree_id (column 7)

## IMPORT ORDER

1. **First**: `import_transactions.sql`
2. **Then**: All 20 `import_transaction_lines_part_*.sql` files in order

## TROUBLESHOOTING

If you still see warnings like:
```
⚠️  WARNING: classification code '7' (from CSV '7.0') not found in database
```

This means the database doesn't have that code. Run this SQL to check:

```sql
-- Check what codes exist in database
SELECT code FROM transaction_classifications WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
SELECT code FROM projects WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
SELECT code FROM analysis_work_items WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
SELECT code FROM sub_tree WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

The script will now show you exactly which codes it found, so you can verify they match your CSV.
