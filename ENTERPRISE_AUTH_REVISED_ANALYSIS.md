# Enterprise Auth Analysis - REVISED Based on Actual Database Schema

**Date:** January 23, 2026  
**Status:** CRITICAL - Analysis Revised with Real Database Data  
**Prepared By:** Senior Engineering Team  

---

## 🎯 Executive Summary - REVISED

After analyzing your **actual database schema**, here are the critical findings:

### ✅ What You HAVE (Good News)

1. **org_memberships table EXISTS** - Users can belong to multiple organizations
2. **project_memberships table EXISTS** - Users can be assigned to specific projects
3. **Organizations table has org_id** - All data tables are scoped
4. **Projects table has org_id** - Projects belong to organizations
5. **RLS policies EXIST** - Some scope enforcement at database level
6. **Helper functions EXIST** - `fn_is_org_member()`, `can_access_project()`

### ❌ What You DON'T HAVE (Critical Gaps)

1. **NO organization_id column in user_roles table** - Roles are GLOBAL, not org-scoped
2. **NO get_user_auth_data_with_scope() RPC** - Auth doesn't load org/project memberships
3. **Frontend permissions.ts is HARDCODED** - Not synced with database
4. **ScopeContext doesn't validate** - Any user can select any org
5. **Routes don't check org membership** - No validation in OptimizedProtectedRoute
6. **NO project assignments in database** - project_memberships table is EMPTY

---

## 📊 Actual Database Structure

### Table: org_memberships ✅
```sql
Columns:
- org_id (uuid) - FK to organizations
- user_id (uuid) - FK to user_profiles
- created_at (timestamp)
- is_default (boolean)
- last_active_at (timestamp)
- can_access_all_projects (boolean) - Important!

Current Data: 16 rows
- 4 organizations
- 5 users
- All have can_access_all_projects = true
```

### Table: project_memberships ✅
```sql
Columns:
- id (uuid)
- project_id (uuid) - FK to projects
- user_id (uuid) - FK to user_profiles
- org_id (uuid) - FK to organizations
- role (varchar) - 'admin', 'member', 'viewer'
- can_create, can_edit, can_delete, can_approve (boolean)
- is_default (boolean)

Current Data: 0 rows (EMPTY!)
```

### Table: user_roles ❌ NO ORG SCOPING
```sql
Columns:
- id (integer)
- user_id (uuid)
- role_id (integer)
- assigned_by (uuid)
- assigned_at (timestamp)
- expires_at (timestamp)
- is_active (boolean)

MISSING: organization_id column!
MISSING: project_id column!

Result: Roles are GLOBAL, not org-scoped
```

### Table: roles ✅
```sql
14 roles exist:
- accountant, admin, Admin, auditor, hr, manager, Manager
- Owner, Reviewer, Super Admin, team_leader, Test User, viewer, Viewer

Note: Duplicate roles (admin/Admin, manager/Manager, viewer/Viewer)
```

### Table: permissions ✅
```sql
~100+ permissions exist
Examples:
- transactions.create
- transactions.read.all
- transactions.read.own
- accounts.view
- organizations.create
- projects.manage
```

### Table: role_permissions ✅
```sql
Columns:
- id (integer)
- role_id (integer)
- permission_id (integer)

Accountant role has 11 permissions:
- transaction_line_items.* (create, delete, update, view)
- transactions.* (create, delete, manage, post, read.all, read.own, update)
```

---

## 🔴 Critical Issue #1: Roles Are Global, Not Org-Scoped

### The Problem

Your `user_roles` table does NOT have `organization_id` column:

```sql
-- CURRENT STRUCTURE (WRONG)
user_roles (
  id, user_id, role_id, assigned_by, assigned_at, expires_at, is_active
)

-- NEEDED STRUCTURE (RIGHT)
user_roles (
  id, user_id, role_id, organization_id, assigned_by, assigned_at, expires_at, is_active
)
```

### Impact

- User with "accountant" role has that role GLOBALLY
- Cannot have "accountant" in org-1 and "admin" in org-2
- Permission checks don't consider which org user is accessing

### Solution

**Option A: Add organization_id to user_roles (Recommended)**
```sql
ALTER TABLE user_roles 
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Make it nullable for backward compatibility
-- NULL = global role (super_admin)
-- Non-NULL = org-scoped role
```

**Option B: Use org_memberships.role column (Quick Fix)**
```sql
-- org_memberships already has a 'role' column (text)
-- But it's not being used by your auth system
-- You could use this instead of user_roles for org-scoped roles
```

---

## 🔴 Critical Issue #2: Auth RPC Doesn't Load Org Memberships

### Current RPC Function

```sql
CREATE FUNCTION get_user_auth_data(p_user_id uuid)
RETURNS json AS $$
BEGIN
  SELECT json_build_object(
    'profile', (SELECT row_to_json(p.*) FROM user_profiles p WHERE p.id = p_user_id),
    'roles', (SELECT json_agg(r.name) FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = p_user_id)
  ) INTO result;
  RETURN result;
END;
$$;
```

### What's Missing

- ❌ No organizations array
- ❌ No projects array
- ❌ No org_roles mapping
- ❌ No project_roles mapping

### What You Need

```sql
CREATE FUNCTION get_user_auth_data_with_scope(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'profile', (
      SELECT row_to_json(p.*) 
      FROM user_profiles p 
      WHERE p.id = p_user_id
    ),
    'roles', (
      SELECT COALESCE(json_agg(r.name), '[]'::json)
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = p_user_id
      AND ur.is_active = true
    ),
    -- NEW: Organizations user belongs to
    'organizations', (
      SELECT COALESCE(json_agg(om.org_id), '[]'::json)
      FROM org_memberships om
      WHERE om.user_id = p_user_id
    ),
    -- NEW: Projects user can access
    'projects', (
      SELECT COALESCE(json_agg(pm.project_id), '[]'::json)
      FROM project_memberships pm
      WHERE pm.user_id = p_user_id
    ),
    -- NEW: Org-specific roles (if you add organization_id to user_roles)
    'org_roles', (
      SELECT json_object_agg(
        ur.organization_id::text,
        (SELECT json_agg(r.name) FROM roles r WHERE r.id = ur.role_id)
      )
      FROM user_roles ur
      WHERE ur.user_id = p_user_id
      AND ur.organization_id IS NOT NULL
      GROUP BY ur.organization_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔴 Critical Issue #3: RLS Policies Are Too Permissive

### Current RLS on transactions

```sql
-- CURRENT (TOO PERMISSIVE)
CREATE POLICY "tx_select" ON transactions FOR SELECT
USING (is_super_admin() OR fn_is_org_member(org_id));

-- PROBLEM: fn_is_org_member() checks if user is member of ANY org
-- It should check if user is member of THIS SPECIFIC org
```

### Current RLS on organizations

```sql
-- CURRENT (ALLOWS ALL)
CREATE POLICY "allow_read_organizations" ON organizations FOR SELECT
USING (true);

-- PROBLEM: Any authenticated user can see ALL organizations
-- Should only see organizations they belong to
```

### Current RLS on projects

```sql
-- CURRENT (ALLOWS ALL)
CREATE POLICY "debug_projects_policy" ON projects FOR ALL
USING (true);

-- PROBLEM: Debug policy left in production!
-- Any user can do anything to any project
```

### What You Need

```sql
-- CORRECT: Only see orgs you belong to
CREATE POLICY "users_see_their_orgs" ON organizations FOR SELECT
USING (
  id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )
);

-- CORRECT: Only see projects in your orgs
CREATE POLICY "users_see_org_projects" ON projects FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )
);

-- CORRECT: Only see transactions in your orgs
CREATE POLICY "users_see_org_transactions" ON transactions FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )
);
```

---

## 🔴 Critical Issue #4: No Project Assignments

### Current State

```sql
SELECT COUNT(*) FROM project_memberships;
-- Result: 0 rows

SELECT COUNT(*) FROM projects;
-- Result: Shows projects exist

SELECT COUNT(*) FROM org_memberships;
-- Result: 16 rows (users ARE assigned to orgs)
```

### The Problem

- Users are assigned to organizations ✅
- Projects exist in database ✅
- But NO users are assigned to specific projects ❌
- All users have `can_access_all_projects = true` in org_memberships

### Impact

- Project-level access control doesn't work
- All org members can access all projects in that org
- Cannot restrict user to specific projects

### Solution

**Option A: Use can_access_all_projects flag (Current Design)**
```typescript
// If user.can_access_all_projects = true
// → User can access all projects in their org
// If user.can_access_all_projects = false
// → User can only access projects in project_memberships table
```

**Option B: Always use project_memberships (Stricter)**
```sql
-- Assign users to specific projects
INSERT INTO project_memberships (project_id, user_id, org_id, role)
VALUES 
  ('project-1', 'user-1', 'org-1', 'member'),
  ('project-2', 'user-1', 'org-1', 'admin');

-- Update org_memberships
UPDATE org_memberships 
SET can_access_all_projects = false
WHERE user_id = 'user-1';
```

---

## 🔴 Critical Issue #5: Frontend Permissions Are Hardcoded

### Current Implementation

```typescript
// src/lib/permissions.ts
const MATRIX: Record<RoleSlug, RoleDefinition> = {
  accountant: {
    routes: [
      '/transactions/*',
      '/main-data/*',  // TOO BROAD!
    ],
    actions: [
      'transactions.create',
      'accounts.view',
    ]
  }
};
```

### Problems

1. **Not synced with database** - Database has different permissions
2. **Too broad** - `/main-data/*` allows access to everything
3. **No org scoping** - Permissions are global
4. **Hardcoded** - Changes require code deployment

### Database Reality

```sql
-- Accountant role in DATABASE has these permissions:
SELECT p.name FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
JOIN roles r ON r.id = rp.role_id
WHERE r.name = 'accountant';

Results:
- transaction_line_items.create
- transaction_line_items.delete
- transaction_line_items.update
- transaction_line_items.view
- transactions.create
- transactions.delete
- transactions.manage
- transactions.post
- transactions.read.all
- transactions.read.own
- transactions.update

MISSING in database:
- accounts.view
- reports.view
- main-data access
```

### Solution

**Load permissions from database, not hardcoded file:**

```typescript
// Instead of hardcoded MATRIX, load from database
const loadPermissionsFromDatabase = async (userId: string, orgId: string) => {
  const { data } = await supabase.rpc('rpc_current_user_permissions', {
    p_org_id: orgId
  });
  
  return data; // Array of permission names
};
```

---

## 📋 Revised Implementation Plan

### Phase 1: Database Schema Fixes (Week 1)

**Step 1.1: Add organization_id to user_roles**
```sql
ALTER TABLE user_roles 
ADD COLUMN organization_id UUID REFERENCES organizations(id);

CREATE INDEX idx_user_roles_org ON user_roles(organization_id);
```

**Step 1.2: Fix RLS Policies**
```sql
-- Drop debug policies
DROP POLICY "debug_projects_policy" ON projects;
DROP POLICY "allow_read_organizations" ON organizations;

-- Create proper policies (see Issue #3 above)
```

**Step 1.3: Create Enhanced Auth RPC**
```sql
-- Create get_user_auth_data_with_scope() function
-- (See Issue #2 above for full code)
```

### Phase 2: Assign Users to Projects (Week 1)

**Step 2.1: Decide on Access Model**
- Keep `can_access_all_projects = true` for most users?
- Or assign users to specific projects?

**Step 2.2: Populate project_memberships (if needed)**
```sql
-- Example: Assign all org members to all org projects
INSERT INTO project_memberships (project_id, user_id, org_id, role)
SELECT 
  p.id as project_id,
  om.user_id,
  om.org_id,
  'member' as role
FROM org_memberships om
CROSS JOIN projects p
WHERE p.org_id = om.org_id
AND om.can_access_all_projects = false;
```

### Phase 3: Frontend Auth Integration (Week 2)

**Step 3.1: Update useOptimizedAuth**
- Call `get_user_auth_data_with_scope()` instead of `get_user_auth_data()`
- Store `userOrganizations` and `userProjects` in state
- Add `belongsToOrg()` and `canAccessProject()` functions

**Step 3.2: Update ScopeContext**
- Validate org selection against `userOrganizations`
- Validate project selection against `userProjects`
- Throw error if user tries to select unauthorized org/project

**Step 3.3: Update OptimizedProtectedRoute**
- Extract `orgId` from route params
- Check `belongsToOrg(orgId)` before allowing access
- Redirect to `/unauthorized` if check fails

### Phase 4: Permission System Overhaul (Week 2-3)

**Step 4.1: Use Database Permissions**
- Remove hardcoded `permissions.ts` matrix
- Load permissions from `rpc_current_user_permissions()`
- Cache permissions per org

**Step 4.2: Implement Org-Scoped Permission Checks**
```typescript
hasActionAccessInOrg(action: string, orgId: string): boolean {
  // Check if user belongs to org
  if (!this.belongsToOrg(orgId)) return false;
  
  // Check if user has permission in this org
  const orgPermissions = this.orgPermissions.get(orgId);
  return orgPermissions?.includes(action) || false;
}
```

### Phase 5: Testing (Week 3)

**Test Case 1: Org Isolation**
```
1. Login as accountant (belongs to org-1 only)
2. Try to access org-2 data
3. Expected: Access denied
```

**Test Case 2: Project Access**
```
1. Login as user with can_access_all_projects = false
2. Try to access project not in project_memberships
3. Expected: Access denied
```

**Test Case 3: Permission Checks**
```
1. Login as accountant
2. Check permissions match database (not hardcoded file)
3. Expected: Only see permissions from role_permissions table
```

---

## 🎯 Quick Wins (Do These First)

### 1. Fix Debug RLS Policy (5 minutes)
```sql
DROP POLICY "debug_projects_policy" ON projects;

CREATE POLICY "users_see_org_projects" ON projects FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )
);
```

### 2. Fix Organizations RLS (5 minutes)
```sql
DROP POLICY "allow_read_organizations" ON organizations;

CREATE POLICY "users_see_their_orgs" ON organizations FOR SELECT
USING (
  id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )
);
```

### 3. Test Current Org Membership (10 minutes)
```sql
-- Check if accountant user can see only their orgs
SELECT o.* FROM organizations o
WHERE o.id IN (
  SELECT org_id FROM org_memberships WHERE user_id = 'accountant-user-id'
);
```

---

## 📊 Summary

### What Works
✅ org_memberships table exists and has data  
✅ project_memberships table exists (but empty)  
✅ Basic RLS policies exist  
✅ Helper functions exist  

### What's Broken
❌ user_roles has no organization_id (roles are global)  
❌ Auth RPC doesn't load org/project memberships  
❌ RLS policies too permissive (debug policy in production!)  
❌ Frontend permissions hardcoded, not from database  
❌ ScopeContext doesn't validate org selection  
❌ Routes don't check org membership  

### Priority Fixes
1. **URGENT:** Fix RLS policies (remove debug policy)
2. **HIGH:** Add organization_id to user_roles
3. **HIGH:** Create enhanced auth RPC
4. **MEDIUM:** Update frontend auth integration
5. **MEDIUM:** Implement org-scoped permission checks

---

**Next Step:** Run the Quick Wins SQL commands to immediately improve security, then proceed with Phase 1 of the implementation plan.

