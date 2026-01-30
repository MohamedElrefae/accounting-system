# Phase 1 Deployment - v3 (Working Functions)

**Date**: January 24, 2026  
**Status**: ✅ READY TO DEPLOY  
**Version**: v3 (4 working functions, get_user_permissions deferred)

---

## What Changed in v3

**Issue Found**: `role_permissions` table doesn't have a `permission` column - it has `permission_id`

**Solution**: Deploy 4 working functions now, discover schema for permissions, deploy get_user_permissions separately

**Functions Deployed**:
1. ✅ `get_user_orgs()` - Returns user's organizations
2. ✅ `check_org_access(uuid)` - Verifies org access
3. ✅ `get_user_scope()` - Returns current scope
4. ✅ `update_user_scope(uuid, uuid)` - Updates scope

**Functions Deferred**:
- `get_user_permissions(uuid)` - Requires schema discovery

---

## Deployment Steps

### Step 1: Deploy v3 Migration

1. Open Supabase SQL Editor
2. Copy entire content of `supabase/migrations/20260123_create_auth_rpc_functions_v3.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify: No errors

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

## Test Scenarios (After Deployment)

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

## Next: Discover Permissions Schema

Run this to discover the actual schema:

```sql
-- Discover role_permissions table schema
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'role_permissions'
ORDER BY ordinal_position;

-- Also check user_roles schema
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- Check permissions table if it exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'permissions'
ORDER BY ordinal_position;
```

Then we'll create the correct `get_user_permissions()` function.

---

## Files

- `supabase/migrations/20260123_create_auth_rpc_functions_v3.sql` - 4 working functions
- `sql/discover_role_permissions_schema.sql` - Schema discovery queries

