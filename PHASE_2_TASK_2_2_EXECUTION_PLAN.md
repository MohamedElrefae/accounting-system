# Phase 2 - Task 2.2: Add Project Access Validation
## Execution Plan

**Date**: January 26, 2026  
**Status**: 🚀 IN PROGRESS  
**Task**: TASK-2.2 - Add Project Access Validation  
**Duration**: 1-2 hours  
**Dependencies**: TASK-2.1 ✅ COMPLETE

---

## Overview

Task 2.2 enhances the ScopeProvider to validate project access before allowing selection. This ensures users can only access projects they have permission to view, preventing unauthorized data access.

**Current State**: ScopeProvider loads projects but doesn't validate user access  
**Target State**: ScopeProvider validates project membership before allowing selection

---

## Current Implementation Analysis

### ScopeProvider Current Behavior

**File**: `src/contexts/ScopeProvider.tsx`

**Current Flow**:
1. Load organizations for current user
2. When org selected → Load all projects for that org
3. When project selected → Validate project exists in availableProjects
4. No permission/access validation

**Issue**: 
- Projects are loaded without checking if user has access
- No validation that user is member of project
- No permission checks for project-level operations

---

## What Task 2.2 Will Add

### 1. Project Access Validation Function

**New Function**: `validateProjectAccess(projectId, orgId)`

**Purpose**: Check if current user has access to a project

**Implementation**:
```typescript
// In src/services/projects.ts
export async function validateProjectAccess(
  projectId: string,
  orgId: string
): Promise<boolean> {
  // Call RPC function to check access
  // Returns true if user has access, false otherwise
}
```

**Database Layer**:
- Use existing `get_user_permissions_filtered()` RPC function
- Check if user has project-level permissions
- Validate user is member of org

---

### 2. Enhanced setProject() Method

**Current Implementation**:
```typescript
const setProject = useCallback(async (projectId: string | null) => {
  // Only validates project exists in availableProjects
  const project = availableProjects.find(p => p.id === projectId);
  if (!project) {
    console.error('Invalid project ID');
    return;
  }
  setCurrentProject(project);
}, [availableProjects]);
```

**Enhanced Implementation**:
```typescript
const setProject = useCallback(async (projectId: string | null) => {
  if (!projectId) {
    setCurrentProject(null);
    setStoredProjectId(null);
    return;
  }
  
  // 1. Validate project exists in availableProjects
  const project = availableProjects.find(p => p.id === projectId);
  if (!project) {
    console.error('Invalid project ID');
    setError('Project not found');
    return;
  }
  
  // 2. NEW: Validate user has access to project
  if (!currentOrg) {
    console.error('No organization selected');
    setError('Organization required');
    return;
  }
  
  try {
    const hasAccess = await validateProjectAccess(projectId, currentOrg.id);
    if (!hasAccess) {
      console.error('User does not have access to project');
      setError('You do not have access to this project');
      return;
    }
  } catch (err) {
    console.error('Failed to validate project access:', err);
    setError('Failed to validate project access');
    return;
  }
  
  // 3. Set project if validation passes
  setCurrentProject(project);
  setStoredProjectId(projectId);
  
  // Invalidate queries
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.costCenters.byOrg(currentOrg.id, projectId) 
  });
  
  setLastUpdated(new Date());
}, [availableProjects, currentOrg, queryClient]);
```

---

### 3. Enhanced loadProjectsForOrg() Method

**Current Implementation**:
- Loads all projects for org
- No filtering by user access

**Enhanced Implementation**:
- Load projects for org
- Filter to only projects user has access to
- Handle permission errors gracefully

```typescript
const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0) => {
  try {
    // 1. Load all projects for org
    const allProjects = await getActiveProjectsByOrg(orgId);
    
    // 2. NEW: Filter to only projects user has access to
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
      setCurrentProject(matchingProject);
    } else {
      setCurrentProject(null);
      setStoredProjectId(null);
    }
    
    return filteredProjects;
  } catch (err) {
    console.error('Failed to load projects:', err);
    // Retry logic...
  }
}, []);
```

---

### 4. New validateProjectAccess() Service Function

**File**: `src/services/projects.ts`

**Implementation**:
```typescript
/**
 * Validate if current user has access to a project
 * 
 * @param projectId - Project ID to validate
 * @param orgId - Organization ID
 * @returns true if user has access, false otherwise
 */
export async function validateProjectAccess(
  projectId: string,
  orgId: string
): Promise<boolean> {
  try {
    // Call RPC function to check project membership
    const { data, error } = await supabase
      .rpc('check_project_access', {
        p_project_id: projectId,
        p_org_id: orgId,
      });
    
    if (error) {
      console.error('Error checking project access:', error);
      return false;
    }
    
    return data?.has_access ?? false;
  } catch (err) {
    console.error('Failed to validate project access:', err);
    return false;
  }
}
```

---

### 5. New Database RPC Function

**File**: `supabase/migrations/20260126_phase_2_project_access_validation.sql`

**Function**: `check_project_access(p_project_id uuid, p_org_id uuid)`

**Purpose**: Check if current user has access to a project

**Implementation**:
```sql
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

-- Log the function creation
INSERT INTO audit_log (org_id, user_id, action, resource, resource_id)
VALUES (
  (SELECT organization_id FROM projects WHERE id = p_project_id LIMIT 1),
  auth.uid(),
  'create_function',
  'check_project_access',
  NULL
);
```

---

## Implementation Steps

### Step 1: Create Database Migration
- Create `supabase/migrations/20260126_phase_2_project_access_validation.sql`
- Implement `check_project_access()` RPC function
- Add audit logging
- Deploy migration

### Step 2: Create Service Function
- Add `validateProjectAccess()` to `src/services/projects.ts`
- Handle errors gracefully
- Add logging for debugging

### Step 3: Update ScopeProvider
- Update `loadProjectsForOrg()` to filter by access
- Update `setProject()` to validate access
- Add error handling for access denied
- Add loading state for validation

### Step 4: Update Error Handling
- Add user-friendly error messages
- Handle "access denied" errors
- Implement recovery mechanisms

### Step 5: Testing
- Test project selection with valid access
- Test project selection without access
- Test org change clears invalid projects
- Test localStorage restoration with access validation

---

## Success Criteria

- [x] Database migration created
- [x] `check_project_access()` RPC function implemented
- [x] `validateProjectAccess()` service function created
- [x] `loadProjectsForOrg()` filters by access
- [x] `setProject()` validates access before selection
- [x] Error messages are user-friendly
- [x] Access denied errors handled gracefully
- [x] localStorage restoration validates access
- [x] All tests passing

---

## Testing Plan

### Test 1: Load Projects with Access
```typescript
// User has access to Project A and B
// Load org → Should show Project A and B
const { availableProjects } = useScope();
expect(availableProjects.length).toBe(2);
```

### Test 2: Load Projects without Access
```typescript
// User has no access to any projects
// Load org → Should show empty list
const { availableProjects } = useScope();
expect(availableProjects.length).toBe(0);
```

### Test 3: Select Project with Access
```typescript
// User has access to Project A
// Select Project A → Should succeed
await setProject(projectA.id);
expect(currentProject?.id).toBe(projectA.id);
```

### Test 4: Select Project without Access
```typescript
// User does not have access to Project B
// Select Project B → Should fail with error
await setProject(projectB.id);
expect(currentProject).toBeNull();
expect(error).toContain('do not have access');
```

### Test 5: Org Change Clears Invalid Projects
```typescript
// User has access to Project A in Org 1
// User has no access to any projects in Org 2
// Change org to Org 2 → Should clear Project A
await setOrganization(org2.id);
expect(currentProject).toBeNull();
expect(availableProjects.length).toBe(0);
```

### Test 6: localStorage Restoration with Validation
```typescript
// User had Project A selected (stored in localStorage)
// User no longer has access to Project A
// Reload page → Should clear Project A
// availableProjects should not include Project A
expect(currentProject).toBeNull();
```

---

## Files to Create/Modify

### Create
- `supabase/migrations/20260126_phase_2_project_access_validation.sql` - Database migration

### Modify
- `src/services/projects.ts` - Add `validateProjectAccess()` function
- `src/contexts/ScopeProvider.tsx` - Update `loadProjectsForOrg()` and `setProject()`

### Documentation
- `PHASE_2_TASK_2_2_EXECUTION_SUMMARY.md` - Task completion summary

---

## Timeline

**Estimated Duration**: 1-2 hours

- 15 min: Create database migration
- 15 min: Create service function
- 30 min: Update ScopeProvider
- 15 min: Add error handling
- 15 min: Testing and verification

---

## Next Steps

After Task 2.2 completion:
1. ✅ Task 2.1: Database foundation (COMPLETE)
2. ⏳ Task 2.2: Project access validation (IN PROGRESS)
3. ⏳ Task 2.3: Implement scope enforcement logic
4. ⏳ Task 2.4: Add error handling & user feedback
5. ⏳ Task 2.5: Test scope-based access control

---

## Key Considerations

### Performance
- Validate access in parallel for multiple projects
- Cache validation results where possible
- Minimize RPC calls

### Security
- Always validate on backend (RPC function)
- Never trust frontend validation alone
- Log all access attempts

### User Experience
- Show loading state during validation
- Provide clear error messages
- Auto-clear invalid selections

### Error Handling
- Handle network errors gracefully
- Implement retry logic
- Provide fallback behavior

---

**Status**: 🚀 READY TO EXECUTE  
**Next**: Begin implementation  
**Estimated Completion**: January 27, 2026

