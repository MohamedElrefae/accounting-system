# Deploy Sub Tree Fix - Step by Step

## Overview

This guide will walk you through deploying the Sub Tree fix to Supabase in exactly 5 steps.

**Total time: 15 minutes**

## Prerequisites

- Access to Supabase Dashboard
- Your Supabase project URL
- Admin access to the project

## Step 1: Verify Current State (2 minutes)

### 1.1 Open Supabase SQL Editor

1. Go to: https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### 1.2 Check if Functions Exist

Copy and paste this query:

```sql
SELECT 
  COUNT(*) as total_functions,
  COUNT(CASE WHEN proname = 'create_sub_tree' THEN 1 END) as create_sub_tree_exists
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code');
```

Click "Run"

**Expected result:**
- `create_sub_tree_exists: 0` = Functions don't exist (this is the problem)
- `create_sub_tree_exists: 1` = Functions already exist (skip to Step 5)

**If 0**: Continue to Step 2

**If 1**: Skip to Step 5 (functions already exist)

## Step 2: Copy the Fix SQL (2 minutes)

### 2.1 Open the Fix File

In your IDE, open: `QUICK_DEPLOY_SUB_TREE_FIX.sql`

### 2.2 Select All Content

Press: `Ctrl+A` (Windows) or `Cmd+A` (Mac)

### 2.3 Copy

Press: `Ctrl+C` (Windows) or `Cmd+C` (Mac)

You should see the entire file highlighted in blue.

## Step 3: Deploy to Supabase (5 minutes)

### 3.1 Create New Query in Supabase

1. Go back to Supabase SQL Editor
2. Click "New Query" (or clear the previous query)
3. You should see an empty SQL editor

### 3.2 Paste the Fix

Press: `Ctrl+V` (Windows) or `Cmd+V` (Mac)

You should see the entire migration SQL pasted into the editor.

### 3.3 Run the Migration

1. Click the "Run" button (or press Ctrl+Enter)
2. Wait for the query to complete
3. You should see a "Success" message at the bottom

**If you see "Success"**: ✅ Migration deployed successfully!

**If you see an error**: 
- Read the error message
- Check "Troubleshooting" section below
- Try running individual fixes (see Step 4)

### 3.4 Wait for Completion

The migration might take 10-30 seconds to complete. Wait for the "Success" message before proceeding.

## Step 4: Verify the Fix (3 minutes)

### 4.1 Check if Functions Now Exist

Copy and paste this query:

```sql
SELECT 
  COUNT(*) as total_functions,
  COUNT(CASE WHEN proname = 'create_sub_tree' THEN 1 END) as create_sub_tree_exists,
  COUNT(CASE WHEN proname = 'update_sub_tree' THEN 1 END) as update_sub_tree_exists,
  COUNT(CASE WHEN proname = 'delete_sub_tree' THEN 1 END) as delete_sub_tree_exists,
  COUNT(CASE WHEN proname = 'rpc_sub_tree_next_code' THEN 1 END) as rpc_sub_tree_next_code_exists
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('create_sub_tree', 'update_sub_tree', 'delete_sub_tree', 'rpc_sub_tree_next_code');
```

Click "Run"

**Expected result:**
- `create_sub_tree_exists: 1` ✅
- `update_sub_tree_exists: 1` ✅
- `delete_sub_tree_exists: 1` ✅
- `rpc_sub_tree_next_code_exists: 1` ✅

**If all are 1**: ✅ Functions were created successfully!

**If any are 0**: ❌ Something went wrong, see "Troubleshooting" below

### 4.2 Check if Views Exist

Copy and paste this query:

```sql
SELECT 
  COUNT(*) as total_views,
  COUNT(CASE WHEN table_name = 'sub_tree_full' THEN 1 END) as sub_tree_full_exists,
  COUNT(CASE WHEN table_name = 'sub_tree_full_v2' THEN 1 END) as sub_tree_full_v2_exists
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('sub_tree_full', 'sub_tree_full_v2');
```

Click "Run"

**Expected result:**
- `sub_tree_full_exists: 1` ✅
- `sub_tree_full_v2_exists: 1` ✅

**If both are 1**: ✅ Views were created successfully!

## Step 5: Clear Cache & Test (3 minutes)

### 5.1 Clear Browser Cache

1. Press: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. A dialog should appear
3. Select "All time" from the time range dropdown
4. Check the box for "Cookies and other site data"
5. Click "Clear data"

### 5.2 Close and Reopen Browser

1. Close your browser completely
2. Wait 5 seconds
3. Reopen your browser
4. Go to your app

### 5.3 Test the Fix

1. Navigate to: MainData > SubTree
2. Select an organization
3. Click "New" to create a new category
4. Fill in:
   - Code: `001`
   - Description: `Test Category`
5. Click "Save"

**Expected result**: ✅ Category created successfully!

### 5.4 Test Adding Sub-Category

1. Click "Add Sub" on the created category
2. Fill in:
   - Code: `001.001`
   - Description: `Sub Category`
3. Click "Save"

**Expected result**: ✅ Sub-category created successfully!

**If both work**: 🎉 Fix is complete!

## Troubleshooting

### Problem: "Syntax error" when running migration

**Solution:**
1. Copy the SQL again carefully
2. Make sure you copied the entire file (should be ~300 lines)
3. Try running smaller chunks:
   - First run just the path fix
   - Then run the views
   - Then run the functions
   - Then run the triggers

### Problem: "Permission denied" error

**Solution:**
1. Make sure you're logged in as admin
2. Check that you're in the correct Supabase project
3. Try running as service role (if available)

### Problem: "Already exists" error

**Solution:**
- This is OK - the migration will replace the existing object
- Just continue to the next step
- The "Already exists" error is expected if you're re-running the migration

### Problem: Functions still return 404 after fix

**Solution:**
1. Run the verification query again (Step 4.1)
2. Check if `create_sub_tree_exists: 1`
3. If still 0, the migration didn't work
4. Try running individual fixes:

**Individual Fix 1: Create Functions Only**
```sql
-- Copy from: SUB_TREE_SYNC_DIAGNOSTIC_GUIDE.md → Fix 1
-- Paste into Supabase SQL Editor
-- Click Run
```

**Individual Fix 2: Recreate Views Only**
```sql
-- Copy from: SUB_TREE_SYNC_DIAGNOSTIC_GUIDE.md → Fix 2
-- Paste into Supabase SQL Editor
-- Click Run
```

### Problem: UI still shows error after fix

**Solution:**
1. Clear browser cache again (Ctrl+Shift+Delete)
2. Close browser completely
3. Reopen browser
4. Go to MainData > SubTree
5. Try again

### Problem: "relation does not exist" error

**Solution:**
1. This means the views don't exist
2. Run verification query (Step 4.2)
3. If views don't exist, run Individual Fix 2 (Recreate Views)

## Quick Reference

| Step | Action | Time |
|------|--------|------|
| 1 | Verify current state | 2 min |
| 2 | Copy fix SQL | 2 min |
| 3 | Deploy to Supabase | 5 min |
| 4 | Verify fix worked | 3 min |
| 5 | Clear cache & test | 3 min |
| **Total** | | **15 min** |

## Files You'll Need

| File | Purpose |
|------|---------|
| `QUICK_DEPLOY_SUB_TREE_FIX.sql` | The complete fix (copy-paste this) |
| `SUB_TREE_SYNC_DIAGNOSTIC_GUIDE.md` | Detailed diagnostic guide |
| `SUB_TREE_IMMEDIATE_ACTION_PLAN.md` | Quick action plan |

## Success Criteria

✅ All of these should be true:
- [ ] Verification query shows all functions exist (1, 1, 1, 1)
- [ ] Verification query shows all views exist (1, 1)
- [ ] Browser cache cleared
- [ ] Can create new sub-tree category
- [ ] Can add sub-category to existing category
- [ ] No 404 errors in console
- [ ] No "relation does not exist" errors

## Next Steps

If everything works:
1. ✅ Test more complex scenarios (multiple levels, linked accounts, etc.)
2. ✅ Monitor for any errors in production
3. ✅ Document the fix for future reference

If something doesn't work:
1. ❌ Check troubleshooting section above
2. ❌ Run verification queries to identify the issue
3. ❌ Try individual fixes if complete fix doesn't work
4. ❌ Check Supabase logs for detailed error messages

## Support

If you're stuck:
1. Share the output of verification queries (Step 4)
2. Share any error messages you see
3. Verify you're in the correct Supabase project
4. Check that you copied the entire SQL file (not just part of it)

---

**You're ready to deploy! Start with Step 1.**
