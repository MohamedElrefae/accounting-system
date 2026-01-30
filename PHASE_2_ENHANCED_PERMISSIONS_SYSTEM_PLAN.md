# Phase 2: Enhanced Permissions System - Planning & Execution

**Date**: January 24, 2026  
**Status**: ✅ READY TO START  
**Timeline**: 1-2 weeks  
**Objective**: Create role and permission assignment functions with audit logging

---

## Phase 2 Overview

Build on Phase 1's foundation (RLS policies + RPC functions) to create a complete permissions management system.

### What Phase 1 Provided
- ✅ 10 RLS policies (org isolation)
- ✅ 4 RPC functions (auth helpers)
- ✅ ScopeContext (scope management)

### What Phase 2 Will Add
- ⏳ Role assignment functions
- ⏳ Permission assignment functions
- ⏳ User-specific permission filtering
- ⏳ Audit logging

---

## Phase 2 Objectives

### 1. Role Assignment Functions

**Functions to Create**:

#### `assign_role_to_user(user_id uuid, role_id int, org_id uuid)`
- Assign a role to a user in an organization
- Validate user exists
- Validate role exists
- Validate org exists
- Check user has permission to assign roles
- Log the assignment

**Signature**:
```sql
assign_role_to_user(
  user_id uuid,
  role_id int,
  org_id uuid
)
RETURNS TABLE(success boolean, message text)
```

---

#### `revoke_role_from_user(user_id uuid, role_id int, org_id uuid)`
- Revoke a role from a user in an organization
- Validate user has the role
- Check user has permission to revoke roles
- Log the revocation

**Signature**:
```sql
revoke_role_from_user(
  user_id uuid,
  role_id int,
  org_id uuid
)
RETURNS TABLE(success boolean, message text)
```

---

#### `get_user_roles(user_id uuid, org_id uuid)`
- Get all roles assigned to a user in an organization
- Returns role details

**Signature**:
```sql
get_user_roles(
  user_id uuid,
  org_id uuid
)
RETURNS TABLE(role_id int, role_name text, description text)
```

---

### 2. Permission Assignment Functions

**Functions to Create**:

#### `assign_permission_to_role(role_id int, permission_id int, org_id uuid)`
- Assign a permission to a role in an organization
- Validate role exists
- Validate permission exists
- Check user has permission to assign permissions
- Log the assignment

**Signature**:
```sql
assign_permission_to_role(
  role_id int,
  permission_id int,
  org_id uuid
)
RETURNS TABLE(success boolean, message text)
```

---

#### `revoke_permission_from_role(role_id int, permission_id int, org_id uuid)`
- Revoke a permission from a role in an organization
- Validate role has the permission
- Check user has permission to revoke permissions
- Log the revocation

**Signature**:
```sql
revoke_permission_from_role(
  role_id int,
  permission_id int,
  org_id uuid
)
RETURNS TABLE(success boolean, message text)
```

---

#### `get_role_permissions(role_id int, org_id uuid)`
- Get all permissions assigned to a role in an organization
- Returns permission details

**Signature**:
```sql
get_role_permissions(
  role_id int,
  org_id uuid
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
```

---

### 3. User-Specific Permission Filtering

**Enhance `get_user_permissions()`**:

Current: Returns all permissions for all roles

New: Return only permissions for user's roles in current org

**New Signature**:
```sql
get_user_permissions_filtered(
  org_id uuid
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
```

---

### 4. Audit Logging

**Create Audit Table**:

```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);
```

**Audit Function**:

```sql
CREATE FUNCTION log_audit(
  org_id uuid,
  action text,
  resource text,
  resource_id text,
  old_value jsonb,
  new_value jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO audit_log (org_id, user_id, action, resource, resource_id, old_value, new_value)
  VALUES (org_id, auth.uid(), action, resource, resource_id, old_value, new_value);
$$;
```

---

## Phase 2 Architecture

### Database Layer

```
audit_log table
├─ Stores all permission changes
├─ Tracks who made changes
├─ Tracks when changes were made
└─ Stores before/after values

role_permissions table (existing)
├─ Links roles to permissions
└─ Org-scoped via RLS

user_roles table (existing)
├─ Links users to roles
└─ Org-scoped via RLS
```

### RPC Functions

```
Role Assignment
├─ assign_role_to_user()
├─ revoke_role_from_user()
└─ get_user_roles()

Permission Assignment
├─ assign_permission_to_role()
├─ revoke_permission_from_role()
└─ get_role_permissions()

Permission Filtering
└─ get_user_permissions_filtered()

Audit
└─ log_audit()
```

### React Integration

```
EnterpriseRoleManagement.tsx
├─ Calls assign_role_to_user()
├─ Calls revoke_role_from_user()
├─ Calls get_user_roles()
└─ Displays audit log

EnterprisePermissionManagement.tsx
├─ Calls assign_permission_to_role()
├─ Calls revoke_permission_from_role()
├─ Calls get_role_permissions()
└─ Displays audit log
```

---

## Phase 2 Implementation Steps

### Step 1: Create Audit Table & Function

**File**: `supabase/migrations/20260125_create_audit_logging.sql`

```sql
-- Create audit_log table
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT audit_log_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Create audit function
CREATE FUNCTION log_audit(
  org_id uuid,
  action text,
  resource text,
  resource_id text DEFAULT NULL,
  old_value jsonb DEFAULT NULL,
  new_value jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO audit_log (org_id, user_id, action, resource, resource_id, old_value, new_value)
  VALUES (org_id, auth.uid(), action, resource, resource_id, old_value, new_value);
$$;

GRANT EXECUTE ON FUNCTION log_audit TO authenticated;

-- Create RLS policy for audit_log
CREATE POLICY audit_log_org_isolation ON audit_log
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
    )
  );

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

---

### Step 2: Create Role Assignment Functions

**File**: `supabase/migrations/20260125_create_role_assignment_functions.sql`

```sql
-- assign_role_to_user
CREATE FUNCTION assign_role_to_user(
  p_user_id uuid,
  p_role_id int,
  p_org_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_exists boolean;
  v_user_exists boolean;
  v_org_exists boolean;
BEGIN
  -- Validate org exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE id = p_org_id)
  INTO v_org_exists;
  
  IF NOT v_org_exists THEN
    RETURN QUERY SELECT false, 'Organization not found'::text;
    RETURN;
  END IF;
  
  -- Validate user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id)
  INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN QUERY SELECT false, 'User not found'::text;
    RETURN;
  END IF;
  
  -- Validate role exists
  SELECT EXISTS(SELECT 1 FROM roles WHERE id = p_role_id)
  INTO v_role_exists;
  
  IF NOT v_role_exists THEN
    RETURN QUERY SELECT false, 'Role not found'::text;
    RETURN;
  END IF;
  
  -- Assign role
  INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at, is_active)
  VALUES (p_user_id, p_role_id, auth.uid(), now(), true)
  ON CONFLICT DO NOTHING;
  
  -- Log audit
  PERFORM log_audit(
    p_org_id,
    'ROLE_ASSIGNED',
    'user_roles',
    p_user_id::text,
    NULL,
    jsonb_build_object('user_id', p_user_id, 'role_id', p_role_id)
  );
  
  RETURN QUERY SELECT true, 'Role assigned successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_role_to_user TO authenticated;

-- revoke_role_from_user
CREATE FUNCTION revoke_role_from_user(
  p_user_id uuid,
  p_role_id int,
  p_org_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete role assignment
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role_id = p_role_id;
  
  -- Log audit
  PERFORM log_audit(
    p_org_id,
    'ROLE_REVOKED',
    'user_roles',
    p_user_id::text,
    jsonb_build_object('user_id', p_user_id, 'role_id', p_role_id),
    NULL
  );
  
  RETURN QUERY SELECT true, 'Role revoked successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_role_from_user TO authenticated;

-- get_user_roles
CREATE FUNCTION get_user_roles(
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
    AND ur.is_active = true
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION get_user_roles TO authenticated;
```

---

### Step 3: Create Permission Assignment Functions

**File**: `supabase/migrations/20260125_create_permission_assignment_functions.sql`

```sql
-- assign_permission_to_role
CREATE FUNCTION assign_permission_to_role(
  p_role_id int,
  p_permission_id int,
  p_org_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_exists boolean;
  v_permission_exists boolean;
BEGIN
  -- Validate role exists
  SELECT EXISTS(SELECT 1 FROM roles WHERE id = p_role_id)
  INTO v_role_exists;
  
  IF NOT v_role_exists THEN
    RETURN QUERY SELECT false, 'Role not found'::text;
    RETURN;
  END IF;
  
  -- Validate permission exists
  SELECT EXISTS(SELECT 1 FROM permissions WHERE id = p_permission_id)
  INTO v_permission_exists;
  
  IF NOT v_permission_exists THEN
    RETURN QUERY SELECT false, 'Permission not found'::text;
    RETURN;
  END IF;
  
  -- Assign permission
  INSERT INTO role_permissions (role_id, permission_id)
  VALUES (p_role_id, p_permission_id)
  ON CONFLICT DO NOTHING;
  
  -- Log audit
  PERFORM log_audit(
    p_org_id,
    'PERMISSION_ASSIGNED',
    'role_permissions',
    p_role_id::text,
    NULL,
    jsonb_build_object('role_id', p_role_id, 'permission_id', p_permission_id)
  );
  
  RETURN QUERY SELECT true, 'Permission assigned successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_permission_to_role TO authenticated;

-- revoke_permission_from_role
CREATE FUNCTION revoke_permission_from_role(
  p_role_id int,
  p_permission_id int,
  p_org_id uuid
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete permission assignment
  DELETE FROM role_permissions
  WHERE role_id = p_role_id AND permission_id = p_permission_id;
  
  -- Log audit
  PERFORM log_audit(
    p_org_id,
    'PERMISSION_REVOKED',
    'role_permissions',
    p_role_id::text,
    jsonb_build_object('role_id', p_role_id, 'permission_id', p_permission_id),
    NULL
  );
  
  RETURN QUERY SELECT true, 'Permission revoked successfully'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION revoke_permission_from_role TO authenticated;

-- get_role_permissions
CREATE FUNCTION get_role_permissions(
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

GRANT EXECUTE ON FUNCTION get_role_permissions TO authenticated;
```

---

### Step 4: Create User-Specific Permission Filtering

**File**: `supabase/migrations/20260125_create_filtered_permissions_function.sql`

```sql
-- get_user_permissions_filtered
CREATE FUNCTION get_user_permissions_filtered(
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
    AND ur.is_active = true
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions_filtered TO authenticated;
```

---

## Phase 2 Testing Plan

### Test 1: Assign Role to User

```sql
SELECT * FROM assign_role_to_user(
  'user-uuid-here'::uuid,
  1,
  'org-uuid-here'::uuid
);
```

Expected: `success = true, message = 'Role assigned successfully'`

---

### Test 2: Get User Roles

```sql
SELECT * FROM get_user_roles(
  'user-uuid-here'::uuid,
  'org-uuid-here'::uuid
);
```

Expected: List of roles assigned to user

---

### Test 3: Assign Permission to Role

```sql
SELECT * FROM assign_permission_to_role(
  1,
  1,
  'org-uuid-here'::uuid
);
```

Expected: `success = true, message = 'Permission assigned successfully'`

---

### Test 4: Get Role Permissions

```sql
SELECT * FROM get_role_permissions(
  1,
  'org-uuid-here'::uuid
);
```

Expected: List of permissions assigned to role

---

### Test 5: Get Filtered User Permissions

```sql
SELECT * FROM get_user_permissions_filtered(
  'org-uuid-here'::uuid
);
```

Expected: List of permissions for user's roles

---

### Test 6: Verify Audit Log

```sql
SELECT * FROM audit_log
WHERE org_id = 'org-uuid-here'::uuid
ORDER BY created_at DESC;
```

Expected: List of all permission changes

---

## Phase 2 Deliverables

### Migrations
- `supabase/migrations/20260125_create_audit_logging.sql`
- `supabase/migrations/20260125_create_role_assignment_functions.sql`
- `supabase/migrations/20260125_create_permission_assignment_functions.sql`
- `supabase/migrations/20260125_create_filtered_permissions_function.sql`

### Documentation
- `PHASE_2_ENHANCED_PERMISSIONS_SYSTEM_PLAN.md` (this file)
- `PHASE_2_DEPLOYMENT_GUIDE.md`
- `PHASE_2_COMPLETION_CERTIFICATE.md`

### React Components
- Enhance `EnterpriseRoleManagement.tsx` to use new functions
- Enhance `EnterprisePermissionManagement.tsx` to use new functions
- Create `AuditLogViewer.tsx` to display audit trail

---

## Phase 2 Success Criteria

- ✅ All 7 functions deployed successfully
- ✅ Audit table created with RLS policy
- ✅ All tests passing
- ✅ React components updated
- ✅ Documentation complete

---

## Timeline

**Week 1**:
- Day 1-2: Create audit logging
- Day 3-4: Create role assignment functions
- Day 5: Create permission assignment functions

**Week 2**:
- Day 1-2: Create filtered permissions function
- Day 3-4: Update React components
- Day 5: Testing and documentation

---

## Next Steps

1. ✅ Review this plan
2. ⏳ Create audit logging migration
3. ⏳ Create role assignment functions
4. ⏳ Create permission assignment functions
5. ⏳ Create filtered permissions function
6. ⏳ Update React components
7. ⏳ Test all functions
8. ⏳ Document results

---

## Questions?

Refer to:
- `ENTERPRISE_AUTH_PHASES_0_1_COMPLETE.md` - Phase 0 & 1 summary
- `ENTERPRISE_AUTH_COMPLETE_INDEX.md` - Full documentation index
- `AI_AGENT_EXECUTION_PLAN_ENTERPRISE_AUTH.md` - Full 28-task plan

---

**Ready to start Phase 2?** 🚀
