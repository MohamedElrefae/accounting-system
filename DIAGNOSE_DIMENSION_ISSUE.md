# DIAGNOSE DIMENSION MAPPING ISSUE

## PROBLEM

The script is fetching 0 dimension records from Supabase, causing all dimensions to be NULL.

Warnings like:
```
⚠️  WARNING: classification code '6' (from CSV '6.0') not found in database
⚠️  WARNING: project code '1' (from CSV '1.0') not found in database
```

## ROOT CAUSE

One of these issues:

1. **Wrong org_id** - The dimension tables have data but for a different organization UUID
2. **Empty tables** - The dimension tables haven't been populated yet
3. **RLS policies** - Row Level Security is blocking access to the data
4. **Connection issue** - Can't connect to Supabase

## DIAGNOSTIC STEPS

### Step 1: Run Diagnostic Script

```bash
python diagnose_supabase_dimensions.py
```

This will show:
- Can we connect to Supabase? ✅/❌
- How many records in each dimension table?
- What org_ids exist in the tables?
- Sample records from each table

### Step 2: Check Supabase Directly

Run this SQL in Supabase SQL Editor:

```sql
-- Check transaction_classifications
SELECT org_id, code, id, name 
FROM transaction_classifications 
LIMIT 10;

-- Check projects
SELECT org_id, code, id, name 
FROM projects 
LIMIT 10;

-- Check analysis_work_items
SELECT org_id, code, id, name 
FROM analysis_work_items 
LIMIT 10;

-- Check sub_tree
SELECT org_id, code, id, name 
FROM sub_tree 
LIMIT 10;

-- Find all org_ids in dimension tables
SELECT DISTINCT org_id FROM transaction_classifications
UNION
SELECT DISTINCT org_id FROM projects
UNION
SELECT DISTINCT org_id FROM analysis_work_items
UNION
SELECT DISTINCT org_id FROM sub_tree;
```

## SOLUTIONS

### Solution 1: Wrong org_id

If the diagnostic shows records exist but with a different org_id:

1. Copy the correct org_id from the diagnostic output
2. Update `ORG_ID` in `create_dimension_mapping_and_import.py`:
   ```python
   ORG_ID = "your-actual-org-id-here"
   ```
3. Run the script again

### Solution 2: Empty Dimension Tables

If tables are empty, you need to populate them first. The dimension data should come from your accounting system setup.

**Check if you have dimension data in your app:**
1. Log into your application
2. Go to Settings → Dimensions (or similar)
3. Check if you have:
   - Transaction Classifications (codes like 6, 7, 8)
   - Projects (codes like 0, 1, 2)
   - Analysis Work Items (codes like 1, 31, 56)
   - Sub Tree (codes like 93, 1094, 5193)

**If dimension data exists in the app but not showing in diagnostic:**
- This is an RLS policy issue (see Solution 3)

**If dimension data doesn't exist:**
- You need to create dimension records first through the app UI
- Or import dimension data from your accounting system

### Solution 3: RLS Policy Blocking Access

If you're using the anon key and RLS is enabled:

**Option A: Use service_role key (for import only)**

Update `.env.local`:
```
VITE_SUPABASE_ANON_KEY=your_service_role_key_here
```

**Option B: Temporarily disable RLS for import**

Run in Supabase SQL Editor:
```sql
ALTER TABLE transaction_classifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_work_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sub_tree DISABLE ROW LEVEL SECURITY;
```

After import, re-enable:
```sql
ALTER TABLE transaction_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_tree ENABLE ROW LEVEL SECURITY;
```

### Solution 4: Connection Issue

If diagnostic shows connection error:

1. Check `.env.local` has correct credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Test connection manually in Supabase dashboard

3. Check network/firewall isn't blocking Supabase

## EXPECTED DIAGNOSTIC OUTPUT

### Good Output (data exists):
```
✅ Supabase client created successfully

TABLE: transaction_classifications
Total: 2
Records for org_id = d5789445-...: 2
Sample records:
  1. code=7, id=uuid-1
  2. code=8, id=uuid-2

✅ Found 22 total dimension records
```

### Bad Output (no data):
```
✅ Supabase client created successfully

TABLE: transaction_classifications
Total: 0
Records for org_id = d5789445-...: 0
❌ NO RECORDS FOUND

❌ CRITICAL ISSUE: NO dimension records found
```

## NEXT STEPS

1. Run `python diagnose_supabase_dimensions.py`
2. Based on output, apply the appropriate solution above
3. Run `python create_dimension_mapping_and_import.py` again
4. You should see dimension mappings being found and used
