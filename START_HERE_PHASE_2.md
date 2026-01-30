# START HERE - Phase 2: Enhanced Permissions System

**Date**: January 24, 2026  
**Status**: ✅ READY TO START  
**Timeline**: 1-2 weeks  
**Objective**: Create role/permission assignment functions + audit logging

---

## What's Phase 2?

Build on Phase 1's foundation to create a complete permissions management system.

### Phase 1 Provided ✅
- 10 RLS policies (org isolation)
- 4 RPC functions (auth helpers)
- ScopeContext (scope management)

### Phase 2 Will Add ⏳
- Role assignment functions
- Permission assignment functions
- User-specific permission filtering
- Audit logging

---

## Phase 2 Functions (7 Total)

### Role Assignment (3 functions)

1. **`assign_role_to_user(user_id, role_id, org_id)`**
   - Assign a role to a user
   - Validates inputs
   - Logs the assignment

2. **`revoke_role_from_user(user_id, role_id, org_id)`**
   - Revoke a role from a user
   - Logs the revocation

3. **`get_user_roles(user_id, org_id)`**
   - Get all roles assigned to a user
   - Returns role details

### Permission Assignment (3 functions)

4. **`assign_permission_to_role(role_id, permission_id, org_id)`**
   - Assign a permission to a role
   - Validates inputs
   - Logs the assignment

5. **`revoke_permission_from_role(role_id, permission_id, org_id)`**
   - Revoke a permission from a role
   - Logs the revocation

6. **`get_role_permissions(role_id, org_id)`**
   - Get all permissions assigned to a role
   - Returns permission details

### Permission Filtering (1 function)

7. **`get_user_permissions_filtered(org_id)`**
   - Get only permissions for user's roles
   - Replaces generic `get_user_permissions()`

---

## Phase 2 Architecture

```
Database Layer
├─ audit_log table (new)
├─ role_permissions table (existing)
└─ user_roles table (existing)

RPC Functions (7 new)
├─ Role Assignment (3)
├─ Permission Assignment (3)
└─ Permission Filtering (1)

React Components (updated)
├─ EnterpriseRoleManagement.tsx
├─ EnterprisePermissionManagement.tsx
└─ AuditLogViewer.tsx (new)
```

---

## Phase 2 Implementation Steps

### Step 1: Create Audit Logging
- Create `audit_log` table
- Create `log_audit()` function
- Add RLS policy
- **File**: `supabase/migrations/20260125_create_audit_logging.sql`

### Step 2: Create Role Assignment Functions
- `assign_role_to_user()`
- `revoke_role_from_user()`
- `get_user_roles()`
- **File**: `supabase/migrations/20260125_create_role_assignment_functions.sql`

### Step 3: Create Permission Assignment Functions
- `assign_permission_to_role()`
- `revoke_permission_from_role()`
- `get_role_permissions()`
- **File**: `supabase/migrations/20260125_create_permission_assignment_functions.sql`

### Step 4: Create Filtered Permissions Function
- `get_user_permissions_filtered()`
- **File**: `supabase/migrations/20260125_create_filtered_permissions_function.sql`

### Step 5: Update React Components
- Enhance `EnterpriseRoleManagement.tsx`
- Enhance `EnterprisePermissionManagement.tsx`
- Create `AuditLogViewer.tsx`

### Step 6: Test All Functions
- Test role assignment
- Test permission assignment
- Test permission filtering
- Verify audit logging

---

## Quick Reference

### Audit Table Schema

```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp
);
```

### Function Signatures

```sql
-- Role Assignment
assign_role_to_user(user_id uuid, role_id int, org_id uuid)
  RETURNS TABLE(success boolean, message text)

revoke_role_from_user(user_id uuid, role_id int, org_id uuid)
  RETURNS TABLE(success boolean, message text)

get_user_roles(user_id uuid, org_id uuid)
  RETURNS TABLE(role_id int, role_name text, description text)

-- Permission Assignment
assign_permission_to_role(role_id int, permission_id int, org_id uuid)
  RETURNS TABLE(success boolean, message text)

revoke_permission_from_role(role_id int, permission_id int, org_id uuid)
  RETURNS TABLE(success boolean, message text)

get_role_permissions(role_id int, org_id uuid)
  RETURNS TABLE(permission_id int, permission_name text, resource text, action text)

-- Permission Filtering
get_user_permissions_filtered(org_id uuid)
  RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
```

---

## Testing Examples

### Test 1: Assign Role

```sql
SELECT * FROM assign_role_to_user(
  'user-uuid'::uuid,
  1,
  'org-uuid'::uuid
);
```

### Test 2: Get User Roles

```sql
SELECT * FROM get_user_roles(
  'user-uuid'::uuid,
  'org-uuid'::uuid
);
```

### Test 3: Assign Permission

```sql
SELECT * FROM assign_permission_to_role(
  1,
  1,
  'org-uuid'::uuid
);
```

### Test 4: Get Filtered Permissions

```sql
SELECT * FROM get_user_permissions_filtered(
  'org-uuid'::uuid
);
```

### Test 5: View Audit Log

```sql
SELECT * FROM audit_log
WHERE org_id = 'org-uuid'::uuid
ORDER BY created_at DESC;
```

---

## Phase 2 Timeline

**Week 1**:
- Day 1-2: Audit logging
- Day 3-4: Role assignment functions
- Day 5: Permission assignment functions

**Week 2**:
- Day 1-2: Filtered permissions function
- Day 3-4: React components
- Day 5: Testing & documentation

---

## Success Criteria

- ✅ All 7 functions deployed
- ✅ Audit table created
- ✅ All tests passing
- ✅ React components updated
- ✅ Documentation complete

---

## Files Reference

**Plan**: `PHASE_2_ENHANCED_PERMISSIONS_SYSTEM_PLAN.md`

**Migrations** (to create):
- `supabase/migrations/20260125_create_audit_logging.sql`
- `supabase/migrations/20260125_create_role_assignment_functions.sql`
- `supabase/migrations/20260125_create_permission_assignment_functions.sql`
- `supabase/migrations/20260125_create_filtered_permissions_function.sql`

**Documentation** (to create):
- `PHASE_2_DEPLOYMENT_GUIDE.md`
- `PHASE_2_COMPLETION_CERTIFICATE.md`

---

## Next Steps

1. ✅ Review this guide
2. ✅ Read `PHASE_2_ENHANCED_PERMISSIONS_SYSTEM_PLAN.md`
3. ⏳ Create audit logging migration
4. ⏳ Create role assignment functions
5. ⏳ Create permission assignment functions
6. ⏳ Create filtered permissions function
7. ⏳ Update React components
8. ⏳ Test all functions

---

## Questions?

See:
- `PHASE_2_ENHANCED_PERMISSIONS_SYSTEM_PLAN.md` - Full plan
- `ENTERPRISE_AUTH_COMPLETE_INDEX.md` - Documentation index
- `ENTERPRISE_AUTH_PHASES_0_1_COMPLETE.md` - Phase 0 & 1 summary

---

**Ready to start Phase 2?** 🚀
