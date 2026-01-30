# Phase 2 - Task 2.2: Ready to Start
## Project Access Validation Implementation

**Status**: 🚀 READY TO EXECUTE  
**Date**: January 26, 2026  
**Task**: TASK-2.2 - Add Project Access Validation  
**Duration**: 1-2 hours  
**Dependencies**: ✅ TASK-2.1 COMPLETE

---

## Quick Summary

Task 2.2 adds project access validation to the ScopeProvider. Currently, the app loads all projects for an org without checking if the user has permission to access them. This task ensures users can only select projects they have access to.

---

## What Will Change

### Before (Current)
```
User selects Org → Load all projects → User can select any project
                                        (even without permission)
```

### After (Task 2.2)
```
User selects Org → Load all projects → Filter by user access → User can only select
                                                                 projects they have
                                                                 permission for
```

---

## Implementation Overview

### 1. Database Layer
**New RPC Function**: `check_project_access(project_id, org_id)`
- Checks if current user has access to a project
- Returns boolean (true/false)
- Uses existing permission system

### 2. Service Layer
**New Function**: `validateProjectAccess(projectId, orgId)`
- Calls the RPC function
- Handles errors gracefully
- Returns boolean

### 3. Frontend Layer
**Updated ScopeProvider**:
- `loadProjectsForOrg()` - Filter projects by access
- `setProject()` - Validate access before selection
- Better error handling

---

## Files to Create

### 1. Database Migration
**File**: `supabase/migrations/20260126_phase_2_project_access_validation.sql`

**Contains**:
- `check_project_access()` RPC function
- Audit logging
- Function grants

### 2. Documentation
**File**: `PHASE_2_TASK_2_2_EXECUTION_SUMMARY.md`

**Contains**:
- What was implemented
- How it works
- Testing results

---

## Files to Modify

### 1. Service Layer
**File**: `src/services/projects.ts`

**Add**:
```typescript
export async function validateProjectAccess(
  projectId: string,
  orgId: string
): Promise<boolean>
```

### 2. ScopeProvider
**File**: `src/contexts/ScopeProvider.tsx`

**Update**:
- `loadProjectsForOrg()` - Add access filtering
- `setProject()` - Add access validation

---

## Key Implementation Details

### Database Function
```sql
CREATE OR REPLACE FUNCTION check_project_access(
  p_project_id uuid,
  p_org_id uuid
)
RETURNS TABLE(has_access boolean)
```

**Logic**:
1. Get current user ID
2. Check if project exists in org
3. Check if user has project-level permission
4. Return true/false

### Service Function
```typescript
export async function validateProjectAccess(
  projectId: string,
  orgId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    'check_project_access',
    { p_project_id: projectId, p_org_id: orgId }
  );
  return data?.has_access ?? false;
}
```

### ScopeProvider Updates
```typescript
// In loadProjectsForOrg()
const filteredProjects = await Promise.all(
  allProjects.map(async (project) => {
    const hasAccess = await validateProjectAccess(project.id, orgId);
    return hasAccess ? project : null;
  })
);

// In setProject()
const hasAccess = await validateProjectAccess(projectId, currentOrg.id);
if (!hasAccess) {
  setError('You do not have access to this project');
  return;
}
```

---

## Testing Checklist

- [ ] Database migration deploys successfully
- [ ] `check_project_access()` function exists
- [ ] `validateProjectAccess()` service function works
- [ ] Projects are filtered by access on load
- [ ] Project selection validates access
- [ ] Error messages are user-friendly
- [ ] localStorage restoration validates access
- [ ] No unauthorized access possible

---

## Success Criteria

✅ All of the following must be true:
1. Database migration created and deployable
2. RPC function implemented with proper security
3. Service function handles errors gracefully
4. ScopeProvider filters projects by access
5. Project selection validates access
6. Error handling is user-friendly
7. All tests passing
8. No performance degradation

---

## Next Steps

1. **Create Database Migration**
   - File: `supabase/migrations/20260126_phase_2_project_access_validation.sql`
   - Implement `check_project_access()` function

2. **Create Service Function**
   - File: `src/services/projects.ts`
   - Add `validateProjectAccess()` function

3. **Update ScopeProvider**
   - File: `src/contexts/ScopeProvider.tsx`
   - Update `loadProjectsForOrg()` and `setProject()`

4. **Test Implementation**
   - Verify database function works
   - Test service function
   - Test ScopeProvider behavior

5. **Document Results**
   - Create `PHASE_2_TASK_2_2_EXECUTION_SUMMARY.md`
   - Update tracker

---

## Detailed Plan

See: `PHASE_2_TASK_2_2_EXECUTION_PLAN.md`

---

## Questions?

Refer to:
- `PHASE_2_ENHANCED_PERMISSIONS_SYSTEM_PLAN.md` - Detailed Phase 2 plan
- `PHASE_2_QUICK_START_GUIDE.md` - Phase 2 overview
- `ENTERPRISE_AUTH_EXECUTION_TRACKER.md` - Overall progress

---

**Status**: 🚀 READY TO EXECUTE  
**Estimated Duration**: 1-2 hours  
**Estimated Completion**: January 27, 2026

