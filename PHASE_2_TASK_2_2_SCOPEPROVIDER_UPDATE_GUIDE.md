# Phase 2 Task 2.2: ScopeProvider Update Guide

**Status**: Ready to Implement  
**File**: `src/contexts/ScopeProvider.tsx`  
**Changes**: Add project access validation to `loadProjectsForOrg()` and `setProject()`

---

## What to Update

### 1. Add Import

At the top of `ScopeProvider.tsx`, add:

```typescript
import { getActiveProjectsByOrg, validateProjectAccess, type Project } from '../services/projects';
```

### 2. Update `loadProjectsForOrg()` Function

**Find this function** and replace it with:

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

### 3. Update `setProject()` Function

**Find this function** and replace it with:

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

---

## Key Changes Explained

### In `loadProjectsForOrg()`:

1. **Load all projects** - Gets all projects for the org
2. **Filter by access** - Calls `validateProjectAccess()` for each project
3. **Remove inaccessible** - Filters out projects user can't access
4. **Restore from storage** - Only restores if project is still accessible
5. **Retry logic** - Retries up to 3 times if loading fails

### In `setProject()`:

1. **Validate project exists** - Checks project is in available list
2. **Validate org selected** - Ensures org is set
3. **Validate access** - Calls `validateProjectAccess()` before setting
4. **Show errors** - Displays user-friendly error messages
5. **Invalidate queries** - Clears cached data for new project

---

## Testing Checklist

- [ ] App builds without errors
- [ ] Projects load for selected org
- [ ] Only accessible projects show in list
- [ ] Selecting inaccessible project shows error
- [ ] localStorage restoration validates access
- [ ] Switching orgs clears invalid projects
- [ ] Error messages display correctly
- [ ] Console logs show validation steps (dev mode)

---

## Troubleshooting

**Projects not loading?**
- Check browser console for errors
- Verify `validateProjectAccess()` is deployed
- Check org membership in database

**All projects filtered out?**
- Check user has project-level permissions
- Verify role has 'project' resource with 'view' action
- Check org_memberships table for user

**localStorage not restoring?**
- Clear browser storage and reload
- Select org and project again
- Check console for validation errors

---

## Next Steps

1. ✅ Add `validateProjectAccess()` to projects.ts
2. ⏳ Update `loadProjectsForOrg()` in ScopeProvider
3. ⏳ Update `setProject()` in ScopeProvider
4. ⏳ Test in app
5. ⏳ Verify all scenarios work

---

**Status**: Ready to implement  
**Estimated Time**: 15-20 minutes  
**Complexity**: Medium
