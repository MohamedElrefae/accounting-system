# Deploy Sub Tree Fix - Quick Guide

## Step 1: Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

## Step 2: Copy and Paste the Migration
1. Open this file: `supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql`
2. Copy ALL the contents
3. Paste into the Supabase SQL Editor
4. Click "Run" button

## Step 3: Verify Success
After running, you should see "Success" message. Verify with these queries:

```sql
-- Check table exists
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_name = 'sub_tree' AND table_schema = 'public';

-- Check views exist
SELECT viewname FROM pg_views 
WHERE viewname IN ('sub_tree_full', 'sub_tree_full_v2') 
AND schemaname = 'public';

-- Check RPC functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('rpc_sub_tree_next_code', 'create_sub_tree', 'update_sub_tree', 'delete_sub_tree')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

All three queries should return results.

## Step 4: Clear Browser Cache
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "All time"
3. Check "Cookies and other site data"
4. Click "Clear data"

## Step 5: Test the Fix
1. Go to your app
2. Navigate to **MainData > SubTree**
3. Select an organization
4. Click **"New"** button
5. Fill in:
   - Code: `001`
   - Description: `Test Category` (any text 1-300 chars)
6. Click **Save**
7. Click **"Add Sub"** on the created item
8. Fill in:
   - Code: `001.001`
   - Description: `Sub Category`
9. Click **Save**

If both operations succeed without errors, the fix is working!

## Troubleshooting

### Error: "relation does not exist"
- The migration didn't run successfully
- Check the SQL Editor for error messages
- Try running the migration again

### Error: "الوصف مطلوب (1..300)"
- Make sure description is between 1-300 characters
- Don't leave it empty
- If it still fails after fix, clear browser cache and try again

### Error: "Parent not found"
- The parent node ID is invalid
- Try refreshing the page and selecting the parent again

### RLS Policy Errors
- Make sure you're a member of the organization
- Check that `org_memberships` table has your user entry

## Rollback (if needed)

If something goes wrong, you can drop the table:

```sql
DROP TABLE IF EXISTS public.sub_tree CASCADE;
DROP VIEW IF EXISTS public.sub_tree_full CASCADE;
DROP VIEW IF EXISTS public.sub_tree_full_v2 CASCADE;
DROP FUNCTION IF EXISTS public.rpc_sub_tree_next_code CASCADE;
DROP FUNCTION IF EXISTS public.create_sub_tree CASCADE;
DROP FUNCTION IF EXISTS public.update_sub_tree CASCADE;
DROP FUNCTION IF EXISTS public.delete_sub_tree CASCADE;
```

Then run the migration again.

## Support

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Check Supabase logs for database errors
3. Verify the migration ran without errors
4. Make sure you're using the correct organization
5. Clear cache and try again
