# Phase 1 Deployment - Clean v2 (Ready Now)

**Date**: January 24, 2026  
**Status**: ✅ READY TO DEPLOY  
**Version**: v2 (Clean deployment with CASCADE drops)

---

## What's Different in v2

**Key Improvements**:
1. Uses `CASCADE` on DROP statements to handle any dependencies
2. Uses `$$` delimiters instead of `$` for better compatibility
3. Cleaner, simpler structure
4. All functions use `CREATE` (not `CREATE OR REPLACE`)

---

## Deployment Steps

### Step 1: Deploy the Clean Migration

1. Open Supabase SQL Editor
2. Copy the entire content of `supabase/migrations/20260123_create_auth_rpc_functions_v2.sql`
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

### Test 1: get_user_orgs()

```sql
SELECT * FROM get_user_orgs();
```

**Expected**: 4 organizations with member counts

---

### Test 2: get_user_permissions()

```sql
SELECT * FROM get_user_permissions('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid);
```

**Expected**: List of permissions

---

### Test 3: check_org_access()

```sql
SELECT check_org_access('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid);
```

**Expected**: `true` or `false`

---

### Test 4: get_user_scope()

```sql
SELECT * FROM get_user_scope();
```

**Expected**: Current org and project

---

### Test 5: update_user_scope()

```sql
SELECT update_user_scope('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid, NULL);
```

**Expected**: No error

---

## Files

- `supabase/migrations/20260123_create_auth_rpc_functions_v2.sql` - Clean deployment file

