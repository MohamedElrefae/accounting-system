# Phase 2 Task 2.2: Corrected Action Plan
## Create Missing Functions & Project Access Validation

**Status**: 🚀 READY TO EXECUTE  
**Duration**: 1-2 hours  
**Date**: January 26, 2026

---

## What You Need to Do

Your system already has a working role/permission system. Task 2.2 needs to:

1. ✅ Create 4 missing getter functions
2. ✅ Add project access validation
3. ✅ Update ScopeProvider to filter projects by access

---

## Step 1: Create Database Migration (20 min)

**File to Create**: `supabase/migrations/20260126_phase_2_missing_getter_functions.sql`

**Copy this SQL**:

```sql
-- Phase 2 Task 2.2: Missing Getter Functions and Project Access Validation

-- 1. CREATE get_user_roles() FUNCTION
CREATE OR REPLACE FUNCTION get_user_roles(
  p_user_id uuid,
  p_org_id uuid
)
RETURNS TABLE(role_id int, role_name text, description text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.name,
    r.description
  FROM roles r
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION get_user_roles(uuid, uuid) TO authenticated;

-- 2. CREATE get_role_permissions() FUNCTION
CREATE OR REPLACE FUNCTION get_role_permissions(
  p_role_id int,
  p_org_id uuid
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.resource,
    p.action
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  WHERE rp.role_id = p_role_id
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_role_permissions(int, uuid) TO authenticated;

-- 3. CREATE get_user_permissions_filtered() FUNCTION
CREATE OR REPLACE FUNCTION get_user_permissions_filtered(
  p_org_id uuid
)
RETURNS TABLE(permission_id int, permission_name text, resource text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.name,
    p.resource,
    p.action
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN roles r ON rp.role_id = r.id
  INNER JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
  ORDER BY p.resource, p.action;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions_filtered(uuid) TO authenticated;

-- 4. CREATE check_project_access() FUNCTION
CREATE OR REPLACE FUNCTION check_project_access(
  p_project_id uuid,
  p_org_id uuid
)
RETURNS TABLE(has_access boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_project_exists boolean;
  v_user_has_permission boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND organization_id = p_org_id
  ) INTO v_project_exists;
  
  IF NOT v_project_exists THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id
    AND ur.organization_id = p_org_id
    AND ur.is_active = TRUE
    AND (
      r.name = 'super_admin'
      OR EXISTS(
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ur.role_id
        AND p.resource = 'project'
        AND p.action = 'view'
      )
    )
  ) INTO v_user_has_permission;
  
  RETURN QUERY SELECT v_user_has_permission;
END;
$$;

GRANT EXECUTE ON FUNCTION check_project_access(uuid, uuid) TO authenticated;
```

**Then**:
1. Deploy to Supabase using CLI or dashboard
2. Verify functions exist

---

## Step 2: Create Service Function (15 min)

**File to Modify**: `src/services/projects.ts`

**Add this function**:

```typescript
/**
 * Validate if current user has access to a project
 */
export async function validateProjectAccess(
  projectId: string,
  orgId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('check_project_access', {
        p_project_id: projectId,
        p_org_id: orgId,
      });
    
    if (error) {
      console.error('Error checking project access:', error);
      return false;
    }
    
    return data?.[0]?.has_access ?? false;
  } catch (err) {
    console.error('Failed to validate project access:', err);
    return false;
  }
}
```

---

## Step 3: Update ScopeProvider (30 min)

**File to Modify**: `src/contexts/ScopeProvider.tsx`

**Update `loadProjectsForOrg()` function**:

Replace the existing function with:

```typescript
const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
  if (import.meta.env.DEV) console.log('[ScopeProvider] Loading projects for org:', orgId, { retryCount });
  setIsLoadingProjects(true);
  
  try {
    // 1. Load all projects for org
    const allProjects = await getActiveProjectsByOrg(orgId);
    if (import.meta.env.DEV) console.log('[ScopeProvider] Loaded projects:', allProjects.length);
    
    // 2. Filter to only projects user has access to
    const accessibleProjects = await Promise.all(
      allProjects.map(async (project) => {
        try {
          const hasAccess = await validateProjectAccess(project.id, orgId);
          return hasAccess ? project : null;
        } catch (err) {
          console.error(`Failed to validate access for project ${project.id}:`, err);
          return null;
        }
      })
    );
    
    const filteredProjects = accessibleProjects.filter(
      (p): p is Project => p !== null
    );
    
    if (!mountedRef.current) return filteredProjects;
    
    setAvailableProjects(filteredProjects);
    
    // 3. Restore project from localStorage if still valid
    const storedProjectId = getStoredProjectId();
    const matchingProject = filteredProjects.find(p => p.id === storedProjectId);
    
    if (matchingProject) {
      if (import.meta.env.DEV) console.log('[ScopeProvider] Restored project from storage:', matchingProject.code);
      setCurrentProject(matchingProject);
    } else {
      setCurrentProject(null);
      setStoredProjectId(null);
    }
    
    return filteredProjects;
  } catch (err) {
    console.error('[ScopeProvider] Failed to load projects:', err);
    
    if (retryCount < 2) {
      if (import.meta.env.DEV) console.log(`[ScopeProvider] Retrying projects load (${retryCount + 1}/3)`);
      setTimeout(() => loadProjectsForOrg(orgId, retryCount + 1), 1000 * (retryCount + 1));
      return [];
    }
    
    if (mountedRef.current) {
      setAvailableProjects([]);
      setCurrentProject(null);
    }
    return [];
  } finally {
    if (mountedRef.current) {
      setIsLoadingProjects(false);
    }
  }
}, []);
```

**Update `setProject()` function**:

Replace the existing function with:

```typescript
const setProject = useCallback(async (projectId: string | null) => {
  if (import.meta.env.DEV) console.log('[ScopeProvider] setProject:', projectId);
  
  if (!projectId) {
    setCurrentProject(null);
    setStoredProjectId(null);
    return;
  }
  
  // 1. Validate project belongs to current org
  const project = availableProjects.find(p => p.id === projectId);
  if (!project) {
    console.error('[ScopeProvider] Invalid project ID or project not in current org:', projectId);
    setError('Project not found');
    return;
  }
  
  // 2. Validate org is selected
  if (!currentOrg) {
    console.error('[ScopeProvider] No organization selected');
    setError('Organization required');
    return;
  }
  
  // 3. Validate user has access to project
  try {
    const hasAccess = await validateProjectAccess(projectId, currentOrg.id);
    if (!hasAccess) {
      console.error('[ScopeProvider] User does not have access to project:', projectId);
      setError('You do not have access to this project');
      return;
    }
  } catch (err) {
    console.error('[ScopeProvider] Failed to validate project access:', err);
    setError('Failed to validate project access');
    return;
  }
  
  // 4. Set project if validation passes
  setCurrentProject(project);
  setStoredProjectId(projectId);
  
  // Invalidate project-scoped queries
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.costCenters.byOrg(currentOrg.id, projectId) 
  });
  
  setLastUpdated(new Date());
}, [availableProjects, currentOrg, queryClient]);
```

**Add import**:

```typescript
import { getActiveProjectsByOrg, validateProjectAccess, type Project } from '../services/projects';
```

---

## Step 4: Test Implementation (15 min)

**Test 1**: Deploy migration
- Run migration in Supabase
- Verify 4 functions exist

**Test 2**: Test database functions
```sql
-- Test get_user_roles
SELECT * FROM get_user_roles('user-uuid'::uuid, 'org-uuid'::uuid);

-- Test check_project_access
SELECT * FROM check_project_access('project-uuid'::uuid, 'org-uuid'::uuid);
```

**Test 3**: Test in app
- Select org → Should show only accessible projects
- Try to select project without access → Should show error
- Change org → Should clear invalid projects

---

## Verification Checklist

- [ ] Migration file created
- [ ] 4 functions deployed to database
- [ ] `validateProjectAccess()` service function added
- [ ] `loadProjectsForOrg()` updated
- [ ] `setProject()` updated
- [ ] App builds without errors
- [ ] Projects filtered by access
- [ ] Error messages display correctly
- [ ] localStorage restoration validates access

---

## Files to Create/Modify

### Create
- `supabase/migrations/20260126_phase_2_missing_getter_functions.sql`

### Modify
- `src/services/projects.ts` - Add `validateProjectAccess()`
- `src/contexts/ScopeProvider.tsx` - Update `loadProjectsForOrg()` and `setProject()`

---

## Expected Outcome

✅ Users can only select projects they have permission to access  
✅ Project list is automatically filtered by permissions  
✅ Unauthorized access attempts show user-friendly errors  
✅ localStorage restoration validates access  

---

## Next Steps After Task 2.2

1. ✅ Task 2.1: Database foundation (COMPLETE)
2. ⏳ Task 2.2: Project access validation (IN PROGRESS)
3. ⏳ Task 2.3: Implement scope enforcement logic
4. ⏳ Task 2.4: Add error handling & user feedback
5. ⏳ Task 2.5: Test scope-based access control

---

**Ready to Execute**: YES ✅  
**Estimated Duration**: 1-2 hours  
**Estimated Completion**: January 27, 2026

