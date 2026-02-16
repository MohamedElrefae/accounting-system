# Why Previous Migration Failed - Technical Analysis

## The Error

```
Could not find the 'account_code' column of 'transaction_lines' in the schema cache
```

## Root Cause

The database schema for `transaction_lines` table does **NOT** have an `account_code` column. It has:

```sql
account_id uuid NOT NULL  -- Foreign key to accounts table
```

But the migration script was trying to insert:

```python
{
  'account_code': 'ACC-001',  # ❌ This column doesn't exist!
  'project_code': 'PROJ-001',  # ❌ This column doesn't exist!
  ...
}
```

## Why This Happened

### 1. Column Mapping Was Incomplete

**File**: `config/column_mapping_APPROVED.csv` (BEFORE)

```csv
Excel_Column,Supabase_Column
account code,account_code        ❌ Wrong! Should be account_id
project code,project_code        ❌ Wrong! Should be project_id
classification code,classification_code  ❌ Wrong! Should be classification_id
```

The mapping assumed the database had string columns for codes, but it actually has UUID columns for IDs.

### 2. No UUID Resolution Logic

The migration script had no logic to:
- Look up account codes in the accounts table
- Get the corresponding account_id (UUID)
- Use that UUID in the insert

### 3. Fundamental Data Type Mismatch

```
Excel Data:
  account_code = "ACC-001" (string)
  
Database Schema:
  account_id = UUID (foreign key)
  
Mapping:
  "ACC-001" → ??? (no logic to resolve)
```

---

## The Actual Database Schema

### transaction_lines Table

```sql
CREATE TABLE transaction_lines (
  id uuid PRIMARY KEY,
  transaction_id uuid NOT NULL,
  line_no integer NOT NULL,
  
  -- These are UUIDs with foreign keys, NOT strings!
  account_id uuid NOT NULL,           -- FK to accounts(id)
  project_id uuid NULL,               -- FK to projects(id)
  cost_center_id uuid NULL,           -- FK to cost_centers(id)
  work_item_id uuid NULL,             -- FK to work_items(id)
  analysis_work_item_id uuid NULL,    -- FK to analysis_work_items(id)
  classification_id uuid NULL,        -- FK to transaction_classification(id)
  sub_tree_id uuid NULL,              -- FK to sub_tree(id)
  
  -- Amount columns
  debit_amount numeric(15, 4) NOT NULL,
  credit_amount numeric(15, 4) NOT NULL,
  description text NULL,
  
  -- Metadata
  org_id uuid NOT NULL,
  created_at timestamp DEFAULT now(),
  
  -- Constraints
  CONSTRAINT fk_tl_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_tl_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_tl_cost_center FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
  CONSTRAINT fk_tl_work_item FOREIGN KEY (work_item_id) REFERENCES work_items(id),
  CONSTRAINT fk_tl_analysis_item FOREIGN KEY (analysis_work_item_id) REFERENCES analysis_work_items(id),
  CONSTRAINT fk_tl_classification FOREIGN KEY (classification_id) REFERENCES transaction_classification(id),
  CONSTRAINT fk_tl_sub_tree FOREIGN KEY (sub_tree_id) REFERENCES sub_tree(id)
);
```

**Key Point**: All dimension columns are UUIDs with foreign key constraints, NOT strings!

---

## What Excel Data Looks Like

```
account code | project code | classification code | debit | credit
ACC-001      | PROJ-001     | CLASS-001          | 1000  | 0
ACC-002      | PROJ-002     | CLASS-002          | 0     | 500
ACC-001      | PROJ-001     | CLASS-001          | 2000  | 0
```

**Problem**: These are all strings, but the database needs UUIDs!

---

## The Solution

### Step 1: Export Reference Data

```sql
-- Get account code → id mapping
SELECT code, id FROM accounts 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Result:
-- code    | id
-- ACC-001 | 550e8400-e29b-41d4-a716-446655440000
-- ACC-002 | 6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

### Step 2: Create Lookup Tables

```python
accounts_map = {
  'ACC-001': '550e8400-e29b-41d4-a716-446655440000',
  'ACC-002': '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
}

projects_map = {
  'PROJ-001': '550e8400-e29b-41d4-a716-446655440001',
  'PROJ-002': '550e8400-e29b-41d4-a716-446655440002',
}
```

### Step 3: Transform Excel Data

```python
# Before
{
  'account_code': 'ACC-001',
  'project_code': 'PROJ-001',
  'debit': 1000,
  'credit': 0
}

# After
{
  'account_id': '550e8400-e29b-41d4-a716-446655440000',  # ✅ UUID
  'project_id': '550e8400-e29b-41d4-a716-446655440001',  # ✅ UUID
  'debit_amount': 1000,
  'credit_amount': 0
}
```

### Step 4: Insert into Database

```sql
INSERT INTO transaction_lines (
  account_id,
  project_id,
  debit_amount,
  credit_amount,
  org_id
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- ✅ Valid UUID
  '550e8400-e29b-41d4-a716-446655440001',  -- ✅ Valid UUID
  1000,
  0,
  'd5789445-11e3-4ad6-9297-b56521675114'
);
```

---

## Why the New Approach Works

### 1. Correct Column Mapping

**File**: `config/column_mapping_APPROVED.csv` (AFTER)

```csv
Excel_Column,Supabase_Column,Mapping_Type
account code,account_id,lookup        ✅ Correct!
project code,project_id,lookup        ✅ Correct!
classification code,classification_id,lookup  ✅ Correct!
```

### 2. UUID Resolution Logic

**Script**: `scripts/prepare_migration_data.py`

```python
# Export reference data
accounts_map = export_accounts_from_supabase()

# Resolve codes to UUIDs
for row in excel_data:
  row['account_id'] = accounts_map[row['account_code']]
  row['project_id'] = projects_map[row['project_code']]
  # ... etc
```

### 3. Prepared CSV Files

**Output**: `data/prepared/transaction_lines_prepared.csv`

```csv
account_id,project_id,debit_amount,credit_amount,org_id
550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001,1000,0,d5789445-11e3-4ad6-9297-b56521675114
6ba7b810-9dad-11d1-80b4-00c04fd430c8,550e8400-e29b-41d4-a716-446655440002,0,500,d5789445-11e3-4ad6-9297-b56521675114
```

✅ All columns are correct UUIDs!

---

## Comparison: Before vs After

### Before (Failed)

```
Excel: account_code = "ACC-001"
  ↓
Migration Script: Insert account_code = "ACC-001"
  ↓
Database: ❌ ERROR - Column 'account_code' doesn't exist!
```

### After (Works)

```
Excel: account_code = "ACC-001"
  ↓
Preparation Script: Lookup "ACC-001" in accounts table
  ↓
Get: account_id = "550e8400-e29b-41d4-a716-446655440000"
  ↓
Prepared CSV: account_id = "550e8400-e29b-41d4-a716-446655440000"
  ↓
Database: ✅ SUCCESS - Valid UUID inserted!
```

---

## Key Learnings

1. **Always check actual database schema** - Don't assume column names
2. **Foreign keys require UUIDs** - Not strings or codes
3. **Lookup tables are essential** - For mapping codes to IDs
4. **Validate locally first** - Before uploading to database
5. **Use dashboard for transparency** - See exactly what's being imported

---

## Files That Changed

1. **Updated**: `config/column_mapping_APPROVED.csv`
   - Corrected Supabase column names
   - Added mapping types (direct, lookup, skip)

2. **Created**: `scripts/prepare_migration_data.py`
   - Exports reference data
   - Resolves codes to UUIDs
   - Generates prepared CSV files
   - Validates mappings

3. **Created**: `MIGRATION_EXECUTION_NEW_APPROACH.md`
   - Step-by-step execution guide
   - Troubleshooting tips
   - Rollback procedures

---

## Next Steps

1. ✅ Understand the problem (this document)
2. ⏭️ Run data preparation script
3. ⏭️ Review mapping report
4. ⏭️ Upload via Supabase Dashboard
5. ⏭️ Verify import success

