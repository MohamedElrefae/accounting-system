# Phase 1 Complete Deployment Guide

**Date**: January 24, 2026  
**Status**: ✅ READY TO DEPLOY  
**Version**: v3 + Permissions (2-step deployment)

---

## Schema Discovery Results

**role_permissions table**:
- `id` (integer, NOT NULL)
- `role_id` (integer)
- `permission_id` (integer)

**user_roles table**:
- `id` (integer, NOT NULL)
- `user_id` (uuid)
- `role_id` (integer)
- `assigned_by` (uuid)
- `assigned_at` (timestamp)
- `expires_at` (timestamp)
- `is_active` (boolean)

⚠️ **NOTE**: `user_roles` does NOT have an `org_id` column. Org filtering happens at RLS policy level.

**permissions table**:
- `id` (integer, NOT NULL)
- `name` (varchar)
- `name_ar` (varchar)
- `resource` (varchar)
- `action` (varchar)
- `description` (text)
- `description_ar` (text)
- `category` (text)
- `created_at` (timestamp)

---

## Deployment Steps

### Step 1: Deploy v3 (4 Core Functions)

1. Open Supabase SQL Editor
2. Copy entire content of `supabase/migrations/20260123_create_auth_rpc_functions_v3.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify: 4 functions created successfully

**Expected Output**:
```
4 rows returned
routine_name | routine_type | data_type
check_org_access | FUNCTION | ...
get_user_orgs | FUNCTION | ...
get_user_scope | FUNCTION | ...
update_user_scope | FUNCTION | ...
```

---

### Step 2: Deploy Permissions Function

1. Open Supabase SQL Editor (new tab)
2. Copy entire content of `supabase/migrations/20260124_create_get_user_permissions.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify: 1 function created successfully

**Expected Output**:
```
1 row returned
routine_name | routine_type
get_user_permissions | FUNCTION
```

---

## Test Scenarios (After Both Deployments)

### Test 1: get_user_orgs()

```sql
SELECT * FROM get_user_orgs();
```

**Expected**: 4 organizations with member counts

---

### Test 2: check_org_access()

```sql
SELECT check_org_access('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid);
```

**Expected**: `true` or `false`

---

### Test 3: get_user_scope()

```sql
SELECT * FROM get_user_scope();
```

**Expected**: Current org and project

---

### Test 4: update_user_scope()

```sql
SELECT update_user_scope('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid, NULL);
```

**Expected**: No error

---

### Test 5: get_user_permissions()

```sql
SELECT * FROM get_user_permissions();
```

**Expected**: List of permissions with columns:
- `permission_id` (integer)
- `permission_name` (text)
- `resource` (text)
- `action` (text)

Example:
```
permission_id | permission_name | resource | action
1             | view_transactions | transactions | view
2             | create_transactions | transactions | create
3             | approve_transactions | transactions | approve
```

---

## Important Notes

✅ **user_roles has no org_id column**
- Org filtering happens at RLS policy level (Phase 0)
- get_user_permissions() returns all permissions for user's roles
- RLS policies ensure users only see data for their orgs

✅ **All functions use SECURITY DEFINER**
- Functions run with elevated privileges
- Safe for authenticated users to call

✅ **Functions filter by is_active**
- Only active user roles are considered
- Expired roles are automatically excluded

---

## Files

- `supabase/migrations/20260123_create_auth_rpc_functions_v3.sql` - 4 core functions
- `supabase/migrations/20260124_create_get_user_permissions.sql` - Permissions function

---

## Next Steps After Deployment

1. ✅ Deploy v3 migration
2. ✅ Deploy permissions migration
3. ✅ Execute all 5 test scenarios
4. ✅ Document test results
5. ⏭️ Create Phase 1 completion certificate
6. ⏭️ Move to Phase 2: Deploy Enhanced Permissions System

