# Access Hierarchy Clarification - Complete Overview

## The Question
"We have two options for user to be assigned to projects:
1. `project_memberships` - Direct project assignment
2. `org_memberships` with `can_access_all_projects = true` - Org-level access

Which one overrides the other if both exist?"

## The Answer

### **`org_memberships.can_access_all_projects = true` OVERRIDES `project_memberships`**

When a user has `can_access_all_projects = true` in their org membership, they see **ALL projects in that organization**, regardless of what's in their `project_memberships` table.

## Access Priority Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ PRIORITY 1 (HIGHEST): org_memberships.can_access_all_projects
│
│ If TRUE → User sees ALL projects in organization
│           (project_memberships is IGNORED)
│
│ If FALSE → Continue to Priority 2
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PRIORITY 2 (LOWER): project_memberships
│
│ If has entries → User sees ONLY those projects
│ If empty → User sees NO projects
└─────────────────────────────────────────────────────────────┘
```

## Visual Comparison

### Scenario A: Both Exist (org-level access wins)
```
User: Alice
├─ org_memberships.can_access_all_projects = true ← PRIORITY 1
├─ project_memberships = [proj-001, proj-002]
│
Result: Alice sees ALL projects in org
├─ proj-001 ✅ (from org-level access)
├─ proj-002 ✅ (from org-level access)
├─ proj-003 ✅ (from org-level access - OVERRIDES no membership)
└─ proj-004 ✅ (from org-level access - OVERRIDES no membership)

Why: org_memberships.can_access_all_projects = true OVERRIDES project_memberships
```

### Scenario B: Only Project-Level Access
```
User: Bob
├─ org_memberships.can_access_all_projects = false ← PRIORITY 1
├─ project_memberships = [proj-001, proj-002] ← PRIORITY 2
│
Result: Bob sees ONLY proj-001 and proj-002
├─ proj-001 ✅ (has project_membership)
├─ proj-002 ✅ (has project_membership)
├─ proj-003 ❌ (no project_membership)
└─ proj-004 ❌ (no project_membership)

Why: org-level access is false, so project_memberships is used
```

### Scenario C: No Access at Either Level
```
User: Carol
├─ org_memberships.can_access_all_projects = false ← PRIORITY 1
├─ project_memberships = [] (empty) ← PRIORITY 2
│
Result: Carol sees NO projects
├─ proj-001 ❌ (no project_membership)
├─ proj-002 ❌ (no project_membership)
├─ proj-003 ❌ (no project_membership)
└─ proj-004 ❌ (no project_membership)

UI: Dropdown disabled, error message shown
Why: Both levels deny access
```

## SQL Implementation

### The Decision Logic
```sql
-- Check PRIORITY 1: Org-level access
IF org_memberships.can_access_all_projects = true THEN
  -- OVERRIDE: Show all projects
  RETURN ALL projects WHERE org_id = ? AND status = 'active'
END IF

-- Check PRIORITY 2: Project-level access
IF org_memberships.can_access_all_projects = false THEN
  -- RESTRICTED: Show only assigned projects
  RETURN projects WHERE 
    org_id = ? 
    AND status = 'active'
    AND EXISTS (project_memberships for this user)
END IF
```

### The WHERE Clause
```sql
WHERE p.org_id = p_org_id
  AND p.status = 'active'
  AND (
    -- PRIORITY 1: Org-level access (OVERRIDES everything)
    (SELECT can_access_all_projects FROM user_org_access) = true
    OR
    -- PRIORITY 2: Project-level access (Only if Priority 1 is false)
    (
      (SELECT can_access_all_projects FROM user_org_access) = false
      AND EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id
          AND pm.user_id = auth.uid()
          AND pm.org_id = p_org_id
      )
    )
  )
```

## Real-World Examples

### Example 1: Admin User
```
Situation: Alice is an organization admin
├─ org_memberships.can_access_all_projects = true
├─ project_memberships = [] (empty - doesn't need explicit assignments)

Result: Alice sees ALL projects
Reason: Org-level access OVERRIDES empty project_memberships
Use Case: Admin needs to manage all projects without explicit assignment
```

### Example 2: Project Manager
```
Situation: Bob manages specific projects
├─ org_memberships.can_access_all_projects = false
├─ project_memberships = [
    { project_id: 'construction-2025', org_id: 'org-123' },
    { project_id: 'renovation-2025', org_id: 'org-123' }
  ]

Result: Bob sees ONLY construction-2025 and renovation-2025
Reason: Org-level access is false, so project_memberships is used
Use Case: PM has limited scope, sees only assigned projects
```

### Example 3: Contractor
```
Situation: Carol is a contractor with org-wide access
├─ org_memberships.can_access_all_projects = true
├─ project_memberships = [
    { project_id: 'construction-2025', org_id: 'org-123' }
  ]

Result: Carol sees ALL projects in organization
Reason: Org-level access OVERRIDES project_memberships
Use Case: Contractor granted org-wide access, can see all projects
```

### Example 4: New Employee
```
Situation: Dave just joined, not yet assigned to projects
├─ org_memberships.can_access_all_projects = false
├─ project_memberships = [] (empty)

Result: Dave sees NO projects
UI: Dropdown disabled, error message: "No projects assigned to you"
Reason: Both levels deny access
Use Case: New employee waiting for project assignment
```

## Implementation Checklist

### Database Setup
- [ ] `org_memberships` table has `can_access_all_projects` boolean column
- [ ] `project_memberships` table exists with user/project/org relationships
- [ ] Indexes created for performance:
  - `org_memberships(org_id, user_id)`
  - `project_memberships(project_id, user_id, org_id)`
  - `projects(org_id, status)`

### RPC Function
- [ ] `get_user_accessible_projects(org_id)` created with SECURITY DEFINER
- [ ] Function checks org-level access first (PRIORITY 1)
- [ ] Function falls back to project-level access (PRIORITY 2)
- [ ] Function returns only active projects
- [ ] Function ordered by project code

### Component Integration
- [ ] ProjectSelector calls `get_user_accessible_projects()` RPC
- [ ] ProjectSelector disables dropdown when no projects available
- [ ] ProjectSelector shows error message in red
- [ ] ProjectSelector hides "All" option when no projects available

### Testing
- [ ] Test admin user (org-level access = true) sees all projects
- [ ] Test PM user (org-level access = false) sees only assigned projects
- [ ] Test new user (no access) sees error message
- [ ] Test contractor (org-level access = true) sees all projects
- [ ] Verify org-level access OVERRIDES project_memberships

## Key Takeaways

1. **Org-level access is the master switch**
   - `can_access_all_projects = true` grants access to ALL projects
   - `can_access_all_projects = false` restricts to project_memberships

2. **Project-level access is secondary**
   - Only used when org-level access is false
   - Ignored when org-level access is true

3. **The override is intentional**
   - Allows admins to grant org-wide access without managing individual project assignments
   - Simplifies access management for large organizations

4. **Both levels are needed**
   - Org-level: For admins and contractors with broad access
   - Project-level: For PMs and team members with limited scope

5. **Security is enforced at database level**
   - RPC function with SECURITY DEFINER
   - Cannot be bypassed from UI
   - Uses `auth.uid()` for user identification

## Related Files

- **RPC Function**: `supabase/migrations/20260126_phase_2_get_user_accessible_projects_v2.sql`
- **Component**: `src/components/Organizations/ProjectSelector.tsx`
- **Service**: `src/services/projects.ts`
- **SQL Logic Details**: `ACCESS_CONTROL_SQL_LOGIC.md`
- **Quick Reference**: `PROJECT_ACCESS_HIERARCHY_REFERENCE.md`
- **Security Summary**: `SECURITY_FIX_PROJECT_SELECTOR_SUMMARY.md`
