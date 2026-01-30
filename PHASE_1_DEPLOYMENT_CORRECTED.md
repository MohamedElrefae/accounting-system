# Phase 1 Deployment - Corrected & Ready (v2)

**Date**: January 24, 2026  
**Status**: ✅ READY TO DEPLOY  
**Previous Errors**: Fixed

---

## What Was Fixed

### Error 1: `COUNT(om.id)` Column Doesn't Exist
**Root Cause**: The `org_memberships` table doesn't have an `id` column.
**Fix**: Changed to `COUNT(*)`

### Error 2: Function Return Type Conflict
**Root Cause**: Functions already existed with different return types.
**Fix**: Added `DROP FUNCTION IF EXISTS` statements at the beginning to clean up old versions before creating new ones.

---

## Migration Changes

**File**: `supabase/migrations/20260123_create_auth_rpc_functions.sql`

**Key Changes**:
1. Added cleanup section with 5 DROP statements
2. Changed all `CREATE OR REPLACE FUNCTION` to `CREATE FUNCTION` (since we're dropping first)
3. Fixed `COUNT(om.id)` to `COUNT(*)` in `get_user_orgs()`

---

## Deployment Steps

### Step 1: Deploy the Corrected Migration

1. Open Supabase SQL Editor
2. Copy the entire content of `supabase/migrations/20260123_create_auth_rpc_functions.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify: No errors should appear

**Expected Output**: 
```
5 rows returned
routine_name | routine_type | data_type
get_user_orgs | FUNCTION | ...
get_user_permissions | FUNCTION | ...
check_org_access | FUNCTION | ...
get_user_scope | FUNCTION | ...
update_user_scope | FUNCTION | ...
```

---

## Test Scenarios (After Deployment)

### Test 1: get_user_orgs() - Returns User's Organizations

**SQL**:
```sql
SELECT * FROM get_user_orgs();
```

**Expected Result**: 
- Returns 4 organizations (for m.elrefeay81@gmail.com)
- Columns: id, name, member_count
- Example:
  ```
  id                                   | name             | member_count
  bc16bacc-4fbe-4aeb-8ab1-fef2d895b441 | المؤسسة الرئيسية | 2
  731a3a00-6fa6-4282-9bec-8b5a8678e127 | مروان            | 1
  b0ceb6db-6255-473e-8fdf-7f583aabf993 | موسسة تجريبية 1  | 1
  cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e | مؤسسة الاختبار   | 3
  ```

---

### Test 2: get_user_permissions() - Returns User's Permissions

**SQL**:
```sql
SELECT * FROM get_user_permissions('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid);
```

**Expected Result**: 
- Returns list of permissions granted to user in that organization
- Columns: permission, granted
- Example:
  ```
  permission | granted
  view_transactions | true
  create_transactions | true
  approve_transactions | true
  ```

---

### Test 3: check_org_access() - Verify Organization Access

**SQL**:
```sql
SELECT check_org_access('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid);
```

**Expected Result**: 
- Returns `true` (user has access to this organization)
- Returns `false` (user does NOT have access to this organization)

---

### Test 4: get_user_scope() - Returns Current Scope

**SQL**:
```sql
SELECT * FROM get_user_scope();
```

**Expected Result**: 
- Returns current org and project selection
- Columns: org_id, org_name, project_id, project_name
- Example:
  ```
  org_id                               | org_name         | project_id | project_name
  cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e | مؤسسة الاختبار   | NULL       | NULL
  ```

---

### Test 5: update_user_scope() - Update Current Scope

**SQL**:
```sql
SELECT update_user_scope('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid, NULL);
```

**Expected Result**: 
- No error
- User's scope updated in user_profiles table
- Verify with: `SELECT * FROM get_user_scope();`

---

## Next Steps After Deployment

1. ✅ Deploy corrected migration
2. ⏭️ Execute all 5 test scenarios
3. ⏭️ Document test results
4. ⏭️ Create Phase 1 completion certificate
5. ⏭️ Move to Phase 2: Deploy Enhanced Permissions System

---

## Files Modified

- `supabase/migrations/20260123_create_auth_rpc_functions.sql` - Added DROP statements, fixed COUNT(*)

---

## Rollback Plan (if needed)

If deployment fails, run:
```sql
DROP FUNCTION IF EXISTS public.get_user_orgs();
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);
DROP FUNCTION IF EXISTS public.check_org_access(uuid);
DROP FUNCTION IF EXISTS public.get_user_scope();
DROP FUNCTION IF EXISTS public.update_user_scope(uuid, uuid);
```

Then investigate the error and re-deploy.



