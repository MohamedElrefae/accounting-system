# Scoped Roles - Phase 6: Implementation Guide

**Date:** January 27, 2026  
**Status:** IMPLEMENTATION READY  
**Duration:** 3-4 hours

---

## 🎯 Phase 6 Implementation Steps

### Step 1: Update RPC Function (30 minutes)

**File:** `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`

**Current RPC returns:**
```sql
{
  profile: {...},
  roles: ['admin', 'manager'],
  organizations: ['org-1', 'org-2'],
  projects: ['proj-1', 'proj-2'],
  default_org: 'org-1'
}
```

**New RPC should return:**
```sql
{
  profile: {...},
  roles: ['admin', 'manager'],  -- Keep for backward compatibility
  organizations: ['org-1', 'org-2'],
  projects: ['proj-1', 'proj-2'],
  default_org: 'org-1',
  org_roles: [
    { org_id: 'org-1', role: 'org_admin', can_access_all_projects: true },
    { org_id: 'org-2', role: 'org_manager', can_access_all_projects: false }
  ],
  project_roles: [
    { project_id: 'proj-1', role: 'project_manager' },
    { project_id: 'proj-2', role: 'project_contributor' }
  ]
}
```

**SQL to Add:**
```sql
-- Get org roles
SELECT 
  org_id,
  role,
  can_access_all_projects
FROM org_roles
WHERE user_id = p_user_id
ORDER BY org_id;

-- Get project roles
SELECT 
  project_id,
  role
FROM project_roles
WHERE user_id = p_user_id
ORDER BY project_id;
```

### Step 2: Update Hook State (20 minutes)

**File:** `src/hooks/useOptimizedAuth.ts`

**Add to OptimizedAuthState interface:**
```typescript
interface OrgRole {
  org_id: string;
  role: string;
  can_access_all_projects: boolean;
}

interface ProjectRole {
  project_id: string;
  role: string;
}

interface OptimizedAuthState {
  // ... existing fields ...
  
  // NEW: Scoped roles
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
}
```

**Update initial state:**
```typescript
let authState: OptimizedAuthState = {
  user: null,
  profile: null,
  loading: true,
  roles: [],
  resolvedPermissions: null,
  userOrganizations: [],
  userProjects: [],
  defaultOrgId: null,
  orgRoles: [],        // NEW
  projectRoles: [],    // NEW
};
```

### Step 3: Update loadAuthData Function (30 minutes)

**File:** `src/hooks/useOptimizedAuth.ts`

**In loadAuthData, after getting RPC data:**
```typescript
// Process org roles
const orgRoles = authData.org_roles || [];
authState.orgRoles = orgRoles;

// Process project roles
const projectRoles = authData.project_roles || [];
authState.projectRoles = projectRoles;

// Log for debugging
if (import.meta.env.DEV) {
  console.log('[Auth] Loaded scoped roles:', {
    orgRoles: orgRoles.length,
    projectRoles: projectRoles.length
  });
}
```

### Step 4: Update Permission Functions (1 hour)

**File:** `src/hooks/useOptimizedAuth.ts`

**Replace hasRoleInOrg:**
```typescript
const hasRoleInOrg = (orgId: string, role: string): boolean => {
  if (!orgId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Check org_roles table
  const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
  if (!orgRole) return false;
  
  return orgRole.role === role;
};
```

**Replace hasRoleInProject:**
```typescript
const hasRoleInProject = (projectId: string, role: string): boolean => {
  if (!projectId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Check project_roles table
  const projectRole = authState.projectRoles.find(r => r.project_id === projectId);
  if (!projectRole) return false;
  
  return projectRole.role === role;
};
```

**Replace canPerformActionInOrg:**
```typescript
const canPerformActionInOrg = (
  orgId: string,
  action: 'manage_users' | 'manage_projects' | 'manage_transactions' | 'view'
): boolean => {
  if (!orgId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Get user's org role
  const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
  if (!orgRole) return false;
  
  // Permission matrix
  const permissions: Record<string, string[]> = {
    org_admin: ['manage_users', 'manage_projects', 'manage_transactions', 'view'],
    org_manager: ['manage_users', 'manage_projects', 'view'],
    org_accountant: ['manage_transactions', 'view'],
    org_auditor: ['view'],
    org_viewer: ['view'],
  };
  
  const allowedActions = permissions[orgRole.role] || [];
  return allowedActions.includes(action);
};
```

**Replace canPerformActionInProject:**
```typescript
const canPerformActionInProject = (
  projectId: string,
  action: 'manage' | 'create' | 'edit' | 'view'
): boolean => {
  if (!projectId) return false;
  
  // Super admin override
  const isSuperAdmin = authState.roles.includes('super_admin') || 
                      authState.profile?.is_super_admin;
  if (isSuperAdmin) return true;
  
  // Get user's project role
  const projectRole = authState.projectRoles.find(r => r.project_id === projectId);
  if (!projectRole) return false;
  
  // Permission matrix
  const permissions: Record<string, string[]> = {
    project_manager: ['manage', 'create', 'edit', 'view'],
    project_contributor: ['create', 'edit', 'view'],
    project_viewer: ['view'],
  };
  
  const allowedActions = permissions[projectRole.role] || [];
  return allowedActions.includes(action);
};
```

**Replace getUserRolesInOrg:**
```typescript
const getUserRolesInOrg = (orgId: string): string[] => {
  if (!orgId) return [];
  
  // Get all roles for this org
  return authState.orgRoles
    .filter(r => r.org_id === orgId)
    .map(r => r.role);
};
```

**Replace getUserRolesInProject:**
```typescript
const getUserRolesInProject = (projectId: string): string[] => {
  if (!projectId) return [];
  
  // Get all roles for this project
  return authState.projectRoles
    .filter(r => r.project_id === projectId)
    .map(r => r.role);
};
```

### Step 5: Update Cache Functions (15 minutes)

**File:** `src/hooks/useOptimizedAuth.ts`

**Update getCachedAuthData:**
```typescript
function getCachedAuthData(userId: string): { 
  profile: Profile | null; 
  roles: RoleSlug[];
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
  orgRoles: OrgRole[];        // NEW
  projectRoles: ProjectRole[]; // NEW
} | null {
  // ... existing code ...
  
  return { 
    profile: entry.profile, 
    roles: entry.roles,
    userOrganizations: entry.userOrganizations || [],
    userProjects: entry.userProjects || [],
    defaultOrgId: entry.defaultOrgId || null,
    orgRoles: entry.orgRoles || [],        // NEW
    projectRoles: entry.projectRoles || [] // NEW
  };
}
```

**Update setCachedAuthData:**
```typescript
function setCachedAuthData(
  userId: string, 
  profile: Profile | null, 
  roles: RoleSlug[],
  userOrganizations: string[],
  userProjects: string[],
  defaultOrgId: string | null,
  orgRoles: OrgRole[],        // NEW
  projectRoles: ProjectRole[]  // NEW
): void {
  try {
    const entry: AuthCacheEntry = {
      profile,
      roles,
      timestamp: Date.now(),
      userId,
      cacheVersion: CACHE_VERSION,
      userOrganizations,
      userProjects,
      defaultOrgId,
      orgRoles,        // NEW
      projectRoles     // NEW
    };
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.warn('[Auth] Cache write error:', error);
  }
}
```

### Step 6: Update signOut Function (5 minutes)

**File:** `src/hooks/useOptimizedAuth.ts`

**Update authState reset:**
```typescript
authState = {
  user: null,
  profile: null,
  loading: false,
  roles: [],
  resolvedPermissions: null,
  userOrganizations: [],
  userProjects: [],
  defaultOrgId: null,
  orgRoles: [],        // NEW
  projectRoles: [],    // NEW
};
```

---

## 🧪 Testing Phase 6

### Test 1: Verify RPC Returns Data
```sql
-- Call RPC and check org_roles and project_roles
SELECT * FROM rpc('get_user_auth_data', '{"p_user_id": "user-id"}');

-- Should return:
-- org_roles: [{ org_id: '...', role: 'org_admin', ... }]
-- project_roles: [{ project_id: '...', role: 'project_manager' }]
```

### Test 2: Verify Hook Loads Data
```typescript
// In browser console
const { orgRoles, projectRoles } = useOptimizedAuth();
console.log('Org roles:', orgRoles);
console.log('Project roles:', projectRoles);

// Should show actual roles from database
```

### Test 3: Test Permission Functions
```typescript
const { 
  hasRoleInOrg, 
  canPerformActionInOrg,
  hasRoleInProject,
  canPerformActionInProject
} = useOptimizedAuth();

// Test org permissions
console.log(hasRoleInOrg('org-id', 'org_admin')); // true/false
console.log(canPerformActionInOrg('org-id', 'manage_users')); // true/false

// Test project permissions
console.log(hasRoleInProject('proj-id', 'project_manager')); // true/false
console.log(canPerformActionInProject('proj-id', 'manage')); // true/false
```

### Test 4: Test Role Inheritance
```typescript
// User with org_admin and can_access_all_projects should access all projects
const { canAccessProject } = useOptimizedAuth();
console.log(canAccessProject('any-project-in-org')); // true
```

### Test 5: Manual UI Testing
1. Assign user org_admin role in org
2. Verify they can manage users in that org
3. Assign user org_accountant role
4. Verify they can only manage transactions
5. Assign user project_manager role
6. Verify they can manage that project

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All code changes reviewed
- [ ] All tests pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Backward compatibility verified

### Deployment
- [ ] Deploy RPC function update
- [ ] Deploy hook changes
- [ ] Verify RPC returns correct data
- [ ] Verify hook loads data correctly
- [ ] Monitor for errors

### Post-Deployment
- [ ] Run smoke tests
- [ ] Verify permissions work correctly
- [ ] Check user feedback
- [ ] Monitor error logs
- [ ] Be ready to rollback if needed

---

## 🔄 Rollback Procedure

If Phase 6 causes issues:

```bash
# 1. Revert RPC function
# Restore from backup or re-run Phase 5 migration

# 2. Revert hook changes
# Restore src/hooks/useOptimizedAuth.ts from git

# 3. Clear browser cache
# Users should clear localStorage

# 4. Verify system works
# Test permission functions return correct values

# 5. Investigate root cause
# Check RPC function, hook state, permission logic
```

---

## 📊 Success Metrics

### Functional Metrics
- ✅ RPC returns org_roles and project_roles
- ✅ Hook loads org_roles and project_roles
- ✅ Permission functions use org/project roles
- ✅ Role inheritance works correctly
- ✅ All tests pass

### Performance Metrics
- ✅ Auth load time < 2 seconds
- ✅ Permission check < 10ms
- ✅ No memory leaks
- ✅ Cache hit rate > 80%

### User Metrics
- ✅ Users get correct permissions
- ✅ No permission errors
- ✅ No access denied errors
- ✅ User satisfaction > 95%

---

## 🎯 Summary

**Phase 6 Implementation:**
- Updates RPC to return org/project roles
- Updates hook to load and use org/project roles
- Updates permission functions to check actual roles
- Enables role inheritance
- Makes system enterprise-ready

**Time Estimate:** 3-4 hours  
**Complexity:** MEDIUM  
**Risk:** LOW  
**Impact:** HIGH (enables full scoped roles functionality)

---

## ✨ What's Next

After Phase 6:
- ✅ Scoped roles fully functional
- ✅ Users get correct permissions per org/project
- ✅ Role inheritance works
- ✅ Enterprise-ready implementation

**Optional Phase 7:**
- Add role templates
- Add bulk role assignment
- Add role expiration
- Add role delegation
- Add advanced audit logging

---

**Ready to implement Phase 6? Start with Step 1!**
