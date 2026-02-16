# SIMPLE FIX FOR DIMENSION MAPPING ISSUE

## THE PROBLEM

Your CSV has dimension codes like: `7.0`, `1.0`, `93.0`, `30000.0`

But we need to know:
1. What format are codes stored in your database? (integer? text? numeric?)
2. What are the actual code values in each dimension table?

## IMMEDIATE ACTION REQUIRED

Run this SQL in Supabase to see your actual dimension data:

```sql
-- Check classification codes
SELECT id, code, name, pg_typeof(code) as code_type
FROM transaction_classifications
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code
LIMIT 10;

-- Check project codes  
SELECT id, code, name, pg_typeof(code) as code_type
FROM projects
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code
LIMIT 10;

-- Check analysis work item codes
SELECT id, code, name, pg_typeof(code) as code_type
FROM analysis_work_items
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code
LIMIT 10;

-- Check sub_tree codes
SELECT id, code, description, pg_typeof(code) as code_type
FROM sub_tree
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code
LIMIT 10;
```

## PASTE THE RESULTS HERE

Once you run the above SQL, paste the results and I'll create the correct mapping script.

The key information I need:
- What is `code_type` for each table? (integer, text, numeric, etc.)
- What are some example code values? (7 or "7" or 7.0?)
- Do the codes match what's in your CSV?

## WHY THIS MATTERS

If database has code=7 (integer) but we're looking for code="7.0" (text), the lookup fails and returns NULL.

We need to match the exact format.
