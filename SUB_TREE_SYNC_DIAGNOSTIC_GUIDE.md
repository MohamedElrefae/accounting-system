# Sub Tree Sync Issues - Diagnostic Guide

## Problem Statement

Migration ran twice but RPC functions still return 404. This means the migration either:
1. ❌ Didn't actually execute
2. ❌ Executed but had errors (silently failed)
3. ❌ Executed but functions were dropped/overwritten
4. ❌ Executed on wrong database/schema

## How to Diagnose

### Step 1: Run Verification Queries

Open Supabase SQL Editor and run: `sql/verify_sub_tree_sync_issues.sql`

This will show you exactly what's in the database.

### Step 2: Interpret Results

#### Check 1: RPC Functions Status
```
create_sub_tree_exists: 0 = ❌ MISSING (this is your problem!)
create_sub_tree_exists: 1 = ✅ EXISTS
```

**If 0**: The RPC functions were never created. The migration didn't work.

#### Check 2: Views Status
```
sub_tree_full_exists: 0 = ❌ MISSING
sub_tree_full_exists: 1 = ✅ EXISTS
```

**If 0**: Views weren't created either.

#### Check 3: sub_tree_full Columns
Should have these 16 columns:
- id
- org_id
- parent_id
- code
- description
- add_to_cost
- is_active
- level
- path
- linked_account_id
- **linked_account_code** ← Missing = problem!
- **linked_account_name** ← Missing = problem!
- **child_count** ← Missing = problem!
- **has_transactions** ← Missing = problem!
- created_at
- updated_at

**If missing any of the bold ones**: Views are incomplete.

#### Check 4: Triggers on sub_tree
Should have 2 triggers:
- `trg_sub_tree_maintain_path`
- `trg_sub_tree_update_timestamp`

**If 0 or 1**: Triggers weren't created.

#### Check 5: sub_tree Data Status
```
null_paths: 0 = ✅ All paths populated
null_paths: > 0 = ❌ Some paths are NULL
```

**If > 0**: Path data is incomplete.

#### Check 6: Test View Queries
```
null_linked_account_codes: 0 = ✅ All populated
null_linked_account_codes: > 0 = ❌ View missing field
```

**If > 0**: View is missing the `linked_account_code` field.

## Most Likely Scenarios

### Scenario 1: RPC Functions Don't Exist (Most Likely)
**Symptoms:**
- `create_sub_tree_exists: 0`
- `update_sub_tree_exists: 0`
- `delete_sub_tree_exists: 0`
- `rpc_sub_tree_next_code_exists: 0`

**Cause:** Migration didn't execute properly

**Solution:** See "Fix Procedures" below

### Scenario 2: Views Exist But Missing Fields
**Symptoms:**
- `sub_tree_full_exists: 1`
- `null_linked_account_codes: > 0`
- `null_child_counts: > 0`
- `null_has_transactions: > 0`

**Cause:** Views were created but without the required fields

**Solution:** Drop and recreate views with all fields

### Scenario 3: Triggers Don't Exist
**Symptoms:**
- Trigger count = 0 or 1
- `null_paths: > 0`

**Cause:** Triggers weren't created

**Solution:** Create triggers manually

### Scenario 4: Path Data Incomplete
**Symptoms:**
- `null_paths: > 0`
- `empty_paths: > 0`

**Cause:** Path data wasn't populated

**Solution:** Update all NULL paths

## Fix Procedures

### Fix 1: Create Missing RPC Functions

If `create_sub_tree_exists: 0`, run this:

```sql
-- Create create_sub_tree function
CREATE OR REPLACE FUNCTION public.create_sub_tree(
  p_org_id UUID,
  p_code VARCHAR,
  p_description VARCHAR,
  p_add_to_cost BOOLEAN DEFAULT FALSE,
  p_parent_id UUID DEFAULT NULL,
  p_linked_account_id UUID DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  v_id UUID;
  v_parent_level INTEGER;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID is required';
  END IF;
  
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RAISE EXCEPTION 'Code is required';
  END IF;
  
  IF p_description IS NULL OR TRIM(p_description) = '' THEN
    RAISE EXCEPTION 'الوصف مطلوب (1..300)';
  END IF;
  
  IF LENGTH(TRIM(p_description)) > 300 THEN
    RAISE EXCEPTION 'الوصف يجب ألا يزيد عن 300 حرف';
  END IF;

  IF p_parent_id IS NOT NULL THEN
    SELECT level INTO v_parent_level FROM public.sub_tree WHERE id = p_parent_id;
    IF v_parent_level IS NULL THEN
      RAISE EXCEPTION 'Parent category not found';
    END IF;
    IF v_parent_level >= 4 THEN
      RAISE EXCEPTION 'Cannot add children beyond level 4';
    END IF;
  END IF;

  IF p_linked_account_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_linked_account_id) THEN
      RAISE EXCEPTION 'Linked account not found';
    END IF;
  END IF;

  INSERT INTO public.sub_tree (
    org_id, parent_id, code, description, add_to_cost, is_active, linked_account_id, created_by
  ) VALUES (
    p_org_id, p_parent_id, TRIM(p_code), TRIM(p_description), p_add_to_cost, TRUE, p_linked_account_id, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_sub_tree TO authenticated;
```

### Fix 2: Recreate Views with All Fields

If `null_linked_account_codes: > 0`, run this:

```sql
DROP VIEW IF EXISTS public.sub_tree_full_v2 CASCADE;
DROP VIEW IF EXISTS public.sub_tree_full CASCADE;

CREATE OR REPLACE VIEW public.sub_tree_full AS
SELECT
  st.id,
  st.org_id,
  st.parent_id,
  st.code,
  st.description,
  st.add_to_cost,
  st.is_active,
  st.level,
  st.path::text as path,
  st.linked_account_id,
  COALESCE(a.code, '') as linked_account_code,
  COALESCE(a.name, '') as linked_account_name,
  (SELECT COUNT(*)::BIGINT FROM public.sub_tree st2 WHERE st2.parent_id = st.id AND st2.is_active = true) as child_count,
  (SELECT EXISTS(SELECT 1 FROM public.transaction_lines tl WHERE tl.sub_tree_id = st.id LIMIT 1)) as has_transactions,
  st.created_at,
  st.updated_at,
  st.created_by,
  st.updated_by
FROM public.sub_tree st
LEFT JOIN public.accounts a ON a.id = st.linked_account_id
WHERE st.is_active = true;

CREATE OR REPLACE VIEW public.sub_tree_full_v2 AS
SELECT
  st.id,
  st.org_id,
  st.parent_id,
  st.code,
  st.description,
  st.add_to_cost,
  st.is_active,
  st.level,
  st.path::text as path,
  st.linked_account_id,
  COALESCE(a.code, '') as linked_account_code,
  COALESCE(a.name, '') as linked_account_name,
  (SELECT COUNT(*)::BIGINT FROM public.sub_tree st2 
   WHERE st2.org_id = st.org_id AND st2.parent_id = st.id AND st2.is_active = true) as child_count,
  (SELECT EXISTS(SELECT 1 FROM public.transaction_lines tl WHERE tl.sub_tree_id = st.id LIMIT 1)) as has_transactions,
  st.created_at,
  st.updated_at,
  st.created_by,
  st.updated_by
FROM public.sub_tree st
LEFT JOIN public.accounts a ON a.id = st.linked_account_id
WHERE st.is_active = true;
```

### Fix 3: Update NULL Paths

If `null_paths: > 0`, run this:

```sql
UPDATE public.sub_tree st
SET path = CASE 
  WHEN parent_id IS NULL THEN code::ltree
  ELSE (SELECT path FROM public.sub_tree WHERE id = st.parent_id) || code::ltree
END
WHERE path IS NULL OR path = ''::ltree;
```

### Fix 4: Create Missing Triggers

If trigger count < 2, run this:

```sql
CREATE OR REPLACE FUNCTION public.sub_tree_maintain_path()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := NEW.code::ltree;
    NEW.level := 1;
  ELSE
    SELECT path, level INTO NEW.path, NEW.level
    FROM public.sub_tree
    WHERE id = NEW.parent_id;
    
    IF NEW.path IS NULL THEN
      RAISE EXCEPTION 'Parent not found';
    END IF;
    
    NEW.path := NEW.path || NEW.code::ltree;
    NEW.level := NEW.level + 1;
    
    IF NEW.level > 4 THEN
      RAISE EXCEPTION 'Cannot add children beyond level 4';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sub_tree_maintain_path ON public.sub_tree;

CREATE TRIGGER trg_sub_tree_maintain_path
BEFORE INSERT OR UPDATE OF parent_id, code ON public.sub_tree
FOR EACH ROW
EXECUTE FUNCTION public.sub_tree_maintain_path();

CREATE OR REPLACE FUNCTION public.sub_tree_update_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sub_tree_update_timestamp ON public.sub_tree;

CREATE TRIGGER trg_sub_tree_update_timestamp
BEFORE UPDATE ON public.sub_tree
FOR EACH ROW
EXECUTE FUNCTION public.sub_tree_update_timestamp();
```

## Why Migration Might Have Failed

### Reason 1: SQL Syntax Error
The migration had a syntax error and failed silently.

**Check:** Look at Supabase logs for SQL errors

### Reason 2: Permission Error
The migration user doesn't have permission to create functions.

**Check:** Look for "permission denied" errors in logs

### Reason 3: Function Already Exists
A function with the same name already exists and migration tried to create it.

**Check:** Look for "already exists" errors in logs

### Reason 4: Wrong Database
Migration ran on wrong database or schema.

**Check:** Verify you're in the right Supabase project

### Reason 5: Migration Rolled Back
Migration started but then rolled back due to an error.

**Check:** Look at migration history in Supabase

## Next Steps

1. **Run verification queries** → `sql/verify_sub_tree_sync_issues.sql`
2. **Identify which components are missing** → Use the diagnostic guide above
3. **Apply appropriate fixes** → Use the fix procedures above
4. **Verify fixes worked** → Run verification queries again
5. **Clear browser cache** → Ctrl+Shift+Delete
6. **Test in UI** → Try creating a sub-tree category

## If Still Not Working

If after running all fixes the RPC functions still return 404:

1. **Check Supabase Project**
   - Go to Supabase Dashboard
   - Verify you're in the correct project
   - Check project URL matches your app

2. **Check RLS Policies**
   - Go to Authentication > Policies
   - Verify RPC functions have proper policies
   - May need to add policy: `GRANT EXECUTE ON FUNCTION public.create_sub_tree TO authenticated;`

3. **Check Function Visibility**
   - Functions must be in `public` schema
   - Functions must be callable by `authenticated` role

4. **Restart Supabase Connection**
   - In your app, clear cache and reload
   - Or restart Supabase instance

## Support

If you're still stuck:

1. Share the output of `sql/verify_sub_tree_sync_issues.sql`
2. Share any error messages from Supabase logs
3. Verify you're in the correct Supabase project
4. Check that the migration file was actually pasted into SQL Editor (not just created locally)
