# Scoped Roles - Phase 6: Org/Project Scoped Roles Implementation

**Date:** January 27, 2026  
**Status:** PLANNING & IMPLEMENTATION  
**Focus:** Implement actual org-scoped and project-scoped role checking

---

## 🎯 Phase 6 Overview

### What Phase 6 Does
Replaces the placeholder implementation in Phase 5 with actual org-scoped and project-scoped role checking. Instead of returning global roles for all orgs/projects, the system will now:

1. Query `org_roles` table for user's roles in specific org
2. Query `project_roles` table for user's roles in specific project
3. Return org-specific permissions based on org role
4. Return project-specific permissions based on project role
5. Handle role inheritance (org → project)

### Why Phase 6 Matters
- **Accuracy:** Users get correct permissions for their specific org/project
- **Security:** Can't access resources outside their assigned scope
- **Flexibility:** Different roles in different orgs/projects
- **Enterprise Ready:** Matches Salesforce/SAP/Dynamics 365 architecture

---

## 📋 Implementation Tasks

### Task 1: Update RPC Function (Database)
**File:** `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`

**Current State:**
- Returns global roles for all orgs/projects
- Returns all orgs/projects user belongs to

**New State:**
- For each org: return user's org role
- For each project: return user's project role
- Handle role inheritance
- Return role-specific permissions

**Changes Needed:**
```sql
-- OLD: Return global roles
SELECT roles FROM user_roles WHERE user_id = p_user_id

-- NEW: Return org-scoped roles
SELECT org_id, role FROM org_roles WHERE user_id = p_user_id

-- NEW: Return project-scoped roles
SELECT project_id, role FROM project_roles WHERE user_id = p_user_id
```

### Task 2: Update useOptimizedAuth Hook
**File:** `src/hooks/useOptimizedAuth.ts`

**Current State:**
- `hasRoleInOrg()` checks if user belongs to org
- `canPerformActionInOrg()` uses global roles

**New State:**
- `hasRoleInOrg()` checks actual org role
- `canPerformActionInOrg()` uses org-specific role permissions
- `hasRoleInProject()` checks actual project role
- `canPerformActionInProject()` uses project-specific role permissions

**Changes Needed:**
```typescript
// OLD: Check if user belongs to org
const hasRoleInOrg = (orgId: string, role: string): boolean => {
  return belongsToOrg(orgId);
};

// NEW: Check actual org role
const hasRoleInOrg = (orgId: string, role: string): boolean => {
  const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
  return orgRole?.role === role;
};
```

### Task 3: Add Org/Project Role State to Hook
**File:** `src/hooks/useOptimizedAuth.ts`

**Add to OptimizedAuthState:**
```typescript
interface OptimizedAuthState {
  // ... existing fields ...
  
  // NEW: Scoped roles data
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
}

interface OrgRole {
  org_id: string;
  role: string;
  can_access_all_projects: boolean;
}

interface ProjectRole {
  project_id: string;
  role: string;
}
```

### Task 4: Update Permission Functions
**File:** `src/hooks/useOptimizedAuth.ts`

**Update 6 functions:**
1. `hasRoleInOrg()` - Check org_roles table
2. `hasRoleInProject()` - Check project_roles table
3. `canPerformActionInOrg()` - Use org role permissions
4. `canPerformActionInProject()` - Use project role permissions
5. `getUserRolesInOrg()` - Return org-specific roles
6. `getUserRolesInProject()` - Return project-specific roles

### Task 5: Update Components (Optional)
**Files:** `src/components/admin/ScopedRoleAssignment.tsx`, etc.

**Changes:**
- Display actual org/project roles instead of global roles
- Show role-specific permissions
- Add role inheritance indicators

---

## 🔧 Implementation Details

### Step 1: Update RPC Function

```sql
-- Get user's org-scoped roles
SELECT 
  org_id,
  role,
  can_access_all_projects
FROM org_roles
WHERE user_id = p_user_id;

-- Get user's project-scoped roles
SELECT 
  project_id,
  role
FROM project_roles
WHERE user_id = p_user_id;
```

### Step 2: Update Hook State

```typescript
interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // Scope data
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
  
  // NEW: Scoped roles
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
}
```

### Step 3: Update Permission Functions

```typescript
// Check if user has specific role in org
const hasRoleInOrg = (orgId: string, role: string): boolean => {
  if (!orgId) return false;
  
  // Super admin override
  if (authState.roles.includes('super_admin')) return true;
  
  // Check org_roles table
  const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
  return orgRole?.role === role;
};

// Check if user can perform action in org
const canPerformActionInOrg = (
  orgId: string,
  action: 'manage_users' | 'manage_projects' | 'manage_transactions' | 'view'
): boolean => {
  if (!orgId) return false;
  
  // Super admin override
  if (authState.roles.includes('super_admin')) return true;
  
  // Get user's org role
  const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
  if (!orgRole) return false;
  
  // Check permissions based on org role
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

### Step 4: Handle Role Inheritance

```typescript
// If user has org_admin role, they can access all projects in org
const canAccessProject = (projectId: string): boolean => {
  if (!projectId) return false;
  
  // Super admin override
  if (authState.roles.includes('super_admin')) return true;
  
  // Check direct project role
  if (authState.projectRoles.some(r => r.project_id === projectId)) {
    return true;
  }
  
  // Check org-level access (org_admin with can_access_all_projects)
  const project = authState.userProjects.find(p => p === projectId);
  if (!project) return false;
  
  // Get project's org
  const projectOrg = getProjectOrg(projectId);
  if (!projectOrg) return false;
  
  // Check if user is org_admin with all projects access
  const orgRole = authState.orgRoles.find(r => r.org_id === projectOrg);
  return orgRole?.role === 'org_admin' && orgRole?.can_access_all_projects;
};
```

---

## 📊 Permission Matrix (Updated)

### Organization Permissions

| Role | manage_users | manage_projects | manage_transactions | view |
|------|--------------|-----------------|---------------------|------|
| org_admin | ✅ | ✅ | ✅ | ✅ |
| org_manager | ✅ | ✅ | ❌ | ✅ |
| org_accountant | ❌ | ❌ | ✅ | ✅ |
| org_auditor | ❌ | ❌ | ❌ | ✅ |
| org_viewer | ❌ | ❌ | ❌ | ✅ |

### Project Permissions

| Role | manage | create | edit | view |
|------|--------|--------|------|------|
| project_manager | ✅ | ✅ | ✅ | ✅ |
| project_contributor | ❌ | ✅ | ✅ | ✅ |
| project_viewer | ❌ | ❌ | ❌ | ✅ |

### Role Inheritance

| Scenario | Result |
|----------|--------|
| org_admin with can_access_all_projects | Can access all projects in org |
| org_admin without can_access_all_projects | Can only access assigned projects |
| org_manager | Can manage projects but not access all |
| project_manager | Can manage specific project only |

---

## 🔄 Data Flow (Phase 6)

```
User Action (e.g., "Can I edit this transaction?")
    ↓
Component calls canPerformActionInOrg(orgId, 'manage_transactions')
    ↓
Hook checks authState.orgRoles for user's role in org
    ↓
Hook looks up permissions for that role
    ↓
Hook returns true/false
    ↓
Component shows/hides UI based on result
```

---

## 📁 Files to Modify

### Database (1 file)
1. `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`
   - Update RPC to return org_roles and project_roles

### Frontend (1 file)
1. `src/hooks/useOptimizedAuth.ts`
   - Add orgRoles and projectRoles to state
   - Update 6 permission functions
   - Update loadAuthData to populate new state

### Optional (3 files)
1. `src/components/admin/ScopedRoleAssignment.tsx` - Show actual roles
2. `src/components/admin/OrgRoleAssignment.tsx` - Show actual roles
3. `src/components/admin/ProjectRoleAssignment.tsx` - Show actual roles

---

## ✅ Testing Checklist

### Unit Tests
- [ ] `hasRoleInOrg()` returns correct role
- [ ] `hasRoleInProject()` returns correct role
- [ ] `canPerformActionInOrg()` checks permissions correctly
- [ ] `canPerformActionInProject()` checks permissions correctly
- [ ] Role inheritance works correctly
- [ ] Super admin override works

### Integration Tests
- [ ] User with org_admin can manage users
- [ ] User with org_manager cannot manage transactions
- [ ] User with org_accountant can manage transactions
- [ ] User with project_manager can edit project items
- [ ] User with project_viewer cannot edit items
- [ ] Role inheritance allows org_admin to access all projects

### Manual Tests
- [ ] Assign user org_admin role
- [ ] Verify they can manage users in that org
- [ ] Assign user org_accountant role
- [ ] Verify they can only manage transactions
- [ ] Assign user project_manager role
- [ ] Verify they can manage that project only

---

## 🚀 Implementation Timeline

### Phase 6a: Database (30 minutes)
1. Update RPC function to return org_roles and project_roles
2. Test RPC returns correct data
3. Verify RLS policies allow access

### Phase 6b: Hook Update (1 hour)
1. Add orgRoles and projectRoles to state
2. Update loadAuthData to populate new state
3. Update 6 permission functions
4. Test all functions return correct values

### Phase 6c: Component Updates (30 minutes)
1. Update components to show actual roles
2. Test components display correct data
3. Verify UI reflects actual permissions

### Phase 6d: Testing & Deployment (1 hour)
1. Run all tests
2. Manual testing in staging
3. Deploy to production
4. Monitor for issues

**Total Time:** 3-4 hours

---

## 🔐 Security Considerations

### RLS Policies
- Ensure users can only see their own roles
- Ensure users can only see orgs/projects they belong to
- Ensure org_admin can only manage users in their org

### Permission Checks
- Always check super_admin first (override)
- Always check user belongs to org/project
- Always check user has required role
- Log all permission checks for audit

### Data Validation
- Validate org_id and project_id exist
- Validate role is valid
- Validate user_id is valid
- Validate action is valid

---

## 📚 Documentation Updates

### New Docs to Create
1. `SCOPED_ROLES_PHASE_6_IMPLEMENTATION_GUIDE.md` - Step-by-step guide
2. `SCOPED_ROLES_PHASE_6_TESTING_GUIDE.md` - Testing procedures
3. `SCOPED_ROLES_PHASE_6_TROUBLESHOOTING.md` - Common issues

### Docs to Update
1. `SCOPED_ROLES_MASTER_INDEX.md` - Add Phase 6 links
2. `SCOPED_ROLES_END_TO_END_WALKTHROUGH.md` - Add Phase 6 steps
3. `SCOPED_ROLES_QUICK_REFERENCE_FINAL.md` - Update with Phase 6 info

---

## 🎯 Success Criteria

Phase 6 is successful when:

✅ RPC function returns org_roles and project_roles  
✅ Hook state includes orgRoles and projectRoles  
✅ Permission functions check actual org/project roles  
✅ Role inheritance works correctly  
✅ All tests pass  
✅ Manual testing confirms correct behavior  
✅ No console errors  
✅ Performance is acceptable  

---

## 📊 Comparison: Phase 5 vs Phase 6

### Phase 5 (Current)
- ✅ UI for assigning roles
- ✅ Service for role management
- ✅ Permission functions exist
- ❌ Permission functions use global roles
- ❌ No actual org/project role checking

### Phase 6 (New)
- ✅ UI for assigning roles
- ✅ Service for role management
- ✅ Permission functions exist
- ✅ Permission functions use org/project roles
- ✅ Actual org/project role checking
- ✅ Role inheritance support
- ✅ Enterprise-ready implementation

---

## 🔄 Rollback Plan

If Phase 6 causes issues:

1. **Immediate:** Revert RPC function to Phase 5 version
2. **Short-term:** Revert hook to Phase 5 version
3. **Investigation:** Identify root cause
4. **Fix:** Address issue and re-deploy
5. **Testing:** Verify fix works before re-deploying

---

## 📞 Support

### Common Issues

**Issue:** Permission functions always return false
- **Cause:** orgRoles/projectRoles not populated
- **Solution:** Check RPC function returns data

**Issue:** Role inheritance not working
- **Cause:** can_access_all_projects flag not set
- **Solution:** Verify flag is set when assigning org_admin role

**Issue:** Users can't access projects they should
- **Cause:** Project not in userProjects list
- **Solution:** Verify project_roles record exists

---

## ✨ Summary

**Phase 6 transforms Phase 5 from a UI framework into a fully functional scoped roles system.**

- **Before Phase 6:** Users can assign roles but permissions still use global roles
- **After Phase 6:** Users get correct permissions based on their org/project roles

**Status:** READY FOR IMPLEMENTATION  
**Estimated Time:** 3-4 hours  
**Complexity:** MEDIUM  
**Risk:** LOW (backward compatible)

---

## 🚀 Next Steps

1. Review this plan
2. Approve implementation approach
3. Start Phase 6a (Database updates)
4. Follow implementation timeline
5. Run comprehensive tests
6. Deploy to production

**Ready to proceed? Say "go on" to start Phase 6 implementation!**
