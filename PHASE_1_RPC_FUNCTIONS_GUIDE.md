# PHASE 1 - RPC FUNCTIONS GUIDE

**Date:** January 23, 2026  
**Status:** Ready to deploy  
**Functions:** 5 (4 main + 1 helper)  

---

## 📋 RPC FUNCTIONS OVERVIEW

### Function 1: get_user_orgs()
**Purpose:** Returns organizations user belongs to  
**Called by:** Organization selector component  
**Returns:** List of organizations with member count

```sql
SELECT * FROM get_user_orgs();
```

**Expected Result:**
```
id                                   | name             | member_count
------------------------------------ | ---------------- | -----------
b0ceb6db-6255-473e-8fdf-7f583aabf993 | موسسة تجريبية 1  | 2
cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e | مؤسسة الاختبار   | 6
```

**Use Cases:**
- Populate org selector dropdown
- Show available organizations
- Display member count
- Filter data by organization

---

### Function 2: get_user_permissions(org_id)
**Purpose:** Returns user's permissions in specific organization  
**Called by:** Permission check component  
**Returns:** List of permissions granted to user

```sql
SELECT * FROM get_user_permissions('b0ceb6db-6255-473e-8fdf-7f583aabf993');
```

**Expected Result:**
```
permission              | granted
----------------------- | -------
view_transactions       | true
create_transactions     | true
approve_transactions    | false
manage_users            | false
```

**Use Cases:**
- Check if user can perform action
- Show/hide UI elements based on permissions
- Enforce role-based access control
- Display permission matrix

---

### Function 3: check_org_access(org_id)
**Purpose:** Verifies user has access to specific organization  
**Called by:** Authorization middleware  
**Returns:** Boolean (true/false)

```sql
SELECT check_org_access('b0ceb6db-6255-473e-8fdf-7f583aabf993');
```

**Expected Result:**
```
check_org_access
----------------
true
```

**Use Cases:**
- Quick permission check
- Authorization middleware
- Route protection
- API endpoint security

---

### Function 4: get_user_scope()
**Purpose:** Returns user's current scope (org + project)  
**Called by:** Scope context provider  
**Returns:** Current organization and project

```sql
SELECT * FROM get_user_scope();
```

**Expected Result:**
```
org_id                               | org_name            | project_id | project_name
------------------------------------ | ------------------- | ---------- | -----------
b0ceb6db-6255-473e-8fdf-7f583aabf993 | موسسة تجريبية 1     | NULL       | NULL
```

**Use Cases:**
- Get current user scope
- Initialize scope context
- Display current organization
- Filter data by current scope

---

### Function 5: update_user_scope(org_id, project_id)
**Purpose:** Updates user's current scope (org + project)  
**Called by:** Scope selector component  
**Returns:** void

```sql
SELECT update_user_scope('b0ceb6db-6255-473e-8fdf-7f583aabf993', NULL);
```

**Use Cases:**
- Switch organization
- Switch project
- Update user context
- Persist scope selection

---

## 🧪 TESTING GUIDE

### Test 1: get_user_orgs()

**Setup:**
- User: m.elrefeay81@gmail.com (super admin)
- Expected: All organizations user belongs to

**Test Query:**
```sql
SELECT * FROM get_user_orgs();
```

**Expected Result:**
- Returns 4 organizations (super admin belongs to all)
- Each organization has member_count > 0
- Results ordered by name

**Verification:**
```sql
-- Verify count
SELECT COUNT(*) FROM get_user_orgs();
-- Should return 4

-- Verify member counts
SELECT org_name, member_count FROM get_user_orgs();
-- All should have member_count > 0
```

---

### Test 2: get_user_permissions()

**Setup:**
- User: m.elrefeay81@gmail.com (super admin)
- Organization: b0ceb6db-6255-473e-8fdf-7f583aabf993

**Test Query:**
```sql
SELECT * FROM get_user_permissions('b0ceb6db-6255-473e-8fdf-7f583aabf993');
```

**Expected Result:**
- Returns list of permissions
- All permissions granted = true
- Results ordered by permission name

**Verification:**
```sql
-- Verify permissions exist
SELECT COUNT(*) FROM get_user_permissions('b0ceb6db-6255-473e-8fdf-7f583aabf993');
-- Should return > 0

-- Verify all granted
SELECT COUNT(*) FROM get_user_permissions('b0ceb6db-6255-473e-8fdf-7f583aabf993')
WHERE granted = false;
-- Should return 0 for super admin
```

---

### Test 3: check_org_access()

**Setup:**
- User: m.elrefeay81@gmail.com (super admin)
- Organization: b0ceb6db-6255-473e-8fdf-7f583aabf993

**Test Query:**
```sql
SELECT check_org_access('b0ceb6db-6255-473e-8fdf-7f583aabf993');
```

**Expected Result:**
- Returns true (user has access)

**Verification:**
```sql
-- Test with valid org
SELECT check_org_access('b0ceb6db-6255-473e-8fdf-7f583aabf993');
-- Should return true

-- Test with invalid org (non-existent)
SELECT check_org_access('00000000-0000-0000-0000-000000000000');
-- Should return false
```

---

### Test 4: get_user_scope()

**Setup:**
- User: m.elrefeay81@gmail.com (super admin)
- Expected: Current scope (org + project)

**Test Query:**
```sql
SELECT * FROM get_user_scope();
```

**Expected Result:**
- Returns current org_id and org_name
- Returns current project_id and project_name (may be NULL)

**Verification:**
```sql
-- Verify scope exists
SELECT * FROM get_user_scope();
-- Should return 1 row

-- Verify org_id is not null
SELECT org_id FROM get_user_scope();
-- Should not be NULL
```

---

### Test 5: update_user_scope()

**Setup:**
- User: m.elrefeay81@gmail.com (super admin)
- New org: cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e

**Test Query:**
```sql
SELECT update_user_scope('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e', NULL);
```

**Verification:**
```sql
-- Verify scope updated
SELECT * FROM get_user_scope();
-- org_id should be cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e

-- Verify in user_profiles
SELECT current_org_id, current_project_id FROM user_profiles
WHERE user_id = auth.uid();
-- Should match the updated values
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy Migration
```bash
# Run migration in Supabase
supabase migration up
```

### Step 2: Verify Functions Created
```sql
-- Check all functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_orgs',
    'get_user_permissions',
    'check_org_access',
    'get_user_scope',
    'update_user_scope'
  );
```

### Step 3: Test Each Function
- Run all 5 tests above
- Verify results match expected
- Document any issues

### Step 4: Verify Permissions
```sql
-- Check execute permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'get_user_orgs';
```

---

## 📊 FUNCTION SPECIFICATIONS

### get_user_orgs()
- **Input:** None
- **Output:** TABLE(id uuid, name text, member_count int)
- **Security:** SECURITY DEFINER
- **Performance:** O(n) where n = number of organizations
- **Caching:** Recommended (5 min TTL)

### get_user_permissions()
- **Input:** org_id uuid
- **Output:** TABLE(permission text, granted boolean)
- **Security:** SECURITY DEFINER
- **Performance:** O(m) where m = number of permissions
- **Caching:** Recommended (10 min TTL)

### check_org_access()
- **Input:** org_id uuid
- **Output:** boolean
- **Security:** SECURITY DEFINER
- **Performance:** O(1)
- **Caching:** Not recommended (real-time check)

### get_user_scope()
- **Input:** None
- **Output:** TABLE(org_id uuid, org_name text, project_id uuid, project_name text)
- **Security:** SECURITY DEFINER
- **Performance:** O(1)
- **Caching:** Recommended (1 min TTL)

### update_user_scope()
- **Input:** org_id uuid, project_id uuid (optional)
- **Output:** void
- **Security:** SECURITY DEFINER
- **Performance:** O(1)
- **Caching:** Invalidate on update

---

## 🔒 SECURITY CONSIDERATIONS

### SECURITY DEFINER
- Functions run with elevated privileges
- Bypasses RLS policies
- Safe because they check auth.uid()
- Prevents unauthorized access

### auth.uid()
- Returns current user's ID
- Set by Supabase auth
- Cannot be spoofed
- Used for all permission checks

### Permission Checks
- All functions verify user_id = auth.uid()
- All functions check org_memberships
- All functions respect role-based permissions
- All functions are read-only (except update_user_scope)

---

## 📈 PERFORMANCE OPTIMIZATION

### Caching Strategy
- get_user_orgs(): Cache 5 minutes
- get_user_permissions(): Cache 10 minutes
- check_org_access(): No cache (real-time)
- get_user_scope(): Cache 1 minute
- update_user_scope(): Invalidate cache

### Index Requirements
- org_memberships(user_id, org_id)
- user_roles(user_id, org_id)
- role_permissions(role_id)

### Query Optimization
- Use INNER JOIN for required data
- Use LEFT JOIN for optional data
- Filter early in WHERE clause
- Order results for consistency

---

## 🎯 INTEGRATION POINTS

### Frontend Components
- OrgSelector: Uses get_user_orgs()
- PermissionCheck: Uses get_user_permissions()
- ScopeContext: Uses get_user_scope()
- ScopeSelector: Uses update_user_scope()

### API Endpoints
- GET /api/auth/orgs: Calls get_user_orgs()
- GET /api/auth/permissions: Calls get_user_permissions()
- GET /api/auth/scope: Calls get_user_scope()
- POST /api/auth/scope: Calls update_user_scope()

### Middleware
- Authorization: Uses check_org_access()
- Permission: Uses get_user_permissions()
- Scope: Uses get_user_scope()

---

## 📝 MIGRATION FILE

**File:** `supabase/migrations/20260123_create_auth_rpc_functions.sql`

**Contents:**
- 4 main RPC functions
- 1 helper function
- Grant statements
- Verification queries

**Deployment:**
```bash
supabase migration up
```

---

**Status:** ✅ READY TO DEPLOY  
**Confidence:** HIGH  
**Risk:** VERY LOW  

