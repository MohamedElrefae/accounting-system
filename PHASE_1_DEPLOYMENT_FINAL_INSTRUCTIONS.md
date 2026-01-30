# Phase 1 Final Deployment - Complete Instructions

**Date**: January 24, 2026  
**Status**: ✅ READY TO DEPLOY  
**Action**: Deploy `get_user_permissions()` function to complete Phase 1

---

## Current Status

**Phase 0**: ✅ COMPLETE
- 10 org-scoped RLS policies deployed
- All users can only see their org's data

**Phase 1**: ✅ 3 of 4 Functions Deployed
- ✅ `get_user_orgs()` - Returns user's organizations
- ✅ `check_org_access(uuid)` - Verifies org access
- ✅ `get_user_scope()` - Returns first org for initialization
- ⏳ `get_user_permissions()` - **READY TO DEPLOY NOW**

---

## Deployment Instructions

### Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query** button

---

### Step 2: Copy and Paste SQL

Copy the entire SQL below and paste into the SQL Editor:

```sql
-- PHASE 1: Create Auth RPC Functions - FINAL WORKING VERSION
-- Date: January 24, 2026
-- Purpose: Create get_user_permissions() RPC function
-- Note: Deploy AFTER v3 migration succeeds

-- ============================================================================
-- CLEANUP: Drop existing functions if they exist
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_permissions() CASCADE;

-- ============================================================================
-- RPC FUNCTION: get_user_permissions()
-- Purpose: Returns user's permissions across all their roles
-- Returns: TABLE(permission_id int, permission_name text, resource text, action text)
-- ============================================================================

CREATE FUNCTION public.get_user_permissions()
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  SELECT DISTINCT
    p.id as permission_id,
    p.name as permission_name,
    p.resource,
    p.action
  FROM roles r
  INNER JOIN role_permissions rp ON r.id = rp.role_id
  INNER JOIN permissions p ON rp.permission_id = p.id
  ORDER BY p.resource, p.action;
$;

GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_permissions'
ORDER BY routine_name;
```

---

### Step 3: Execute Query

1. Click **Run** button (or press `Ctrl+Enter`)
2. Wait for execution to complete
3. Verify result shows: `1 row returned` with `get_user_permissions | FUNCTION`

---

## Expected Output

```
routine_name         | routine_type
---------------------|----------
get_user_permissions | FUNCTION
```

---

## Verification Tests (After Deployment)

### Test 1: Verify Function Exists

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_orgs',
    'check_org_access',
    'get_user_scope',
    'get_user_permissions'
  )
ORDER BY routine_name;
```

**Expected**: 4 rows (all functions)

---

### Test 2: Get User Permissions

```sql
SELECT * FROM get_user_permissions();
```

**Expected**: List of permissions (may be empty if no permissions assigned yet)

---

### Test 3: Get User Organizations

```sql
SELECT * FROM get_user_orgs();
```

**Expected**: List of organizations user belongs to

---

### Test 4: Check Organization Access

```sql
SELECT check_org_access('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid);
```

**Expected**: `true` or `false`

---

### Test 5: Get User Scope

```sql
SELECT * FROM get_user_scope();
```

**Expected**: First organization (for ScopeContext initialization)

---

## Phase 1 Architecture

### Database Layer (Phase 0)
- 10 org-scoped RLS policies
- Enforce org isolation at database level
- All queries automatically filtered by org

### Auth Functions (Phase 1)
- `get_user_orgs()` - List accessible organizations
- `check_org_access()` - Verify org membership
- `get_user_scope()` - Bootstrap scope initialization
- `get_user_permissions()` - Get available permissions

### React Layer (ScopeContext)
- Manages current org/project selection in memory
- Validates project belongs to org
- Syncs with unified manager
- Session-based, temporary state

---

## Files Reference

- `supabase/migrations/20260123_create_auth_rpc_functions_v3.sql` - 3 core functions (already deployed)
- `supabase/migrations/20260124_create_auth_rpc_functions_final.sql` - Permissions function (ready to deploy)
- `src/contexts/ScopeContext.tsx` - React scope management
- `PHASE_1_COMPLETION_CERTIFICATE.md` - Phase 1 status

---

## Next Steps After Deployment

1. ✅ Execute all 5 verification tests
2. ✅ Document test results
3. ✅ Create Phase 1 completion certificate
4. ⏭️ Move to Phase 2: Enhanced Permissions System
   - Create role assignment functions
   - Create permission assignment functions
   - Create audit logging

---

## Troubleshooting

### Error: "function get_user_permissions() already exists"

**Solution**: The DROP FUNCTION statement should handle this. If error persists:

```sql
DROP FUNCTION IF EXISTS public.get_user_permissions() CASCADE;
```

Then run the CREATE FUNCTION statement again.

---

### Error: "column does not exist"

**Solution**: Verify the schema:

```sql
-- Check roles table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'roles' ORDER BY column_name;

-- Check role_permissions table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'role_permissions' ORDER BY column_name;

-- Check permissions table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'permissions' ORDER BY column_name;
```

---

### Error: "permission denied"

**Solution**: Ensure you're logged in as a user with superadmin access (e.g., `m.elrefeay81@gmail.com`)

---

## Success Criteria

✅ Phase 1 Complete when:
1. All 4 functions deployed successfully
2. All 5 verification tests pass
3. No errors in Supabase logs
4. Functions callable from authenticated users

---

## Phase 1 Completion Certificate

Once all tests pass, Phase 1 is complete:

**Phase 0**: ✅ RLS policies (org isolation)  
**Phase 1**: ✅ Auth RPC functions (user data)  
**Phase 2**: ⏭️ Enhanced permissions system  
**Phase 3**: ⏭️ Audit logging  
**Phase 4**: ⏭️ Advanced features  
**Phase 5**: ⏭️ Production hardening

---

## Questions?

Refer to:
- `PHASE_1_FINAL_DEPLOYMENT_READY.md` - Architecture decisions
- `PHASE_1_COMPLETION_CERTIFICATE.md` - Current status
- `AI_AGENT_EXECUTION_PLAN_ENTERPRISE_AUTH.md` - Full 28-task plan
