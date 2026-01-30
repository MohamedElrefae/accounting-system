# Phase 2: Frontend Auth Integration - Detailed Tasks

**Phase:** 2 of 5  
**Status:** 📋 PENDING (Ready to start after Phase 1)  
**Estimated Duration:** 3 days  
**Tasks:** 5 total  
**Priority:** HIGH

---

## 📋 PHASE 2 OVERVIEW

**Goal:** Integrate enhanced auth RPC into frontend and add scope validation functions

**Key Deliverables:**
- Updated useOptimizedAuth hook with org/project data
- Scope validation functions
- TypeScript interfaces for new data structures
- Comprehensive testing

**Success Criteria:**
- Hook returns org/project memberships
- Validation functions work correctly
- No TypeScript errors
- No breaking changes to existing code
- All tests passing

---

## TASK-2.1: Update useOptimizedAuth Interface

**Task ID:** `TASK-2.1`  
**Status:** [ ] PENDING  
**Estimated Time:** 30 minutes  
**Dependencies:** Phase 1 complete  
**Assigned To:** AI Agent  

### Description
Update the useOptimizedAuth hook interface to include new return types for org/project data and scope validation functions.

### Deliverables
1. Updated TypeScript interfaces
2. New return types added to hook
3. Type definitions for org/project data
4. Documentation comments added

### Implementation Steps
1. Open `src/hooks/useOptimizedAuth.ts`
2. Add new TypeScript interfaces
3. Update hook return type
4. Add JSDoc comments
5. Verify no TypeScript errors

### New Interfaces to Add
```typescript
interface OrgMembership {
  org_id: string;
  org_name: string;
  is_default: boolean;
  can_access_all_projects: boolean;
}

interface ProjectMembership {
  project_id: string;
  project_name: string;
  org_id: string;
}

interface EnhancedAuthData {
  profile: UserProfile;
  roles: string[];
  organizations: OrgMembership[];
  projects: ProjectMembership[];
  org_roles: Record<string, string[]>;
  default_org: string | null;
}

interface UseOptimizedAuthReturn {
  // Existing fields
  user: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  
  // New fields
  authData: EnhancedAuthData | null;
  organizations: OrgMembership[];
  projects: ProjectMembership[];
  defaultOrg: string | null;
  
  // New validation functions
  canAccessOrg: (orgId: string) => boolean;
  canAccessProject: (projectId: string) => boolean;
  getAvailableOrgs: () => OrgMembership[];
  getAvailableProjects: (orgId?: string) => ProjectMembership[];
}
```

### Acceptance Criteria
- [ ] New interfaces defined
- [ ] Hook return type updated
- [ ] All fields documented with JSDoc
- [ ] No TypeScript errors
- [ ] Backward compatible (existing fields still work)

### Verification
```bash
# Check for TypeScript errors
npm run type-check

# Expected: No errors in useOptimizedAuth.ts
```

### Progress Report Template
```
Task 2.1: [STATUS] - Interfaces added. TypeScript: [errors/no errors]. Backward compatible: [yes/no].
Example: Task 2.1: [COMPLETED] - 4 new interfaces added. No TypeScript errors. Backward compatible.
```

---

## TASK-2.2: Update loadAuthData Function

**Task ID:** `TASK-2.2`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-2.1 (interfaces updated)  
**Assigned To:** AI Agent  

### Description
Update the loadAuthData function to call the enhanced RPC and parse org/project memberships.

### Deliverables
1. Function calls enhanced RPC
2. Parses org/project data correctly
3. Handles errors gracefully
4. Returns EnhancedAuthData structure

### Implementation Steps
1. Open `src/services/authService.ts` or `src/hooks/useOptimizedAuth.ts`
2. Find loadAuthData function
3. Replace old RPC call with new enhanced RPC
4. Add parsing logic for org/project data
5. Add error handling
6. Test with real data

### Key Changes
```typescript
// OLD CODE (to replace)
const authData = await supabase.rpc('get_user_auth_data', {
  p_user_id: userId
});

// NEW CODE (replacement)
const authData = await supabase.rpc('get_user_auth_data_with_scope', {
  p_user_id: userId
});

// Parse response
const parsed: EnhancedAuthData = {
  profile: authData.profile,
  roles: authData.roles,
  organizations: authData.organizations.map(org => ({
    org_id: org.id,
    org_name: org.name,
    is_default: org.is_default,
    can_access_all_projects: org.can_access_all_projects
  })),
  projects: authData.projects.map(proj => ({
    project_id: proj.id,
    project_name: proj.name,
    org_id: proj.org_id
  })),
  org_roles: authData.org_roles,
  default_org: authData.default_org
};
```

### Error Handling
```typescript
try {
  const authData = await supabase.rpc('get_user_auth_data_with_scope', {
    p_user_id: userId
  });
  
  if (!authData) {
    throw new Error('Failed to load auth data');
  }
  
  return parseAuthData(authData);
} catch (error) {
  console.error('Error loading auth data:', error);
  throw new Error('Failed to load authentication data');
}
```

### Acceptance Criteria
- [ ] Function calls enhanced RPC
- [ ] Parses org/project data correctly
- [ ] Returns EnhancedAuthData structure
- [ ] Error handling works
- [ ] No TypeScript errors
- [ ] Tested with real data

### Verification Query
```sql
-- Test the RPC directly
SELECT get_user_auth_data_with_scope('test-user-id');

-- Expected: Valid JSON with all fields
```

### Progress Report Template
```
Task 2.2: [STATUS] - RPC called. Data parsed: [correct/incorrect]. Errors: [none/list].
Example: Task 2.2: [COMPLETED] - Enhanced RPC called. Data parsed correctly. Error handling added. Tested with 3 users.
```

---

## TASK-2.3: Add Scope Validation Functions

**Task ID:** `TASK-2.3`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-2.2 (loadAuthData updated)  
**Assigned To:** AI Agent  

### Description
Create scope validation functions that check if user can access org/project.

### Deliverables
1. canAccessOrg() function
2. canAccessProject() function
3. getAvailableOrgs() function
4. getAvailableProjects() function
5. Comprehensive error handling

### Implementation Steps
1. Create new file: `src/utils/scopeValidation.ts`
2. Implement validation functions
3. Add error handling
4. Add JSDoc comments
5. Test with various scenarios

### Function Implementations
```typescript
// src/utils/scopeValidation.ts

export function canAccessOrg(
  authData: EnhancedAuthData | null,
  orgId: string
): boolean {
  if (!authData) return false;
  
  return authData.organizations.some(org => org.org_id === orgId);
}

export function canAccessProject(
  authData: EnhancedAuthData | null,
  projectId: string
): boolean {
  if (!authData) return false;
  
  return authData.projects.some(proj => proj.project_id === projectId);
}

export function getAvailableOrgs(
  authData: EnhancedAuthData | null
): OrgMembership[] {
  if (!authData) return [];
  
  return authData.organizations;
}

export function getAvailableProjects(
  authData: EnhancedAuthData | null,
  orgId?: string
): ProjectMembership[] {
  if (!authData) return [];
  
  if (orgId) {
    return authData.projects.filter(proj => proj.org_id === orgId);
  }
  
  return authData.projects;
}

export function getDefaultOrg(
  authData: EnhancedAuthData | null
): OrgMembership | null {
  if (!authData || !authData.default_org) return null;
  
  return authData.organizations.find(
    org => org.org_id === authData.default_org
  ) || null;
}

export function validateOrgAccess(
  authData: EnhancedAuthData | null,
  orgId: string
): { valid: boolean; error?: string } {
  if (!authData) {
    return { valid: false, error: 'Not authenticated' };
  }
  
  if (!canAccessOrg(authData, orgId)) {
    return { valid: false, error: 'Access denied to organization' };
  }
  
  return { valid: true };
}

export function validateProjectAccess(
  authData: EnhancedAuthData | null,
  projectId: string,
  orgId?: string
): { valid: boolean; error?: string } {
  if (!authData) {
    return { valid: false, error: 'Not authenticated' };
  }
  
  if (!canAccessProject(authData, projectId)) {
    return { valid: false, error: 'Access denied to project' };
  }
  
  if (orgId && !canAccessOrg(authData, orgId)) {
    return { valid: false, error: 'Access denied to organization' };
  }
  
  return { valid: true };
}
```

### Acceptance Criteria
- [ ] All 4 functions implemented
- [ ] Functions return correct values
- [ ] Error handling works
- [ ] No TypeScript errors
- [ ] Functions tested with various scenarios
- [ ] JSDoc comments added

### Test Cases
```typescript
// Test 1: User can access their org
const result = canAccessOrg(authData, userOrgId);
// Expected: true

// Test 2: User cannot access other org
const result = canAccessOrg(authData, otherOrgId);
// Expected: false

// Test 3: Get available orgs
const orgs = getAvailableOrgs(authData);
// Expected: Array with user's orgs

// Test 4: Get projects for org
const projects = getAvailableProjects(authData, orgId);
// Expected: Array with org's projects
```

### Progress Report Template
```
Task 2.3: [STATUS] - Functions created: X. Tests: [passed/failed]. Errors: [none/list].
Example: Task 2.3: [COMPLETED] - 6 functions created. All tests passed. No errors.
```

---

## TASK-2.4: Export New Functions

**Task ID:** `TASK-2.4`  
**Status:** [ ] PENDING  
**Estimated Time:** 15 minutes  
**Dependencies:** TASK-2.3 (validation functions created)  
**Assigned To:** AI Agent  

### Description
Export new functions from hook and update type exports.

### Deliverables
1. Functions exported from useOptimizedAuth
2. Types exported from types file
3. Validation functions exported from utils
4. Index files updated

### Implementation Steps
1. Update `src/hooks/useOptimizedAuth.ts` to export validation functions
2. Update `src/types/auth.ts` to export new interfaces
3. Update `src/utils/index.ts` to export validation functions
4. Update `src/index.ts` if needed
5. Verify imports work correctly

### Export Locations
```typescript
// src/hooks/useOptimizedAuth.ts
export { useOptimizedAuth };
export { canAccessOrg, canAccessProject, getAvailableOrgs, getAvailableProjects };

// src/types/auth.ts
export type { EnhancedAuthData, OrgMembership, ProjectMembership };
export type { UseOptimizedAuthReturn };

// src/utils/scopeValidation.ts
export { canAccessOrg, canAccessProject, getAvailableOrgs, getAvailableProjects };
export { validateOrgAccess, validateProjectAccess, getDefaultOrg };
```

### Acceptance Criteria
- [ ] All functions exported
- [ ] All types exported
- [ ] No circular dependencies
- [ ] Imports work correctly
- [ ] No TypeScript errors

### Verification
```bash
# Check imports work
npm run type-check

# Expected: No errors
```

### Progress Report Template
```
Task 2.4: [STATUS] - Exports added. Imports: [working/broken]. TypeScript: [errors/no errors].
Example: Task 2.4: [COMPLETED] - All functions and types exported. Imports working. No TypeScript errors.
```

---

## TASK-2.5: Test Auth Hook Changes

**Task ID:** `TASK-2.5`  
**Status:** [ ] PENDING  
**Estimated Time:** 1 hour  
**Dependencies:** TASK-2.4 (exports updated)  
**Assigned To:** AI Agent  

### Description
Test updated auth hook with unit and integration tests.

### Deliverables
1. Unit tests for validation functions
2. Integration tests with RPC
3. Test coverage report
4. All tests passing

### Test File Location
```
src/hooks/useOptimizedAuth.test.ts
src/utils/scopeValidation.test.ts
```

### Unit Tests
```typescript
describe('Scope Validation Functions', () => {
  let authData: EnhancedAuthData;
  
  beforeEach(() => {
    authData = {
      profile: { id: 'user-1', email: 'test@example.com' },
      roles: ['accountant'],
      organizations: [
        { org_id: 'org-1', org_name: 'Org 1', is_default: true, can_access_all_projects: false },
        { org_id: 'org-2', org_name: 'Org 2', is_default: false, can_access_all_projects: true }
      ],
      projects: [
        { project_id: 'proj-1', project_name: 'Project 1', org_id: 'org-1' },
        { project_id: 'proj-2', project_name: 'Project 2', org_id: 'org-2' }
      ],
      org_roles: { 'org-1': ['accountant'], 'org-2': ['viewer'] },
      default_org: 'org-1'
    };
  });
  
  test('canAccessOrg returns true for user org', () => {
    expect(canAccessOrg(authData, 'org-1')).toBe(true);
  });
  
  test('canAccessOrg returns false for other org', () => {
    expect(canAccessOrg(authData, 'org-3')).toBe(false);
  });
  
  test('canAccessProject returns true for user project', () => {
    expect(canAccessProject(authData, 'proj-1')).toBe(true);
  });
  
  test('canAccessProject returns false for other project', () => {
    expect(canAccessProject(authData, 'proj-3')).toBe(false);
  });
  
  test('getAvailableOrgs returns user orgs', () => {
    const orgs = getAvailableOrgs(authData);
    expect(orgs).toHaveLength(2);
    expect(orgs[0].org_id).toBe('org-1');
  });
  
  test('getAvailableProjects filters by org', () => {
    const projects = getAvailableProjects(authData, 'org-1');
    expect(projects).toHaveLength(1);
    expect(projects[0].project_id).toBe('proj-1');
  });
});
```

### Integration Tests
```typescript
describe('useOptimizedAuth Hook', () => {
  test('hook returns enhanced auth data', async () => {
    const { result } = renderHook(() => useOptimizedAuth());
    
    await waitFor(() => {
      expect(result.current.authData).toBeDefined();
    });
    
    expect(result.current.organizations).toBeDefined();
    expect(result.current.projects).toBeDefined();
  });
  
  test('validation functions work with hook data', async () => {
    const { result } = renderHook(() => useOptimizedAuth());
    
    await waitFor(() => {
      expect(result.current.authData).toBeDefined();
    });
    
    const canAccess = result.current.canAccessOrg('org-1');
    expect(typeof canAccess).toBe('boolean');
  });
});
```

### Acceptance Criteria
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Test coverage > 80%
- [ ] No console errors
- [ ] No breaking changes

### Run Tests
```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- useOptimizedAuth.test.ts

# Check coverage
npm run test -- --coverage
```

### Progress Report Template
```
Task 2.5: [STATUS] - Tests: X passed, Y failed. Coverage: Z%. Breaking changes: [none/list].
Example: Task 2.5: [COMPLETED] - 15 tests passed. 0 failed. Coverage 85%. No breaking changes.
```

---

## ✅ PHASE 2 COMPLETION CHECKLIST

### All Tasks Complete
- [ ] TASK-2.1: Interfaces updated
- [ ] TASK-2.2: loadAuthData updated
- [ ] TASK-2.3: Validation functions created
- [ ] TASK-2.4: Functions exported
- [ ] TASK-2.5: Tests passing

### Verification
- [ ] Hook returns org/project data
- [ ] Validation functions work correctly
- [ ] No TypeScript errors
- [ ] No breaking changes
- [ ] All tests passing

### Documentation
- [ ] JSDoc comments added
- [ ] Progress report completed
- [ ] Any issues documented

### Sign-Off
```
Phase 2 Completion Report:
- Completed: [Date/Time]
- All tasks: [COMPLETED/BLOCKED]
- Tests: [all passing/some failing]
- Breaking changes: [none/list]
- Ready for Phase 3: [YES/NO]
- Notes: [Any additional notes]
```

---

**Status:** 📋 PENDING - Ready to start after Phase 1  
**Last Updated:** January 25, 2026  
**Next Phase:** Phase 3 - ScopeContext Validation
