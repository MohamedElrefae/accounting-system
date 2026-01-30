# Project Access Hierarchy Reference

## Quick Decision Tree

```
User selects an organization
    ↓
Check org_memberships.can_access_all_projects
    ↓
    ├─ TRUE → User sees ALL projects in org
    │         (OVERRIDES project_memberships)
    │
    └─ FALSE → Check project_memberships
               ↓
               ├─ Has entries → User sees ONLY those projects
               └─ No entries → User sees NO projects (error message)
```

## Access Priority

| Level | Source | Priority | Override | Behavior |
|-------|--------|----------|----------|----------|
| **1** | `org_memberships.can_access_all_projects` | Highest | ✅ YES | Grants access to ALL org projects |
| **2** | `project_memberships` | Lower | ❌ NO | Grants access to specific projects only |

## Implementation in RPC

```sql
-- PRIORITY 1: Check org-level access (HIGHEST)
IF org_memberships.can_access_all_projects = true THEN
  RETURN ALL projects WHERE org_id = ? AND status = 'active'
END IF

-- PRIORITY 2: Check project-level access (LOWER)
IF org_memberships.can_access_all_projects = false THEN
  RETURN projects WHERE 
    org_id = ? 
    AND status = 'active'
    AND EXISTS (project_memberships for this user)
END IF
```

## Database Tables Involved

### org_memberships
```sql
CREATE TABLE org_memberships (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  can_access_all_projects boolean DEFAULT false,  -- ← KEY FIELD
  ...
)
```

### project_memberships
```sql
CREATE TABLE project_memberships (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  ...
)
```

### projects
```sql
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  code varchar NOT NULL,
  name varchar NOT NULL,
  status varchar DEFAULT 'active',  -- ← FILTERED
  ...
)
```

## User Scenarios

### Scenario A: Admin User (Full Org Access)
```
User: admin@company.com
org_memberships.can_access_all_projects = true
project_memberships = [] (empty)

Result: Sees ALL projects in organization
Reason: Org-level access OVERRIDES empty project_memberships
```

### Scenario B: Project Manager (Specific Projects)
```
User: pm@company.com
org_memberships.can_access_all_projects = false
project_memberships = [
  { project_id: 'proj-001', org_id: 'org-123' },
  { project_id: 'proj-002', org_id: 'org-123' }
]

Result: Sees ONLY proj-001 and proj-002
Reason: Restricted access, limited to explicit memberships
```

### Scenario C: New User (No Access)
```
User: newuser@company.com
org_memberships.can_access_all_projects = false
project_memberships = [] (empty)

Result: Sees NO projects
UI: Dropdown disabled, error message shown
Reason: No org-level access AND no project memberships
```

### Scenario D: Contractor (Org Access)
```
User: contractor@company.com
org_memberships.can_access_all_projects = true
project_memberships = [
  { project_id: 'proj-001', org_id: 'org-123' }
]

Result: Sees ALL projects in organization
Reason: Org-level access OVERRIDES project_memberships
```

## SQL Query Examples

### Get all projects for a user (using RPC)
```sql
SELECT * FROM get_user_accessible_projects('org-123'::uuid);
```

### Check if user has org-level access
```sql
SELECT can_access_all_projects 
FROM org_memberships 
WHERE org_id = 'org-123' 
  AND user_id = auth.uid();
```

### Check if user has project-level access
```sql
SELECT COUNT(*) 
FROM project_memberships 
WHERE project_id = 'proj-001' 
  AND user_id = auth.uid();
```

## Security Implications

### ✅ What's Protected
- Users with `can_access_all_projects = false` cannot see projects they're not assigned to
- Database-level enforcement prevents UI bypass
- RPC function runs with `SECURITY DEFINER` for trusted execution

### ✅ What's Allowed
- Org admins (with `can_access_all_projects = true`) can see all org projects
- Project managers see only their assigned projects
- Access is checked at database level, not just UI

### ⚠️ Important Notes
- `can_access_all_projects = true` is a powerful flag - use carefully
- Project memberships are ignored when org-level access is true
- Always verify access at database level, not just UI

## Deployment Checklist

- [ ] Migration `20260126_phase_2_get_user_accessible_projects_v2.sql` deployed
- [ ] RPC function `get_user_accessible_projects()` created
- [ ] ProjectSelector component updated to use RPC
- [ ] projects.ts service updated to call RPC
- [ ] Test users with different access levels
- [ ] Verify org admins see all projects
- [ ] Verify restricted users see only assigned projects
- [ ] Verify new users see error message

## Testing Commands

```sql
-- Test 1: Admin user (should see all projects)
SELECT * FROM get_user_accessible_projects('org-123'::uuid);
-- Expected: All active projects in org-123

-- Test 2: Restricted user (should see only assigned)
-- (Run as restricted user)
SELECT * FROM get_user_accessible_projects('org-123'::uuid);
-- Expected: Only projects with project_memberships

-- Test 3: New user (should see nothing)
-- (Run as new user with no memberships)
SELECT * FROM get_user_accessible_projects('org-123'::uuid);
-- Expected: Empty result set
```

## Related Documentation

- **Security Fix Summary**: `SECURITY_FIX_PROJECT_SELECTOR_SUMMARY.md`
- **RPC Function**: `supabase/migrations/20260126_phase_2_get_user_accessible_projects_v2.sql`
- **Component**: `src/components/Organizations/ProjectSelector.tsx`
- **Service**: `src/services/projects.ts`
