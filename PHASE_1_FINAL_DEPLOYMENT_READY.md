# Phase 1 Final Deployment - Ready Now

**Date**: January 24, 2026  
**Status**: ✅ READY TO DEPLOY  
**Version**: v3 Final (4 functions, scope handled by ScopeContext)

---

## Critical Decision: Scope Management

**Question**: Should we add `current_org_id` and `current_project_id` to `user_profiles`?

**Answer**: NO - Here's why:

1. **ScopeContext manages scope in React state** - Not in database
2. **Scope is session-based** - Temporary, per-session, not persistent
3. **RLS policies enforce org isolation** - Phase 0 already ensures data isolation
4. **get_user_scope() is initialization helper** - Returns first org to bootstrap ScopeContext

**Architecture**:
- Database: Stores org memberships (Phase 0 RLS policies)
- React: ScopeContext manages current selection in memory
- Functions: Helper to get user's organizations

---

## Final Functions (v3)

1. ✅ `get_user_orgs()` - Returns all user's organizations
2. ✅ `check_org_access(uuid)` - Verifies org access
3. ✅ `get_user_scope()` - Returns first org (for initialization)
4. ✅ `get_user_permissions()` - Returns user's permissions

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
routine_name | routine_type
check_org_access | FUNCTION
get_user_orgs | FUNCTION
get_user_permissions | FUNCTION
get_user_scope | FUNCTION
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

**Expected**: First organization (for ScopeContext initialization)
```
org_id                               | org_name
cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e | مؤسسة الاختبار
```

---

### Test 4: get_user_permissions()

```sql
SELECT * FROM get_user_permissions();
```

**Expected**: List of permissions
```
permission_id | permission_name | resource | action
1             | view_transactions | transactions | view
2             | create_transactions | transactions | create
```

---

## Architecture Summary

**Phase 0 (Complete)**: RLS policies enforce org isolation at database level

**Phase 1 (Now)**: RPC functions provide auth helpers
- `get_user_orgs()` - List accessible orgs
- `check_org_access()` - Verify access
- `get_user_scope()` - Bootstrap scope
- `get_user_permissions()` - Get permissions

**React Layer**: ScopeContext manages current selection in memory
- Stores `currentOrg` and `currentProject`
- Validates project belongs to org
- Syncs with unified manager

**Result**: Clean separation of concerns
- Database: Enforces security (RLS)
- Functions: Provide data (RPC)
- React: Manages UX state (ScopeContext)

---

## Files

- `supabase/migrations/20260123_create_auth_rpc_functions_v3.sql` - 4 core functions
- `supabase/migrations/20260124_create_get_user_permissions.sql` - Permissions function

---

## Next Steps

1. ✅ Deploy v3 migration
2. ✅ Deploy permissions migration
3. ✅ Execute all 4 test scenarios
4. ✅ Document test results
5. ⏭️ Create Phase 1 completion certificate
6. ⏭️ Move to Phase 2: Deploy Enhanced Permissions System

