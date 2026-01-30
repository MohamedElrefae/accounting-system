# Enterprise Auth - Developer Quick Reference

**Quick reference for implementing org-scoped authentication**

---

## 🎯 Core Concept

**BEFORE:** User has "accountant" role globally → can access ALL organizations  
**AFTER:** User has "accountant" role in org-1 only → can ONLY access org-1

---

## 📊 Database Changes

### New Column: user_roles.organization_id
```sql
-- NULL = global role (super_admin only)
-- UUID = role applies only in this organization
ALTER TABLE user_roles ADD COLUMN organization_id UUID;
```

### New RPC: get_user_auth_data_with_scope()
```sql
-- Returns: profile, roles, organizations, projects, org_roles, default_org
SELECT get_user_auth_data_with_scope('user-id');
```

### Helper Functions
```sql
-- Check if user belongs to org
SELECT user_belongs_to_org('user-id', 'org-id');

-- Check if user can access project
SELECT user_can_access_project('user-id', 'project-id');

-- Get user roles in specific org
SELECT get_user_roles_in_org('user-id', 'org-id');

-- Get user permissions in specific org
SELECT get_user_permissions_in_org('user-id', 'org-id');
```

---

## 🔧 Frontend Changes

### 1. Update useOptimizedAuth Hook

**Add to interface:**
```typescript
interface OptimizedAuthState {
  // ... existing fields
  userOrganizations: string[];      // NEW
  userProjects: string[];           // NEW
  orgRoles: Map<string, RoleSlug[]>; // NEW
  defaultOrgId: string | null;      // NEW
}
```

**Add to loadAuthData:**
```typescript
// Call enhanced RPC
const { data: scopeData } = await supabase.rpc(
  'get_user_auth_data_with_scope',
  { p_user_id: userId }
);

// Store scope data
authState.userOrganizations = scopeData.organizations || [];
authState.userProjects = scopeData.projects || [];
authState.orgRoles = new Map(Object.entries(scopeData.org_roles || {}));
authState.defaultOrgId = scopeData.default_org;
```

**Add validation functions:**
```typescript
// Check if user belongs to org
const belongsToOrg = (orgId: string): boolean => {
  return authState.userOrganizations.includes(orgId);
};

// Check if user can access project
const canAccessProject = (projectId: string): boolean => {
  return authState.userProjects.includes(projectId);
};

// Get roles in specific org
const getRolesInOrg = (orgId: string): RoleSlug[] => {
  return authState.orgRoles.get(orgId) || [];
};

// Check permission in org context
const hasActionAccessInOrg = (
  action: PermissionCode,
  orgId: string
): boolean => {
  if (!belongsToOrg(orgId)) return false;
  const orgRoles = getRolesInOrg(orgId);
  const orgPermissions = flattenPermissions(orgRoles);
  return orgPermissions.actions.has(action);
};
```

**Export new functions:**
```typescript
return {
  // ... existing exports
  userOrganizations,
  userProjects,
  defaultOrgId,
  belongsToOrg,
  canAccessProject,
  getRolesInOrg,
  hasActionAccessInOrg,
};
```

### 2. Update ScopeContext

**Add validation to setOrganization:**
```typescript
const setOrganization = async (orgId: string | null) => {
  if (orgId) {
    // Validate user belongs to this org
    if (!belongsToOrg(orgId)) {
      throw new Error('You do not have access to this organization');
    }
    
    // Load org details
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    
    if (error) throw new Error(`Failed to load organization: ${error.message}`);
    
    setCurrentOrg(org);
  } else {
    setCurrentOrg(null);
  }
  
  // Clear project when org changes
  setCurrentProject(null);
};
```

**Add validation to setProject:**
```typescript
const setProject = async (projectId: string | null) => {
  if (projectId) {
    // Validate user can access this project
    if (!canAccessProject(projectId)) {
      throw new Error('You do not have access to this project');
    }
    
    // Load project details
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) throw new Error(`Failed to load project: ${error.message}`);
    
    // Validate project belongs to current org
    if (currentOrg && project.organization_id !== currentOrg.id) {
      throw new Error('Project does not belong to current organization');
    }
    
    setCurrentProject(project);
  } else {
    setCurrentProject(null);
  }
};
```

### 3. Update OptimizedProtectedRoute

**Add props:**
```typescript
interface OptimizedProtectedRouteProps {
  children: React.ReactNode;
  requiredAction?: PermissionCode;
  requiresOrgAccess?: boolean;      // NEW
  requiresProjectAccess?: boolean;  // NEW
  fallback?: React.ReactNode;
  redirectTo?: string;
}
```

**Add validation:**
```typescript
const { belongsToOrg } = useOptimizedAuth();
const { currentOrg, currentProject } = useScope();
const params = useParams();

// Validate org access if required
if (requiresOrgAccess) {
  if (!currentOrg || !belongsToOrg(currentOrg.id)) {
    return <Navigate to="/select-organization" state={{ from: location }} replace />;
  }
}

// Validate route params match user's scope
const routeOrgId = params.orgId || params.organizationId;
if (routeOrgId && !belongsToOrg(routeOrgId)) {
  return <Navigate to="/unauthorized" state={{ 
    reason: 'org_access_denied',
    orgId: routeOrgId 
  }} replace />;
}
```

### 4. Update Route Definitions

**Add requiresOrgAccess prop:**
```typescript
<Route path="organization-management" element={
  <OptimizedProtectedRoute 
    requiredAction="settings.manage"
    requiresOrgAccess={true}  // NEW
  >
    <OrganizationManagement />
  </OptimizedProtectedRoute>
} />
```

---

## 🧪 Testing

### Test 1: Accountant Cannot Access Other Orgs
```typescript
// Login as accountant (belongs to org-1 only)
await signIn('accountant@example.com', 'password');

// Try to select org-2
await expect(
  setOrganization('org-2-uuid')
).rejects.toThrow('You do not have access to this organization');

// Try to navigate to org-2 settings
await navigate('/organizations/org-2-uuid/settings');
expect(location.pathname).toBe('/unauthorized');
```

### Test 2: RLS Policies Work
```sql
-- Login as accountant user
-- Should only see their orgs
SELECT COUNT(*) FROM organizations;
-- Expected: 1 or 2 (their orgs only)

-- Should not see other orgs
SELECT COUNT(*) FROM organizations WHERE id = 'other-org-uuid';
-- Expected: 0
```

### Test 3: Org-Scoped Permissions
```typescript
// User is accountant in org-1, admin in org-2
const { getRolesInOrg, hasActionAccessInOrg } = useOptimizedAuth();

// Check roles in org-1
expect(getRolesInOrg('org-1')).toEqual(['accountant']);

// Check roles in org-2
expect(getRolesInOrg('org-2')).toEqual(['admin']);

// Check permissions in org-1
expect(hasActionAccessInOrg('transactions.create', 'org-1')).toBe(true);
expect(hasActionAccessInOrg('users.manage', 'org-1')).toBe(false);

// Check permissions in org-2
expect(hasActionAccessInOrg('users.manage', 'org-2')).toBe(true);
```

---

## 🐛 Common Issues

### Issue 1: "You do not have access to this organization"
**Cause:** User is not in org_memberships for this org  
**Fix:** Add user to org_memberships table
```sql
INSERT INTO org_memberships (user_id, org_id, is_default)
VALUES ('user-id', 'org-id', false);
```

### Issue 2: User sees no organizations
**Cause:** No entries in org_memberships for this user  
**Fix:** Assign user to at least one organization
```sql
INSERT INTO org_memberships (user_id, org_id, is_default)
VALUES ('user-id', 'org-id', true);
```

### Issue 3: RLS policies blocking everything
**Cause:** org_memberships table is empty  
**Fix:** Populate org_memberships with user assignments
```sql
-- Assign all users to default org
INSERT INTO org_memberships (user_id, org_id, is_default)
SELECT up.id, o.id, true
FROM user_profiles up
CROSS JOIN organizations o
WHERE o.name = 'Default Organization'
ON CONFLICT DO NOTHING;
```

### Issue 4: Enhanced RPC returns empty organizations array
**Cause:** org_memberships table doesn't exist or is empty  
**Fix:** Create table and populate data
```sql
-- Check if table exists
SELECT * FROM org_memberships LIMIT 1;

-- If empty, populate with default assignments
INSERT INTO org_memberships (user_id, org_id, is_default)
SELECT up.id, o.id, true
FROM user_profiles up
CROSS JOIN (SELECT id FROM organizations LIMIT 1) o;
```

---

## 📝 Cheat Sheet

### Check User's Organizations
```typescript
const { userOrganizations } = useOptimizedAuth();
console.log('User belongs to:', userOrganizations);
```

### Check User's Roles in Org
```typescript
const { getRolesInOrg } = useOptimizedAuth();
const roles = getRolesInOrg('org-id');
console.log('User roles in org:', roles);
```

### Validate Org Access
```typescript
const { belongsToOrg } = useOptimizedAuth();
if (!belongsToOrg(orgId)) {
  throw new Error('Access denied');
}
```

### Check Permission in Org
```typescript
const { hasActionAccessInOrg } = useOptimizedAuth();
if (hasActionAccessInOrg('transactions.create', orgId)) {
  // User can create transactions in this org
}
```

### Get Current Org
```typescript
const { currentOrg } = useScope();
console.log('Current org:', currentOrg?.name);
```

### Change Organization
```typescript
const { setOrganization } = useScope();
try {
  await setOrganization('org-id');
} catch (error) {
  console.error('Cannot access org:', error.message);
}
```

---

## 🔍 Debugging

### Check Auth State
```typescript
const auth = useOptimizedAuth();
console.log('Auth state:', {
  user: auth.user?.email,
  roles: auth.roles,
  organizations: auth.userOrganizations,
  projects: auth.userProjects,
  orgRoles: Array.from(auth.orgRoles.entries()),
});
```

### Check Scope State
```typescript
const scope = useScope();
console.log('Scope state:', {
  currentOrg: scope.currentOrg?.name,
  currentProject: scope.currentProject?.name,
  availableOrgs: scope.availableOrgs.map(o => o.name),
  availableProjects: scope.availableProjects.map(p => p.name),
});
```

### Check Database
```sql
-- Check user's org memberships
SELECT 
  up.email,
  o.name as org_name,
  om.is_default,
  om.can_access_all_projects
FROM org_memberships om
JOIN user_profiles up ON up.id = om.user_id
JOIN organizations o ON o.id = om.org_id
WHERE up.email = 'user@example.com';

-- Check user's roles
SELECT 
  up.email,
  r.name as role,
  o.name as organization,
  ur.is_active
FROM user_roles ur
JOIN user_profiles up ON up.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE up.email = 'user@example.com';
```

---

## 📚 Key Files

- `src/hooks/useOptimizedAuth.ts` - Auth hook with scope support
- `src/contexts/ScopeContext.tsx` - Org/project selection context
- `src/components/routing/OptimizedProtectedRoute.tsx` - Route protection
- `sql/quick_wins_fix_rls_policies.sql` - RLS policy fixes
- `supabase/migrations/20260123_add_org_id_to_user_roles.sql` - Schema changes
- `supabase/migrations/20260123_create_enhanced_auth_rpc.sql` - Enhanced RPC

---

## ✅ Checklist

### Backend
- [ ] Deploy RLS policy fixes
- [ ] Run migration: add org_id to user_roles
- [ ] Run migration: create enhanced auth RPC
- [ ] Test enhanced RPC returns correct data
- [ ] Verify RLS policies work

### Frontend
- [ ] Update useOptimizedAuth interface
- [ ] Add scope fields to auth state
- [ ] Add validation functions
- [ ] Update ScopeContext with validation
- [ ] Update OptimizedProtectedRoute
- [ ] Update route definitions
- [ ] Test org selection validation
- [ ] Test route protection

### Testing
- [ ] Test accountant cannot access other orgs
- [ ] Test RLS policies enforce isolation
- [ ] Test org-scoped permissions
- [ ] Test route param validation
- [ ] Test error messages

---

**Need help?** Check `ENTERPRISE_AUTH_IMPLEMENTATION_ACTION_PLAN.md` for detailed instructions.
