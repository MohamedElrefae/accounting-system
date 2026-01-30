# Next Action: Execute Task 2.2
## Add Project Access Validation

**Status**: 🚀 READY TO START  
**Task**: TASK-2.2 - Add Project Access Validation  
**Duration**: 1-2 hours  
**Date**: January 26, 2026

---

## What You Need to Do

Task 2.2 adds project access validation to ensure users can only select projects they have permission to access.

### Current State
- Users can select any project in an org
- No validation of project access
- No permission checks

### Target State
- Users can only select projects they have access to
- Project list is filtered by permissions
- Unauthorized access is blocked with user-friendly errors

---

## Implementation Steps

### Step 1: Create Database Migration (15 min)

**File to Create**: `supabase/migrations/20260126_phase_2_project_access_validation.sql`

**What to Do**:
1. Copy the SQL code from: `PHASE_2_TASK_2_2_IMPLEMENTATION_CODE.md` (Section 1)
2. Create new file with the migration
3. Deploy to Supabase

**What It Does**:
- Creates `check_project_access()` RPC function
- Validates if user has access to a project
- Logs function creation to audit_log

---

### Step 2: Create Service Function (15 min)

**File to Modify**: `src/services/projects.ts`

**What to Do**:
1. Open the file
2. Add the `validateProjectAccess()` function
3. Copy code from: `PHASE_2_TASK_2_2_IMPLEMENTATION_CODE.md` (Section 2)

**What It Does**:
- Calls the RPC function
- Handles errors gracefully
- Returns boolean (true/false)

---

### Step 3: Update ScopeProvider (30 min)

**File to Modify**: `src/contexts/ScopeProvider.tsx`

**What to Do**:
1. Open the file
2. Update `loadProjectsForOrg()` function
3. Update `setProject()` function
4. Copy code from: `PHASE_2_TASK_2_2_IMPLEMENTATION_CODE.md` (Section 3)

**What It Does**:
- Filters projects by user access on load
- Validates access before allowing project selection
- Handles errors with user-friendly messages

---

### Step 4: Test Implementation (15 min)

**What to Do**:
1. Deploy the migration to Supabase
2. Test the database function works
3. Test the service function works
4. Test the ScopeProvider behavior

**How to Test**:
- Select an org → Should show only accessible projects
- Try to select a project without access → Should show error
- Change org → Should clear invalid projects
- Reload page → Should restore valid projects only

---

### Step 5: Document Results (10 min)

**What to Do**:
1. Create: `PHASE_2_TASK_2_2_EXECUTION_SUMMARY.md`
2. Update: `ENTERPRISE_AUTH_EXECUTION_TRACKER.md`
3. Mark Task 2.2 as complete

---

## Files You'll Need

### To Read (Planning)
1. `PHASE_2_TASK_2_2_READY_TO_START.md` - Quick overview (5 min)
2. `PHASE_2_TASK_2_2_EXECUTION_PLAN.md` - Detailed plan (10 min)

### To Copy From (Implementation)
1. `PHASE_2_TASK_2_2_IMPLEMENTATION_CODE.md` - All code ready to copy

### To Modify
1. `src/contexts/ScopeProvider.tsx` - Update project validation
2. `src/services/projects.ts` - Add validateProjectAccess()

### To Create
1. `supabase/migrations/20260126_phase_2_project_access_validation.sql` - Database migration

---

## Quick Reference

### Database Function
```sql
CREATE OR REPLACE FUNCTION check_project_access(
  p_project_id uuid,
  p_org_id uuid
)
RETURNS TABLE(has_access boolean)
```

### Service Function
```typescript
export async function validateProjectAccess(
  projectId: string,
  orgId: string
): Promise<boolean>
```

### ScopeProvider Updates
- `loadProjectsForOrg()` - Filter projects by access
- `setProject()` - Validate access before selection

---

## Success Checklist

- [ ] Database migration created
- [ ] `check_project_access()` function deployed
- [ ] `validateProjectAccess()` service function added
- [ ] `loadProjectsForOrg()` updated to filter by access
- [ ] `setProject()` updated to validate access
- [ ] Error handling implemented
- [ ] All tests passing
- [ ] Execution summary created
- [ ] Tracker updated

---

## Estimated Timeline

| Step | Duration | Total |
|------|----------|-------|
| 1. Database Migration | 15 min | 15 min |
| 2. Service Function | 15 min | 30 min |
| 3. Update ScopeProvider | 30 min | 60 min |
| 4. Testing | 15 min | 75 min |
| 5. Documentation | 10 min | 85 min |
| **Total** | | **~1.5 hours** |

---

## What Happens After Task 2.2

Once Task 2.2 is complete:
1. ✅ Task 2.1: Database foundation (COMPLETE)
2. ✅ Task 2.2: Project access validation (COMPLETE)
3. ⏳ Task 2.3: Implement scope enforcement logic
4. ⏳ Task 2.4: Add error handling & user feedback
5. ⏳ Task 2.5: Test scope-based access control

---

## Need Help?

### For Implementation Details
- See: `PHASE_2_TASK_2_2_IMPLEMENTATION_CODE.md`

### For Planning Details
- See: `PHASE_2_TASK_2_2_EXECUTION_PLAN.md`

### For Quick Overview
- See: `PHASE_2_TASK_2_2_READY_TO_START.md`

### For Phase 2 Overview
- See: `PHASE_2_QUICK_START_GUIDE.md`

---

## Ready to Start?

1. Read: `PHASE_2_TASK_2_2_READY_TO_START.md` (5 min)
2. Read: `PHASE_2_TASK_2_2_EXECUTION_PLAN.md` (10 min)
3. Copy code from: `PHASE_2_TASK_2_2_IMPLEMENTATION_CODE.md`
4. Follow the 5 implementation steps above
5. Test and document results

---

**Status**: 🚀 READY TO EXECUTE  
**Next**: Begin Task 2.2 implementation  
**Estimated Completion**: January 27, 2026

