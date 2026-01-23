# Fix: "relation public.expenses_categories does not exist" Error

## The Real Problem

The database was migrated from `expenses_categories` table to `sub_tree` table, but **old migration files (039-047) are still in the codebase**. These files create functions and views that try to query the non-existent `expenses_categories` table.

When you try to create a sub-tree category, the trigger function `sub_tree_biu_set_path_level` tries to query `expenses_categories` instead of `sub_tree`, causing the error:

```
relation "public.expenses_categories" does not exist
```

## Root Cause

### Old Migration Files Still Exist
```
src/database/migrations/039_expenses_categories_core.sql
src/database/migrations/040_expenses_categories_rls.sql
src/database/migrations/041_expenses_categories_rpcs.sql
src/database/migrations/042_expenses_categories_view.sql
src/database/migrations/043_expenses_categories_rollups.sql
src/database/migrations/045_expenses_categories_materialized.sql
src/database/migrations/046_expenses_categories_full.sql
src/database/migrations/047_expenses_categories_delete_v2.sql
```

### These Files Create
- Functions: `create_expenses_category()`, `update_expenses_category()`, `delete_expenses_category()`
- Views: `expenses_categories_with_accounts`, `v_expenses_categories_rollups`, `expenses_categories_full`
- Triggers: `trg_expenses_categories_biu`, `trg_expenses_categories_touch`
- All referencing the non-existent `expenses_categories` table

## The Solution

### Step 1: Run the Cleanup SQL

1. Open Supabase SQL Editor
2. Copy all content from: `sql/fix_expenses_categories_references.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Wait for "Success" message

This will:
- ✅ Drop all views referencing `expenses_categories`
- ✅ Drop all functions referencing `expenses_categories`
- ✅ Drop all triggers referencing `expenses_categories`
- ✅ Drop the old `expenses_categories` table
- ✅ Verify `sub_tree` table and functions exist

### Step 2: Delete Old Migration Files

Delete these files from your codebase:
```
src/database/migrations/039_expenses_categories_core.sql
src/database/migrations/040_expenses_categories_rls.sql
src/database/migrations/041_expenses_categories_rpcs.sql
src/database/migrations/042_expenses_categories_view.sql
src/database/migrations/043_expenses_categories_rollups.sql
src/database/migrations/044_expenses_categories_permissions.sql
src/database/migrations/045_expenses_categories_materialized.sql
src/database/migrations/046_expenses_categories_full.sql
src/database/migrations/047_expenses_categories_delete_v2.sql
```

These are no longer needed because the new `sub_tree` table has all the functionality.

### Step 3: Clear Browser Cache

1. Press: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select: "All time"
3. Check: "Cookies and other site data"
4. Click: "Clear data"
5. Close browser completely
6. Reopen browser

### Step 4: Test

1. Go to MainData > SubTree
2. Try to create a new category
3. Should work now ✅

## What Gets Fixed

| Issue | Before | After |
|-------|--------|-------|
| Error | "relation public.expenses_categories does not exist" | ✅ No error |
| Functions | Reference old table | ✅ Use sub_tree table |
| Views | Reference old table | ✅ Use sub_tree table |
| Triggers | Reference old table | ✅ Use sub_tree table |
| Database | Mixed old/new tables | ✅ Only sub_tree table |

## Files to Delete

These old migration files should be deleted from your repository:

```
src/database/migrations/039_expenses_categories_core.sql
src/database/migrations/040_expenses_categories_rls.sql
src/database/migrations/041_expenses_categories_rpcs.sql
src/database/migrations/042_expenses_categories_view.sql
src/database/migrations/043_expenses_categories_rollups.sql
src/database/migrations/044_expenses_categories_permissions.sql
src/database/migrations/045_expenses_categories_materialized.sql
src/database/migrations/046_expenses_categories_full.sql
src/database/migrations/047_expenses_categories_delete_v2.sql
src/database/migrations/018_expenses_categories_permissions.sql
src/database/migrations/019_expenses_categories_next_code.sql
src/database/migrations/020_expenses_categories_code_check.sql
```

## Verification

After running the cleanup SQL, you should see:

```
✅ sub_tree table EXISTS
✅ sub_tree_full view EXISTS
✅ sub_tree_full_v2 view EXISTS
✅ create_sub_tree function EXISTS
✅ update_sub_tree function EXISTS
✅ delete_sub_tree function EXISTS
✅ rpc_sub_tree_next_code function EXISTS
✅ No functions reference expenses_categories
✅ No views reference expenses_categories
✅ expenses_categories table removed
```

## Timeline

| Step | Time |
|------|------|
| Run cleanup SQL | 2 min |
| Delete old files | 2 min |
| Clear browser cache | 1 min |
| Test | 1 min |
| **Total** | **6 min** |

## Summary

The error was caused by old migration files that still reference the non-existent `expenses_categories` table. By running the cleanup SQL and deleting the old migration files, the error will be completely resolved.

The new `sub_tree` table has all the functionality of the old `expenses_categories` table, so nothing is lost.

---

**Next Action**: Run `sql/fix_expenses_categories_references.sql` in Supabase SQL Editor
