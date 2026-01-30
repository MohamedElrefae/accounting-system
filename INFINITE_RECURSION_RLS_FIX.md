# CRITICAL FIX: Infinite Recursion in RLS Policies

## Problem
App cannot load because of 500 errors:
```
infinite recursion detected in policy for relation "system_roles"
```

The TopBar cannot load organizations or projects because:
1. `organizations` RLS policy checks `org_roles` table
2. `org_roles` RLS policy checks `system_roles` table  
3. `system_roles` RLS policy checks `system_roles` table again ← **INFINITE LOOP**

## Root Cause
In `20260126_create_scoped_roles_tables.sql`, the `system_roles` table has this policy:

```sql
CREATE POLICY "Super admins can view all system roles"
  ON system_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_roles sr2  -- ← CHECKS ITSELF!
      WHERE sr2.user_id = auth.uid()
      AND sr2.role = 'super_admin'
    )
  );
```

When Postgres evaluates this policy, it needs to check if the user is a super admin by querying `system_roles`, but that query itself is subject to the same policy, creating infinite recursion.

## Solution
Use SECURITY DEFINER functions that bypass RLS instead of subqueries in policies.

### Step 1: Deploy the Migration
Run this migration in Supabase SQL Editor:

```bash
# File: supabase/migrations/20260127_fix_infinite_recursion_rls.sql
```

Or manually execute in Supabase:
1. Go to SQL Editor
2. Copy entire contents of `supabase/migrations/20260127_fix_infinite_recursion_rls.sql`
3. Run it

### Step 2: Verify the Fix
Test in Supabase SQL Editor:

```sql
-- Should return organizations without error
SELECT * FROM organizations LIMIT 1;

-- Should return projects without error
SELECT * FROM projects LIMIT 1;

-- Should return org roles without error
SELECT * FROM org_roles LIMIT 1;
```

### Step 3: Clear Browser Cache
Hard refresh the app:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### Step 4: Test the App
1. Reload the app
2. TopBar should now load organizations and projects
3. Org/Project selectors should work

## What Changed

### Before (Broken)
```sql
-- system_roles policy checked system_roles (infinite recursion)
CREATE POLICY "Super admins can view all system roles"
  ON system_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_roles sr2  -- ← RECURSION!
      WHERE sr2.user_id = auth.uid()
      AND sr2.role = 'super_admin'
    )
  );
```

### After (Fixed)
```sql
-- system_roles policy uses SECURITY DEFINER function (no recursion)
CREATE POLICY "system_roles_admin_direct"
  ON system_roles FOR ALL
  USING (
    is_super_admin(auth.uid())  -- ← SECURITY DEFINER function
  );
```

The `is_super_admin()` function is marked `SECURITY DEFINER`, which means:
- It runs with elevated privileges
- It bypasses RLS policies
- It can safely query `system_roles` without triggering the policy again

## Key Changes in Migration

1. **Disabled RLS** on role tables temporarily to drop problematic policies
2. **Dropped all recursive policies** from `org_roles`, `project_roles`, `system_roles`
3. **Created simple, non-recursive policies** that use SECURITY DEFINER functions
4. **Updated `organizations` and `projects` policies** to be simpler and safer

## Testing Checklist

- [ ] Migration runs without errors
- [ ] `SELECT * FROM organizations` returns data
- [ ] `SELECT * FROM projects` returns data
- [ ] TopBar loads without 500 errors
- [ ] Org selector dropdown works
- [ ] Project selector dropdown works
- [ ] Can switch between orgs/projects
- [ ] No console errors about RLS

## Rollback (if needed)

If something breaks, you can rollback by:
1. Going to Supabase Migrations
2. Reverting to the previous migration
3. Redeploying

But this fix should be safe - it only simplifies RLS policies.

## Files Modified

- `supabase/migrations/20260127_fix_infinite_recursion_rls.sql` - Main fix
- `sql/fix_infinite_recursion_rls.sql` - Reference copy

## Next Steps

After this fix is deployed:
1. Monitor for any RLS-related errors
2. Test all user roles (super admin, org admin, accountant, etc.)
3. Verify data isolation still works correctly
4. Consider adding more comprehensive RLS tests

---

**Status**: Ready to deploy
**Priority**: CRITICAL - App is broken without this
**Estimated Time**: 5 minutes to deploy + 2 minutes to verify
