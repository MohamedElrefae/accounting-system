## Scoped Roles Migration - Complete Implementation Guide

**Date:** January 26, 2026  
**Status:** READY TO DEPLOY  
**Priority:** HIGH - Foundational Architecture Change

---

## 🎯 Executive Summary

We're migrating from **global roles** (same role everywhere) to **scoped roles** (different roles per org/project). This is the industry standard used by Salesforce, Microsoft Dynamics, SAP, Workday, and all major enterprise applications.

**Why?**
- ✅ More flexible (user can be admin in Org A, viewer in Org B)
- ✅ Better security (least privilege per context)
- ✅ Easier delegation (org admins manage their org only)
- ✅ Clearer audit trail (know exactly what user can do where)

---

## 📋 Migration Phases

### Phase 1: Create Scoped Roles Tables ✅ COMPLETE
**File:** `supabase/migrations/20260126_create_scoped_roles_tables.sql`

**What it does:**
- Creates `org_roles` table (replaces `org_memberships`)
- Creates `project_roles` table (replaces `project_memberships`)
- Creates `system_roles` table (for super admins)
- Adds RLS policies
- Creates helper functions

**Tables created:**
```sql
org_roles (user_id, org_id, role, can_access_all_projects)
project_roles (user_id, project_id, role)
system_roles (user_id, role)
```

**Roles:**
- System: `super_admin`, `system_auditor`
- Org: `org_admin`, `org_manager`, `org_accountant`, `org_auditor`, `org_viewer`
- Project: `project_manager`, `project_contributor`, `project_viewer`

---

### Phase 2: Migrate Existing Data ✅ COMPLETE
**File:** `supabase/migrations/20260126_migrate_to_scoped_roles_data.sql`

**What it does:**
- Migrates super admins to `system_roles`
- Migrates `org_memberships` + `user_roles` to `org_roles`
- Migrates `project_memberships` + `user_roles` to `project_roles`
- Creates project roles for users with `can_access_all_projects=true`
- Creates compatibility views for old code

**Data flow:**
```
user_roles (global) + org_memberships → org_roles (scoped)
user_roles (global) + project_memberships → project_roles (scoped)
user_profiles.is_super_admin → system_roles
```

---

### Phase 3: Update RLS Policies ✅ COMPLETE
**File:** `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`

**What it does:**
- Updates all RLS policies to use scoped roles
- Uses helper functions (`has_org_role`, `has_project_role`, `is_super_admin`)
- Ensures proper access control per context

**Tables updated:**
- `organizations` - Check `org_roles`
- `projects` - Check `org_roles` + `project_roles`
- `transactions` - Check `org_roles` + `project_roles`
- `transaction_line_items` - Inherit from transaction
- `accounts` - Check `org_roles`
- `user_profiles` - Check `system_roles` + `org_roles`

---

### Phase 4: Update Auth RPC ✅ COMPLETE
**File:** `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`

**What it does:**
- Updates `get_user_auth_data()` to return scoped roles
- Adds helper functions for scoped queries
- Maintains backward compatibility

**New RPC response structure:**
```json
{
  "profile": { ... },
  "system_roles": ["super_admin"],
  "org_roles": [
    {
      "org_id": "uuid",
      "role": "org_admin",
      "can_access_all_projects": true,
      "org_name": "Company A"
    }
  ],
  "project_roles": [
    {
      "project_id": "uuid",
      "role": "project_manager",
      "project_name": "Project X",
      "org_id": "uuid"
    }
  ],
  "organizations": ["org-id-1", "org-id-2"],
  "projects": ["project-id-1", "project-id-2"],
  "default_org": "org-id-1",
  "roles": ["admin", "manager"] // Legacy compatibility
}
```

---

### Phase 5: Update Frontend (TODO)
**File:** `src/hooks/useOptimizedAuth.ts`

**What needs to be updated:**

1. **Update OptimizedAuthState interface:**
```typescript
interface OptimizedAuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  
  // NEW: Scoped roles
  systemRoles: string[];
  orgRoles: Array<{
    org_id: string;
    role: string;
    can_access_all_projects: boolean;
    org_name?: string;
  }>;
  projectRoles: Array<{
    project_id: string;
    role: string;
    project_name?: string;
    org_id: string;
  }>;
  
  // Keep for compatibility
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // Scope data
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
}
```

2. **Update loadAuthData function:**
```typescript
const loadAuthData = async (userId: string) => {
  const { data: authData } = await supabase.rpc('get_user_auth_data', { 
    p_user_id: userId 
  });
  
  if (authData) {
    authState.profile = authData.profile;
    authState.systemRoles = authData.system_roles || [];
    authState.orgRoles = authData.org_roles || [];
    authState.projectRoles = authData.project_roles || [];
    authState.userOrganizations = authData.organizations || [];
    authState.userProjects = authData.projects || [];
    authState.defaultOrgId = authData.default_org;
    
    // Legacy compatibility
    authState.roles = authData.roles || [];
    authState.resolvedPermissions = flattenPermissions(authState.roles);
  }
};
```

3. **Add new scoped permission functions:**
```typescript
// Check if user has role in org
const hasRoleInOrg = (orgId: string, role: string): boolean => {
  if (authState.systemRoles.includes('super_admin')) return true;
  return authState.orgRoles.some(
    r => r.org_id === orgId && r.role === role
  );
};

// Check if user has role in project
const hasRoleInProject = (projectId: string, role: string): boolean => {
  if (authState.systemRoles.includes('super_admin')) return true;
  return authState.projectRoles.some(
    r => r.project_id === projectId && r.role === role
  );
};

// Check if user can perform action in org
const canPerformActionInOrg = (
  orgId: string,
  action: 'manage_users' | 'manage_projects' | 'manage_transactions' | 'view'
): boolean => {
  if (authState.systemRoles.includes('super_admin')) return true;
  
  const userRoles = authState.orgRoles
    .filter(r => r.org_id === orgId)
    .map(r => r.role);
  
  // Check permissions based on role
  if (userRoles.includes('org_admin')) return true;
  if (userRoles.includes('org_manager') && 
      ['manage_users', 'manage_projects', 'view'].includes(action)) return true;
  if (userRoles.includes('org_accountant') && 
      ['manage_transactions', 'view'].includes(action)) return true;
  if (['org_auditor', 'org_viewer'].some(r => userRoles.includes(r)) && 
      action === 'view') return true;
  
  return false;
};

// Check if user can perform action in project
const canPerformActionInProject = (
  projectId: string,
  action: 'manage' | 'create' | 'edit' | 'view'
): boolean => {
  if (authState.systemRoles.includes('super_admin')) return true;
  
  // Check project-level roles
  const projectRole = authState.projectRoles.find(
    r => r.project_id === projectId
  );
  
  if (projectRole) {
    if (projectRole.role === 'project_manager') return true;
    if (projectRole.role === 'project_contributor' && 
        ['create', 'edit', 'view'].includes(action)) return true;
    if (projectRole.role === 'project_viewer' && action === 'view') return true;
  }
  
  // Check org-level access
  const project = authState.projectRoles.find(r => r.project_id === projectId);
  if (project) {
    return canPerformActionInOrg(project.org_id, 'manage_projects');
  }
  
  return false;
};
```

4. **Update hook return:**
```typescript
return {
  // Existing
  user: state.user,
  profile: state.profile,
  loading: state.loading,
  roles: state.roles,
  resolvedPermissions: state.resolvedPermissions,
  hasRouteAccess,
  hasActionAccess,
  signIn,
  signOut,
  signUp,
  refreshProfile,
  
  // Scope data
  userOrganizations: state.userOrganizations,
  userProjects: state.userProjects,
  defaultOrgId: state.defaultOrgId,
  belongsToOrg,
  canAccessProject,
  
  // NEW: Scoped roles
  systemRoles: state.systemRoles,
  orgRoles: state.orgRoles,
  projectRoles: state.projectRoles,
  hasRoleInOrg,
  hasRoleInProject,
  canPerformActionInOrg,
  canPerformActionInProject,
};
```

---

## 🚀 Deployment Steps

### Step 1: Backup Database
```bash
# Create backup before migration
pg_dump your_database > backup_before_scoped_roles_$(date +%Y%m%d).sql
```

### Step 2: Run Migrations in Order
```bash
# Connect to Supabase
supabase db push

# Or run manually in order:
psql -f supabase/migrations/20260126_create_scoped_roles_tables.sql
psql -f supabase/migrations/20260126_migrate_to_scoped_roles_data.sql
psql -f supabase/migrations/20260126_update_rls_for_scoped_roles.sql
psql -f supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql
```

### Step 3: Verify Migration
```sql
-- Check data migration
SELECT 'system_roles' as table_name, COUNT(*) as count FROM system_roles
UNION ALL
SELECT 'org_roles', COUNT(*) FROM org_roles
UNION ALL
SELECT 'project_roles', COUNT(*) FROM project_roles;

-- Check specific user
SELECT 'system' as scope, role 
FROM system_roles 
WHERE user_id = 'YOUR_USER_ID'
UNION ALL
SELECT 'org:' || org_id, role 
FROM org_roles 
WHERE user_id = 'YOUR_USER_ID'
UNION ALL
SELECT 'project:' || project_id, role 
FROM project_roles 
WHERE user_id = 'YOUR_USER_ID';

-- Test RPC function
SELECT get_user_auth_data('YOUR_USER_ID');
```

### Step 4: Update Frontend
- Update `src/hooks/useOptimizedAuth.ts` (see Phase 5 above)
- Update components to use new scoped permission functions
- Test thoroughly

### Step 5: Test Access Control
Test with different user types:
- Super admin (should access everything)
- Org admin (should manage their org only)
- Org accountant (should manage transactions in their org)
- Project manager (should manage their project only)
- Project viewer (should view their project only)

---

## 🧪 Testing Checklist

### Database Tests
- [ ] All migrations run without errors
- [ ] Data migrated correctly (counts match)
- [ ] RLS policies work (test with different users)
- [ ] Helper functions work
- [ ] RPC function returns correct data

### Frontend Tests
- [ ] useOptimizedAuth hook loads scoped roles
- [ ] Permission checks work per org/project
- [ ] UI shows/hides buttons correctly
- [ ] Navigation works based on scoped permissions
- [ ] No console errors

### User Scenarios
- [ ] Super admin can access everything
- [ ] Org admin can manage their org only
- [ ] Org accountant can create transactions in their org
- [ ] Org viewer can only view in their org
- [ ] Project manager can manage their project
- [ ] Project contributor can edit in their project
- [ ] Project viewer can only view their project
- [ ] User with multiple orgs sees correct data per org
- [ ] User with org + project roles has correct access

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Use Compatibility Views
The migration creates compatibility views that allow old code to work:
- `user_roles_compat`
- `org_memberships_compat`
- `project_memberships_compat`

### Option 2: Restore from Backup
```bash
# Restore database from backup
psql your_database < backup_before_scoped_roles_YYYYMMDD.sql
```

### Option 3: Keep Both Systems
- Keep old tables (`user_roles`, `org_memberships`, `project_memberships`)
- Keep new tables (`org_roles`, `project_roles`, `system_roles`)
- Use feature flag to switch between them

---

## 📊 Before/After Comparison

### Before (Global Roles)
```sql
-- Ahmed is accountant everywhere
user_roles: { user_id: ahmed, role: 'accountant' }
org_memberships: { user_id: ahmed, org_id: 'org_a' }
org_memberships: { user_id: ahmed, org_id: 'org_b' }

-- Problem: Ahmed is accountant in BOTH orgs
-- Can't make him admin in Org A and viewer in Org B
```

### After (Scoped Roles)
```sql
-- Ahmed has different roles per org
org_roles: { user_id: ahmed, org_id: 'org_a', role: 'org_admin' }
org_roles: { user_id: ahmed, org_id: 'org_b', role: 'org_viewer' }

-- Solution: Ahmed is admin in Org A, viewer in Org B ✅
```

---

## 🎯 Benefits Summary

1. **Flexibility** - Different roles in different contexts
2. **Security** - Least privilege per context
3. **Delegation** - Org admins manage their org without affecting others
4. **Audit Trail** - Clear record of who can do what where
5. **Industry Standard** - Same as Salesforce, Dynamics, SAP, Workday
6. **Scalability** - Supports complex multi-tenant scenarios

---

## 📚 Related Documents

- `GLOBAL_VS_SCOPED_ROLES_ANALYSIS.md` - Detailed analysis and comparison
- `SERVER_SIDE_RBAC_ENTERPRISE_BEST_PRACTICES.md` - Why server-side is correct
- `PHASE_2_IMPLEMENTATION_COMPLETE.md` - Current auth implementation status

---

## ✅ Next Steps

1. **Review this guide** - Make sure you understand the changes
2. **Backup database** - Safety first!
3. **Run migrations** - Execute in order
4. **Verify data** - Check migration success
5. **Update frontend** - Implement Phase 5 changes
6. **Test thoroughly** - Use testing checklist
7. **Deploy to production** - When confident

---

**Status:** READY TO DEPLOY  
**Estimated Time:** 2-4 hours (including testing)  
**Risk Level:** MEDIUM (database schema change, but backward compatible)  
**Rollback:** Available (backup + compatibility views)

---

**Questions?** Review the analysis documents or ask for clarification.

**Ready to proceed?** Start with Step 1: Backup Database
