# START HERE - PHASE 1: DEPLOY ENHANCED AUTH RPC FUNCTIONS

**Date:** January 23, 2026  
**Status:** Ready to begin  
**Duration:** ~45 minutes  
**Tasks:** 5  

---

## 🎯 WHAT IS PHASE 1?

Phase 1 creates 4 RPC functions that the frontend will use for:
- Getting user's organizations
- Checking user's permissions
- Verifying organization access
- Managing user scope (org + project)

---

## 📋 QUICK OVERVIEW

### 5 Functions to Create

1. **get_user_orgs()** - Returns user's organizations
2. **get_user_permissions(org_id)** - Returns user's permissions
3. **check_org_access(org_id)** - Verifies org access
4. **get_user_scope()** - Returns current scope
5. **update_user_scope(org_id, project_id)** - Updates scope

---

## 🚀 EXECUTION STEPS

### Step 1: Deploy Migration (5 minutes)

**File:** `supabase/migrations/20260123_create_auth_rpc_functions.sql`

**What it does:**
- Creates 4 main RPC functions
- Creates 1 helper function
- Grants execute permissions
- Includes verification queries

**How to deploy:**
1. Open Supabase SQL Editor
2. Copy entire migration file
3. Run in SQL Editor
4. Verify all functions created

**Verification Query:**
```sql
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

Expected: 5 functions returned

---

### Step 2: Test get_user_orgs() (8 minutes)

**Purpose:** Returns user's organizations

**Test Query:**
```sql
SELECT * FROM get_user_orgs();
```

**Expected Result:**
- Returns list of organizations
- Each has id, name, member_count
- Results ordered by name

**Verification:**
```sql
-- Count should be > 0
SELECT COUNT(*) FROM get_user_orgs();
```

---

### Step 3: Test get_user_permissions() (8 minutes)

**Purpose:** Returns user's permissions in organization

**Test Query:**
```sql
SELECT * FROM get_user_permissions('b0ceb6db-6255-473e-8fdf-7f583aabf993');
```

**Expected Result:**
- Returns list of permissions
- Each has permission name and granted flag
- Results ordered by permission

**Verification:**
```sql
-- Count should be > 0
SELECT COUNT(*) FROM get_user_permissions('b0ceb6db-6255-473e-8fdf-7f583aabf993');
```

---

### Step 4: Test check_org_access() (8 minutes)

**Purpose:** Verifies user has access to organization

**Test Query:**
```sql
SELECT check_org_access('b0ceb6db-6255-473e-8fdf-7f583aabf993');
```

**Expected Result:**
- Returns true (user has access)

**Verification:**
```sql
-- Test with invalid org
SELECT check_org_access('00000000-0000-0000-0000-000000000000');
-- Should return false
```

---

### Step 5: Test get_user_scope() & update_user_scope() (13 minutes)

**Purpose:** Get and update user's current scope

**Test Query 1 - Get Scope:**
```sql
SELECT * FROM get_user_scope();
```

**Expected Result:**
- Returns current org_id and org_name
- Returns current project_id and project_name (may be NULL)

**Test Query 2 - Update Scope:**
```sql
SELECT update_user_scope('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e', NULL);
```

**Verification:**
```sql
-- Verify scope updated
SELECT * FROM get_user_scope();
-- org_id should match the updated value
```

---

## 📁 KEY FILES

### Migration File
- `supabase/migrations/20260123_create_auth_rpc_functions.sql` - All RPC functions

### Documentation
- `PHASE_1_EXECUTION_PLAN.md` - Detailed execution plan
- `PHASE_1_RPC_FUNCTIONS_GUIDE.md` - Complete function guide

### Status
- `START_HERE_PHASE_1.md` - This file

---

## ✅ SUCCESS CRITERIA

All 5 tests must pass:
- [ ] get_user_orgs() returns organizations
- [ ] get_user_permissions() returns permissions
- [ ] check_org_access() returns boolean
- [ ] get_user_scope() returns scope
- [ ] update_user_scope() updates scope

---

## 🔧 TROUBLESHOOTING

### If Functions Don't Create
**Error:** "Function already exists"  
**Solution:** Drop existing functions first
```sql
DROP FUNCTION IF EXISTS public.get_user_orgs();
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);
DROP FUNCTION IF EXISTS public.check_org_access(uuid);
DROP FUNCTION IF EXISTS public.get_user_scope();
DROP FUNCTION IF EXISTS public.update_user_scope(uuid, uuid);
```

### If Tests Return No Results
**Error:** "No rows returned"  
**Solution:** Check user has org memberships
```sql
SELECT * FROM org_memberships WHERE user_id = auth.uid();
```

### If Permission Denied
**Error:** "Permission denied"  
**Solution:** Verify execute permissions
```sql
GRANT EXECUTE ON FUNCTION public.get_user_orgs() TO authenticated;
```

---

## 📊 PHASE 1 TIMELINE

| Task | Time | Status |
|------|------|--------|
| Deploy Migration | 5 min | ⏳ READY |
| Test get_user_orgs() | 8 min | ⏳ READY |
| Test get_user_permissions() | 8 min | ⏳ READY |
| Test check_org_access() | 8 min | ⏳ READY |
| Test get_user_scope() | 13 min | ⏳ READY |

**Total:** ~45 minutes

---

## 🎯 WHAT EACH FUNCTION DOES

### get_user_orgs()
Returns all organizations the user belongs to with member count.

**Used by:** Organization selector dropdown

**Example:**
```
id                                   | name             | member_count
------------------------------------ | ---------------- | -----------
b0ceb6db-6255-473e-8fdf-7f583aabf993 | موسسة تجريبية 1  | 2
cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e | مؤسسة الاختبار   | 6
```

---

### get_user_permissions(org_id)
Returns user's permissions in specific organization.

**Used by:** Permission checks and RBAC

**Example:**
```
permission              | granted
----------------------- | -------
view_transactions       | true
create_transactions     | true
approve_transactions    | false
```

---

### check_org_access(org_id)
Quick check if user has access to organization.

**Used by:** Authorization middleware

**Example:**
```
check_org_access
----------------
true
```

---

### get_user_scope()
Returns user's current selected organization and project.

**Used by:** Scope context provider

**Example:**
```
org_id                               | org_name            | project_id | project_name
------------------------------------ | ------------------- | ---------- | -----------
b0ceb6db-6255-473e-8fdf-7f583aabf993 | موسسة تجريبية 1     | NULL       | NULL
```

---

### update_user_scope(org_id, project_id)
Updates user's current selected organization and project.

**Used by:** Scope selector component

**Example:**
```sql
SELECT update_user_scope('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e', NULL);
```

---

## 📈 ENTERPRISE AUTH SECURITY FIX PROGRESS

```
Phase 0: Quick Wins                    ██████████ 100% ✅ COMPLETE
Phase 1: Enhanced Auth RPC Functions   ░░░░░░░░░░  0%  ⏳ IN PROGRESS
Phase 2: Scope-Based Access Control    ░░░░░░░░░░  0%
Phase 3: Advanced Permission System    ░░░░░░░░░░  0%
Phase 4: Audit Trail & Logging         ░░░░░░░░░░  0%
Phase 5: Production Deployment         ░░░░░░░░░░  0%

Overall Progress: █████░░░░░░ 16.7% → 33.3%
```

---

## 🚀 NEXT PHASE

After Phase 1 completes:

**Phase 2: Implement Scope-Based Access Control** (4 tasks, ~30 minutes)
- Create scope context in frontend
- Implement org/project filtering
- Add scope selector to UI
- Test scope switching

---

## ✨ FINAL CHECKLIST

Before Starting:
- [ ] Read this document
- [ ] Have Supabase SQL Editor open
- [ ] Know the migration file location

During Execution:
- [ ] Deploy migration
- [ ] Test get_user_orgs()
- [ ] Test get_user_permissions()
- [ ] Test check_org_access()
- [ ] Test get_user_scope()
- [ ] Test update_user_scope()

After Completion:
- [ ] All tests passed
- [ ] Results documented
- [ ] Ready for Phase 2

---

**Status:** ✅ READY TO BEGIN  
**Confidence:** HIGH  
**Risk:** VERY LOW  

**Let's start PHASE 1!** 🚀

