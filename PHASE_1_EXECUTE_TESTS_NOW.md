# Phase 1 - Execute Tests Now

**Status**: Ready to test  
**Date**: January 24, 2026

---

## Quick Action: Deploy & Test

### 1️⃣ Deploy Migration (Copy & Paste)

Go to Supabase SQL Editor and run:

```sql
-- PHASE 1: Create Enhanced Auth RPC Functions
-- Date: January 23, 2026
-- Purpose: Create RPC functions for auth, permissions, and scope management

-- ============================================================================
-- RPC FUNCTION 1: get_user_orgs()
-- Purpose: Returns organizations user belongs to
-- Returns: TABLE(id uuid, name text, member_count int)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_orgs()
RETURNS TABLE(id uuid, name text, member_count int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  SELECT 
    o.id,
    o.name,
    COUNT(*)::int as member_count
  FROM organizations o
  INNER JOIN org_memberships om ON o.id = om.org_id
  WHERE om.user_id = auth.uid()
  GROUP BY o.id, o.name
  ORDER BY o.name;
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_orgs() TO authenticated;

-- ============================================================================
-- RPC FUNCTION 2: get_user_permissions()
-- Purpose: Returns user's permissions in specific organization
-- Parameters: org_id uuid
-- Returns: TABLE(permission text, granted boolean)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions(org_id uuid)
RETURNS TABLE(permission text, granted boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  SELECT 
    rp.permission,
    true as granted
  FROM user_roles ur
  INNER JOIN roles r ON ur.role_id = r.id
  INNER JOIN role_permissions rp ON r.id = rp.role_id
  WHERE ur.user_id = auth.uid()
    AND ur.org_id = $1
  ORDER BY rp.permission;
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;

-- ============================================================================
-- RPC FUNCTION 3: check_org_access()
-- Purpose: Verifies user has access to specific organization
-- Parameters: org_id uuid
-- Returns: boolean
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_org_access(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  SELECT EXISTS(
    SELECT 1
    FROM org_memberships
    WHERE user_id = auth.uid()
      AND org_id = $1
  );
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_org_access(uuid) TO authenticated;

-- ============================================================================
-- RPC FUNCTION 4: get_user_scope()
-- Purpose: Returns user's current scope (org + project)
-- Returns: TABLE(org_id uuid, org_name text, project_id uuid, project_name text)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_scope()
RETURNS TABLE(org_id uuid, org_name text, project_id uuid, project_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  SELECT 
    o.id as org_id,
    o.name as org_name,
    p.id as project_id,
    p.name as project_name
  FROM user_profiles up
  LEFT JOIN organizations o ON up.current_org_id = o.id
  LEFT JOIN projects p ON up.current_project_id = p.id
  WHERE up.user_id = auth.uid();
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_scope() TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: update_user_scope()
-- Purpose: Updates user's current scope (org + project)
-- Parameters: org_id uuid, project_id uuid
-- Returns: void
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_scope(org_id uuid, project_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  UPDATE user_profiles
  SET 
    current_org_id = $1,
    current_project_id = $2,
    updated_at = NOW()
  WHERE user_id = auth.uid();
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_scope(uuid, uuid) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all functions created successfully
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_orgs',
    'get_user_permissions',
    'check_org_access',
    'get_user_scope',
    'update_user_scope'
  )
ORDER BY routine_name;
```

**Expected**: 5 rows returned with all function names

---

### 2️⃣ Test 1: Get User Organizations

```sql
SELECT * FROM get_user_orgs();
```

**Expected**: 4 organizations returned

---

### 3️⃣ Test 2: Get User Permissions

```sql
SELECT * FROM get_user_permissions('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid);
```

**Expected**: List of permissions (or empty if no roles assigned)

---

### 4️⃣ Test 3: Check Organization Access

```sql
-- Should return true (user has access)
SELECT check_org_access('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid);

-- Should return false (user doesn't have access)
SELECT check_org_access('00000000-0000-0000-0000-000000000000'::uuid);
```

**Expected**: true, then false

---

### 5️⃣ Test 4: Get Current Scope

```sql
SELECT * FROM get_user_scope();
```

**Expected**: Current org and project (may be NULL if not set)

---

### 6️⃣ Test 5: Update Scope

```sql
SELECT update_user_scope('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid, NULL);
```

**Expected**: No error

Verify:
```sql
SELECT * FROM get_user_scope();
```

---

## ✅ All Tests Passed?

If yes, Phase 1 is complete! Move to Phase 2.

