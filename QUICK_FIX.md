# Quick Fix for GL Function Error

## Error
`ERROR: 42725: function name "public.get_general_ledger_report_filtered" is not unique`

## Solution
Run this SQL script: **`create_gl_functions_safe.sql`**

This script:
- ✅ Uses `CREATE OR REPLACE` to handle conflicts automatically
- ✅ No need to manually drop existing functions  
- ✅ Includes verification queries
- ✅ Safe to run multiple times

## After Running the SQL
1. Refresh your browser/restart dev server
2. Test the expenses category filter in General Ledger UI
3. The dropdown should now filter the report data properly

## If Still Having Issues
1. Run the diagnostic query from `drop_existing_gl_functions.sql` first
2. Then run `create_gl_functions_safe.sql`

The expenses category filter will work immediately after the database functions are created!