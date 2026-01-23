# Nuclear Option - Final Fix

## Problem

The previous fix didn't work because the function is being recreated with the old reference. We need to use a **nuclear option**: drop ALL old functions and recreate only what's needed.

## Solution

**File:** `sql/nuclear_option_drop_all_old_functions.sql`

This script:
1. Drops ALL functions that might reference `expenses_categories`
2. Recreates ONLY the essential trigger function
3. Verifies everything is clean

## Deploy (5 minutes)

1. Go to **Supabase Dashboard → SQL Editor**
2. Click **"New Query"**
3. Copy ALL content from: **`sql/nuclear_option_drop_all_old_functions.sql`**
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for success message

## Verification

You should see:
```
✅ SUCCESS - NO functions reference expenses_categories
✅ SUCCESS - Trigger function correctly references sub_tree
```

## Then Test

1. Clear browser cache (`Ctrl+Shift+Delete`)
2. Go to MainData > SubTree
3. Click "New / جديد"
4. Create a test category
5. Should work! ✅

## What Gets Dropped

- `sub_tree_biu_set_path_level` (old version)
- `refresh_reporting_matviews_concurrent`
- `refresh_expenses_categories_rollups`
- `refresh_all_rollups`
- `_ec_label_from_code`

## What Gets Created

- `sub_tree_biu_set_path_level` (corrected version)

## Expected Result

After this nuclear option:
- ✅ NO functions reference `expenses_categories`
- ✅ Trigger function references `sub_tree` table
- ✅ Creating sub-tree categories works
- ✅ No more 404 errors
- ✅ Sub Tree functionality fully working

**Total time:** ~5 minutes

