# ScopeContext & ProjectSelector Conflict - Root Cause & Fix

## Problem Statement

**Symptom**: User has `can_access_all_projects = true` in org_memberships, but ProjectSelector shows only ONE project instead of ALL projects.

**User Data**:
```json
{
  "org_id": "cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e",
  "user_id": "5eeb26da-0c45-432c-a009-0977c76bfc47",
  "can_access_all_projects": true,
  "is_superadmin": true
}
```

**Expected**: User sees ALL projects in organization
**Actual**: User sees only ONE project (from project_memberships)

## Root Cause Analysis

### Issue 1: Double Filtering in ScopeProvider

**Location**: `src/contexts/ScopeProvider.tsx` - `loadProjectsForOrg()` function

```typescript
const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
  // 1. Load all projects for org
  const allProjects = await getActiveProjectsByOrg(orgId);  // ← Uses RPC (correct)
  
  // 2. Filter to only projects user has access to
  const accessibleProjects = await Promise.all(
    allProjects.map(async (project) => {
      try {
        const hasAccess = await validateProjectAccess(project.id, orgId);  // ← PROBLEM!
        return hasAccess ? project : null;
      } catch (err) {
        return null;
      }
    })
  );
  
  const filteredProjects = accessibleProjects.filter(
    (p): p is Project => p !== null
  );
  
  setAvailableProjects(filteredProjects);  // ← Wrong data!
}, []);
```

**The Problem**:
1. `getActiveProjectsByOrg()` calls the RPC `get_user_accessible_projects()` which correctly returns ALL projects (because `can_access_all_projects = true`)
2. Then `validateProjectAccess()` is called for EACH project, which checks `project_memberships` table
3. Since user only has ONE entry in `project_memberships`, only that ONE project passes validation
4. Result: User sees only ONE project instead of ALL

### Issue 2: validateProjectAccess() Logic

**Location**: `src/services/projects.ts` - `validateProjectAccess()` function

```typescript
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

**The Problem**:
- This function calls `check_project_access` RPC
- That RPC likely only checks `project_memberships` table
- It doesn't check `org_memberships.can_access_all_projects` flag
- Result: Returns `false` for projects not in `project_memberships`, even if user has org-level access

## The Conflict

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: getActiveProjectsByOrg() calls RPC                     │
├─────────────────────────────────────────────────────────────────┤
│ get_user_accessible_projects(org_id)                           │
│ ├─ Checks org_memberships.can_access_all_projects = true       │
│ └─ Returns ALL projects in org ✅                              │
│                                                                 │
│ Result: [proj-001, proj-002, proj-003, proj-004]               │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ STEP 2: ScopeProvider filters with validateProjectAccess()     │
├─────────────────────────────────────────────────────────────────┤
│ For each project:                                              │
│   validateProjectAccess(project_id, org_id)                    │
│   ├─ Calls check_project_access RPC                            │
│   ├─ Only checks project_memberships table ❌                  │
│   └─ Ignores org_memberships.can_access_all_projects           │
│                                                                 │
│ Result: Only proj-001 passes (has project_membership)          │
│         proj-002, proj-003, proj-004 fail ❌                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ STEP 3: User sees only ONE project                             │
├─────────────────────────────────────────────────────────────────┤
│ availableProjects = [proj-001]                                 │
│                                                                 │
│ ❌ WRONG! Should be ALL projects                               │
└─────────────────────────────────────────────────────────────────┘
```

## Solution

### Option 1: Remove Double Filtering (RECOMMENDED)

**Rationale**: The RPC `get_user_accessible_projects()` already handles ALL access control logic. No need to filter again.

**Change**: Remove the `validateProjectAccess()` loop in `ScopeProvider.tsx`

```typescript
// BEFORE (Wrong - double filtering)
const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
  const allProjects = await getActiveProjectsByOrg(orgId);
  
  // ❌ REMOVE THIS - it's redundant and breaks org-level access
  const accessibleProjects = await Promise.all(
    allProjects.map(async (project) => {
      const hasAccess = await validateProjectAccess(project.id, orgId);
      return hasAccess ? project : null;
    })
  );
  
  const filteredProjects = accessibleProjects.filter(
    (p): p is Project => p !== null
  );
  
  setAvailableProjects(filteredProjects);
  return filteredProjects;
}, []);

// AFTER (Correct - trust the RPC)
const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
  const allProjects = await getActiveProjectsByOrg(orgId);
  
  // ✅ RPC already filtered by access control - just use the results
  setAvailableProjects(allProjects);
  
  // Restore project from localStorage if still valid
  const storedProjectId = getStoredProjectId();
  const matchingProject = allProjects.find(p => p.id === storedProjectId);
  
  if (matchingProject) {
    setCurrentProject(matchingProject);
  } else {
    setCurrentProject(null);
    setStoredProjectId(null);
  }
  
  return allProjects;
}, []);
```

### Option 2: Fix check_project_access RPC (Alternative)

**Rationale**: Make `check_project_access` RPC respect org-level access

**Change**: Update the RPC to check `org_memberships.can_access_all_projects` first

```sql
CREATE OR REPLACE FUNCTION check_project_access(
  p_project_id uuid,
  p_org_id uuid
)
RETURNS TABLE(has_access boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  SELECT 
    CASE
      -- PRIORITY 1: Check org-level access
      WHEN EXISTS (
        SELECT 1 FROM org_memberships om
        WHERE om.org_id = p_org_id
          AND om.user_id = auth.uid()
          AND om.can_access_all_projects = true
      ) THEN true
      
      -- PRIORITY 2: Check project-level access
      WHEN EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p_project_id
          AND pm.org_id = p_org_id
          AND pm.user_id = auth.uid()
      ) THEN true
      
      ELSE false
    END as has_access;
$;
```

## Recommended Fix: Option 1

**Why Option 1 is better**:
1. **Simpler**: Remove code instead of adding more
2. **Faster**: One RPC call instead of N+1 calls (one per project)
3. **Consistent**: Single source of truth for access control
4. **Maintainable**: Less code to maintain

**Why Option 2 is problematic**:
1. **Performance**: Makes N+1 RPC calls (one per project)
2. **Redundant**: Duplicates logic already in `get_user_accessible_projects()`
3. **Complexity**: Two places to maintain access control logic

## Implementation Steps

### Step 1: Update ScopeProvider.tsx

```typescript
// File: src/contexts/ScopeProvider.tsx

// Find the loadProjectsForOrg function and replace it with:

const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
  if (import.meta.env.DEV) console.log('[ScopeProvider] Loading projects for org:', orgId, { retryCount });
  setIsLoadingProjects(true);
  
  try {
    // Load projects using RPC (already filtered by access control)
    const projects = await getActiveProjectsByOrg(orgId);
    if (import.meta.env.DEV) console.log('[ScopeProvider] Loaded projects:', projects.length);
    
    if (!mountedRef.current) return projects;
    
    // Set available projects (no additional filtering needed)
    setAvailableProjects(projects);
    
    // Restore project from localStorage if still valid
    const storedProjectId = getStoredProjectId();
    const matchingProject = projects.find(p => p.id === storedProjectId);
    
    if (matchingProject) {
      if (import.meta.env.DEV) console.log('[ScopeProvider] Restored project from storage:', matchingProject.code);
      setCurrentProject(matchingProject);
    } else {
      setCurrentProject(null);
      setStoredProjectId(null);
    }
    
    return projects;
  } catch (err) {
    console.error('[ScopeProvider] Failed to load projects:', err);
    
    // Implement retry logic
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

### Step 2: Update setProject validation (Optional)

If you want to keep validation in `setProject`, update it to use the same logic:

```typescript
const setProject = useCallback(async (projectId: string | null) => {
  if (import.meta.env.DEV) console.log('[ScopeProvider] setProject:', projectId);
  
  if (!projectId) {
    setCurrentProject(null);
    setStoredProjectId(null);
    return;
  }
  
  // 1. Validate project is in available projects (already filtered by RPC)
  const project = availableProjects.find(p => p.id === projectId);
  if (!project) {
    console.error('[ScopeProvider] Invalid project ID or no access:', projectId);
    setError('Project not found or no access');
    return;
  }
  
  // 2. Validate org is selected
  if (!currentOrg) {
    console.error('[ScopeProvider] No organization selected');
    setError('Organization required');
    return;
  }
  
  // 3. Set project (access already validated by RPC)
  setCurrentProject(project);
  setStoredProjectId(projectId);
  
  // Invalidate project-scoped queries
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.costCenters.byOrg(currentOrg.id, projectId) 
  });
  
  setLastUpdated(new Date());
}, [availableProjects, currentOrg, queryClient]);
```

## Testing

### Test Case 1: User with org-level access
```
User: can_access_all_projects = true
Expected: Sees ALL projects in org
Test: Select organization, check ProjectSelector dropdown
```

### Test Case 2: User with project-level access
```
User: can_access_all_projects = false, has project_memberships
Expected: Sees ONLY assigned projects
Test: Select organization, check ProjectSelector dropdown
```

### Test Case 3: User with no access
```
User: can_access_all_projects = false, no project_memberships
Expected: Sees NO projects, error message shown
Test: Select organization, check ProjectSelector shows error
```

## Verification SQL

```sql
-- Run this to verify the fix works
-- Replace user_id and org_id with actual values

-- 1. Check org membership
SELECT 
  'org_memberships' as source,
  can_access_all_projects,
  is_default
FROM org_memberships
WHERE user_id = '5eeb26da-0c45-432c-a009-0977c76bfc47'
  AND org_id = 'cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e';

-- 2. Check what RPC returns
SELECT 
  'RPC result' as source,
  id,
  code,
  name
FROM get_user_accessible_projects('cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'::uuid)
ORDER BY code;

-- 3. Check all projects in org (what SHOULD be returned)
SELECT 
  'All projects' as source,
  id,
  code,
  name,
  status
FROM projects
WHERE org_id = 'cd6772a1-d4ba-4b7c-8cf6-3a5b76d2269e'
  AND status = 'active'
ORDER BY code;

-- If RPC returns all projects but UI shows only one:
-- → ScopeProvider is filtering incorrectly (this fix addresses that)
```

## Summary

**Root Cause**: ScopeProvider was double-filtering projects:
1. First filter: RPC `get_user_accessible_projects()` (correct)
2. Second filter: `validateProjectAccess()` for each project (wrong)

**Fix**: Remove the second filter - trust the RPC

**Impact**: 
- Users with `can_access_all_projects = true` will now see ALL projects
- Users with `can_access_all_projects = false` will see only assigned projects
- Performance improved (N+1 RPC calls eliminated)
- Code simplified (less to maintain)

**Status**: Ready to implement
