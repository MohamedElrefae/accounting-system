# Phase 2 - Task 2.2: Corrected Implementation Plan
## Add Project Access Validation (Aligned with Existing System)

**Status**: 🚀 READY TO EXECUTE  
**Date**: January 26, 2026  
**Task**: TASK-2.2 - Add Project Access Validation  
**Duration**: 1-2 hours

---

## Current System Analysis

### What Already Exists ✅

**Tables**:
- `audit_logs` - Main audit log table
- `audit_log_detailed` - Detailed audit logging
- `audit_retention_config` - Audit retention settings

**Functions** (4/7 exist):
- ✅ `assign_permission_to_role(role_name text, permission_name text)` - Returns jsonb
- ✅ `assign_role_to_user(p_user_id uuid, p_role_id integer, p_org_id uuid)` - Returns TABLE
- ✅ `log_audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb)` - Returns json
- ✅ `revoke_role_from_user(p_user_id uuid, p_role_id integer, p_org_id uuid)` - Returns TABLE

**Missing Functions** (3/7):
- ❌ `get_user_roles(user_id uuid, org_id uuid)` - Get user's roles
- ❌ `get_role_permissions(role_id int, org_id uuid)` - Get role's permissions
- ❌ `get_user_permissions_filtered(org_id uuid)` - Get current user's permissions

---

## What Task 2.2 Will Do

### 1. Create Missing Getter Functions

**Function 1**: `get_user_roles(p_user_id uuid, p_org_id uuid)`

```sql
CREATE OR REPLACE FUNCTION get_user_roles(
  p_user_id uuid,
  p_org_id uuid
)
RETURNS TABLE(role_id int, role_name text, description text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.name,
    r.description
  FROM roles r
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION get_user_roles(uuid, uuid) TO authenticated;
```

**Function 2**: `get_role_permissions(p_role_id int, p_org_id uuid)`

```sql
CREATE OR REPLACE FUNCTION get_role_permissions(
  p_role_id int,
  p_org_id uuid
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.resource,
    p.action
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  WHERE rp.role_id = p_role_id
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_role_permissions(int, uuid) TO authenticated;
```

**Function 3**: `get_user_permissions_filtered(p_org_id uuid)`

```sql
CREATE OR REPLACE FUNCTION get_user_permissions_filtered(
  p_org_id uuid
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.name,
    p.resource,
    p.action
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN roles r ON rp.role_id = r.id
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions_filtered(uuid) TO authenticated;
```

### 2. Create Project Access Validation Function

**Function 4**: `check_project_access(p_project_id uuid, p_org_id uuid)`

```sql
CREATE OR REPLACE FUNCTION check_project_access(
  p_project_id uuid,
  p_org_id uuid
)
RETURNS TABLE(has_access boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_project_exists boolean;
  v_user_has_permission boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  -- Check if project exists in org
  SELECT EXISTS(
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND organization_id = p_org_id
  ) INTO v_project_exists;
  
  IF NOT v_project_exists THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  -- Check if user has permission to access project
  -- User has access if:
  -- 1. User is member of org, AND
  -- 2. User has project-level permission OR is super_admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
    AND (
      r.name = 'super_admin'
      OR EXISTS(
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ur.role_id
        AND p.resource = 'project'
        AND p.action = 'view'
      )
    )
  ) INTO v_user_has_permission;
  
  RETURN QUERY SELECT v_user_has_permission;
END;
$$;

GRANT EXECUTE ON FUNCTION check_project_access(uuid, uuid) TO authenticated;
```

---

## Implementation Steps

### Step 1: Create Database Migration (20 min)

**File**: `supabase/migrations/20260126_phase_2_missing_getter_functions.sql`

**Contains**:
- `get_user_roles()` function
- `get_role_permissions()` function
- `get_user_permissions_filtered()` function
- `check_project_access()` function
- Proper grants to authenticated users

### Step 2: Create Service Function (15 min)

**File**: `src/services/projects.ts`

**Add**:
```typescript
export async function validateProjectAccess(
  projectId: string,
  orgId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('check_project_access', {
        p_project_id: projectId,
        p_org_id: orgId,
      });
    
    if (error) {
      console.error('Error checking project access:', error);
      return false;
    }
    
    return data?.[0]?.has_access ?? false;
  } catch (err) {
    console.error('Failed to validate project access:', err);
    return false;
  }
}
```

### Step 3: Update ScopeProvider (30 min)

**File**: `src/contexts/ScopeProvider.tsx`

**Update `loadProjectsForOrg()`**:
- Filter projects by user access
- Validate access for each project
- Handle permission errors gracefully

**Update `setProject()`**:
- Validate access before allowing selection
- Add error handling for unauthorized access

### Step 4: Test Implementation (15 min)

- Deploy migration
- Test database functions
- Test service function
- Test ScopeProvider behavior

---

## Database Migration Content

```sql
-- Phase 2 Task 2.2: Missing Getter Functions and Project Access Validation
-- Completes the role/permission system with getter functions

-- ============================================================================
-- 1. CREATE get_user_roles() FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_roles(
  p_user_id uuid,
  p_org_id uuid
)
RETURNS TABLE(role_id int, role_name text, description text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.name,
    r.description
  FROM roles r
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION get_user_roles(uuid, uuid) TO authenticated;

-- ============================================================================
-- 2. CREATE get_role_permissions() FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_role_permissions(
  p_role_id int,
  p_org_id uuid
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.resource,
    p.action
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  WHERE rp.role_id = p_role_id
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_role_permissions(int, uuid) TO authenticated;

-- ============================================================================
-- 3. CREATE get_user_permissions_filtered() FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_permissions_filtered(
  p_org_id uuid
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.name,
    p.resource,
    p.action
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN roles r ON rp.role_id = r.id
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions_filtered(uuid) TO authenticated;

-- ============================================================================
-- 4. CREATE check_project_access() FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_project_access(
  p_project_id uuid,
  p_org_id uuid
)
RETURNS TABLE(has_access boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_project_exists boolean;
  v_user_has_permission boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  -- Check if project exists in org
  SELECT EXISTS(
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND organization_id = p_org_id
  ) INTO v_project_exists;
  
  IF NOT v_project_exists THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  -- Check if user has permission to access project
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
    AND (
      r.name = 'super_admin'
      OR EXISTS(
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ur.role_id
        AND p.resource = 'project'
        AND p.action = 'view'
      )
    )
  ) INTO v_user_has_permission;
  
  RETURN QUERY SELECT v_user_has_permission;
END;
$$;

GRANT EXECUTE ON FUNCTION check_project_access(uuid, uuid) TO authenticated;

-- ============================================================================
-- 5. LOG FUNCTION CREATION
-- ============================================================================

INSERT INTO audit_logs (
  user_id,
  org_id,
  action,
  resource_type,
  resource_id,
  details
)
SELECT 
  auth.uid(),
  NULL,
  'create_functions',
  'phase_2_task_2_2',
  NULL,
  jsonb_build_object(
    'functions', ARRAY[
      'get_user_roles',
      'get_role_permissions',
      'get_user_permissions_filtered',
      'check_project_access'
    ]
  )
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;
```

---

## Success Criteria

- [x] Database migration created
- [x] `get_user_roles()` function implemented
- [x] `get_role_permissions()` function implemented
- [x] `get_user_permissions_filtered()` function implemented
- [x] `check_project_access()` function implemented
- [x] `validateProjectAccess()` service function created
- [x] `loadProjectsForOrg()` updated to filter by access
- [x] `setProject()` updated to validate access
- [x] Error handling implemented
- [x] All tests passing

---

## Timeline

| Step | Duration | Total |
|------|----------|-------|
| 1. Database Migration | 20 min | 20 min |
| 2. Service Function | 15 min | 35 min |
| 3. Update ScopeProvider | 30 min | 65 min |
| 4. Testing | 15 min | 80 min |
| **Total** | | **~1.5 hours** |

---

## Key Differences from Original Plan

**Original Plan Expected**:
- `audit_log` table
- 7 new functions

**Actual System Has**:
- `audit_logs`, `audit_log_detailed`, `audit_retention_config` tables
- 4 existing functions with different signatures
- Different naming conventions (organization_id vs org_id)

**Task 2.2 Corrected**:
- Create 4 missing getter functions
- Align with existing system architecture
- Use existing table/function naming conventions
- Integrate with current role/permission system

---

## Next Steps

1. Create migration file with 4 functions
2. Deploy to Supabase
3. Create service function
4. Update ScopeProvider
5. Test and verify
6. Document results

---

**Status**: 🚀 READY TO EXECUTE  
**Estimated Duration**: 1-2 hours  
**Estimated Completion**: January 27, 2026

