# Phase 2 - Task 2.2: Implementation Code Reference

**Task**: Add Project Access Validation  
**Status**: READY TO IMPLEMENT  
**Date**: January 26, 2026

---

## 1. Database Migration

**File**: `supabase/migrations/20260126_phase_2_project_access_validation.sql`

```sql
-- Phase 2 Task 2.2: Project Access Validation
-- Adds check_project_access() RPC function to validate user access to projects

-- ============================================================================
-- 1. CREATE check_project_access() FUNCTION
-- ============================================================================

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
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  -- Check if project exists in org
  SELECT EXISTS(
    SELECT 1 FROM projects
    WHERE id = p_project_id
    AND organization_id = p_org_id
  ) INTO v_project_exists;
  
  IF NOT v_project_exists THEN
    RETURN QUERY SELECT false;
    RETURN;
  END IF;
  
  -- Check if user has permission to access project
  -- User has access if:
  -- 1. User is member of org, AND
  -- 2. User has project-level permission OR is super_admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id
    AND ur.org_id = p_org_id
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

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION check_project_access(uuid, uuid) TO authenticated;

-- ============================================================================
-- 2. LOG FUNCTION CREATION
-- ============================================================================

INSERT INTO audit_log (org_id, user_id, action, resource, resource_id)
SELECT 
  p.organization_id,
  auth.uid(),
  'create_function',
  'check_project_access',
  NULL
FROM projects p
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. VERIFY FUNCTION EXISTS
-- ============================================================================

-- Run this to verify the function was created:
-- SELECT * FROM pg_proc WHERE proname = 'check_project_access';
```

---

## 2. Service Function

**File**: `src/services/projects.ts`

**Add this function to the existing file**:

```typescript
/**
 * Validate if current user has access to a project
 * 
 * @param projectId - Project ID to validate
 * @param orgId - Organization ID
 * @returns true if user has access, false otherwise
 * @throws Error if validation fails
 */
export async function validateProjectAccess(
  projectId: string,
  orgId: string
): Promise<boolean> {
  try {
    if (import.meta.env.DEV) {
      console.log('[validateProjectAccess] Checking access:', { projectId, orgId });
    }
    
    // Call RPC function to check project access
    const { data, error } = await supabase
      .rpc('check_project_access', {
        p_project_id: projectId,
        p_org_id: orgId,
      });
    
    if (error) {
      console.error('[validateProjectAccess] RPC error:', error);
      return false;
    }
    
    const hasAccess = data?.[0]?.has_access ?? false;
    
    if (import.meta.env.DEV) {
      console.log('[validateProjectAccess] Result:', { projectId, hasAccess });
    }
    
    return hasAccess;
  } catch (err) {
    console.error('[validateProjectAccess] Failed to validate project access:', err);
    return false;
  }
}
```

---

## 3. ScopeProvider Updates

**File**: `src/contexts/ScopeProvider.tsx`

### Update 1: Import the new function

**Add to imports**:
```typescript
import { getActiveProjectsByOrg, validateProjectAccess, type Project } from '../services/projects';
```

### Update 2: Modify loadProjectsForOrg()

**Replace the existing function with**:

```typescript
// Load projects for a specific org with retry mechanism and access validation
const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
  if (import.meta.env.DEV) console.log('[ScopeProvider] Loading projects for org:', orgId, { retryCount });
  setIsLoadingProjects(true);
  
  try {
    // 1. Load all projects for org
    const allProjects = await getActiveProjectsByOrg(orgId);
    if (import.meta.env.DEV) console.log('[ScopeProvider] Loaded projects:', allProjects.length);
    
    // 2. Filter to only projects user has access to
    if (import.meta.env.DEV) console.log('[ScopeProvider] Validating project access...');
    const accessibleProjects = await Promise.all(
      allProjects.map(async (project) => {
        try {
          const hasAccess = await validateProjectAccess(project.id, orgId);
          if (import.meta.env.DEV && !hasAccess) {
            console.log('[ScopeProvider] User does not have access to project:', project.code);
          }
          return hasAccess ? project : null;
        } catch (err) {
          console.error(`[ScopeProvider] Failed to validate access for project ${project.id}:`, err);
          return null;
        }
      })
    );
    
    const filteredProjects = accessibleProjects.filter(
      (p): p is Project => p !== null
    );
    
    if (import.meta.env.DEV) console.log('[ScopeProvider] Accessible projects:', filteredProjects.length);
    
    if (!mountedRef.current) return filteredProjects;
    
    setAvailableProjects(filteredProjects);
    
    // 3. Restore project from localStorage if still valid
    const storedProjectId = getStoredProjectId();
    const matchingProject = filteredProjects.find(p => p.id === storedProjectId);
    
    if (matchingProject) {
      if (import.meta.env.DEV) console.log('[ScopeProvider] Restored project from storage:', matchingProject.code);
      setCurrentProject(matchingProject);
    } else {
      if (storedProjectId && import.meta.env.DEV) {
        console.log('[ScopeProvider] Stored project no longer accessible, clearing:', storedProjectId);
      }
      setCurrentProject(null);
      setStoredProjectId(null);
    }
    
    return filteredProjects;
  } catch (err) {
    console.error('[ScopeProvider] Failed to load projects:', err);
    
    // Implement retry logic for projects
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

### Update 3: Modify setProject()

**Replace the existing function with**:

```typescript
// Set project - validates org ownership and user access
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
    if (import.meta.env.DEV) console.log('[ScopeProvider] Validating project access...');
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

## 4. Testing Code

**File**: `src/contexts/ScopeProvider.test.tsx` (or similar)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ScopeProvider, useScope } from './ScopeProvider';
import * as projectService from '../services/projects';

// Mock the services
vi.mock('../services/projects');
vi.mock('../services/organization');

describe('ScopeProvider - Project Access Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter projects by user access', async () => {
    // Mock: User has access to Project A and B, but not C
    const mockProjects = [
      { id: 'proj-a', code: 'PROJ_A', name: 'Project A' },
      { id: 'proj-b', code: 'PROJ_B', name: 'Project B' },
      { id: 'proj-c', code: 'PROJ_C', name: 'Project C' },
    ];
    
    vi.mocked(projectService.getActiveProjectsByOrg).mockResolvedValue(mockProjects);
    vi.mocked(projectService.validateProjectAccess).mockImplementation(
      async (projectId) => projectId !== 'proj-c'
    );
    
    const { result } = renderHook(() => useScope(), {
      wrapper: ScopeProvider,
    });
    
    await waitFor(() => {
      expect(result.current.availableProjects.length).toBe(2);
    });
    
    expect(result.current.availableProjects.map(p => p.id)).toEqual(['proj-a', 'proj-b']);
  });

  it('should prevent selecting project without access', async () => {
    const mockProjects = [
      { id: 'proj-a', code: 'PROJ_A', name: 'Project A' },
    ];
    
    vi.mocked(projectService.getActiveProjectsByOrg).mockResolvedValue(mockProjects);
    vi.mocked(projectService.validateProjectAccess).mockResolvedValue(false);
    
    const { result } = renderHook(() => useScope(), {
      wrapper: ScopeProvider,
    });
    
    await act(async () => {
      await result.current.setProject('proj-a');
    });
    
    expect(result.current.currentProject).toBeNull();
    expect(result.current.error).toContain('do not have access');
  });

  it('should allow selecting project with access', async () => {
    const mockProjects = [
      { id: 'proj-a', code: 'PROJ_A', name: 'Project A' },
    ];
    
    vi.mocked(projectService.getActiveProjectsByOrg).mockResolvedValue(mockProjects);
    vi.mocked(projectService.validateProjectAccess).mockResolvedValue(true);
    
    const { result } = renderHook(() => useScope(), {
      wrapper: ScopeProvider,
    });
    
    await act(async () => {
      await result.current.setProject('proj-a');
    });
    
    expect(result.current.currentProject?.id).toBe('proj-a');
    expect(result.current.error).toBeNull();
  });

  it('should clear invalid projects on org change', async () => {
    // Org 1: User has access to Project A
    // Org 2: User has no access to any projects
    
    const mockOrgs = [
      { id: 'org-1', code: 'ORG_1', name: 'Org 1' },
      { id: 'org-2', code: 'ORG_2', name: 'Org 2' },
    ];
    
    const mockProjectsOrg1 = [
      { id: 'proj-a', code: 'PROJ_A', name: 'Project A' },
    ];
    
    const mockProjectsOrg2 = [];
    
    vi.mocked(projectService.getOrganizations).mockResolvedValue(mockOrgs);
    vi.mocked(projectService.getActiveProjectsByOrg).mockImplementation(
      async (orgId) => orgId === 'org-1' ? mockProjectsOrg1 : mockProjectsOrg2
    );
    vi.mocked(projectService.validateProjectAccess).mockResolvedValue(true);
    
    const { result } = renderHook(() => useScope(), {
      wrapper: ScopeProvider,
    });
    
    // Select Org 1 and Project A
    await act(async () => {
      await result.current.setOrganization('org-1');
      await result.current.setProject('proj-a');
    });
    
    expect(result.current.currentProject?.id).toBe('proj-a');
    
    // Change to Org 2
    await act(async () => {
      await result.current.setOrganization('org-2');
    });
    
    // Project should be cleared
    expect(result.current.currentProject).toBeNull();
    expect(result.current.availableProjects.length).toBe(0);
  });
});
```

---

## 5. Verification Script

**File**: `sql/verify_task_2_2_complete.sql`

```sql
-- Verify Task 2.2 Implementation

-- 1. Check if check_project_access function exists
SELECT 
  'check_project_access function' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'check_project_access' AND n.nspname = 'public'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 2. Check function signature
SELECT 
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'check_project_access' AND n.nspname = 'public';

-- 3. Test the function (replace with real IDs)
-- SELECT * FROM check_project_access(
--   'project-uuid-here'::uuid,
--   'org-uuid-here'::uuid
-- );

-- 4. Verify function grants
SELECT 
  (aclexplode(p.proacl)).grantee::regrole as grantee,
  (aclexplode(p.proacl)).privilege_type as privilege
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'check_project_access' AND n.nspname = 'public';
```

---

## Implementation Checklist

- [ ] Create database migration file
- [ ] Add `validateProjectAccess()` to projects.ts
- [ ] Update `loadProjectsForOrg()` in ScopeProvider
- [ ] Update `setProject()` in ScopeProvider
- [ ] Deploy migration to database
- [ ] Test database function works
- [ ] Test service function works
- [ ] Test ScopeProvider behavior
- [ ] Run verification script
- [ ] Create execution summary document
- [ ] Update tracker

---

## Key Points

1. **Database Function**: Uses SECURITY DEFINER to safely check permissions
2. **Service Function**: Handles errors gracefully and returns boolean
3. **ScopeProvider**: Filters projects on load and validates on selection
4. **Error Handling**: User-friendly error messages for access denied
5. **Performance**: Parallel validation for multiple projects
6. **Security**: Always validates on backend, never trusts frontend

---

**Status**: READY TO IMPLEMENT  
**Estimated Duration**: 1-2 hours  
**Next**: Execute implementation steps

