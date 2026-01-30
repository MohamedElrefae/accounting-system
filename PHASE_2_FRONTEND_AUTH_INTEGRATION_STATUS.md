# Phase 2: Frontend Auth Integration - Current Status

**Date:** January 26, 2026  
**Status:** 🔄 READY TO START (After Verification)  
**Progress:** 40% (Infrastructure complete, core logic needed)

---

## 📊 What's Already Done

### ✅ Database & Backend (100% Complete)
- RLS policies deployed and working
- `org_memberships` table with `can_access_all_projects`
- `project_memberships` table
- `get_user_accessible_projects()` RPC function
- Access control enforced at database level

### ✅ ScopeContext (100% Complete)
- Full `ScopeProvider` implementation
- Org/project state management
- Automatic project clearing on org change
- localStorage persistence
- Error handling and retry logic
- Connection health monitoring

### ✅ UI Components (100% Complete)
- `OrgSelector` with access control
- `ProjectSelector` with RPC-based filtering
- `OrgMembersManagement` with checkbox
- `ProjectMembersManager` for assignments

### ✅ Services (100% Complete)
- `organization.ts` service
- `projects.ts` with `getActiveProjectsByOrg()`
- `org-memberships.ts` service
- `projectMemberships.ts` service

---

## ❌ What's Missing

### 1. useOptimizedAuth Hook (0% Complete)

**Current State:**
- Loads profile and roles ✅
- Uses `get_user_auth_data()` RPC ✅
- Does NOT load org/project memberships ❌
- Does NOT have validation functions ❌

**What's Needed:**
```typescript
// Missing from authState:
userOrganizations: string[]
userProjects: string[]
defaultOrgId: string | null

// Missing functions:
belongsToOrg(orgId: string): boolean
canAccessProject(projectId: string): boolean
getRolesInOrg(orgId: string): RoleSlug[]
```

**Impact:** 
- Frontend cannot validate org/project access
- Relies entirely on database RLS (good for security, bad for UX)
- No user feedback before API calls fail

### 2. RPC Function Extension (0% Complete)

**Current:** `get_user_auth_data()` returns profile + roles  
**Needed:** Also return org/project memberships

**SQL to Add:**
```sql
CREATE OR REPLACE FUNCTION get_user_auth_data(p_user_id UUID)
RETURNS JSON AS $$
  -- Add organizations array
  -- Add projects array
  -- Add default_org
$$;
```

### 3. Comprehensive Testing (0% Complete)

**Missing Tests:**
- Unit tests for validation functions
- Integration tests with ScopeContext
- Performance tests
- User scenario tests

---

## 🎯 Immediate Next Steps

### Step 1: Verify Current Implementation (30 min)

Run these checks:

```bash
# 1. Check if validation functions exist
grep -r "belongsToOrg" src/hooks/useOptimizedAuth.ts

# 2. Check if scope fields exist in interface
grep -r "userOrganizations" src/hooks/useOptimizedAuth.ts

# 3. Check if RPC returns scope data
# Run in Supabase SQL Editor:
SELECT get_user_auth_data('user-id-here');
```

**Expected Results:**
- ❌ No `belongsToOrg` function found
- ❌ No `userOrganizations` field found
- ❌ RPC doesn't return org/project data

### Step 2: Answer Design Questions (15 min)

**Question 1:** Extend existing RPC or create new one?
- **Recommendation:** Extend existing (better performance)
- **Your Decision:** _____________

**Question 2:** Implement org-scoped roles now or later?
- **Recommendation:** Later (keep it simple)
- **Your Decision:** _____________

**Question 3:** Cache duration for scope data?
- **Recommendation:** Same as auth (30 min)
- **Your Decision:** _____________

### Step 3: Start Implementation (6 hours)

Follow the revised plan in `PHASE_2_FRONTEND_AUTH_INTEGRATION_REVISED.md`:

1. **TASK-2.2:** Update loadAuthData (2 hours)
   - Extend RPC function
   - Update loadAuthData to process scope data
   - Update cache logic

2. **TASK-2.3:** Add Validation Functions (1 hour)
   - Implement `belongsToOrg()`
   - Implement `canAccessProject()`
   - Implement `getRolesInOrg()`
   - Export functions

3. **TASK-2.5:** Comprehensive Testing (3 hours)
   - Write unit tests
   - Write integration tests
   - Write performance tests
   - Write user scenario tests

---

## 📋 Verification Checklist

Before starting implementation, verify:

- [ ] Read `PHASE_2_FRONTEND_AUTH_INTEGRATION_REVISED.md`
- [ ] Understand what's already done
- [ ] Understand what's missing
- [ ] Answer the 3 design questions
- [ ] Have access to Supabase SQL Editor
- [ ] Have test database ready
- [ ] Have test users ready (accountant, admin, super_admin)

---

## 🚨 Critical Notes

### Security
- Database RLS is already enforcing access control ✅
- Frontend validation is for UX, not security ✅
- Never trust client-side validation alone ✅

### Performance
- Current auth load time: ~350ms (good)
- Target with scope data: < 500ms
- Cache hit should be < 50ms

### Compatibility
- Must work with existing ScopeContext ✅
- Must not break existing auth flow ✅
- Must be backward compatible ✅

---

## 📞 Need Help?

**If validation functions already exist:**
- Check `src/hooks/useOptimizedAuth.ts` lines 890-1023
- Search for `belongsToOrg` or `canAccessProject`
- If found, update status to "Verify Implementation"

**If RPC already returns scope data:**
- Test with: `SELECT get_user_auth_data('user-id');`
- Check if result includes `organizations` and `projects` keys
- If yes, skip RPC extension step

**If tests already exist:**
- Check `src/hooks/useOptimizedAuth.test.ts`
- Check `src/hooks/useOptimizedAuth.integration.test.ts`
- Run: `npm run test useOptimizedAuth`

---

**Status:** 🔄 AWAITING VERIFICATION  
**Next Action:** Run verification checks, then start TASK-2.2  
**Estimated Completion:** 1-2 days from start
