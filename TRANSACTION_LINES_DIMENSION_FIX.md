# Transaction Lines CSV - Dimension ID Fix Required

## Problem Identified

The `transaction_lines.csv` file has all dimension IDs set to placeholder values:
```
classification_id: 00000000-0000-0000-0000-000000000001
project_id: 00000000-0000-0000-0000-000000000001
analysis_work_item_id: 00000000-0000-0000-0000-000000000001
sub_tree_id: 00000000-0000-0000-0000-000000000001
```

These placeholder UUIDs will cause foreign key constraint violations during import because they don't exist in your Supabase database.

---

## Solution: Get Real Dimension IDs from Supabase

You need to retrieve the actual dimension IDs from your Supabase database and update the CSV.

### Step 1: Query Your Supabase Database

Run these SQL queries in your Supabase SQL editor to get the dimension IDs:

```sql
-- Get a transaction classification ID
SELECT id FROM transaction_classifications LIMIT 1;

-- Get a project ID
SELECT id FROM projects LIMIT 1;

-- Get an analysis work item ID
SELECT id FROM analysis_work_items LIMIT 1;

-- Get a sub_tree ID
SELECT id FROM sub_tree LIMIT 1;
```

### Step 2: Update the CSV

Once you have the real UUIDs, you have two options:

#### Option A: Manual Update (Small Dataset)
1. Open `transaction_lines.csv` in a text editor or Excel
2. Replace all instances of `00000000-0000-0000-0000-000000000001` with the real UUID
3. Save the file

#### Option B: Automated Update (Recommended)
Use this Python script to update the CSV:

```python
import csv
from pathlib import Path

# Replace with actual UUIDs from your Supabase queries
CLASSIFICATION_ID = "YOUR_CLASSIFICATION_UUID_HERE"
PROJECT_ID = "YOUR_PROJECT_UUID_HERE"
ANALYSIS_WORK_ITEM_ID = "YOUR_ANALYSIS_WORK_ITEM_UUID_HERE"
SUB_TREE_ID = "YOUR_SUB_TREE_UUID_HERE"

csv_path = Path("transaction_lines.csv")
rows = []

# Read CSV
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Update dimension IDs
for row in rows:
    row['classification_id'] = CLASSIFICATION_ID
    row['project_id'] = PROJECT_ID
    row['analysis_work_item_id'] = ANALYSIS_WORK_ITEM_ID
    row['sub_tree_id'] = SUB_TREE_ID

# Write updated CSV
with open(csv_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

print(f"✓ Updated {len(rows)} rows with real dimension IDs")
```

---

## Step-by-Step Instructions

### 1. Get Dimension IDs from Supabase

Go to your Supabase dashboard:
1. Click "SQL Editor"
2. Create a new query
3. Run each query above to get the UUIDs
4. Copy the UUIDs

### 2. Update the CSV

Choose one of the methods above to update the CSV with real UUIDs.

### 3. Verify the Update

Check that the CSV now has real UUIDs:
```bash
head -2 transaction_lines.csv
```

You should see something like:
```
transaction_id,account_id,classification_id,project_id,analysis_work_item_id,sub_tree_id,debit_amount,credit_amount,description,notes,org_id
TXN00001-L1,7accdb8c-bbd4-4b2c-abdd-706b8070b41a,a1b2c3d4-e5f6-7890-abcd-ef1234567890,b2c3d4e5-f6a7-8901-bcde-f12345678901,c3d4e5f6-a7b8-9012-cdef-123456789012,d4e5f6a7-b8c9-0123-def0-1234567890ab,7054506.00,0.00,مستخلص رقم 3,,d5789445-11e3-4ad6-9297-b56521675114
```

### 4. Import to Supabase

Once the CSV has real dimension IDs:
1. Go to Supabase dashboard
2. Select the `transaction_lines` table
3. Click "Import data" → "CSV"
4. Upload the updated `transaction_lines.csv`
5. Map columns and import

---

## Important Notes

- **All rows use the same dimension IDs**: The current CSV uses the same dimension ID for all 14,224 rows. If you need different dimensions per transaction, you'll need to adjust the mapping logic.
- **Foreign Key Constraints**: Supabase will validate that all dimension IDs exist in their respective tables.
- **Account IDs**: The account_id values are already correct (mapped from the Excel account codes).
- **Organization ID**: Already set to `d5789445-11e3-4ad6-9297-b56521675114` for all rows.

---

## Troubleshooting

**Error: "Foreign key violation"**
- The dimension ID doesn't exist in the database
- Verify the UUID is correct by querying the table

**Error: "Invalid UUID format"**
- The UUID format is incorrect
- Make sure it's a valid UUID (8-4-4-4-12 hex digits)

**Error: "Column not found"**
- The CSV column names don't match the table schema
- Verify column names match exactly (case-sensitive)

---

## Next Steps

1. Query Supabase to get real dimension IDs
2. Update the CSV with real UUIDs
3. Import to Supabase using the table import feature
4. Verify data integrity after import

