# Quick Sub Tree Fix - 3 Simple Steps

## The Problem
You're getting a 404 error when trying to create a sub-tree category because the RPC functions don't exist in Supabase yet.

## The Solution

### Step 1: Run Diagnostic Query (2 minutes)
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy ALL content from: `sql/diagnose_sub_tree_rpc_issue.sql`
4. Paste it into the SQL Editor
5. Click "Run"
6. Review the results - look for ✅ or ❌ marks

### Step 2: Deploy Missing RPC Functions (5 minutes)
If diagnostic shows RPC functions are missing:

**First, run this migration:**
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy ALL content from: `supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql`
4. Paste it into the SQL Editor
5. Click "Run"
6. Wait for success message

**Then, run this migration:**
1. Create another new query
2. Copy ALL content from: `supabase/migrations/20260121_fix_sub_tree_data_sync.sql`
3. Paste it into the SQL Editor
4. Click "Run"
5. Wait for success message

### Step 3: Clear Cache & Test (2 minutes)
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "All time"
3. Check "Cookies and other site data"
4. Click "Clear data"
5. Go to MainData > SubTree
6. Click "New / جديد"
7. Try to create a sub-tree category
8. Should work now! ✅

## What's Happening

**Before:** Service calls `create_sub_tree` RPC → RPC doesn't exist → 404 error

**After:** Service calls `create_sub_tree` RPC → RPC exists → Works! ✅

## Files to Know

- **Diagnostic:** `sql/diagnose_sub_tree_rpc_issue.sql`
- **Migration 1:** `supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql`
- **Migration 2:** `supabase/migrations/20260121_fix_sub_tree_data_sync.sql`
- **Service:** `src/services/sub-tree.ts` (already correct)
- **UI:** `src/pages/MainData/SubTree.tsx` (already correct)

## Troubleshooting

**Still getting 404 after deployment?**
- Run diagnostic query again to verify RPC functions exist
- Clear browser cache again
- Close and reopen browser
- Check browser console for any other errors

**Getting SQL errors during deployment?**
- Make sure you're copying the ENTIRE file content
- Check for any typos in the SQL
- Try running each migration separately
- Check Supabase logs for detailed error messages

