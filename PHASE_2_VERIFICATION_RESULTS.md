# Phase 2: Frontend Auth Integration - Verification Results

**Date:** January 26, 2026  
**Status:** ✅ VERIFICATION COMPLETE  
**Next Action:** Proceed with Implementation

---

## 🔍 Verification Summary

### What We Checked

1. ✅ **useOptimizedAuth Hook** - Lines 1-1023 reviewed
2. ✅ **ScopeProvider** - Full implementation reviewed
3. ✅ **ScopeContext** - Interface reviewed
4. ✅ **Access Control Diagrams** - Architecture understood

---

## 📊 Verification Results

### ❌ MISSING: Scope Data in useOptimizedAuth

**Current State:**
```typescript
interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  // ❌ NO org/project membership data
}
```

**What's Missing:**
- ❌ `userOrganizations: string[]` - Org IDs user belongs to
- ❌ `userProjects: string[]` - Project IDs user can access
- ❌ `defaultOrgId: string | null` - User's default org
- ❌ `belongsToOrg()` function
- ❌ `canAccessProject()` function
- ❌ `getRolesInOrg()` function

**Impact:**
- Frontend cannot validate org/project access before API calls
- No user feedback for unauthorized access attempts
- Relies entirely on database RLS (good for security, but bad for UX)

---

### ✅ COMPLETE: ScopeProvider Implementation

**Current State:**
```typescript
// ✅ Full implementation exists
- Org/project state management
- localStorage persistence
- Automatic project clearing on org change
- Connection health monitoring
- Retry logic for failed loads
- Integration with React Query
```

**What Works:**
- ✅ `setOrganization()` - Clears project on org change
- ✅ `setProject()` - Validates org ownership
- ✅ `loadProjectsForOrg()` - Uses RPC with access control
- ✅ Error handling and retry logic
- ✅ Connection monitoring

**No Changes Needed:** ScopeProvider is 100% complete

---

### ❌ MISSING: RPC Function Extension

**Current RPC:** `get_user_auth_data(p_user_id UUID)`

**Returns:**
```json
{
  "profile": { ... },
  "roles": ["admin", "accountant"]
  // ❌ NO organizations array
  // ❌ NO projects array
  // ❌ NO default_org
}
```

**What's Needed:**
```json
{
  "profile": { ... },
  "roles": ["admin", "accountant"],
  "organizations": ["org-1", "org-2"],  // NEW
  "projects": ["proj-1", "proj-2"],     // NEW
  "default_org": "org-1"                // NEW
}
```

---

### ❌ MISSING: Comprehensive Testing

**Current Tests:** None found for scope validation

**What's Needed:**
- ❌ Unit tests for validation functions
- ❌ Integration tests with ScopeContext
- ❌ Performance tests
- ❌ User scenario tests

---

## 🎯 Implementation Plan

### Phase 2.1: Extend RPC Function (30 min)

**File:** `supabase/migrations/20260126_extend_get_user_auth_data_with_scope.sql`

**SQL:**
```sql
CREATE OR REPLACE FUNCTION get_user_auth_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (
      SELECT row_to_json(up.*) 
      FROM user_profiles up 
      WHERE up.id = p_user_id
    ),
    'roles', (
      SELECT array_agg(r.name) 
      FROM user_roles ur 
      JOIN roles r ON r.id = ur.role_id 
      WHERE ur.user_id = p_user_id
    ),
    -- NEW: Organizations user belongs to
    'organizations', (
      SELECT array_agg(om.org_id) 
      FROM org_memberships om 
      WHERE om.user_id = p_user_id
    ),
    -- NEW: Projects user can access
    'projects', (
      SELECT array_agg(DISTINCT p.id) 
      FROM projects p 
      WHERE p.id IN (
        -- Direct project memberships
        SELECT pm.project_id 
        FROM project_memberships pm 
        WHERE pm.user_id = p_user_id
        UNION
        -- Org-level access (can_access_all_projects = true)
        SELECT p2.id 
        FROM projects p2 
        JOIN org_memberships om2 ON om2.org_id = p2.org_id 
        WHERE om2.user_id = p_user_id 
          AND om2.can_access_all_projects = true
      )
    ),
    -- NEW: Default organization
    'default_org', (
      SELECT om.org_id 
      FROM org_memberships om 
      WHERE om.user_id = p_user_id 
        AND om.is_default = true 
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_auth_data(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_auth_data IS 'Returns user profile, roles, organizations, projects, and default org for auth initialization';
```

**Testing:**
```sql
-- Test with a real user ID
SELECT get_user_auth_data('user-id-here');

-- Expected result:
{
  "profile": { "id": "...", "email": "...", ... },
  "roles": ["accountant"],
  "organizations": ["org-1", "org-2"],
  "projects": ["proj-1", "proj-2", "proj-3"],
  "default_org": "org-1"
}
```

---

### Phase 2.2: Update useOptimizedAuth Interface (15 min)

**File:** `src/hooks/useOptimizedAuth.ts`

**Changes:**

1. **Update Interface:**
```typescript
interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // NEW: Scope-aware fields
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
}
```

2. **Update Initial State:**
```typescript
let authState: OptimizedAuthState = {
  user: null,
  profile: null,
  loading: true,
  roles: [],
  resolvedPermissions: null,
  
  // NEW: Initialize scope fields
  userOrganizations: [],
  userProjects: [],
  defaultOrgId: null,
};
```

3. **Update Cache Interface:**
```typescript
interface AuthCacheEntry {
  profile: Profile | null;
  roles: RoleSlug[];
  timestamp: number;
  userId: string;
  cacheVersion: string;
  
  // NEW: Cache scope data
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
}
```

---

### Phase 2.3: Update loadAuthData Function (45 min)

**File:** `src/hooks/useOptimizedAuth.ts`

**Location:** Around line 400 (in `loadAuthData` function)

**Changes:**

1. **Process Scope Data from RPC:**
```typescript
// After processing profile and roles...

// NEW: Process organizations
const organizations = authData.organizations || [];
authState.userOrganizations = organizations;

// NEW: Process projects
const projects = authData.projects || [];
authState.userProjects = projects;

// NEW: Process default org
const defaultOrg = authData.default_org || null;
authState.defaultOrgId = defaultOrg;

if (import.meta.env.DEV) {
  console.log('[Auth] Loaded scope data:', {
    orgs: organizations.length,
    projects: projects.length,
    defaultOrg
  });
}
```

2. **Update Cache Functions:**
```typescript
// Update getCachedAuthData
function getCachedAuthData(userId: string): { 
  profile: Profile | null; 
  roles: RoleSlug[];
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
} | null {
  // ... existing code ...
  
  return { 
    profile: entry.profile, 
    roles: entry.roles,
    userOrganizations: entry.userOrganizations || [],
    userProjects: entry.userProjects || [],
    defaultOrgId: entry.defaultOrgId || null
  };
}

// Update setCachedAuthData
function setCachedAuthData(
  userId: string, 
  profile: Profile | null, 
  roles: RoleSlug[],
  userOrganizations: string[],
  userProjects: string[],
  defaultOrgId: string | null
): void {
  const entry: AuthCacheEntry = {
    profile,
    roles,
    timestamp: Date.now(),
    userId,
    cacheVersion: CACHE_VERSION,
    userOrganizations,
    userProjects,
    defaultOrgId
  };
  localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(entry));
}
```

3. **Update All Cache Calls:**
```typescript
// Update cache restoration
if (cachedData) {
  authState.profile = cachedData.profile;
  authState.roles = cachedData.roles;
  authState.resolvedPermissions = flattenPermissions(cachedData.roles);
  
  // NEW: Restore scope data
  authState.userOrganizations = cachedData.userOrganizations;
  authState.userProjects = cachedData.userProjects;
  authState.defaultOrgId = cachedData.defaultOrgId;
  
  clearCaches();
  notifyListeners();
  // ...
}

// Update cache saving
setCachedAuthData(
  userId, 
  authState.profile, 
  finalRoles,
  authState.userOrganizations,
  authState.userProjects,
  authState.defaultOrgId
);
```

---

### Phase 2.4: Add Validation Functions (30 min)

**File:** `src/hooks/useOptimizedAuth.ts`

**Location:** After `hasActionAccess` function (around line 850)

**Add Functions:**
```typescript
// Check if user belongs to organization
const belongsToOrg = (orgId: string): boolean => {
  if (!orgId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Check membership
  return authState.userOrganizations.includes(orgId);
};

// Check if user can access project
const canAccessProject = (projectId: string): boolean => {
  if (!projectId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Check access
  return authState.userProjects.includes(projectId);
};

// Get roles in specific org (for future org-scoped roles)
const getRolesInOrg = (orgId: string): RoleSlug[] => {
  if (!orgId) return [];
  
  // For now, return global roles
  // TODO: Implement org-scoped roles when needed
  if (!belongsToOrg(orgId)) return [];
  return authState.roles;
};

// Check permission in specific org
const hasActionAccessInOrg = (
  action: PermissionCode,
  orgId: string
): boolean => {
  if (!belongsToOrg(orgId)) return false;
  return hasActionAccess(action);
};
```

---

### Phase 2.5: Export New Functions (10 min)

**File:** `src/hooks/useOptimizedAuth.ts`

**Location:** In `useOptimizedAuth` return statement (around line 1000)

**Update Return:**
```typescript
export const useOptimizedAuth = () => {
  // ... existing code ...

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    roles: state.roles,
    resolvedPermissions: state.resolvedPermissions,
    hasRouteAccess: hasRouteAccessMemo,
    hasActionAccess: hasActionAccessMemo,
    signIn,
    signOut,
    signUp,
    refreshProfile,
    
    // NEW: Scope data
    userOrganizations: state.userOrganizations,
    userProjects: state.userProjects,
    defaultOrgId: state.defaultOrgId,
    
    // NEW: Validation functions
    belongsToOrg,
    canAccessProject,
    getRolesInOrg,
    hasActionAccessInOrg,
  };
};
```

---

### Phase 2.6: Update TypeScript Types (10 min)

**File:** `src/hooks/useOptimizedAuth.ts`

**Add Interface:**
```typescript
export interface UseOptimizedAuthReturn {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  hasRouteAccess: (pathname: string) => boolean;
  hasActionAccess: (action: PermissionCode) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<any>;
  refreshProfile: () => Promise<void>;
  
  // NEW: Scope data
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
  
  // NEW: Validation functions
  belongsToOrg: (orgId: string) => boolean;
  canAccessProject: (projectId: string) => boolean;
  getRolesInOrg: (orgId: string) => RoleSlug[];
  hasActionAccessInOrg: (action: PermissionCode, orgId: string) => boolean;
}
```

---

## 📋 Implementation Checklist

### Database Layer
- [ ] Create migration file
- [ ] Extend `get_user_auth_data()` RPC
- [ ] Test RPC with real user IDs
- [ ] Deploy to Supabase
- [ ] Verify RPC returns scope data

### Auth Hook
- [ ] Update `OptimizedAuthState` interface
- [ ] Update initial state
- [ ] Update `AuthCacheEntry` interface
- [ ] Update `getCachedAuthData()` function
- [ ] Update `setCachedAuthData()` function
- [ ] Update `loadAuthData()` to process scope data
- [ ] Update all cache restoration calls
- [ ] Update all cache saving calls
- [ ] Add `belongsToOrg()` function
- [ ] Add `canAccessProject()` function
- [ ] Add `getRolesInOrg()` function
- [ ] Add `hasActionAccessInOrg()` function
- [ ] Export new functions
- [ ] Add TypeScript types

### Testing
- [ ] Test with accountant user (limited orgs)
- [ ] Test with admin user (multiple orgs)
- [ ] Test with super_admin (all orgs)
- [ ] Test cache hit/miss
- [ ] Test validation functions
- [ ] Verify no performance degradation

### Documentation
- [ ] Add JSDoc comments
- [ ] Update README
- [ ] Create migration guide

---

## 🚀 Estimated Timeline

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 2.1 | Extend RPC Function | 30 min | CRITICAL |
| 2.2 | Update Interface | 15 min | HIGH |
| 2.3 | Update loadAuthData | 45 min | CRITICAL |
| 2.4 | Add Validation Functions | 30 min | HIGH |
| 2.5 | Export Functions | 10 min | MEDIUM |
| 2.6 | Update Types | 10 min | MEDIUM |
| **TOTAL** | **All Tasks** | **2.5 hours** | **HIGH** |

**Realistic Timeline:** 3-4 hours (including testing and debugging)

---

## ✅ Success Criteria

Phase 2 is complete when:

1. ✅ RPC returns org/project data
2. ✅ Auth hook loads scope data
3. ✅ Validation functions work correctly
4. ✅ Cache includes scope data
5. ✅ No performance degradation
6. ✅ Works with all user types
7. ✅ TypeScript compiles without errors

---

## 📞 Design Decisions

### Question 1: RPC Function Design
**Decision:** Extend existing `get_user_auth_data()` function  
**Reason:** Single call, better performance, simpler caching

### Question 2: Org-Scoped Roles
**Decision:** Implement later (use global roles for now)  
**Reason:** Keep it simple, add when needed

### Question 3: Cache Strategy
**Decision:** Same duration as auth data (30 min)  
**Reason:** Scope changes are rare, consistent with auth cache

---

**Status:** ✅ VERIFICATION COMPLETE - READY TO IMPLEMENT  
**Next Action:** Create RPC migration file  
**Last Updated:** January 26, 2026
