# Scoped Roles - End-to-End Implementation Guide

**Date:** January 26, 2026  
**Status:** ✅ COMPLETE WALKTHROUGH  
**Scope:** Database → Frontend → Testing → Deployment

---

## 🎯 Complete End-to-End Scenario

### Real-World Example
**Company:** Acme Corp (using your system)

**Structure:**
- **Org A:** Acme Engineering (HQ)
- **Org B:** Acme Consulting (subsidiary)
- **Project 1:** Infrastructure (in Org A)
- **Project 2:** Client Work (in Org B)

**Users:**
- Ahmed: Super Admin (full access everywhere)
- Sara: Org A Admin (manages Org A only)
- John: Accountant in Org A (manages transactions in Org A)
- Lisa: Project Manager in Project 1 (manages Project 1 only)

---

## 📋 Step 1: Database Deployment (1-2 hours)

### 1.1 Backup Database

```bash
# Create backup
pg_dump your_database > backup_$(date +%Y%m%d).sql

# Verify backup
ls -lh backup_*.sql
```

### 1.2 Deploy Phase 1: Create Tables

**File:** `supabase/migrations/20260126_create_scoped_roles_tables.sql`

**What happens:**
- Creates `org_roles` table
- Creates `project_roles` table
- Creates `system_roles` table
- Adds RLS policies
- Creates helper functions

**Deploy:**
```bash
supabase db push
# Or manually in Supabase Dashboard
```

**Verify:**
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('org_roles', 'project_roles', 'system_roles');

-- Expected output:
-- org_roles
-- project_roles
-- system_roles
```

### 1.3 Deploy Phase 2: Clean Setup

**File:** `supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql`

**What happens:**
- Verifies tables created
- Creates empty tables (no data migration)
- Provides verification queries

**Deploy:**
```bash
supabase db push
```

**Verify:**
```sql
-- Check tables are empty
SELECT COUNT(*) FROM org_roles;      -- Should be 0
SELECT COUNT(*) FROM project_roles;  -- Should be 0
SELECT COUNT(*) FROM system_roles;   -- Should be 0
```

### 1.4 Deploy Phase 3: Update RLS

**File:** `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`

**What happens:**
- Updates RLS policies on all tables
- Uses helper functions for access control
- Ensures proper security

**Deploy:**
```bash
supabase db push
```

**Verify:**
```sql
-- Check RLS policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('org_roles', 'project_roles', 'system_roles')
ORDER BY tablename;

-- Expected: Multiple policies per table
```

### 1.5 Deploy Phase 4: Update Auth RPC

**File:** `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`

**What happens:**
- Updates `get_user_auth_data()` RPC function
- Returns scoped roles
- Returns scope data (orgs, projects)

**Deploy:**
```bash
supabase db push
```

**Verify:**
```sql
-- Test RPC function
SELECT get_user_auth_data('test-user-id'::UUID);

-- Expected: JSON with profile, system_roles, org_roles, project_roles, etc.
```

### 1.6 Add Sample Data

**File:** `sql/add_scoped_roles_data_later.sql`

**What happens:**
- Migrates super admins
- Migrates org memberships
- Migrates project memberships
- Handles org-level access

**Deploy (when ready):**
```bash
psql -f sql/add_scoped_roles_data_later.sql
```

**Verify:**
```sql
-- Check data migrated
SELECT COUNT(*) FROM system_roles;
SELECT COUNT(*) FROM org_roles;
SELECT COUNT(*) FROM project_roles;

-- Check specific user
SELECT 'system' as scope, role FROM system_roles WHERE user_id = 'ahmed-id'
UNION ALL
SELECT 'org:' || org_id, role FROM org_roles WHERE user_id = 'ahmed-id'
UNION ALL
SELECT 'project:' || project_id, role FROM project_roles WHERE user_id = 'ahmed-id';
```

---

## 🔧 Step 2: Frontend Implementation (2-3 hours)

### 2.1 Update Auth Hook

**File:** `src/hooks/useOptimizedAuth.ts`

**What to add:**

```typescript
// NEW: Scoped roles state
interface OptimizedAuthState {
  // Existing
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  roles: RoleSlug[];
  resolvedPermissions: ResolvedRole | null;
  
  // NEW: Scoped roles
  systemRoles: string[];
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
  
  // NEW: Scope data
  userOrganizations: string[];
  userProjects: string[];
  defaultOrgId: string | null;
}

// NEW: Permission functions
const hasRoleInOrg = (orgId: string, role: string): boolean => {
  if (authState.systemRoles.includes('super_admin')) return true;
  return authState.orgRoles.some(
    r => r.org_id === orgId && r.role === role
  );
};

const canPerformActionInOrg = (
  orgId: string,
  action: 'manage_users' | 'manage_projects' | 'manage_transactions' | 'view'
): boolean => {
  if (authState.systemRoles.includes('super_admin')) return true;
  
  const userRoles = authState.orgRoles
    .filter(r => r.org_id === orgId)
    .map(r => r.role);
  
  if (userRoles.includes('org_admin')) return true;
  if (userRoles.includes('org_manager') && 
      ['manage_users', 'manage_projects', 'view'].includes(action)) return true;
  if (userRoles.includes('org_accountant') && 
      ['manage_transactions', 'view'].includes(action)) return true;
  if (['org_auditor', 'org_viewer'].some(r => userRoles.includes(r)) && 
      action === 'view') return true;
  
  return false;
};
```

**See:** `SCOPED_ROLES_PHASE_5_FRONTEND_PART1.md` for complete code

### 2.2 Create Role Service

**File:** `src/services/scopedRolesService.ts`

**What to add:**

```typescript
export const scopedRolesService = {
  // Org roles
  async assignOrgRole(assignment: OrgRoleAssignment) { ... },
  async updateOrgRole(userId, orgId, role) { ... },
  async removeOrgRole(userId, orgId) { ... },
  async getOrgRoles(orgId) { ... },
  
  // Project roles
  async assignProjectRole(assignment: ProjectRoleAssignment) { ... },
  async updateProjectRole(userId, projectId, role) { ... },
  async removeProjectRole(userId, projectId) { ... },
  async getProjectRoles(projectId) { ... },
  
  // System roles
  async assignSystemRole(assignment: SystemRoleAssignment) { ... },
  async removeSystemRole(userId, role) { ... },
  async getSystemRoles() { ... },
};
```

**See:** `SCOPED_ROLES_PHASE_5_FRONTEND_PART1.md` for complete code

### 2.3 Create UI Components

**Files:**
- `src/components/admin/ScopedRoleAssignment.tsx`
- `src/components/admin/OrgRoleAssignment.tsx`
- `src/components/admin/ProjectRoleAssignment.tsx`

**What to add:**

```typescript
// ScopedRoleAssignment - Main component
<ScopedRoleAssignment userId={userId} userName={name} userEmail={email} />

// OrgRoleAssignment - Org-specific
<OrgRoleAssignment orgId={orgId} orgName={name} />

// ProjectRoleAssignment - Project-specific
<ProjectRoleAssignment projectId={projectId} projectName={name} />
```

**Features:**
- View current roles
- Add new roles
- Update roles
- Remove roles
- Manage org-level access to all projects

**See:** `SCOPED_ROLES_PHASE_5_FRONTEND_PART2.md` for complete code

### 2.4 Integrate with EnterpriseUserManagement

**File:** `src/pages/admin/EnterpriseUserManagement.tsx`

**What to update:**

```typescript
// Add tabs
<button onClick={() => setActiveTab('users')}>Users</button>
<button onClick={() => setActiveTab('org-roles')}>Organization Roles</button>
<button onClick={() => setActiveTab('project-roles')}>Project Roles</button>

// Use components
{activeTab === 'users' && (
  <ScopedRoleAssignment userId={selectedUser} />
)}

{activeTab === 'org-roles' && (
  <OrgRoleAssignment orgId={selectedOrg} />
)}

{activeTab === 'project-roles' && (
  <ProjectRoleAssignment projectId={selectedProject} />
)}
```

**See:** `SCOPED_ROLES_PHASE_5_FRONTEND_PART3.md` for complete code

---

## 🧪 Step 3: Testing (1-2 hours)

### 3.1 Test Scenario 1: Assign Ahmed as Super Admin

```typescript
// Database: Add super admin
INSERT INTO system_roles (user_id, role, created_by)
VALUES ('ahmed-id', 'super_admin', 'ahmed-id');

// Frontend: Verify
const { systemRoles } = useOptimizedAuth();
console.log(systemRoles); // Expected: ['super_admin']

// Test permission
const { canPerformActionInOrg } = useOptimizedAuth();
console.log(canPerformActionInOrg('any-org', 'manage_transactions'));
// Expected: true (super admin can do anything)
```

### 3.2 Test Scenario 2: Assign Sara as Org A Admin

```typescript
// Database: Add org role
INSERT INTO org_roles (user_id, org_id, role, can_access_all_projects, created_by)
VALUES ('sara-id', 'org-a-id', 'org_admin', true, 'ahmed-id');

// Frontend: Verify
const { orgRoles } = useOptimizedAuth();
console.log(orgRoles);
// Expected: [{ org_id: 'org-a-id', role: 'org_admin', can_access_all_projects: true }]

// Test permission in Org A
const { canPerformActionInOrg } = useOptimizedAuth();
console.log(canPerformActionInOrg('org-a-id', 'manage_users'));
// Expected: true

// Test permission in Org B (should fail)
console.log(canPerformActionInOrg('org-b-id', 'manage_users'));
// Expected: false
```

### 3.3 Test Scenario 3: Assign John as Accountant in Org A

```typescript
// Database: Add org role
INSERT INTO org_roles (user_id, org_id, role, can_access_all_projects, created_by)
VALUES ('john-id', 'org-a-id', 'org_accountant', false, 'sara-id');

// Frontend: Verify
const { orgRoles } = useOptimizedAuth();
console.log(orgRoles);
// Expected: [{ org_id: 'org-a-id', role: 'org_accountant', can_access_all_projects: false }]

// Test permission to manage transactions
const { canPerformActionInOrg } = useOptimizedAuth();
console.log(canPerformActionInOrg('org-a-id', 'manage_transactions'));
// Expected: true

// Test permission to manage users (should fail)
console.log(canPerformActionInOrg('org-a-id', 'manage_users'));
// Expected: false
```

### 3.4 Test Scenario 4: Assign Lisa as Project Manager in Project 1

```typescript
// Database: Add project role
INSERT INTO project_roles (user_id, project_id, role, created_by)
VALUES ('lisa-id', 'project-1-id', 'project_manager', 'sara-id');

// Frontend: Verify
const { projectRoles } = useOptimizedAuth();
console.log(projectRoles);
// Expected: [{ project_id: 'project-1-id', role: 'project_manager', org_id: 'org-a-id' }]

// Test permission in Project 1
const { canPerformActionInProject } = useOptimizedAuth();
console.log(canPerformActionInProject('project-1-id', 'manage'));
// Expected: true

// Test permission in Project 2 (should fail)
console.log(canPerformActionInProject('project-2-id', 'manage'));
// Expected: false
```

### 3.5 Test Scenario 5: Update John's Role to Manager

```typescript
// Database: Update role
UPDATE org_roles
SET role = 'org_manager'
WHERE user_id = 'john-id' AND org_id = 'org-a-id';

// Frontend: Verify
const { getUserRolesInOrg } = useOptimizedAuth();
const roles = getUserRolesInOrg('org-a-id');
console.log(roles); // Expected: ['org_manager']

// Test new permission
const { canPerformActionInOrg } = useOptimizedAuth();
console.log(canPerformActionInOrg('org-a-id', 'manage_projects'));
// Expected: true (org_manager can manage projects)
```

### 3.6 Test Scenario 6: Remove Sara from Org A

```typescript
// Database: Remove role
DELETE FROM org_roles
WHERE user_id = 'sara-id' AND org_id = 'org-a-id';

// Frontend: Verify
const { orgRoles } = useOptimizedAuth();
console.log(orgRoles);
// Expected: [] (empty, no roles)

// Test permission (should fail)
const { canPerformActionInOrg } = useOptimizedAuth();
console.log(canPerformActionInOrg('org-a-id', 'manage_users'));
// Expected: false
```

---

## 🎯 Step 4: Real-World Usage Examples

### Example 1: Transaction Form (Check Permission)

```typescript
// src/components/Transactions/TransactionForm.tsx

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const TransactionForm: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { canPerformActionInOrg } = useOptimizedAuth();

  const canCreateTransaction = canPerformActionInOrg(
    orgId,
    'manage_transactions'
  );

  if (!canCreateTransaction) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">
          You don't have permission to create transactions in this organization.
        </p>
      </div>
    );
  }

  return (
    <form>
      {/* Form fields */}
      <input type="text" placeholder="Description" />
      <input type="number" placeholder="Amount" />
      <button type="submit">Create Transaction</button>
    </form>
  );
};
```

### Example 2: Admin Panel (Check Role)

```typescript
// src/components/admin/OrgAdminPanel.tsx

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const OrgAdminPanel: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { hasRoleInOrg } = useOptimizedAuth();

  const isOrgAdmin = hasRoleInOrg(orgId, 'org_admin');

  if (!isOrgAdmin) {
    return <div>You must be an organization admin to access this panel.</div>;
  }

  return (
    <div className="space-y-4">
      <h2>Organization Settings</h2>
      <button>Manage Users</button>
      <button>Manage Projects</button>
      <button>View Reports</button>
    </div>
  );
};
```

### Example 3: Project Settings (Check Project Role)

```typescript
// src/components/Projects/ProjectSettings.tsx

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const ProjectSettings: React.FC<{ projectId: string }> = ({
  projectId,
}) => {
  const { hasRoleInProject } = useOptimizedAuth();

  const isProjectManager = hasRoleInProject(projectId, 'project_manager');

  if (!isProjectManager) {
    return <div>Only project managers can edit settings.</div>;
  }

  return (
    <form>
      <input type="text" placeholder="Project Name" />
      <input type="text" placeholder="Description" />
      <button type="submit">Save Settings</button>
    </form>
  );
};
```

### Example 4: User Role Display

```typescript
// src/components/UserProfile/UserRoles.tsx

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const UserRoles: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { getUserRolesInOrg, orgRoles } = useOptimizedAuth();

  const roles = getUserRolesInOrg(orgId);
  const orgRole = orgRoles.find(r => r.org_id === orgId);

  return (
    <div className="space-y-2">
      <h3>Your Roles in This Organization</h3>
      <div className="space-y-1">
        {roles.map((role) => (
          <div key={role} className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              {role}
            </span>
            {orgRole?.can_access_all_projects && (
              <span className="text-xs text-gray-600">(All Projects)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Example 5: Assign User to Organization (UI)

```typescript
// src/components/admin/AssignUserToOrg.tsx

import { useState } from 'react';
import { scopedRolesService } from '@/services/scopedRolesService';

export const AssignUserToOrg: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [role, setRole] = useState('org_viewer');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    try {
      setLoading(true);
      await scopedRolesService.assignOrgRole({
        user_id: userId,
        org_id: orgId,
        role: role as any,
      });
      alert('User assigned successfully!');
      setUserId('');
      setOrgId('');
      setRole('org_viewer');
    } catch (error) {
      alert('Error assigning user: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded">
      <h3>Assign User to Organization</h3>
      
      <div>
        <label>User ID:</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter user ID"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label>Organization ID:</label>
        <input
          type="text"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="Enter org ID"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label>Role:</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="org_admin">Admin</option>
          <option value="org_manager">Manager</option>
          <option value="org_accountant">Accountant</option>
          <option value="org_auditor">Auditor</option>
          <option value="org_viewer">Viewer</option>
        </select>
      </div>

      <button
        onClick={handleAssign}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Assigning...' : 'Assign User'}
      </button>
    </div>
  );
};
```

---

## 📊 Step 5: Deployment Checklist

### Pre-Deployment
- [ ] Read all documentation
- [ ] Backup database
- [ ] Test in development
- [ ] Code review complete

### Database Deployment
- [ ] Phase 1 migration deployed
- [ ] Phase 2 migration deployed
- [ ] Phase 3 migration deployed
- [ ] Phase 4 migration deployed
- [ ] Verification queries pass
- [ ] Data migration complete

### Frontend Implementation
- [ ] Hook updated
- [ ] Service created
- [ ] Components created
- [ ] Integration complete
- [ ] No TypeScript errors
- [ ] All imports correct

### Testing
- [ ] Test assign org role
- [ ] Test assign project role
- [ ] Test permission checking
- [ ] Test role updates
- [ ] Test role removal
- [ ] Test with different users
- [ ] Test UI rendering
- [ ] No console errors

### Deployment
- [ ] Code review approved
- [ ] All tests passing
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Document any issues

---

## 🚀 Deployment Steps

### Step 1: Deploy Database
```bash
# Backup
pg_dump your_database > backup_$(date +%Y%m%d).sql

# Deploy migrations
supabase db push

# Verify
psql -c "SELECT COUNT(*) FROM org_roles;"
```

### Step 2: Implement Frontend
```bash
# Copy files
cp SCOPED_ROLES_PHASE_5_FRONTEND_PART1.md src/hooks/useOptimizedAuth.ts
cp SCOPED_ROLES_PHASE_5_FRONTEND_PART1.md src/services/scopedRolesService.ts
cp SCOPED_ROLES_PHASE_5_FRONTEND_PART2.md src/components/admin/

# Update imports
# Run tests
npm run test

# Build
npm run build
```

### Step 3: Deploy Frontend
```bash
# Commit
git add .
git commit -m "feat: implement scoped roles (Phase 5)"

# Push
git push origin main

# Deploy
# (Your deployment process)
```

---

## ✅ Success Criteria

### Database
- ✅ All 4 migrations deployed
- ✅ Tables created and populated
- ✅ RLS policies active
- ✅ Helper functions working
- ✅ Auth RPC updated

### Frontend
- ✅ Hook loads scoped roles
- ✅ Service methods work
- ✅ Components render
- ✅ Permission checking works
- ✅ Role assignment works

### Testing
- ✅ All 6 test scenarios pass
- ✅ No console errors
- ✅ UI updates correctly
- ✅ Permissions enforced

### Deployment
- ✅ Code reviewed
- ✅ Tests passing
- ✅ Staging tested
- ✅ Production deployed
- ✅ No issues

---

## 📞 Troubleshooting

### Issue: Permission Denied
**Solution:**
- Check user has correct role
- Verify RLS policies
- Check if super_admin

### Issue: Roles Not Loading
**Solution:**
- Verify RPC function updated
- Check data in database
- Check browser console

### Issue: Component Not Updating
**Solution:**
- Call loadUserRoles() after changes
- Check state updating
- Verify hook used

---

## 🎓 Summary

### What's Implemented
- ✅ Database schema (org_roles, project_roles, system_roles)
- ✅ RLS policies (secure access control)
- ✅ Helper functions (permission checking)
- ✅ Auth RPC function (return scoped roles)
- ✅ Frontend hook (load scoped roles)
- ✅ Role service (manage roles)
- ✅ UI components (assign roles)
- ✅ Integration (with existing components)
- ✅ Real-world examples (5 scenarios)
- ✅ Testing guide (6 test cases)

### What's Ready
- ✅ All code ready to deploy
- ✅ All components ready to use
- ✅ All services ready to integrate
- ✅ All tests ready to run
- ✅ All documentation complete

### Timeline
- Database: 1-2 hours
- Frontend: 2-3 hours
- Testing: 1-2 hours
- **Total: 4-7 hours**

---

**Status:** ✅ END-TO-END COMPLETE  
**Ready to Deploy:** YES  
**Estimated Time:** 4-7 hours

**Start Now:** Follow Step 1 - Database Deployment!

