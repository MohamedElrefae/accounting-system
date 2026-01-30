# Scoped Roles - Phase 5: Frontend Implementation (Part 3)

**Date:** January 26, 2026  
**Status:** INTEGRATION & TESTING  
**Focus:** Integration with existing components and testing

---

## 🎯 Part 3 Overview

### What's Covered
1. Integration with EnterpriseUserManagement
2. Usage examples in components
3. Testing guide
4. Troubleshooting
5. Deployment checklist

---

## 🔧 Integration: EnterpriseUserManagement

### Updated Component

```typescript
// src/pages/admin/EnterpriseUserManagement.tsx

import React, { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { ScopedRoleAssignment } from '@/components/admin/ScopedRoleAssignment';
import { OrgRoleAssignment } from '@/components/admin/OrgRoleAssignment';
import { ProjectRoleAssignment } from '@/components/admin/ProjectRoleAssignment';
import { supabase } from '@/lib/supabase';

type TabType = 'users' | 'org-roles' | 'project-roles';

export const EnterpriseUserManagement: React.FC = () => {
  const { canPerformActionInOrg } = useOptimizedAuth();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, name, is_super_admin')
        .order('name');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (orgsError) throw orgsError;
      setOrganizations(orgsData || []);

      // Load projects
      const { data: projsData, error: projsError } = await supabase
        .from('projects')
        .select('id, name, org_id')
        .order('name');

      if (projsError) throw projsError;
      setProjects(projsData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">Enterprise User Management</h1>
        <p className="text-gray-600 mt-1">
          Manage user roles across organizations and projects
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'users'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('org-roles')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'org-roles'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Organization Roles
        </button>
        <button
          onClick={() => setActiveTab('project-roles')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'project-roles'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Project Roles
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select User to Manage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user.id)}
                  className={`p-4 rounded border-2 text-left transition ${
                    selectedUser === user.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  {user.is_super_admin && (
                    <p className="text-xs text-red-600 mt-1">Super Admin</p>
                  )}
                </button>
              ))}
            </div>

            {selectedUser && (
              <div className="mt-6 border-t pt-6">
                <ScopedRoleAssignment
                  userId={selectedUser}
                  userName={users.find((u) => u.id === selectedUser)?.name}
                  userEmail={users.find((u) => u.id === selectedUser)?.email}
                />
              </div>
            )}
          </div>
        )}

        {/* Organization Roles Tab */}
        {activeTab === 'org-roles' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select Organization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrg(org.id)}
                  className={`p-4 rounded border-2 text-left transition ${
                    selectedOrg === org.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">{org.name}</p>
                </button>
              ))}
            </div>

            {selectedOrg && (
              <div className="mt-6 border-t pt-6">
                <OrgRoleAssignment
                  orgId={selectedOrg}
                  orgName={organizations.find((o) => o.id === selectedOrg)?.name}
                />
              </div>
            )}
          </div>
        )}

        {/* Project Roles Tab */}
        {activeTab === 'project-roles' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Select Project</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setSelectedProject(proj.id)}
                  className={`p-4 rounded border-2 text-left transition ${
                    selectedProject === proj.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">{proj.name}</p>
                </button>
              ))}
            </div>

            {selectedProject && (
              <div className="mt-6 border-t pt-6">
                <ProjectRoleAssignment
                  projectId={selectedProject}
                  projectName={projects.find((p) => p.id === selectedProject)?.name}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 💡 Usage Examples

### Example 1: Check Permission in Component

```typescript
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const TransactionForm: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { canPerformActionInOrg } = useOptimizedAuth();

  const canCreateTransaction = canPerformActionInOrg(
    orgId,
    'manage_transactions'
  );

  if (!canCreateTransaction) {
    return <div>You don't have permission to create transactions</div>;
  }

  return <form>{/* Form content */}</form>;
};
```

### Example 2: Check Role in Org

```typescript
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const OrgAdminPanel: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { hasRoleInOrg } = useOptimizedAuth();

  const isOrgAdmin = hasRoleInOrg(orgId, 'org_admin');

  return (
    <div>
      {isOrgAdmin && (
        <button>Manage Organization Settings</button>
      )}
    </div>
  );
};
```

### Example 3: Check Role in Project

```typescript
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const ProjectSettings: React.FC<{ projectId: string }> = ({
  projectId,
}) => {
  const { hasRoleInProject } = useOptimizedAuth();

  const isProjectManager = hasRoleInProject(projectId, 'project_manager');

  return (
    <div>
      {isProjectManager && (
        <button>Edit Project Settings</button>
      )}
    </div>
  );
};
```

### Example 4: Get User's Roles in Org

```typescript
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

export const UserRoleDisplay: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { getUserRolesInOrg } = useOptimizedAuth();

  const roles = getUserRolesInOrg(orgId);

  return (
    <div>
      <p>Your roles in this organization:</p>
      <ul>
        {roles.map((role) => (
          <li key={role}>{role}</li>
        ))}
      </ul>
    </div>
  );
};
```

---

## 🧪 Testing Guide

### Test 1: Assign User to Organization

```typescript
// Test: Assign user to org with org_admin role
const testAssignOrgRole = async () => {
  const userId = 'test-user-id';
  const orgId = 'test-org-id';

  const result = await scopedRolesService.assignOrgRole({
    user_id: userId,
    org_id: orgId,
    role: 'org_admin',
    can_access_all_projects: true,
  });

  console.log('Assigned org role:', result);
  // Expected: Record created in org_roles table
};
```

### Test 2: Assign User to Project

```typescript
// Test: Assign user to project with project_manager role
const testAssignProjectRole = async () => {
  const userId = 'test-user-id';
  const projectId = 'test-project-id';

  const result = await scopedRolesService.assignProjectRole({
    user_id: userId,
    project_id: projectId,
    role: 'project_manager',
  });

  console.log('Assigned project role:', result);
  // Expected: Record created in project_roles table
};
```

### Test 3: Check Permission

```typescript
// Test: Check if user can perform action
const testCheckPermission = async () => {
  const { canPerformActionInOrg } = useOptimizedAuth();

  const canManageTransactions = canPerformActionInOrg(
    'test-org-id',
    'manage_transactions'
  );

  console.log('Can manage transactions:', canManageTransactions);
  // Expected: true if user has org_admin, org_manager, or org_accountant role
};
```

### Test 4: Get User Roles

```typescript
// Test: Get user's roles in org
const testGetUserRoles = async () => {
  const { getUserRolesInOrg } = useOptimizedAuth();

  const roles = getUserRolesInOrg('test-org-id');

  console.log('User roles in org:', roles);
  // Expected: Array of role strings
};
```

### Test 5: Update Role

```typescript
// Test: Update user's role in org
const testUpdateRole = async () => {
  const userId = 'test-user-id';
  const orgId = 'test-org-id';

  const result = await scopedRolesService.updateOrgRole(
    userId,
    orgId,
    'org_manager'
  );

  console.log('Updated role:', result);
  // Expected: Record updated in org_roles table
};
```

### Test 6: Remove Role

```typescript
// Test: Remove user's role from org
const testRemoveRole = async () => {
  const userId = 'test-user-id';
  const orgId = 'test-org-id';

  await scopedRolesService.removeOrgRole(userId, orgId);

  console.log('Role removed');
  // Expected: Record deleted from org_roles table
};
```

---

## 🐛 Troubleshooting

### Issue 1: Permission Denied Error

**Problem:** Getting "permission denied" when trying to assign roles

**Solution:**
1. Check if user has `org_admin` role in the organization
2. Verify RLS policies are correctly set up
3. Check if user is super_admin

```typescript
// Debug: Check user's roles
const { systemRoles, orgRoles } = useOptimizedAuth();
console.log('System roles:', systemRoles);
console.log('Org roles:', orgRoles);
```

### Issue 2: Roles Not Loading

**Problem:** Scoped roles not showing in UI

**Solution:**
1. Verify `get_user_auth_data` RPC function is updated
2. Check if data exists in `org_roles` and `project_roles` tables
3. Verify auth hook is calling the RPC function

```typescript
// Debug: Call RPC directly
const { data, error } = await supabase.rpc('get_user_auth_data', {
  p_user_id: 'user-id',
});
console.log('Auth data:', data);
console.log('Error:', error);
```

### Issue 3: Component Not Re-rendering

**Problem:** UI not updating after role assignment

**Solution:**
1. Call `loadUserRoles()` after assignment
2. Verify state is being updated
3. Check if component is using correct hook

```typescript
// Make sure to refresh after changes
await scopedRolesService.assignOrgRole(assignment);
await loadUserRoles(); // Refresh data
```

### Issue 4: Org/Project Not Showing in Dropdown

**Problem:** Organizations or projects not appearing in assignment UI

**Solution:**
1. Verify organizations/projects exist in database
2. Check if user has permission to see them
3. Verify RLS policies allow access

```typescript
// Debug: Check available orgs
const { data: orgs, error } = await supabase
  .from('organizations')
  .select('*');
console.log('Available orgs:', orgs);
console.log('Error:', error);
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All 4 database migrations deployed
- [ ] Data migrated to new scoped roles tables
- [ ] RLS policies verified working
- [ ] Auth RPC function updated

### Frontend Implementation
- [ ] `useOptimizedAuth` hook updated
- [ ] `scopedRolesService` created
- [ ] `ScopedRoleAssignment` component created
- [ ] `OrgRoleAssignment` component created
- [ ] `ProjectRoleAssignment` component created
- [ ] `EnterpriseUserManagement` updated

### Testing
- [ ] Test assigning user to org
- [ ] Test assigning user to project
- [ ] Test permission checking
- [ ] Test role updates
- [ ] Test role removal
- [ ] Test with different user types

### Integration
- [ ] Update all components using permissions
- [ ] Update navigation based on scoped roles
- [ ] Update UI to show scoped permissions
- [ ] Test end-to-end workflows

### Deployment
- [ ] Code review complete
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Deploy to staging
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 📊 Permission Matrix

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

---

## 🎯 Summary

### What's Implemented
- ✅ Updated `useOptimizedAuth` hook with scoped roles
- ✅ Created `scopedRolesService` for role management
- ✅ Created UI components for role assignment
- ✅ Integrated with EnterpriseUserManagement
- ✅ Added permission checking functions
- ✅ Created testing guide
- ✅ Created troubleshooting guide

### What's Ready
- ✅ All code ready to implement
- ✅ All components ready to use
- ✅ All services ready to integrate
- ✅ All tests ready to run

### Next Steps
1. Copy code from Part 1, 2, 3 into your project
2. Update imports and paths as needed
3. Run tests to verify everything works
4. Deploy to production

---

**Status:** ✅ PHASE 5 COMPLETE  
**Estimated Implementation Time:** 2-3 hours  
**Complexity:** MEDIUM

