# Quick Fix - Project Memberships (5 minutes)

## Problem
Projects dropdown shows no projects because users aren't assigned to projects.

## Solution

### Step 1: Deploy Fixed Migration (1 min)
```bash
supabase db push --linked
```

This deploys the corrected `check_project_access()` function that checks `project_memberships` table.

### Step 2: Assign Yourself to Projects (2 min)
Run this in Supabase SQL Editor while logged in:

```sql
INSERT INTO project_memberships (
  project_id, user_id, org_id, role,
  can_create, can_edit, can_delete, can_approve, is_default
)
SELECT 
  p.id, auth.uid(), p.organization_id, 'admin',
  true, true, true, true, true
FROM projects p
WHERE p.organization_id IN (
  SELECT om.organization_id FROM org_memberships om 
  WHERE om.user_id = auth.uid()
)
ON CONFLICT (project_id, user_id) DO NOTHING;
```

### Step 3: Verify (1 min)
```sql
-- Check your memberships
SELECT pm.*, p.code 
FROM project_memberships pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id = auth.uid();
```

Should show all your projects.

### Step 4: Test in App (1 min)
1. Refresh browser
2. Select organization
3. Projects dropdown should now show projects
4. Select a project
5. Should work without errors

## Files Changed
- ✅ `supabase/migrations/20260126_phase_2_missing_getter_functions_fixed.sql` - Fixed RPC
- ✅ `src/services/projectMemberships.ts` - New service for managing memberships
- ✅ `src/components/Projects/ProjectMembersManager.tsx` - UI component
- ✅ `src/components/Projects/ProjectMembersManager.css` - Styling
- ✅ `sql/seed_project_memberships.sql` - Seed script

## Done! 🎉

Projects should now load in the dropdown. Use `ProjectMembersManager` component to add/remove users from projects.

