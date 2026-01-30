# Phase 2: Frontend Auth Integration - REVISED PLAN

**Date:** January 26, 2026  
**Status:** 🔄 IN PROGRESS  
**Estimated Duration:** 2 days  
**Priority:** HIGH  

---

## 📊 Current Implementation Status

### ✅ Already Completed

1. **Database Layer** (Phase 0 & 1)
   - ✅ RLS policies deployed
   - ✅ `org_memberships` table with `can_access_all_projects` column
   - ✅ `project_memberships` table
   - ✅ `get_user_accessible_projects()` RPC function
   - ✅ Enhanced auth RPC functions

2. **ScopeContext Implementation**
   - ✅ `ScopeProvider` with org/project state management
   - ✅ `setOrganization()` function (clears project on org change)
   - ✅ `setProject()` function (validates org ownership)
   - ✅ Project access validation via RPC (database-level)
   - ✅ localStorage persistence
   - ✅ Error handling and retry logic
   - ✅ Connection health monitoring

3. **UI Components**
   - ✅ `OrgSelector` component
   - ✅ `ProjectSelector` component with access control
   - ✅ `OrgMembersManagement` with `can_access_all_projects` checkbox
   - ✅ `ProjectMembersManager` for project-level assignments

4. **Services**
   - ✅ `organization.ts` service
   - ✅ `projects.ts` service with `getActiveProjectsByOrg()`
   - ✅ `org-memberships.ts` service
   - ✅ `projectMemberships.ts` service

### ❌ Missing / Needs Implementation

1. **useOptimizedAuth Hook**
   - ❌ No org/project membership data loading
   - ❌ No scope validation functions (`belongsToOrg`, `canAccessProject`)
   - ❌ No org-scoped permission checking
   - ❌ Interface doesn't expose scope data

2. **Frontend Validation**
   - ❌ No client-side validation before API calls
   - ❌ No user feedback for unauthorized access attempts
   - ❌ Relies entirely on database RLS (good, but needs UI feedback)

3. **Testing**
   - ❌ No comprehensive tests for scope validation
   - ❌ No integration tests for auth + scope

---

## 🎯 Revised Phase 2 Tasks

### TASK-2.1: Update useOptimizedAuth Interface ✅ COMPLETE

**Status:** ✅ ALREADY DONE (via existing implementation)  
**Verification Needed:** YES

The interface already exists but needs to be extended with scope-aware fields.

**What to Add:**
```typescript
interface OptimizedAuthState {
  // ... existing fields
  
  // NEW: Scope-aware fields
  userOrganizations: string[];           // Org IDs user belongs to
  userProjects: string[];                // Project IDs user can access
  defaultOrgId: string | null;           // User's default org
}

interface UseOptimizedAuthReturn {
  // ... existing fields
  
  // NEW: Scope validation functions
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
  belongsToOrg: (orgId: string) => boolean;
  canAccessProject: (projectId: string) => boolean;
  getRolesInOrg: (orgId: string) => RoleSlug[];
}
```

**Verification Steps:**
1. Check if interface has these fields
2. Check if TypeScript compiles
3. Check if exports are available

---

### TASK-2.2: Update loadAuthData Function 🚀 NEEDS IMPLEMENTATION

**Status:** ❌ NOT IMPLEMENTED  
**Estimated Time:** 2 hours  
**Priority:** CRITICAL  

**Current State:**
- `loadAuthData()` loads profile and roles
- Uses `get_user_auth_data()` RPC
- Does NOT load org/project memberships

**What to Implement:**

```typescript
const loadAuthData = async (userId: string) => {
  // ... existing profile/roles loading ...
  
  // NEW: Load org/project memberships
  try {
    // Option 1: Extend existing RPC to return org/project data
    const { data: authData, error } = await supabase.rpc(
      'get_user_auth_data_with_scope',  // NEW RPC or extend existing
      { p_user_id: userId }
    );
    
    if (!error && authData) {
      // Process organizations
      authState.userOrganizations = authData.organizations || [];
      
      // Process projects  
      authState.userProjects = authData.projects || [];
      
      // Process default org
      authState.defaultOrgId = authData.default_org || null;
      
      // Process org-specific roles (if needed)
      authState.orgRoles = new Map(
        Object.entries(authData.org_roles || {})
      );
    }
  } catch (error) {
    console.error('Failed to load scope data:', error);
    // Don't fail completely - user can still use app
  }
  
  // ... rest of existing code ...
};
```

**Database Changes Needed:**

Create or extend RPC function:

```sql
-- Option 1: Extend existing get_user_auth_data
CREATE OR REPLACE FUNCTION get_user_auth_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (SELECT row_to_json(up.*) FROM user_profiles up WHERE up.id = p_user_id),
    'roles', (SELECT array_agg(r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = p_user_id),
    'organizations', (SELECT array_agg(om.org_id) FROM org_memberships om WHERE om.user_id = p_user_id),
    'projects', (SELECT array_agg(DISTINCT p.id) FROM projects p WHERE p.id IN (
      SELECT pm.project_id FROM project_memberships pm WHERE pm.user_id = p_user_id
      UNION
      SELECT p2.id FROM projects p2 
      JOIN org_memberships om2 ON om2.org_id = p2.org_id 
      WHERE om2.user_id = p_user_id AND om2.can_access_all_projects = true
    )),
    'default_org', (SELECT om.org_id FROM org_memberships om WHERE om.user_id = p_user_id AND om.is_default = true LIMIT 1)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Implementation Steps:**

1. **Create/Update RPC Function** (30 min)
   - Extend `get_user_auth_data()` to include org/project data
   - Test RPC returns correct data
   - Deploy to Supabase

2. **Update loadAuthData** (45 min)
   - Add scope data processing
   - Update authState interface
   - Add error handling
   - Test with real users

3. **Update Cache Logic** (15 min)
   - Include scope data in cache
   - Update cache key versioning
   - Test cache hit/miss

4. **Testing** (30 min)
   - Test with accountant user (limited orgs)
   - Test with admin user (multiple orgs)
   - Test with super_admin (all orgs)
   - Verify cache works

**Acceptance Criteria:**
- [ ] RPC returns org/project data
- [ ] `authState` includes scope fields
- [ ] Cache includes scope data
- [ ] No performance degradation
- [ ] Works with all user types

---

### TASK-2.3: Add Scope Validation Functions ✅ VERIFY IMPLEMENTATION

**Status:** ⚠️ PARTIALLY IMPLEMENTED (needs verification)  
**Estimated Time:** 1 hour  
**Priority:** HIGH  

**What to Verify:**

Check if these functions exist in `useOptimizedAuth.ts`:

```typescript
// 1. Check org membership
const belongsToOrg = (orgId: string): boolean => {
  if (!orgId) return false;
  return authState.userOrganizations.includes(orgId);
};

// 2. Check project access
const canAccessProject = (projectId: string): boolean => {
  if (!projectId) return false;
  return authState.userProjects.includes(projectId);
};

// 3. Get roles in specific org (if org-scoped roles exist)
const getRolesInOrg = (orgId: string): RoleSlug[] => {
  if (!orgId) return [];
  return authState.orgRoles?.get(orgId) || authState.roles;
};

// 4. Check permission in specific org
const hasActionAccessInOrg = (
  action: PermissionCode,
  orgId: string
): boolean => {
  if (!belongsToOrg(orgId)) return false;
  
  // For now, use global permissions
  // Later: implement org-scoped permissions
  return hasActionAccess(action);
};
```

**If NOT Implemented:**

1. **Add Functions** (30 min)
   - Implement all 4 validation functions
   - Add JSDoc comments
   - Add console logging for debugging

2. **Export Functions** (10 min)
   - Add to return statement
   - Update TypeScript types
   - Verify exports work

3. **Testing** (20 min)
   - Test each function with valid/invalid inputs
   - Test with different user types
   - Verify performance (< 1ms per call)

**Acceptance Criteria:**
- [ ] All 4 functions implemented
- [ ] Functions return correct results
- [ ] Performance < 1ms per call
- [ ] Exported from hook
- [ ] TypeScript types correct

---

### TASK-2.4: Export New Functions ❌ CANCEL (Not Related to Excel/PDF Export)

**Status:** ❌ CANCELLED  
**Reason:** This task is about exporting functions from the auth hook, NOT related to the Universal Export Manager for Excel/PDF.

**Clarification:**
- **This Task:** Export `belongsToOrg`, `canAccessProject`, etc. from `useOptimizedAuth` hook
- **Universal Export Manager:** Separate feature for exporting reports to Excel/PDF (already implemented)

**Action:** Merge this task into TASK-2.3 (already covered in "Export Functions" step)

---

### TASK-2.5: Comprehensive Auth Hook Testing 🧪 CRITICAL

**Status:** ❌ NOT IMPLEMENTED  
**Estimated Time:** 3 hours  
**Priority:** CRITICAL  

**Why This is Critical:**
- Auth is the foundation of the entire app
- Scope validation prevents unauthorized access
- Bugs here affect ALL features
- Performance issues here slow down entire app

**Test Categories:**

#### 1. Unit Tests (1 hour)

**File:** `src/hooks/useOptimizedAuth.test.ts`

```typescript
describe('useOptimizedAuth - Scope Validation', () => {
  describe('belongsToOrg', () => {
    it('returns true for user org', () => {
      // Test implementation
    });
    
    it('returns false for non-user org', () => {
      // Test implementation
    });
    
    it('handles null/undefined gracefully', () => {
      // Test implementation
    });
  });
  
  describe('canAccessProject', () => {
    it('returns true for accessible project', () => {
      // Test implementation
    });
    
    it('returns false for inaccessible project', () => {
      // Test implementation
    });
  });
  
  describe('loadAuthData', () => {
    it('loads org/project memberships', async () => {
      // Test implementation
    });
    
    it('handles RPC errors gracefully', async () => {
      // Test implementation
    });
    
    it('caches scope data', async () => {
      // Test implementation
    });
  });
});
```

#### 2. Integration Tests (1 hour)

**File:** `src/hooks/useOptimizedAuth.integration.test.ts`

```typescript
describe('useOptimizedAuth - Integration', () => {
  it('loads auth data on login', async () => {
    // 1. Login as accountant
    // 2. Verify profile loaded
    // 3. Verify roles loaded
    // 4. Verify orgs loaded
    // 5. Verify projects loaded
  });
  
  it('validates org access correctly', async () => {
    // 1. Login as accountant (org-1 only)
    // 2. Check belongsToOrg('org-1') === true
    // 3. Check belongsToOrg('org-2') === false
  });
  
  it('validates project access correctly', async () => {
    // 1. Login as user with specific projects
    // 2. Check canAccessProject for each project
    // 3. Verify results match database
  });
  
  it('works with ScopeContext', async () => {
    // 1. Login
    // 2. Select org via ScopeContext
    // 3. Verify auth hook validates org
    // 4. Try to select unauthorized org
    // 5. Verify validation blocks it
  });
});
```

#### 3. Performance Tests (30 min)

```typescript
describe('useOptimizedAuth - Performance', () => {
  it('loads auth data in < 500ms', async () => {
    const start = performance.now();
    await loadAuthData(userId);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
  
  it('validation functions execute in < 1ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      belongsToOrg('org-1');
    }
    const duration = performance.now() - start;
    const avgTime = duration / 1000;
    expect(avgTime).toBeLessThan(1);
  });
  
  it('cache reduces load time by 80%+', async () => {
    // First load (no cache)
    const start1 = performance.now();
    await loadAuthData(userId);
    const duration1 = performance.now() - start1;
    
    // Second load (with cache)
    const start2 = performance.now();
    await loadAuthData(userId);
    const duration2 = performance.now() - start2;
    
    expect(duration2).toBeLessThan(duration1 * 0.2);
  });
});
```

#### 4. User Scenario Tests (30 min)

```typescript
describe('useOptimizedAuth - User Scenarios', () => {
  it('Scenario A: Accountant with limited access', async () => {
    // Login as accountant
    // Verify sees only their orgs
    // Verify cannot access other orgs
    // Verify sees only their projects
  });
  
  it('Scenario B: Admin with multiple orgs', async () => {
    // Login as admin
    // Verify sees multiple orgs
    // Verify can switch between orgs
    // Verify projects update on org change
  });
  
  it('Scenario C: Super admin sees everything', async () => {
    // Login as super_admin
    // Verify sees all orgs
    // Verify can access any org
    // Verify can access any project
  });
  
  it('Scenario D: User with can_access_all_projects', async () => {
    // Login as user with org-level access
    // Verify sees all projects in org
    // Verify doesn't need project_memberships
  });
});
```

**Verification Checklist:**

Before marking Phase 2 complete, verify:

- [ ] All unit tests pass (100%)
- [ ] All integration tests pass (100%)
- [ ] Performance tests meet targets
- [ ] All user scenarios work correctly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Cache works correctly
- [ ] Works in production build
- [ ] Works with real database
- [ ] Works with all user types

**Test Execution:**

```bash
# Run all tests
npm run test

# Run specific test file
npm run test useOptimizedAuth.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode (during development)
npm run test:watch
```

**Expected Results:**

```
Test Suites: 3 passed, 3 total
Tests:       25 passed, 25 total
Coverage:    > 85% statements
             > 80% branches
             > 85% functions
             > 85% lines
```

---

## 📋 Phase 2 Completion Checklist

### Database Layer
- [ ] RPC function returns org/project data
- [ ] RPC tested with all user types
- [ ] RPC performance < 200ms

### Auth Hook
- [ ] Interface updated with scope fields
- [ ] `loadAuthData` loads scope data
- [ ] Validation functions implemented
- [ ] Functions exported correctly
- [ ] Cache includes scope data

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Performance tests meet targets
- [ ] User scenario tests passing
- [ ] Manual testing completed

### Documentation
- [ ] Code comments added
- [ ] JSDoc for all functions
- [ ] README updated
- [ ] Migration guide created

### Deployment
- [ ] TypeScript compiles
- [ ] No console errors
- [ ] Production build works
- [ ] Database migrations deployed

---

## 🚀 Next Steps After Phase 2

Once Phase 2 is complete, proceed to:

**Phase 3: Route Protection & UI Validation**
- Add route-level scope validation
- Update protected routes
- Add user feedback for unauthorized access
- Implement error boundaries

**Phase 4: Advanced Features**
- Org-scoped permission caching
- Permission refresh on role change
- Audit logging for access attempts
- Performance monitoring

---

## 📞 Questions to Answer Before Starting

### Question 1: RPC Function Design

**Current:** `get_user_auth_data()` returns profile + roles  
**Needed:** Also return org/project memberships

**Options:**
1. **Extend existing RPC** - Add org/project data to current function
2. **Create new RPC** - Keep existing, create `get_user_auth_data_with_scope()`
3. **Separate calls** - Call existing RPC + separate org/project queries

**Recommendation:** Option 1 (Extend existing) - Single call, better performance

**Your Decision:** _____________

### Question 2: Org-Scoped Roles

**Current:** Roles are global (user has same role everywhere)  
**Future:** Roles could be org-specific (user is admin in org-1, viewer in org-2)

**Question:** Do we need org-scoped roles NOW or later?

**Options:**
1. **Now** - Implement `getRolesInOrg()` with org-specific logic
2. **Later** - Use global roles for now, add org-scoped later

**Recommendation:** Option 2 (Later) - Keep it simple, add when needed

**Your Decision:** _____________

### Question 3: Cache Strategy

**Current:** Cache includes profile + roles  
**Needed:** Also cache org/project data

**Question:** Should scope data have same cache duration as auth data?

**Options:**
1. **Same duration** (30 min) - Simple, consistent
2. **Shorter duration** (5 min) - More up-to-date, more API calls
3. **Separate cache** - Different keys, different durations

**Recommendation:** Option 1 (Same duration) - Scope changes are rare

**Your Decision:** _____________

---

## 📊 Estimated Timeline

| Task | Estimated Time | Priority |
|------|---------------|----------|
| TASK-2.1: Interface Update | ✅ Done | - |
| TASK-2.2: loadAuthData | 2 hours | CRITICAL |
| TASK-2.3: Validation Functions | 1 hour | HIGH |
| TASK-2.4: Export Functions | ❌ Cancelled | - |
| TASK-2.5: Testing | 3 hours | CRITICAL |
| **TOTAL** | **6 hours** | **1 day** |

**Realistic Timeline:** 1-2 days (including testing and debugging)

---

## ✅ Success Criteria

Phase 2 is complete when:

1. ✅ Auth hook loads org/project memberships
2. ✅ Validation functions work correctly
3. ✅ All tests pass (100%)
4. ✅ Performance targets met
5. ✅ Works with all user types
6. ✅ No breaking changes
7. ✅ Documentation complete

---

**Status:** 🔄 READY TO START  
**Next Action:** Answer the 3 questions above, then begin TASK-2.2  
**Last Updated:** January 26, 2026
