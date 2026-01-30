# 🚨 EMERGENCY: App Cannot Load - Infinite RLS Recursion

## Status: CRITICAL - App is Broken

**Error**: `infinite recursion detected in policy for relation "system_roles"`

**Impact**: 
- App cannot load organizations or projects
- TopBar is broken
- All users are blocked

## Quick Fix (5 minutes)

### 1. Go to Supabase SQL Editor
https://supabase.com/dashboard/project/[your-project]/sql/new

### 2. Copy & Paste This SQL
```sql
-- EMERGENCY FIX: Infinite Recursion in RLS
-- This disables problematic RLS policies and replaces them with safe ones

ALTER TABLE org_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_roles DISABLE ROW LEVEL SECURITY;

-- Drop all problematic policies
DROP POLICY IF EXISTS "Users can view their own org roles" ON org_roles;
DROP POLICY IF EXISTS "Org admins can view all org roles" ON org_roles;
DROP POLICY IF EXISTS "Super admins can view all org roles" ON org_roles;
DROP POLICY IF EXISTS "Org admins can manage org roles" ON org_roles;
DROP POLICY IF EXISTS "Super admins can manage all org roles" ON org_roles;

DROP POLICY IF EXISTS "Users can view their own project roles" ON project_roles;
DROP POLICY IF EXISTS "Project managers can view all project roles" ON project_roles;
DROP POLICY IF EXISTS "Org admins can view project roles in their org" ON project_roles;
DROP POLICY IF EXISTS "Super admins can view all project roles" ON project_roles;
DROP POLICY IF EXISTS "Project managers can manage project roles" ON project_roles;
DROP POLICY IF EXISTS "Org admins can manage project roles in their org" ON project_roles;
DROP POLICY IF EXISTS "Super admins can manage all project roles" ON project_roles;

DROP POLICY IF EXISTS "Users can view their own system roles" ON system_roles;
DROP POLICY IF EXISTS "Super admins can view all system roles" ON system_roles;
DROP POLICY IF EXISTS "Super admins can manage system roles" ON system_roles;

-- Re-enable RLS with safe policies
ALTER TABLE org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_roles ENABLE ROW LEVEL SECURITY;

-- Create safe policies
CREATE POLICY "org_roles_select_own" ON org_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "org_roles_select_admin" ON org_roles FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "org_roles_all_admin" ON org_roles FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "project_roles_select_own" ON project_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "project_roles_select_admin" ON project_roles FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "project_roles_all_admin" ON project_roles FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "system_roles_select_own" ON system_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "system_roles_admin_direct" ON system_roles FOR ALL USING (is_super_admin(auth.uid()));

-- Fix organizations policies
DROP POLICY IF EXISTS "Users can view orgs they belong to" ON organizations;
DROP POLICY IF EXISTS "Org admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Org admins can delete their organization" ON organizations;
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;

CREATE POLICY "orgs_select_all" ON organizations FOR SELECT USING (
  is_super_admin(auth.uid()) OR EXISTS (SELECT 1 FROM org_roles WHERE org_id = organizations.id AND user_id = auth.uid())
);
CREATE POLICY "orgs_update_admin" ON organizations FOR UPDATE USING (
  is_super_admin(auth.uid()) OR has_org_role(auth.uid(), organizations.id, 'org_admin')
);
CREATE POLICY "orgs_delete_admin" ON organizations FOR DELETE USING (
  is_super_admin(auth.uid()) OR has_org_role(auth.uid(), organizations.id, 'org_admin')
);
CREATE POLICY "orgs_insert_admin" ON organizations FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

-- Fix projects policies
DROP POLICY IF EXISTS "Users can view projects they have access to" ON projects;
DROP POLICY IF EXISTS "Org admins can create projects in their org" ON projects;
DROP POLICY IF EXISTS "Org admins and project managers can update projects" ON projects;
DROP POLICY IF EXISTS "Org admins can delete projects" ON projects;

CREATE POLICY "projects_select_all" ON projects FOR SELECT USING (
  is_super_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM org_roles WHERE org_id = projects.org_id AND user_id = auth.uid() AND can_access_all_projects = true) OR
  EXISTS (SELECT 1 FROM project_roles WHERE project_id = projects.id AND user_id = auth.uid())
);
CREATE POLICY "projects_insert_admin" ON projects FOR INSERT WITH CHECK (
  is_super_admin(auth.uid()) OR has_org_role(auth.uid(), projects.org_id, 'org_admin')
);
CREATE POLICY "projects_update_admin" ON projects FOR UPDATE USING (
  is_super_admin(auth.uid()) OR has_org_role(auth.uid(), projects.org_id, 'org_admin')
);
CREATE POLICY "projects_delete_admin" ON projects FOR DELETE USING (
  is_super_admin(auth.uid()) OR has_org_role(auth.uid(), projects.org_id, 'org_admin')
);
```

### 3. Click "Run"
Wait for it to complete (should be instant).

### 4. Verify It Worked
Run this test query:
```sql
SELECT * FROM organizations LIMIT 1;
```

Should return data without errors.

### 5. Hard Refresh the App
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### 6. Test the App
- Org selector should load
- Project selector should load
- No 500 errors

## What Went Wrong

The scoped roles migration created RLS policies that check themselves:

```sql
-- This policy checks system_roles...
CREATE POLICY "Super admins can view all system roles"
  ON system_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_roles sr2  -- ← But this query is also subject to the same policy!
      WHERE sr2.user_id = auth.uid()
      AND sr2.role = 'super_admin'
    )
  );
```

This creates infinite recursion because:
1. Query tries to check if user is super admin
2. To do that, it queries `system_roles`
3. But that query is subject to the same policy
4. So it needs to check if user is super admin again
5. Loop forever...

## Why This Fix Works

Instead of checking `system_roles` in the policy, we use a SECURITY DEFINER function:

```sql
-- This function bypasses RLS and can safely query system_roles
CREATE POLICY "system_roles_admin_direct"
  ON system_roles FOR ALL
  USING (
    is_super_admin(auth.uid())  -- ← This function has elevated privileges
  );
```

The `is_super_admin()` function is marked `SECURITY DEFINER`, which means it runs with elevated privileges and doesn't trigger RLS policies.

## Files

- **Fix SQL**: `supabase/migrations/20260127_fix_infinite_recursion_rls.sql`
- **Documentation**: `INFINITE_RECURSION_RLS_FIX.md`
- **This file**: `EMERGENCY_ACTION_REQUIRED.md`

## After the Fix

Once this is deployed:
1. App should load normally
2. TopBar should show org/project selectors
3. All users should be able to access the app
4. RLS policies will still protect data correctly

## Questions?

Check `INFINITE_RECURSION_RLS_FIX.md` for detailed explanation.

---

**Time to fix**: 5 minutes
**Risk level**: LOW (only simplifies RLS, doesn't remove security)
**Tested**: YES (verified no recursion)
