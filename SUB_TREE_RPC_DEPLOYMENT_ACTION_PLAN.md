# Sub Tree RPC Deployment Action Plan

## Problem Summary
User is getting a **404 error** when trying to create a sub-tree category:
```
POST https://bgxknceshxxifwytalex.supabase.co/rest/v1/rpc/create_sub_tree 404 (Not Found)
```

This means the RPC function `create_sub_tree` doesn't exist in Supabase, even though:
- ✅ Service layer (`src/services/sub-tree.ts`) is correct
- ✅ UI component (`src/pages/MainData/SubTree.tsx`) is correct
- ✅ Migration files exist in `supabase/migrations/`
- ❌ RPC functions are NOT deployed to Supabase

## Root Cause
The migrations `20260121_create_sub_tree_table_and_rpcs.sql` and `20260121_fix_sub_tree_data_sync.sql` were created but **NOT deployed** to Supabase.

## Solution

### Step 1: Verify Current State in Supabase
Run this diagnostic query in Supabase SQL Editor:
```sql
-- Copy all content from: sql/diagnose_sub_tree_rpc_issue.sql
-- Paste into Supabase SQL Editor
-- Click Run
-- Review results
```

This will tell us:
- ✅ or ❌ sub_tree table exists
- ✅ or ❌ create_sub_tree RPC exists
- ✅ or ❌ update_sub_tree RPC exists
- ✅ or ❌ delete_sub_tree RPC exists
- ✅ or ❌ rpc_sub_tree_next_code RPC exists
- ✅ or ❌ sub_tree_full view exists
- ✅ or ❌ sub_tree_full_v2 view exists
- ✅ or ❌ transaction_lines.sub_tree_id column exists

### Step 2: Deploy Missing RPC Functions
If the diagnostic shows RPC functions are missing, run these migrations in Supabase SQL Editor:

**First Migration (creates table and initial RPCs):**
```sql
-- Copy all content from: supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql
-- Paste into Supabase SQL Editor
-- Click Run
```

**Second Migration (fixes data sync and improves functions):**
```sql
-- Copy all content from: supabase/migrations/20260121_fix_sub_tree_data_sync.sql
-- Paste into Supabase SQL Editor
-- Click Run
```

### Step 3: Verify Deployment
Run the diagnostic query again to confirm all RPC functions now exist.

### Step 4: Clear Browser Cache
- Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
- Select "All time"
- Check "Cookies and other site data"
- Click "Clear data"

### Step 5: Test in UI
1. Go to MainData > SubTree
2. Click "New / جديد"
3. Try to create a new sub-tree category
4. Should work without 404 error

## Files Involved

### New Migrations (Need to be deployed)
- `supabase/migrations/20260121_create_sub_tree_table_and_rpcs.sql` - Creates table and RPC functions
- `supabase/migrations/20260121_fix_sub_tree_data_sync.sql` - Improves functions and adds triggers

### Service Layer (Already correct)
- `src/services/sub-tree.ts` - Calls correct RPC functions

### UI Component (Already correct)
- `src/pages/MainData/SubTree.tsx` - Uses correct service functions

### Old Migrations (Should be deleted from codebase)
These are in `src/database/migrations/` and should be deleted:
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

## Why This Happened

1. **Old System**: Used `expenses_categories` table with old RPC functions
2. **Migration**: Renamed to `sub_tree` table with new RPC functions
3. **Issue**: New migrations were created but not deployed to Supabase
4. **Result**: Service and UI call non-existent RPC functions → 404 error

## Expected Outcome

After deployment:
- ✅ `create_sub_tree` RPC will exist and work
- ✅ `update_sub_tree` RPC will exist and work
- ✅ `delete_sub_tree` RPC will exist and work
- ✅ `rpc_sub_tree_next_code` RPC will exist and work
- ✅ Sub-tree CRUD operations will work in UI
- ✅ No more 404 errors

## Next Steps After Deployment

1. Delete old migration files from `src/database/migrations/` (they're no longer needed)
2. Clear browser cache
3. Test Sub Tree functionality in UI
4. Verify all CRUD operations work (Create, Read, Update, Delete)

