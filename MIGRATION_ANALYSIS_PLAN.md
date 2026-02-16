# Migration Analysis Plan - New Approach

## Current Situation

**Database State:**
- Transactions table: 2,962 existing records
- Transaction_lines table: Complex schema with foreign keys to:
  - `account_id` (references accounts table)
  - `project_id` (references projects table)
  - `cost_center_id` (references cost_centers table)
  - `work_item_id` (references work_items table)
  - `analysis_work_item_id` (references analysis_work_items table)
  - `classification_id` (references transaction_classification table)
  - `sub_tree_id` (references sub_tree table)

**Excel Data:**
- 14,224 rows with columns like:
  - `account code` (string, not UUID)
  - `project code` (string, not UUID)
  - etc.

**Problem:**
The Excel data uses codes/names, but the database expects UUIDs with foreign key relationships. We need to map codes to IDs.

---

## Recommended Approach

### Phase 1: Data Analysis & Mapping (LOCAL)

1. **Export existing reference data from Supabase:**
   - accounts (account_code → account_id mapping)
   - projects (project_code → project_id mapping)
   - cost_centers (cost_center_code → cost_center_id mapping)
   - work_items (work_item_code → work_item_id mapping)
   - analysis_work_items (analysis_code → analysis_work_item_id mapping)
   - transaction_classification (classification_code → classification_id mapping)
   - sub_tree (sub_tree_code → sub_tree_id mapping)

2. **Create local CSV files:**
   - `transactions_prepared.csv` - Grouped by entry_no + entry_date
   - `transaction_lines_prepared.csv` - With resolved UUIDs instead of codes

3. **Validate mappings:**
   - Check which Excel codes don't have matches in database
   - Identify missing reference data
   - Create lookup tables

### Phase 2: Data Preparation (LOCAL)

1. **Create mapping script** to:
   - Load Excel data
   - Load reference data from Supabase
   - Map codes to UUIDs
   - Generate prepared CSV files with correct UUIDs

2. **Validate prepared data:**
   - All foreign keys resolve correctly
   - No NULL values in required fields
   - Debit/credit amounts are valid

### Phase 3: Upload to Supabase (VIA DASHBOARD)

1. **Use Supabase Dashboard CSV import:**
   - Upload transactions_prepared.csv to transactions table
   - Upload transaction_lines_prepared.csv to transaction_lines table
   - Supabase handles foreign key validation

---

## Why This Approach is Better

✅ **Transparent**: See exactly what data is being imported
✅ **Validatable**: Can verify mappings before upload
✅ **Debuggable**: Easy to identify missing reference data
✅ **Safe**: Supabase dashboard provides visual feedback
✅ **Accurate**: No column name mismatches

---

## Next Steps

1. **Export reference data from Supabase:**
   ```sql
   SELECT id, code FROM accounts WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   SELECT id, code FROM projects WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
   -- etc for all reference tables
   ```

2. **Create Python script** to:
   - Load Excel data
   - Load reference data
   - Create mapping dictionaries
   - Generate prepared CSV files

3. **Validate prepared CSV files** locally

4. **Upload via Supabase Dashboard** (safer than API)

---

## Status

🟡 **ANALYSIS PHASE** - Need to understand reference data structure before proceeding

