# Scoped Roles - Complete End-to-End Walkthrough

**Date:** January 26, 2026  
**Status:** ✅ COMPLETE IMPLEMENTATION GUIDE  
**Total Time:** 5-7 hours  
**Complexity:** MEDIUM

---

## 🎯 What You'll Accomplish

By the end of this guide, you'll have:
- ✅ Deployed scoped roles database (Phases 1-4)
- ✅ Implemented frontend hook and service
- ✅ Created UI components for role assignment
- ✅ Integrated with existing admin pages
- ✅ Tested end-to-end workflows
- ✅ Deployed to production

---

## 📊 Complete Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| **Database** | Backup & Deploy | 1-2 hrs | Ready |
| **Frontend** | Hook, Service, Components | 2-3 hrs | Ready |
| **Testing** | E2E Tests | 1 hr | Ready |
| **Deployment** | Production Deploy | 30 min | Ready |
| **Total** | | **5-7 hrs** | **Ready** |

---

## 🚀 PART 1: DATABASE DEPLOYMENT (1-2 hours)

### Step 1.1: Backup Your Database (5 min)

```bash
# Create backup
pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh backup_*.sql
```

**Why:** Safety first. If anything goes wrong, you can restore.

### Step 1.2: Deploy Phase 1 - Create Tables (15 min)

**File:** `supabase/migrations/20260126_create_scoped_roles_tables.sql`

**What it does:**
- Creates `org_roles` table
- Creates `project_roles` table
- Creates `system_roles` table
- Adds RLS policies
- Creates helper functions

**Deploy:**
```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Manual via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy entire file content
# 3. Paste and run
```

**Verify:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('org_roles', 'project_roles', 'system_roles');

-- Expected output: 3 rows
```

### Step 1.3: Deploy Phase 2 - Clean Setup (5 min)

**File:** `supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql`

**What it does:**
- Verifies tables created
- Creates empty tables (no data migration)
- Provides verification queries

**Deploy:**
```bash
supabase db push
```

**Verify:**
```sql
-- Check tables are empty
SELECT COUNT(*) FROM org_roles;      -- Should be 0
SELECT COUNT(*) FROM project_roles;  -- Should be 0
SELECT COUNT(*) FROM system_roles;   -- Should be 0
```

### Step 1.4: Deploy Phase 3 - Update RLS (15 min)

**File:** `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`

**What it does:**
- Updates RLS policies on all tables
- Uses scoped roles for access control
- Ensures proper security

**Deploy:**
```bash
supabase db push
```

**Verify:**
```sql
-- Check RLS policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('org_roles', 'project_roles', 'system_roles')
ORDER BY tablename;

-- Expected: Multiple policies per table
```

### Step 1.5: Deploy Phase 4 - Update Auth RPC (15 min)

**File:** `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`

**What it does:**
- Updates `get_user_auth_data()` RPC function
- Returns scoped roles
- Returns scope data (orgs, projects)

**Deploy:**
```bash
supabase db push
```

**Verify:**
```sql
-- Test RPC function
SELECT get_user_auth_data('your-user-id'::UUID);

-- Expected: JSON with:
-- - profile
-- - system_roles
-- - org_roles
-- - project_roles
-- - organizations
-- - projects
-- - default_org
```

### Step 1.6: Add Sample Data (Optional, 10 min)

**File:** `sql/add_scoped_roles_data_later.sql`

**When to run:** When ready to add real data

```bash
# Run when ready
psql -f sql/add_scoped_roles_data_later.sql
```

**Or add manually:**
```sql
-- Add test super admin
INSERT INTO system_roles (user_id, role, created_by)
VALUES ('test-user-id', 'super_admin', 'test-user-id');

-- Add test org role
INSERT INTO org_roles (user_id, org_id, role, can_access_all_projects, created_by)
VALUES ('test-user-id', 'test-org-id', 'org_admin', true, 'test-user-id');

-- Add test project role
INSERT INTO project_roles (user_id, project_id, role, created_by)
VALUES ('test-user-id', 'test-project-id', 'project_manager', 'test-user-id');
```

---

## 💻 PART 2: FRONTEND IMPLEMENTATION (2-3 hours)

### Step 2.1: Update Auth Hook (30 min)

**File:** `src/hooks/useOptimizedAuth.ts`

**What to do:**
1. Open the file
2. Copy code from `SCOPED_ROLES_PHASE_5_FRONTEND_PART1.md`
3. Replace entire file content
4. Update imports if needed

**Key additions:**
```typescript
// NEW: Scoped roles state
systemRoles: string[];
orgRoles: OrgRole[];
projectRoles: ProjectRole[];

// NEW: Permission functions
hasRoleInOrg(orgId, role)
hasRoleInProject(projectId, role)
canPerformActionInOrg(orgId, action)
canPerformActionInProject(projectId, action)
getUserRolesInOrg(orgId)
getUserRolesInProject(projectId)
```

**Verify:**
```bash
# Check for TypeScript errors
npm run type-check

# Expected: No errors
```

### Step 2.2: Create Role Service (15 min)

**File:** `src/services/scopedRolesService.ts`

**What to do:**
1. Create new file
2. Copy code from `SCOPED_ROLES_PHASE_5_FRONTEND_PART1.md`
3. Save file

**Key methods:**
```typescript
assignOrgRole()
updateOrgRole()
removeOrgRole()
assignProjectRole()
updateProjectRole()
removeProjectRole()
```

**Verify:**
```bash
npm run type-check
```

### Step 2.3: Create UI Components (45 min)

**Create 3 files:**

#### File 1: `src/components/admin/ScopedRoleAssignment.tsx`
- Main role assignment UI
- Copy from Part 2
- Handles both org and project roles

#### File 2: `src/components/admin/OrgRoleAssignment.tsx`
- Org-specific role management
- Copy from Part 2
- Simpler than main component

#### File 3: `src/components/admin/ProjectRoleAssignment.tsx`
- Project-specific role management
- Copy from Part 2
- Simpler than main component

**Verify:**
```bash
npm run type-check
```

### Step 2.4: Integrate with Admin Page (30 min)

**File:** `src/pages/admin/EnterpriseUserManagement.tsx`

**What to do:**
1. Open file
2. Copy code from `SCOPED_ROLES_PHASE_5_FRONTEND_PART3.md`
3. Replace entire file content
4. Update imports

**Key changes:**
- Import new components
- Add tabs for org/project roles
- Use new components in UI
- Handle role assignments

**Verify:**
```bash
npm run type-check
```

### Step 2.5: Test Frontend (1 hour)

**Test 1: Hook loads scoped roles**
```typescript
// In browser console
const auth = useOptimizedAuth();
console.log('System roles:', auth.systemRoles);
console.log('Org roles:', auth.orgRoles);
console.log('Project roles:', auth.projectRoles);
```

**Test 2: Permission checking**
```typescript
const auth = useOptimizedAuth();
console.log(auth.hasRoleInOrg('org-id', 'org_admin'));
console.log(auth.canPerformActionInOrg('org-id', 'manage_transactions'));
```

**Test 3: Service methods**
```typescript
// Assign user to org
await scopedRolesService.assignOrgRole({
  user_id: 'user-id',
  org_id: 'org-id',
  role: 'org_admin',
});

// Verify in database
SELECT * FROM org_roles WHERE user_id = 'user-id';
```

**Test 4: UI rendering**
- Navigate to admin page
- Check tabs appear
- Check components render
- No console errors

---

## 🧪 PART 3: END-TO-END TESTING (1 hour)

### Test Scenario 1: Assign User to Organization

**Steps:**
1. Go to Admin → Enterprise User Management
2. Click "Organization Roles" tab
3. Select an organization
4. Click "Add User to Organization"
5. Select a user
6. Select role (e.g., "org_admin")
7. Click "Add"

**Verify:**
```sql
-- Check in database
SELECT * FROM org_roles 
WHERE user_id = 'selected-user-id' 
AND org_id = 'selected-org-id';

-- Expected: 1 row with role = 'org_admin'
```

### Test Scenario 2: Assign User to Project

**Steps:**
1. Go to Admin → Enterprise User Management
2. Click "Project Roles" tab
3. Select a project
4. Click "Add User to Project"
5. Select a user
6. Select role (e.g., "project_manager")
7. Click "Add"

**Verify:**
```sql
-- Check in database
SELECT * FROM project_roles 
WHERE user_id = 'selected-user-id' 
AND project_id = 'selected-project-id';

-- Expected: 1 row with role = 'project_manager'
```

### Test Scenario 3: Check Permissions

**Steps:**
1. Assign user to org with "org_accountant" role
2. In component, check permission:
```typescript
const { canPerformActionInOrg } = useOptimizedAuth();
const can = canPerformActionInOrg('org-id', 'manage_transactions');
console.log(can); // Should be true
```

### Test Scenario 4: Update Role

**Steps:**
1. Go to Admin → Enterprise User Management
2. Click "Organization Roles" tab
3. Select organization with user
4. Change user's role dropdown
5. Verify change in database

### Test Scenario 5: Remove Role

**Steps:**
1. Go to Admin → Enterprise User Management
2. Click "Organization Roles" tab
3. Select organization with user
4. Click "Remove" button
5. Verify removed from database

### Test Scenario 6: Multiple Roles

**Steps:**
1. Assign user to Org A as "org_admin"
2. Assign user to Org B as "org_viewer"
3. Assign user to Project X as "project_manager"
4. Check permissions:
```typescript
const auth = useOptimizedAuth();
console.log(auth.hasRoleInOrg('org-a', 'org_admin')); // true
console.log(auth.hasRoleInOrg('org-b', 'org_viewer')); // true
console.log(auth.hasRoleInProject('project-x', 'project_manager')); // true
```

---

## 🚀 PART 4: PRODUCTION DEPLOYMENT (30 min)

### Step 4.1: Code Review

**Checklist:**
- [ ] All TypeScript errors fixed
- [ ] All imports correct
- [ ] No console errors
- [ ] All tests passing
- [ ] Code follows project style

### Step 4.2: Staging Test

**Steps:**
1. Deploy to staging environment
2. Run all test scenarios
3. Check for errors
4. Verify performance

### Step 4.3: Production Deployment

**Steps:**
1. Merge to main branch
2. Deploy to production
3. Monitor for errors
4. Check logs

**Rollback plan:**
```bash
# If something goes wrong
git revert <commit-hash>
git push
```

### Step 4.4: Post-Deployment

**Checklist:**
- [ ] All features working
- [ ] No errors in logs
- [ ] Users can assign roles
- [ ] Permissions enforced
- [ ] Performance acceptable

---

## 📋 Complete Checklist

### Pre-Implementation
- [ ] Read all documentation
- [ ] Backup database
- [ ] Have Supabase credentials
- [ ] Test in development first

### Database (Phase 1-4)
- [ ] Phase 1 migration runs
- [ ] Phase 2 migration runs
- [ ] Phase 3 migration runs
- [ ] Phase 4 migration runs
- [ ] Tables created
- [ ] RLS policies active
- [ ] Helper functions work
- [ ] Auth RPC updated

### Frontend
- [ ] Hook updated
- [ ] Service created
- [ ] Components created
- [ ] Integration complete
- [ ] No TypeScript errors
- [ ] No console errors

### Testing
- [ ] Test assign org role
- [ ] Test assign project role
- [ ] Test permission checking
- [ ] Test role updates
- [ ] Test role removal
- [ ] Test multiple roles
- [ ] Test UI rendering
- [ ] All tests pass

### Deployment
- [ ] Code review complete
- [ ] Staging tested
- [ ] Production deployed
- [ ] Monitoring active
- [ ] No issues

---

## 🐛 Troubleshooting

### Issue: TypeScript Errors

**Solution:**
```bash
# Check errors
npm run type-check

# Fix imports
# Fix types
# Run again
```

### Issue: RPC Function Not Working

**Solution:**
```sql
-- Verify function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'get_user_auth_data';

-- Test function
SELECT get_user_auth_data('user-id'::UUID);

-- Check for errors in output
```

### Issue: Permissions Not Working

**Solution:**
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('org_roles', 'project_roles');

-- Check user has role
SELECT * FROM org_roles WHERE user_id = 'user-id';

-- Test permission function
SELECT has_org_role('user-id'::UUID, 'org-id'::UUID, 'org_admin');
```

### Issue: Components Not Rendering

**Solution:**
- Check imports are correct
- Check no TypeScript errors
- Check browser console for errors
- Verify hook is used correctly

---

## 📊 Success Criteria

### Database
- ✅ All 4 migrations deployed
- ✅ Tables created and empty
- ✅ RLS policies active
- ✅ Helper functions work
- ✅ Auth RPC returns correct data

### Frontend
- ✅ Hook loads scoped roles
- ✅ Service methods work
- ✅ Components render
- ✅ Integration complete
- ✅ No errors

### Testing
- ✅ All test scenarios pass
- ✅ Permissions enforced
- ✅ Roles assigned correctly
- ✅ UI works as expected
- ✅ No console errors

### Deployment
- ✅ Code reviewed
- ✅ Staging tested
- ✅ Production deployed
- ✅ Monitoring active
- ✅ No issues

---

## 🎓 Key Concepts

### Scoped Roles
- User can have different roles in different orgs/projects
- Example: Admin in Org A, Viewer in Org B

### Permission Checking
- Check if user has role in org/project
- Check if user can perform action
- Used in components to show/hide features

### Role Assignment
- Assign user to org with role
- Assign user to project with role
- Update or remove roles

### RLS Policies
- Enforce access control at database level
- Users can only see/modify their own roles
- Org admins can manage org roles
- Super admins can manage all roles

---

## 📞 Support

If you encounter issues:

1. Check troubleshooting section
2. Review test scenarios
3. Check browser console
4. Check database logs
5. Review documentation

---

## 🎯 Summary

### What You've Done
- ✅ Deployed scoped roles database
- ✅ Implemented frontend hook and service
- ✅ Created UI components
- ✅ Integrated with admin pages
- ✅ Tested end-to-end
- ✅ Deployed to production

### What's Working
- ✅ Users can be assigned to orgs
- ✅ Users can be assigned to projects
- ✅ Permissions are enforced
- ✅ Roles can be updated/removed
- ✅ UI works correctly

### What's Next
- Monitor for issues
- Gather user feedback
- Optimize if needed
- Plan Phase 6 (if any)

---

**Status:** ✅ COMPLETE END-TO-END GUIDE  
**Total Time:** 5-7 hours  
**Complexity:** MEDIUM  
**Ready to Deploy:** YES

**Start Now:** Follow Part 1 - Database Deployment!

