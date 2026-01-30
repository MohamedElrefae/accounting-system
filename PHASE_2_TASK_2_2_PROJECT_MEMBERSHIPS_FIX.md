# Phase 2 Task 2.2 - Project Memberships Fix

## 🔴 Issue Identified

The `check_project_access()` RPC function was returning 400 errors because:
1. It was checking `org_memberships` table instead of `project_memberships`
2. No users were assigned to projects via `project_memberships` table
3. The validation logic was incorrect

## ✅ Solution Implemented

### 1. Fixed RPC Function
**File**: `supabase/migrations/20260126_phase_2_missing_getter_functions_fixed.sql`

Updated `check_project_access()` to:
- Check `project_memberships` table instead of `org_memberships`
- Validate user has explicit project membership
- Return correct boolean result

```sql
-- Check if user has access to project via project_memberships
SELECT EXISTS(
  SELECT 1 FROM project_memberships pm
  WHERE pm.project_id = p_project_id
  AND pm.user_id = v_user_id
  AND pm.org_id = p_org_id
) INTO v_user_has_access;
```

### 2. Created Project Memberships Service
**File**: `src/services/projectMemberships.ts`

Functions for managing project memberships:
- `getProjectMemberships()` - Get all members of a project
- `getUserProjectMemberships()` - Get user's projects
- `addUserToProject()` - Add user to project
- `removeUserFromProject()` - Remove user from project
- `updateProjectMembership()` - Update member role/permissions
- `getProjectMembersWithDetails()` - Get members with user info
- `bulkAddUsersToProject()` - Add multiple users at once

### 3. Created UI Component
**File**: `src/components/Projects/ProjectMembersManager.tsx`

React component for managing project members:
- View current project members
- Add new members from organization
- Change member roles (admin/member/viewer)
- Remove members
- Bulk add users

**Styling**: `src/components/Projects/ProjectMembersManager.css`

### 4. Created Seed Script
**File**: `sql/seed_project_memberships.sql`

SQL script to:
- Assign current user to all their organization's projects
- Set role to 'admin' with full permissions
- Verify memberships were created

## 🚀 Implementation Steps

### Step 1: Deploy Migration
```bash
# Deploy the fixed RPC function
supabase db push --linked
```

### Step 2: Seed Test Data
```sql
-- Run in Supabase SQL Editor while logged in
-- This assigns you to all your organization's projects
INSERT INTO project_memberships (
  project_id,
  user_id,
  org_id,
  role,
  can_create,
  can_edit,
  can_delete,
  can_approve,
  is_default
)
SELECT 
  p.id,
  auth.uid(),
  p.organization_id,
  'admin',
  true,
  true,
  true,
  true,
  true
FROM projects p
WHERE p.organization_id IN (
  SELECT om.organization_id 
  FROM org_memberships om 
  WHERE om.user_id = auth.uid()
)
ON CONFLICT (project_id, user_id) DO NOTHING;
```

### Step 3: Integrate UI Component
Add to your project settings/admin page:

```tsx
import { ProjectMembersManager } from '../components/Projects/ProjectMembersManager'

export function ProjectSettings() {
  return (
    <ProjectMembersManager 
      projectId={projectId}
      orgId={orgId}
      onClose={() => {}}
    />
  )
}
```

### Step 4: Test
1. Deploy migration to Supabase
2. Run seed script to assign yourself to projects
3. Refresh app
4. Verify projects now appear in dropdown
5. Use ProjectMembersManager to add/remove members

## 📊 Architecture

```
User selects org
    ↓
ScopeProvider loads projects for org
    ↓
For each project, calls validateProjectAccess()
    ↓
validateProjectAccess() calls check_project_access() RPC
    ↓
check_project_access() checks project_memberships table
    ↓
Returns true if user has membership, false otherwise
    ↓
ScopeProvider filters projects to only accessible ones
    ↓
Projects dropdown shows only accessible projects
```

## 🔑 Key Points

1. **Project Access**: Managed via `project_memberships` table
2. **User Assignment**: Users must be explicitly added to projects
3. **Roles**: admin, member, viewer
4. **Permissions**: can_create, can_edit, can_delete, can_approve
5. **Default Project**: is_default flag for user's default project

## 📝 Database Schema

```sql
CREATE TABLE project_memberships (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  org_id uuid NOT NULL,
  role varchar(50) DEFAULT 'member',
  can_create boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  created_by uuid,
  UNIQUE(project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
)
```

## ✨ Next Steps

1. Deploy migration
2. Seed test data
3. Integrate ProjectMembersManager component
4. Test project access
5. Create admin UI for managing project members
6. Add audit logging for membership changes

## 🐛 Troubleshooting

**Projects still not showing?**
- Verify user has project_memberships entry
- Check RPC function exists: `SELECT * FROM check_project_access('project-id'::uuid, 'org-id'::uuid);`
- Check browser console for errors

**Can't add users?**
- Verify users exist in organization
- Check user_profiles table has entries
- Verify org_memberships exist for users

**Permission denied errors?**
- Check RLS policies on project_memberships table
- Verify user has authenticated role
- Check GRANT statements on RPC function

