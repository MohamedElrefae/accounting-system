# Phase 2 Task 2.2: Architecture-Corrected Implementation
## Create Missing Functions & Project Access Validation

**Status**: 🚀 READY TO EXECUTE  
**Duration**: 1-2 hours  
**Date**: January 26, 2026  
**Architecture**: Scope managed by ScopeContext (React), NOT database

---

## Architecture Clarification

**Key Decision**: Organization and project scope are managed by **ScopeContext in React state**, not stored in database.

**Implications**:
- ✅ `organization_id` does NOT exist in `user_roles` table
- ✅ `organization_id` does NOT exist in `roles` table
- ✅ Organization filtering happens via RLS policies (database level)
- ✅ Scope selection happens via ScopeContext (UI level)
- ✅ Functions don't need org parameters for role/permission queries

---

## What You Need to Do

Your system already has a working role/permission system. Task 2.2 needs to:

1. ✅ Create 4 missing getter functions (corrected for actual schema)
2. ✅ Add project access validation
3. ✅ Update ScopeProvider to filter projects by access

---

## Step 1: Deploy Database Migration (5 min)

**File**: `supabase/migrations/20260126_phase_2_missing_getter_functions_fixed.sql`

**What's Different**:
- `get_user_roles(p_user_id)` - No org parameter (org filtering via RLS)
- `get_role_permissions(p_role_id)` - No org parameter
- `get_user_permissions_filtered()` - No parameters (uses auth.uid())
- `check_project_access()` - Checks org_memberships table for org access

**Deploy Steps**:

1. **Option A: Supabase Dashboard**
   - Go to SQL Editor
   - Copy entire SQL from migration file
   - Run the query
   - Verify all 4 functions created

2. **Option B: Supabase CLI**
   ```bash
   supabase db push
   ```

---

## Step 2: Verify Deployment (5 min)

**Run this verification query**:

```sql
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'get_user_roles',
  'get_role_permissions',
  'get_user_permissions_filtered',
  'check_project_access'
)
ORDER BY p.proname;
```

**Expected Result**: 4 rows with all functions

---

## Step 3: Create Service Function (10 min)

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

## Step 4: Update ScopeProvider (20 min)

**File to Modify**: `src/contexts/ScopeProvider.tsx`

**Update `loadProjectsForOrg()` function**:

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

## Step 5: Test Implementation (15 min)

**Test 1**: Deploy migration
- Run migration in Supabase
- Verify 4 functions exist

**Test 2**: Test database functions
```sql
-- Test get_user_roles
SELECT * FROM get_user_roles('user-uuid'::uuid);

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
- `supabase/migrations/20260126_phase_2_missing_getter_functions_fixed.sql`

### Modify
- `src/services/projects.ts` - Add `validateProjectAccess()`
- `src/contexts/ScopeProvider.tsx` - Update `loadProjectsForOrg()` and `setProject()`

---

## Architecture Summary

**Layer 1: Database Security (Phase 0 - Complete)**
- 10 RLS policies
- Automatic org filtering
- Prevents cross-org access

**Layer 2: Auth Functions (Phase 1 - Complete)**
- 4 RPC functions
- Provides user data safely
- Validates org membership

**Layer 3: Scope Management (Phase 2 - This Task)**
- ScopeContext manages org/project in React state
- Functions validate project access
- RLS policies enforce org isolation

**Layer 4: React State (ScopeContext)**
- Manages current org/project
- Validates selections
- Session-based state (not persistent)

---

## Expected Outcome

✅ Users can only select projects they have permission to access  
✅ Project list is automatically filtered by permissions  
✅ Unauthorized access attempts show user-friendly errors  
✅ localStorage restoration validates access  
✅ Scope managed entirely by ScopeContext (React state)

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
