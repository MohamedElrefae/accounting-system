# Organization Membership - Project Access Control Implementation

## Overview
Added a checkbox to the organization member assignment form that allows administrators to control whether a user can access all projects in an organization or only specific projects they're explicitly assigned to.

## Changes Made

### 1. Database Migration - RPC Function Update
**File:** `supabase/migrations/20260126_add_can_access_all_projects_to_org_member_add.sql`

- Updated `org_member_add()` function to accept a new parameter: `p_can_access_all_projects`
- Default value is `true` (maintains backward compatibility)
- The function now inserts/updates the `can_access_all_projects` field in `org_memberships` table
- Uses `ON CONFLICT DO UPDATE` to handle both insert and update scenarios

### 2. Database Migration - List Function Update
**File:** `supabase/migrations/20260126_update_org_members_list_with_can_access_all_projects.sql`

- Updated `org_members_list()` function to return the `can_access_all_projects` field
- Returns `true` as default if the field is null (backward compatibility)
- Allows the UI to display the current access level for each member

### 3. TypeScript Service Updates
**File:** `src/services/org-memberships.ts`

Updated interfaces:
```typescript
export interface OrgMemberRecord {
  org_id: string;
  user_id: string;
  created_at?: string;
  can_access_all_projects?: boolean; // NEW
}

export interface OrgMemberWithUser {
  org_id: string;
  user_id: string;
  created_at?: string;
  can_access_all_projects?: boolean; // NEW
  user: { ... };
}
```

Updated functions:
- `addOrgMember()` - Now accepts `canAccessAllProjects` parameter (default: `true`)
- `listOrgMembers()` - Now returns the `can_access_all_projects` field from the database

### 4. UI Component Updates
**File:** `src/components/Organizations/OrgMembersManagement.tsx`

Added:
- New state variable: `canAccessAllProjects` (default: `true`)
- Checkbox in the add member dialog with label: "السماح بالوصول لجميع مشاريع المؤسسة"
- Help text that explains the implications of the setting
- New table column showing access level for each member
- Badge display showing "جميع المشاريع" (All Projects) or "مشاريع محددة" (Specific Projects)

### 5. CSS Styling
**File:** `src/components/Organizations/OrgMembersManagement.module.css`

Added styles for:
- `.checkboxLabel` - Styled checkbox container with hover effects
- `.checkbox` - Checkbox input styling
- `.helpText` - Explanatory text below the checkbox
- `.accessBadgeAll` - Green badge for "all projects" access
- `.accessBadgeSpecific` - Orange badge for "specific projects" access

## Database Schema Reference

The `org_memberships` table already has the `can_access_all_projects` column:

```sql
create table public.org_memberships (
  org_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  is_default boolean null default false,
  last_active_at timestamp with time zone null,
  can_access_all_projects boolean null default true,
  constraint org_memberships_pkey primary key (org_id, user_id),
  constraint org_memberships_user_id_user_profiles_fkey 
    foreign key (user_id) references user_profiles (id) on delete cascade
);
```

## How It Works

### Adding a Member
1. Admin opens the "Add Member" dialog
2. Searches for and selects a user
3. Checkbox is checked by default (can_access_all_projects = true)
4. Admin can uncheck to restrict access to specific projects only
5. On save, the value is passed to the RPC function
6. Database stores the preference in `org_memberships.can_access_all_projects`

### Viewing Members
1. The members list displays a badge for each user
2. Green badge "جميع المشاريع" = User can access all projects
3. Orange badge "مشاريع محددة" = User needs explicit project assignment

### Access Control Logic
- When `can_access_all_projects = true`: User automatically has access to all projects in the organization
- When `can_access_all_projects = false`: User only has access to projects they're explicitly added to via `project_memberships` table

## Testing Checklist

- [ ] Deploy both migration files to Supabase
- [ ] Test adding a new member with "all projects" access (checkbox checked)
- [ ] Test adding a new member with "specific projects" access (checkbox unchecked)
- [ ] Verify the badge displays correctly in the members list
- [ ] Verify existing members show the correct access level
- [ ] Test that project access is properly enforced based on this setting
- [ ] Verify backward compatibility (existing members default to "all projects")

## Deployment Steps

1. Run migrations in order:
   ```bash
   # First, update the list function
   psql -f supabase/migrations/20260126_update_org_members_list_with_can_access_all_projects.sql
   
   # Then, update the add function
   psql -f supabase/migrations/20260126_add_can_access_all_projects_to_org_member_add.sql
   ```

2. Deploy frontend changes (already done in the codebase)

3. Test the functionality in the UI

## Related Files
- Access control logic: `src/contexts/ScopeProvider.tsx` (line 87-88 has comments about this feature)
- Project access RPC: `supabase/migrations/20260126_phase_2_get_user_accessible_projects.sql`
- Project members manager: `src/components/Projects/ProjectMembersManager.tsx`

## Notes
- The default value of `true` ensures backward compatibility
- Existing members without this field set will be treated as having access to all projects
- This setting works in conjunction with the `get_user_accessible_projects()` RPC function
- The UI is fully RTL-compatible (Arabic interface)
