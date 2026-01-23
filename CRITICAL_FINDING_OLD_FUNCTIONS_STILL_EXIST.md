# CRITICAL FINDING: Old Functions Still Exist and Reference expenses_categories

## What We Found

The diagnostic query revealed that **old functions and views still exist** and are referencing the old `expenses_categories` table name:

### Old Functions Found ❌

1. **`sub_tree_biu_set_path_level`** - Trigger function
   - **Problem:** References `public.expenses_categories` table (old name)
   - **Line:** `from public.expenses_categories p where p.id = new.parent_id`
   - **Impact:** When inserting/updating sub_tree, this trigger tries to query the old table → ERROR

2. **`refresh_reporting_matviews_concurrent`** - Refresh function
   - **Problem:** References `public.mv_expenses_categories_rollups` materialized view
   - **Impact:** Tries to refresh a view that may not exist

3. **`refresh_all_rollups`** - Refresh function
   - **Problem:** References `public.refresh_expenses_categories_rollups()` function
   - **Impact:** Tries to call a function that may not exist

### Old Views Found ❌

1. **`v_expenses_categories_rollups_v2`** - View
   - **Problem:** References `sub_tree` table but with old naming conventions
   - **Status:** May be causing confusion

### Old Indexes Found ❌

1. **`expenses_categories_pkey`** - Primary key index
   - **Problem:** Named with old name but points to `sub_tree` table
   - **Status:** Confusing naming

2. **`expenses_categories_code_unique_per_org`** - Unique constraint index
   - **Problem:** Named with old name but points to `sub_tree` table
   - **Status:** Confusing naming

## Why This Causes the 404 Error

When you try to create a sub-tree category:

```
1. UI calls createExpensesCategory()
2. Service calls supabase.rpc('create_sub_tree', {...})
3. RPC function executes INSERT into sub_tree table
4. Trigger sub_tree_biu_set_path_level fires
5. Trigger tries to query: SELECT ... FROM public.expenses_categories
6. Table doesn't exist (it's now called sub_tree)
7. Trigger fails with error
8. INSERT fails
9. RPC returns error
10. Service throws error
11. UI shows error message
```

## The Real Problem

The trigger function `sub_tree_biu_set_path_level` is **hardcoded to reference the old `expenses_categories` table name**. This is why the error message says:

```
relation "public.expenses_categories" does not exist
```

## Solution

We need to **fix the trigger function** to reference `sub_tree` instead of `expenses_categories`.

### Step 1: Drop the Old Trigger Function

```sql
DROP TRIGGER IF EXISTS sub_tree_biu_set_path_level ON public.sub_tree;
DROP FUNCTION IF EXISTS public.sub_tree_biu_set_path_level CASCADE;
```

### Step 2: Create the Corrected Trigger Function

```sql
CREATE OR REPLACE FUNCTION public.sub_tree_biu_set_path_level()
RETURNS TRIGGER AS $function$
DECLARE
  v_parent_level INT;
  v_parent_path LTREE;
BEGIN
  -- Set timestamps
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
    NEW.updated_by := AUTH.UID();
  ELSE
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.updated_at := COALESCE(NEW.updated_at, NOW());
    NEW.created_by := COALESCE(NEW.created_by, AUTH.UID());
    NEW.updated_by := COALESCE(NEW.updated_by, AUTH.UID());
  END IF;

  -- Calculate level and path
  IF NEW.parent_id IS NULL THEN
    NEW.level := 1;
    NEW.path := NEW.code::LTREE;
  ELSE
    -- FIX: Query sub_tree table (not expenses_categories)
    SELECT level, path INTO v_parent_level, v_parent_path
    FROM public.sub_tree p
    WHERE p.id = NEW.parent_id 
    AND p.org_id = NEW.org_id
    LIMIT 1;

    IF v_parent_level IS NULL THEN
      RAISE EXCEPTION 'Parent category not found in same org';
    END IF;

    -- Prevent cycles on update
    IF TG_OP = 'UPDATE' AND OLD.id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.sub_tree p 
        WHERE p.id = NEW.parent_id 
        AND p.path <@ OLD.path
      ) THEN
        RAISE EXCEPTION 'Cannot set parent to a descendant (cycle prevention)';
      END IF;
    END IF;

    NEW.level := v_parent_level + 1;
    NEW.path := v_parent_path || NEW.code::LTREE;

    IF NEW.level > 4 THEN
      RAISE EXCEPTION 'Max depth (4) exceeded';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER sub_tree_biu_set_path_level
BEFORE INSERT OR UPDATE ON public.sub_tree
FOR EACH ROW
EXECUTE FUNCTION public.sub_tree_biu_set_path_level();
```

### Step 3: Fix the Refresh Functions

```sql
-- Drop old refresh functions
DROP FUNCTION IF EXISTS public.refresh_expenses_categories_rollups CASCADE;
DROP FUNCTION IF EXISTS public.refresh_all_rollups CASCADE;
DROP FUNCTION IF EXISTS public.refresh_reporting_matviews_concurrent CASCADE;

-- Create corrected refresh function
CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews_concurrent()
RETURNS VOID AS $function$
BEGIN
  -- Only refresh if materialized views exist
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_expenses_categories_rollups_v2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Refresh failed: v_expenses_categories_rollups_v2: %', SQLERRM;
  END;
END;
$function$ LANGUAGE plpgsql;
```

### Step 4: Rename Indexes for Clarity

```sql
-- Rename indexes to reflect they're for sub_tree
ALTER INDEX IF EXISTS expenses_categories_pkey RENAME TO sub_tree_pkey;
ALTER INDEX IF EXISTS expenses_categories_code_unique_per_org RENAME TO sub_tree_code_unique_per_org;
```

## Files to Create

I'll create a comprehensive fix SQL file that:
1. Drops old trigger function
2. Creates corrected trigger function
3. Fixes refresh functions
4. Renames indexes
5. Verifies everything works

## Expected Outcome

After applying this fix:
- ✅ Trigger function will reference `sub_tree` table (not `expenses_categories`)
- ✅ Creating sub-tree categories will work
- ✅ No more "relation 'public.expenses_categories' does not exist" error
- ✅ All CRUD operations will work

## Why This Wasn't Caught Before

The old trigger function was created by an old migration and never updated when the table was renamed from `expenses_categories` to `sub_tree`. The function definition is hardcoded to reference the old table name.

