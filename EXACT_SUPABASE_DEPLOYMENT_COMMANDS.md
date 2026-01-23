# Exact Supabase Deployment Commands

## How to Deploy

1. Go to **Supabase Dashboard** → **SQL Editor**
2. For each command below, create a new query and run it

---

## Command 1: Diagnostic Query (Run First)

**Purpose:** Check what's currently in Supabase

**Steps:**
1. Click "New Query"
2. Copy ALL content from: `sql/diagnose_sub_tree_rpc_issue.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Review results - look for ✅ or ❌ marks

**Expected Results:**
- If you see ❌ marks, the RPC functions are missing and need to be deployed
- If you see ✅ marks, the RPC functions already exist

---

## Command 2: Deploy First Migration

**Purpose:** Create sub_tree table and RPC functions

**Steps:**
1. Click "New Query"
2. Copy ALL content from: `supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Wait for success message

**What it does:**
- Creates `sub_tree` table
- Creates `create_sub_tree` RPC function
- Creates `update_sub_tree` RPC function
- Creates `delete_sub_tree` RPC function
- Creates `rpc_sub_tree_next_code` RPC function
- Creates `sub_tree_full` view
- Creates `sub_tree_full_v2` view
- Sets up RLS policies
- Grants permissions

**Expected Output:**
```
Query executed successfully
```

---

## Command 3: Deploy Second Migration

**Purpose:** Improve RPC functions and add triggers

**Steps:**
1. Click "New Query"
2. Copy ALL content from: `supabase/migrations/20260121_fix_sub_tree_data_sync.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Wait for success message

**What it does:**
- Improves `create_sub_tree` RPC function
- Improves `update_sub_tree` RPC function
- Adds trigger for automatic path maintenance
- Adds trigger for timestamp updates
- Optimizes indexes
- Improves error handling

**Expected Output:**
```
Query executed successfully
```

---

## Command 4: Verify Deployment (Run After Migrations)

**Purpose:** Confirm all RPC functions are now deployed

**Steps:**
1. Click "New Query"
2. Copy ALL content from: `sql/diagnose_sub_tree_rpc_issue.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Review results - should see all ✅ marks now

**Expected Results:**
- ✅ sub_tree table exists
- ✅ create_sub_tree RPC exists
- ✅ update_sub_tree RPC exists
- ✅ delete_sub_tree RPC exists
- ✅ rpc_sub_tree_next_code RPC exists
- ✅ sub_tree_full view exists
- ✅ sub_tree_full_v2 view exists
- ✅ transaction_lines.sub_tree_id column exists
- ✅ OLD expenses_categories table removed
- ✅ No old RPC functions exist

---

## Troubleshooting

### Error: "relation 'public.sub_tree' does not exist"
- This means the first migration didn't run successfully
- Check the error message in Supabase
- Try running the first migration again
- Make sure you copied the ENTIRE file content

### Error: "function create_sub_tree already exists"
- This is OK - it means the function already exists
- The migration will replace it with the improved version
- Just continue with the second migration

### Error: "syntax error"
- Make sure you copied the ENTIRE file content
- Check for any missing lines
- Try copying again and pasting carefully

### Still getting 404 after deployment?
- Run the diagnostic query again to verify RPC functions exist
- Clear browser cache (Ctrl+Shift+Delete)
- Close and reopen browser
- Check browser console for other errors

---

## Files to Copy From

### Diagnostic Query
**Location:** `sql/diagnose_sub_tree_rpc_issue.sql`

### First Migration
**Location:** `supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql`

### Second Migration
**Location:** `supabase/migrations/20260121_fix_sub_tree_data_sync.sql`

---

## After Deployment

### Step 1: Clear Browser Cache
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "All time"
3. Check "Cookies and other site data"
4. Click "Clear data"

### Step 2: Test in UI
1. Go to MainData > SubTree
2. Click "New / جديد"
3. Try to create a new sub-tree category
4. Should work without 404 error ✅

### Step 3: Delete Old Migration Files (Optional)
Delete these files from `src/database/migrations/`:
- `018_expenses_categories_permissions.sql`
- `019_expenses_categories_next_code.sql`
- `020_expenses_categories_code_check.sql`
- `039_expenses_categories_core.sql`
- `040_expenses_categories_rls.sql`
- `041_expenses_categories_rpcs.sql`
- `042_expenses_categories_view.sql`
- `043_expenses_categories_rollups.sql`
- `045_expenses_categories_materialized.sql`
- `046_expenses_categories_full.sql`
- `047_expenses_categories_delete_v2.sql`

---

## Summary

| Step | Action | File | Expected Result |
|------|--------|------|-----------------|
| 1 | Run diagnostic | `sql/diagnose_sub_tree_rpc_issue.sql` | See ❌ marks (RPC missing) |
| 2 | Deploy migration 1 | `supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql` | Query executed successfully |
| 3 | Deploy migration 2 | `supabase/migrations/20260121_fix_sub_tree_data_sync.sql` | Query executed successfully |
| 4 | Verify deployment | `sql/diagnose_sub_tree_rpc_issue.sql` | See ✅ marks (RPC exists) |
| 5 | Clear cache | Browser cache | Cache cleared |
| 6 | Test in UI | MainData > SubTree | Create category works ✅ |

