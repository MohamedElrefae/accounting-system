# Phase 7: Scoped Roles UI Implementation Plan

**Status**: Ready for Implementation  
**Date**: January 27, 2026  
**Objective**: Update and enhance admin components to fully support scoped roles management (org-level and project-level role assignment)

---

## Executive Summary

Phase 7 focuses on updating existing admin components to leverage the scoped roles system implemented in Phase 6. The current components (`EnterpriseRoleManagement.tsx`, `EnterpriseUserManagement.tsx`) manage global roles, but need enhancement to support:

1. **Organization-level role assignment** (org_admin, org_manager, org_accountant, org_auditor, org_viewer)
2. **Project-level role assignment** (project_manager, project_contributor, project_viewer)
3. **System-level role assignment** (super_admin, system_auditor)
4. **Scoped role dashboard** for admins to manage all three levels

---

## Current State Analysis

### Existing Components

#### 1. **EnterpriseRoleManagement.tsx** (1409 lines)
- **Purpose**: Manages global roles with permissions
- **Features**:
  - Create/edit/delete roles
  - Assign permissions to roles
  - View roles in cards, table, or comparison mode
  - Search, sort, and filter roles
  - Export role data
  - Duplicate roles
  - Permission audit logging
- **Limitations**:
  - Only manages global `roles` table
  - Does not handle scoped roles (org_roles, project_roles, system_roles)
  - No org/project context awareness

#### 2. **EnterpriseUserManagement.tsx** (1478 lines)
- **Purpose**: Manages users and their role assignments
- **Features**:
  - Create/edit/delete users
  - Assign global roles to users
  - View users in cards, table, or analytics mode
  - Search, sort, and filter users
  - Export user data
  - Invite new users
  - User status management (active/inactive)
- **Limitations**:
  - Only assigns global roles
  - Has a "scoped-roles" view mode but it's not fully implemented
  - References `ScopedRoleAssignment`, `OrgRoleAssignment`, `ProjectRoleAssignment` components but doesn't integrate them properly

#### 3. **ScopedRoleAssignment.tsx** (Basic implementation)
- **Purpose**: Assign org and project roles to a specific user
- **Features**:
  - Load user's current org and project roles
  - Add/update/remove org roles
  - Add/update/remove project roles
  - Display role summary
- **Limitations**:
  - Basic HTML/CSS styling (not MUI)
  - No integration with `useOptimizedAuth` hook
  - Limited error handling
  - No audit logging

#### 4. **OrgRoleAssignment.tsx** (Basic implementation)
- **Purpose**: Manage users in an organization
- **Features**:
  - List users with their org roles
  - Add users to organization
  - Update user roles
  - Remove users from organization
- **Limitations**:
  - Basic HTML/CSS styling
  - No MUI components
  - Limited to org level only

#### 5. **ProjectRoleAssignment.tsx** (Basic implementation)
- **Purpose**: Manage users in a project
- **Features**:
  - List users with their project roles
  - Add users to project
  - Update user roles
  - Remove users from project
- **Limitations**:
  - Basic HTML/CSS styling
  - No MUI components
  - Limited to project level only

#### 6. **scopedRolesService.ts** (Complete)
- **Purpose**: API service for scoped roles operations
- **Features**:
  - Org role management (assign, update, remove, get)
  - Project role management (assign, update, remove, get)
  - System role management (assign, remove, get)
- **Status**: Ready to use

---

## Phase 7 Implementation Tasks

### Task 7.1: Enhance ScopedRoleAssignment Component

**Objective**: Convert to MUI-based component with full scoped roles management

**Changes**:
1. Replace basic HTML with MUI components (Card, Table, Dialog, etc.)
2. Integrate `useOptimizedAuth` hook for permission checking
3. Add audit logging for role changes
4. Improve error handling and loading states
5. Add tabs for org roles vs project roles
6. Add role filtering and search
7. Add bulk operations (assign multiple users to org/project)

**File**: `src/components/admin/ScopedRoleAssignment.tsx`

**Key Features**:
```typescript
- Tabs: "Organization Roles" | "Project Roles" | "System Roles"
- For each tab:
  - Current roles table with edit/delete actions
  - Add new role dialog
  - Bulk operations
  - Audit trail
- Permission checks using useOptimizedAuth
- Loading and error states
- Responsive design
```

---

### Task 7.2: Enhance OrgRoleAssignment Component

**Objective**: Convert to MUI-based component with advanced org role management

**Changes**:
1. Replace basic HTML with MUI components
2. Add advanced filtering (by role, by project access)
3. Add bulk user assignment
4. Add role templates
5. Add permission matrix visualization
6. Add audit logging
7. Integrate with `useOptimizedAuth` for permission checks

**File**: `src/components/admin/OrgRoleAssignment.tsx`

**Key Features**:
```typescript
- Organization selector
- Users table with:
  - Role dropdown
  - "Can Access All Projects" toggle
  - Edit/delete actions
  - Bulk select
- Add user dialog with:
  - User search/select
  - Role selection
  - Project access options
- Permission matrix showing what each role can do
- Audit trail
```

---

### Task 7.3: Enhance ProjectRoleAssignment Component

**Objective**: Convert to MUI-based component with advanced project role management

**Changes**:
1. Replace basic HTML with MUI components
2. Add project selector
3. Add advanced filtering
4. Add bulk user assignment
5. Add role templates
6. Add permission matrix visualization
7. Add audit logging

**File**: `src/components/admin/ProjectRoleAssignment.tsx`

**Key Features**:
```typescript
- Project selector with org filter
- Users table with:
  - Role dropdown
  - Edit/delete actions
  - Bulk select
- Add user dialog with:
  - User search/select
  - Role selection
- Permission matrix
- Audit trail
```

---

### Task 7.4: Update EnterpriseUserManagement Component

**Objective**: Fully implement the "scoped-roles" view mode

**Changes**:
1. Implement the "scoped-roles" tab properly
2. Add sub-tabs for:
   - User scoped roles (ScopedRoleAssignment)
   - Organization roles (OrgRoleAssignment)
   - Project roles (ProjectRoleAssignment)
3. Add org/project selectors
4. Add user selector for viewing specific user's roles
5. Integrate with `useOptimizedAuth` for permission checks
6. Add audit logging

**File**: `src/pages/admin/EnterpriseUserManagement.tsx`

**Key Features**:
```typescript
- Main tabs: "Users" | "Scoped Roles"
- Scoped Roles tab with sub-tabs:
  - "User Roles": Select user → show their org/project roles
  - "Organization Roles": Select org → manage users in org
  - "Project Roles": Select project → manage users in project
- Each sub-tab has its own component
- Org/project selectors
- User selector
- Audit trail
```

---

### Task 7.5: Create Scoped Roles Dashboard Component

**Objective**: Create a new admin dashboard for managing all scoped roles

**File**: `src/pages/admin/ScopedRolesDashboard.tsx`

**Features**:
```typescript
- Overview cards:
  - Total organizations
  - Total projects
  - Users with org roles
  - Users with project roles
  - Users with system roles
- Quick actions:
  - Assign user to org
  - Assign user to project
  - Assign system role
- Recent activity (audit trail)
- Role distribution charts
- Permission matrix visualization
- Bulk operations
```

---

### Task 7.6: Create Role Templates Component

**Objective**: Create reusable role templates for quick assignment

**File**: `src/components/admin/RoleTemplates.tsx`

**Features**:
```typescript
- Predefined templates:
  - "Finance Team": org_accountant + project_contributor
  - "Management": org_manager + project_manager
  - "Audit": org_auditor + project_viewer
  - "Viewer": org_viewer + project_viewer
- Custom templates
- Apply template to user
- Edit/delete templates
```

---

### Task 7.7: Create Permission Matrix Component

**Objective**: Visualize what each role can do

**File**: `src/components/admin/PermissionMatrix.tsx`

**Features**:
```typescript
- Org roles vs permissions matrix
- Project roles vs permissions matrix
- System roles vs permissions matrix
- Color-coded (can do / cannot do)
- Filterable by role or permission
- Exportable
```

---

### Task 7.8: Update useOptimizedAuth Hook

**Objective**: Ensure hook provides all necessary scoped role data

**File**: `src/hooks/useOptimizedAuth.ts`

**Verify**:
- ✅ `orgRoles` array with org_id, role, can_access_all_projects
- ✅ `projectRoles` array with project_id, role
- ✅ `systemRoles` array with role
- ✅ Helper methods:
  - `hasRoleInOrg(orgId, role)`
  - `hasRoleInProject(projectId, role)`
  - `canPerformActionInOrg(orgId, action)`
  - `canPerformActionInProject(projectId, action)`
  - `getUserRolesInOrg(orgId)`
  - `getUserRolesInProject(projectId)`
  - `hasSystemRole(role)`

---

## Implementation Order

1. **Task 7.1**: Enhance ScopedRoleAssignment (foundation)
2. **Task 7.2**: Enhance OrgRoleAssignment
3. **Task 7.3**: Enhance ProjectRoleAssignment
4. **Task 7.4**: Update EnterpriseUserManagement
5. **Task 7.5**: Create ScopedRolesDashboard
6. **Task 7.6**: Create RoleTemplates
7. **Task 7.7**: Create PermissionMatrix
8. **Task 7.8**: Verify useOptimizedAuth

---

## Key Design Principles

1. **Consistency**: All components use MUI for consistent styling
2. **Accessibility**: RTL support, Arabic labels, keyboard navigation
3. **Audit Trail**: All role changes are logged
4. **Permission Checks**: Use `useOptimizedAuth` to verify user can perform actions
5. **Error Handling**: Graceful error messages and recovery
6. **Performance**: Efficient data loading and caching
7. **Responsiveness**: Mobile-friendly design

---

## Database Tables Used

- `org_roles` - Organization-level role assignments
- `project_roles` - Project-level role assignments
- `system_roles` - System-level role assignments
- `organizations` - Organization data
- `projects` - Project data
- `user_profiles` - User data
- `permission_audit_logs` - Audit trail

---

## API Endpoints (via scopedRolesService)

- `assignOrgRole(assignment)` - Assign org role
- `updateOrgRole(userId, orgId, role, canAccessAllProjects)` - Update org role
- `removeOrgRole(userId, orgId)` - Remove org role
- `getOrgRoles(orgId)` - Get org roles
- `assignProjectRole(assignment)` - Assign project role
- `updateProjectRole(userId, projectId, role)` - Update project role
- `removeProjectRole(userId, projectId)` - Remove project role
- `getProjectRoles(projectId)` - Get project roles
- `assignSystemRole(assignment)` - Assign system role
- `removeSystemRole(userId, role)` - Remove system role
- `getSystemRoles()` - Get system roles

---

## Testing Checklist

- [ ] Can assign org roles to users
- [ ] Can update org roles
- [ ] Can remove org roles
- [ ] Can assign project roles to users
- [ ] Can update project roles
- [ ] Can remove project roles
- [ ] Can assign system roles
- [ ] Can remove system roles
- [ ] Audit logging works for all operations
- [ ] Permission checks prevent unauthorized actions
- [ ] RTL/Arabic labels display correctly
- [ ] Mobile responsive design works
- [ ] Error handling works gracefully
- [ ] Loading states display correctly
- [ ] Bulk operations work
- [ ] Role templates work
- [ ] Permission matrix displays correctly

---

## Deployment Checklist

- [ ] All components updated and tested
- [ ] No console errors or warnings
- [ ] Audit logging working
- [ ] Permission checks working
- [ ] Database migrations applied (if any)
- [ ] RLS policies updated (if needed)
- [ ] Documentation updated
- [ ] User guide created
- [ ] Admin training materials prepared

---

## Next Steps

1. Start with Task 7.1 (ScopedRoleAssignment enhancement)
2. Test each component thoroughly
3. Integrate into EnterpriseUserManagement
4. Create dashboard and supporting components
5. Perform end-to-end testing
6. Deploy to production

---

## Notes

- The RLS infinite recursion issue from Phase 6 must be deployed first
- Browser cache must be cleared after deployment
- All components should use `useOptimizedAuth` for permission checks
- Audit logging should be enabled for all role changes
- Consider adding role templates for common scenarios
- Consider adding bulk operations for efficiency
