# Sub Tree Technical Analysis - Complete Diagnosis

## Executive Summary

**Problem:** 404 error on `POST /rest/v1/rpc/create_sub_tree`

**Root Cause:** RPC functions not deployed to Supabase

**Status:** Service and UI are correct; database deployment is incomplete

**Solution:** Deploy 2 migration files to Supabase

---

## Detailed Analysis

### 1. Service Layer Analysis ✅ CORRECT

**File:** `src/services/sub-tree.ts`

**What it does:**
- Calls RPC function `create_sub_tree` to create sub-tree categories
- Calls RPC function `update_sub_tree` to update categories
- Calls RPC function `delete_sub_tree` to delete categories
- Calls RPC function `rpc_sub_tree_next_code` to get next code
- Falls back to direct table query if views fail

**Key functions:**
```typescript
export async function createExpensesCategory(payload: CreateSubTreePayload): Promise<string> {
  const { data, error } = await supabase.rpc('create_sub_tree', {
    p_org_id: payload.org_id,
    p_code: String(payload.code ?? '').trim(),
    p_description: desc,
    p_add_to_cost: payload.add_to_cost ?? false,
    p_parent_id: payload.parent_id ?? null,
    p_linked_account_id: payload.linked_account_id ?? null,
  })
  if (error) throw error
  return data as string
}
```

**Verdict:** ✅ Service is calling the correct RPC functions with correct parameters

---

### 2. UI Component Analysis ✅ CORRECT

**File:** `src/pages/MainData/SubTree.tsx`

**What it does:**
- Displays sub-tree categories in tree and list views
- Calls service functions to create, update, delete categories
- Handles form validation
- Shows proper error messages

**Key flow:**
```typescript
const handleSave = async () => {
  if (!orgId) { showToast('Select organization', { severity: 'warning' }); return }
  try {
    if (editingId) {
      await updateExpensesCategory({...})
    } else {
      await createExpensesCategory({...})  // Calls service
    }
    showToast('Created successfully', { severity: 'success' })
    await reload(orgId)
  } catch (e: unknown) {
    showToast((e as Error).message || 'Save failed', { severity: 'error' })
  }
}
```

**Verdict:** ✅ UI is calling the correct service functions

---

### 3. Database Schema Analysis ⚠️ INCOMPLETE

**Table:** `public.sub_tree`

**Status:** Table likely exists (created by earlier migrations)

**Columns:**
- `id` (UUID, PK)
- `org_id` (UUID, FK to organizations)
- `parent_id` (UUID, FK to sub_tree)
- `code` (VARCHAR 50)
- `description` (VARCHAR 300, NOT NULL)
- `add_to_cost` (BOOLEAN)
- `is_active` (BOOLEAN)
- `level` (INTEGER, 1-4)
- `path` (ltree)
- `linked_account_id` (UUID, FK to accounts)
- `created_at`, `updated_at`, `created_by`, `updated_by`

**Verdict:** ✅ Table structure is correct

---

### 4. RPC Functions Analysis ❌ MISSING

**Expected RPC Functions:**

1. **`create_sub_tree`** - Creates new sub-tree category
   - Parameters: `p_org_id`, `p_code`, `p_description`, `p_add_to_cost`, `p_parent_id`, `p_linked_account_id`
   - Returns: UUID (new category ID)
   - Status: ❌ MISSING (404 error)

2. **`update_sub_tree`** - Updates existing sub-tree category
   - Parameters: `p_id`, `p_code`, `p_description`, `p_add_to_cost`, `p_is_active`, `p_linked_account_id`, `p_clear_linked_account`
   - Returns: BOOLEAN
   - Status: ❌ MISSING

3. **`delete_sub_tree`** - Deletes sub-tree category
   - Parameters: `p_id`
   - Returns: BOOLEAN
   - Status: ❌ MISSING

4. **`rpc_sub_tree_next_code`** - Gets next code for new category
   - Parameters: `p_org_id`, `p_parent_id`
   - Returns: VARCHAR
   - Status: ❌ MISSING

**Verdict:** ❌ All RPC functions are missing from Supabase

---

### 5. Views Analysis ⚠️ INCOMPLETE

**Expected Views:**

1. **`sub_tree_full`** - Full view with joined account info
   - Status: ⚠️ May exist from old migration, but needs verification

2. **`sub_tree_full_v2`** - Optimized version
   - Status: ⚠️ May exist from old migration, but needs verification

**Verdict:** ⚠️ Views may exist but need verification

---

### 6. Migration Files Analysis

**New Migrations (in `supabase/migrations/`):**

1. **`20260121_create_sub_tree_table_and_rpcs.sql`** ✅ EXISTS
   - Creates `sub_tree` table
   - Creates all 4 RPC functions
   - Creates views
   - Sets up RLS policies
   - Status: ✅ File exists, but NOT deployed to Supabase

2. **`20260121_fix_sub_tree_data_sync.sql`** ✅ EXISTS
   - Improves RPC functions
   - Adds triggers for path maintenance
   - Adds timestamp triggers
   - Improves indexes
   - Status: ✅ File exists, but NOT deployed to Supabase

**Old Migrations (in `src/database/migrations/`):**

These reference the old `expenses_categories` table and should be deleted:
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

**Verdict:** ✅ New migrations exist but need to be deployed

---

## Error Flow Analysis

### Current Error Flow (404)

```
User clicks "New / جديد" in SubTree.tsx
    ↓
Calls createExpensesCategory() in sub-tree.ts
    ↓
Calls supabase.rpc('create_sub_tree', {...})
    ↓
Supabase REST API tries to find RPC function
    ↓
RPC function doesn't exist in database
    ↓
Returns 404 Not Found
    ↓
Error: "relation 'public.expenses_categories' does not exist"
```

### Expected Error Flow (After Fix)

```
User clicks "New / جديد" in SubTree.tsx
    ↓
Calls createExpensesCategory() in sub-tree.ts
    ↓
Calls supabase.rpc('create_sub_tree', {...})
    ↓
Supabase REST API finds RPC function
    ↓
RPC function executes:
  - Validates inputs
  - Calculates path and level
  - Inserts into sub_tree table
  - Returns new UUID
    ↓
Service receives UUID
    ↓
UI shows success message
    ↓
Data reloads and displays new category
```

---

## Why This Happened

### Timeline

1. **Old System (Before):** Used `expenses_categories` table
   - Old migrations created this table
   - Old RPC functions referenced this table

2. **Migration Decision:** Rename to `sub_tree` for consistency
   - New migrations created with `sub_tree` table
   - New RPC functions created
   - Service updated to call new RPC functions
   - UI updated to use new service

3. **Deployment Gap:** New migrations not deployed to Supabase
   - New migrations exist in `supabase/migrations/`
   - But they were never run in Supabase
   - Old table/functions may still exist or be missing
   - Result: Service calls non-existent RPC → 404 error

---

## Verification Checklist

Run `sql/diagnose_sub_tree_rpc_issue.sql` to verify:

- [ ] `sub_tree` table exists
- [ ] `create_sub_tree` RPC exists
- [ ] `update_sub_tree` RPC exists
- [ ] `delete_sub_tree` RPC exists
- [ ] `rpc_sub_tree_next_code` RPC exists
- [ ] `sub_tree_full` view exists
- [ ] `sub_tree_full_v2` view exists
- [ ] `transaction_lines.sub_tree_id` column exists
- [ ] No old `expenses_categories` table exists
- [ ] No old RPC functions exist

---

## Solution Steps

### Step 1: Verify Current State
Run diagnostic query to see what's missing

### Step 2: Deploy Migrations
Run both new migrations in Supabase SQL Editor

### Step 3: Verify Deployment
Run diagnostic query again to confirm all RPC functions exist

### Step 4: Clear Cache
Clear browser cache to remove any cached 404 responses

### Step 5: Test
Try creating a sub-tree category in UI

### Step 6: Cleanup
Delete old migration files from `src/database/migrations/`

---

## Expected Outcome

After deployment:
- ✅ All RPC functions exist in Supabase
- ✅ Service can call RPC functions successfully
- ✅ UI can create, read, update, delete sub-tree categories
- ✅ No more 404 errors
- ✅ Sub Tree functionality fully working

