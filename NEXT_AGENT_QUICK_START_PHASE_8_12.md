# Next Agent Quick Start - Phase 8-12 (Remaining Auth System)

**For:** Next AI Agent  
**Date:** January 27, 2026  
**Time Available:** ~8-12 hours  
**Status:** Phase 7 Complete ✅ → Phase 8 Ready ⏳

---

## 🎯 YOUR MISSION

Complete the enterprise auth system by:
1. Deploying scoped roles migration to database (Phase 8)
2. Updating frontend hook for scoped roles (Phase 9)
3. Testing end-to-end (Phase 10)
4. Fixing any remaining issues (Phase 11)
5. Deploying to production (Phase 12)

---

## ⚡ PHASE 8: DEPLOY SCOPED ROLES (2-3 hours)

### Step 1: Backup Database
```bash
# Create backup
pg_dump -h db.supabase.co -U postgres -d postgres > backup_before_scoped_roles.sql
```

### Step 2: Deploy 4 Migrations (In Order)

**Migration 1: Create Tables**
```
File: supabase/migrations/20260126_create_scoped_roles_tables.sql
Action: Copy entire file → Supabase SQL Editor → Run
Verify: SELECT COUNT(*) FROM system_roles; (should work)
```

**Migration 2: Migrate Data**
```
File: supabase/migrations/20260126_migrate_to_scoped_roles_data.sql
Action: Copy entire file → Supabase SQL Editor → Run
Verify: SELECT COUNT(*) FROM org_roles; (should have data)
```

**Migration 3: Update RLS**
```
File: supabase/migrations/20260126_update_rls_for_scoped_roles.sql
Action: Copy entire file → Supabase SQL Editor → Run
Verify: SELECT * FROM pg_policies WHERE table_name = 'organizations'; (should have new policies)
```

**Migration 4: Update RPC**
```
File: supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql
Action: Copy entire file → Supabase SQL Editor → Run
Verify: SELECT * FROM rpc('get_user_auth_data', '{"p_user_id": "user-id"}'); (should return org_roles and project_roles)
```

### Step 3: Verify All Migrations

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('system_roles', 'org_roles', 'project_roles');

-- Check data migrated
SELECT COUNT(*) as system_roles FROM system_roles;
SELECT COUNT(*) as org_roles FROM org_roles;
SELECT COUNT(*) as project_roles FROM project_roles;

-- Check RPC works
SELECT * FROM rpc('get_user_auth_data', '{"p_user_id": "user-id"}');
```

**Expected Result:** ✅ All migrations successful, data migrated, RPC returns org_roles and project_roles

---

## ⚡ PHASE 9: UPDATE FRONTEND HOOK (1-2 hours)

### File: src/hooks/useOptimizedAuth.ts

### Change 1: Add Scoped Roles to Interface
```typescript
interface AuthCacheEntry {
  // ... existing fields ...
  orgRoles: OrgRole[];
  projectRoles: ProjectRole[];
}
```

### Change 2: Update Cache Functions
```typescript
// In getCachedAuthData()
const orgRoles = cached.orgRoles || [];
const projectRoles = cached.projectRoles || [];

// In setCachedAuthData()
// Add parameters: orgRoles, projectRoles
// Store in cache
```

### Change 3: Update loadAuthData()
```typescript
// Extract from RPC response
const orgRoles = authData.org_roles || [];
const projectRoles = authData.project_roles || [];

// Store in state
authState.orgRoles = orgRoles;
authState.projectRoles = projectRoles;

// Update cache calls to include scoped roles
setCachedAuthData(
  userId, 
  profile, 
  finalRoles,
  organizations,
  projects,
  defaultOrg,
  orgRoles,
  projectRoles
);
```

### Change 4: Update Permission Functions (6 functions)

```typescript
// 1. hasRoleInOrg(orgId, role)
const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
return orgRole?.role === role;

// 2. hasRoleInProject(projectId, role)
const projectRole = authState.projectRoles.find(r => r.project_id === projectId);
return projectRole?.role === role;

// 3. canPerformActionInOrg(orgId, action)
const permissions = {
  org_admin: ['manage_users', 'manage_projects', 'manage_transactions', 'view'],
  org_manager: ['manage_users', 'manage_projects', 'view'],
  org_accountant: ['manage_transactions', 'view'],
  org_auditor: ['view'],
  org_viewer: ['view'],
};
const role = authState.orgRoles.find(r => r.org_id === orgId)?.role;
return permissions[role]?.includes(action) || false;

// 4. canPerformActionInProject(projectId, action)
const permissions = {
  project_manager: ['manage', 'create', 'edit', 'view'],
  project_contributor: ['create', 'edit', 'view'],
  project_viewer: ['view'],
};
const role = authState.projectRoles.find(r => r.project_id === projectId)?.role;
return permissions[role]?.includes(action) || false;

// 5. getUserRolesInOrg(orgId)
return authState.orgRoles
  .filter(r => r.org_id === orgId)
  .map(r => r.role);

// 6. getUserRolesInProject(projectId)
return authState.projectRoles
  .filter(r => r.project_id === projectId)
  .map(r => r.role);
```

### Change 5: Update Hook Export
```typescript
return {
  // ... existing fields ...
  orgRoles: state.orgRoles,
  projectRoles: state.projectRoles,
  hasRoleInOrg,
  hasRoleInProject,
  canPerformActionInOrg,
  canPerformActionInProject,
  getUserRolesInOrg,
  getUserRolesInProject,
};
```

### Verify Changes
```bash
npm run type-check  # Should have 0 errors
npm run test        # Should pass
npm run build       # Should succeed
```

---

## ⚡ PHASE 10: END-TO-END TESTING (2-3 hours)

### Test 1: Database Verification (15 min)
```sql
-- Run these queries
SELECT COUNT(*) as system_roles FROM system_roles;
SELECT COUNT(*) as org_roles FROM org_roles;
SELECT COUNT(*) as project_roles FROM project_roles;

-- Verify RLS works
SELECT * FROM organizations WHERE id = 'org-id';
-- Should return data if user has access
```

### Test 2: RPC Function Verification (15 min)
```sql
-- Test RPC returns correct data
SELECT * FROM rpc('get_user_auth_data', '{"p_user_id": "user-id"}');

-- Verify response includes:
-- - profile
-- - roles
-- - organizations
-- - projects
-- - default_org
-- - org_roles (NEW)
-- - project_roles (NEW)
```

### Test 3: Frontend Hook Verification (15 min)
```typescript
// In browser console
const { 
  orgRoles, 
  projectRoles,
  hasRoleInOrg,
  hasRoleInProject,
  canPerformActionInOrg,
  canPerformActionInProject,
  getUserRolesInOrg,
  getUserRolesInProject
} = useOptimizedAuth();

// Verify data loaded
console.log('Org roles:', orgRoles);
console.log('Project roles:', projectRoles);

// Verify functions work
console.log('Has org_admin in org-id:', hasRoleInOrg('org-id', 'org_admin'));
console.log('Can manage users in org-id:', canPerformActionInOrg('org-id', 'manage_users'));
```

### Test 4: UI Component Testing (1 hour)

**Test Scenario 1: Multi-Org User**
```
User: Ahmed
Setup:
  - Company A: org_admin
  - Company B: org_viewer

Test:
  1. Login as Ahmed
  2. Select Company A
  3. Verify can manage users (org_admin)
  4. Select Company B
  5. Verify can only view (org_viewer)
  
Expected: ✅ Different permissions per org
```

**Test Scenario 2: Project-Based Access**
```
User: Sara
Setup:
  - Project X: project_manager
  - Project Y: project_viewer

Test:
  1. Login as Sara
  2. Select Project X
  3. Verify can manage (project_manager)
  4. Select Project Y
  5. Verify can only view (project_viewer)
  
Expected: ✅ Different permissions per project
```

**Test Scenario 3: Super Admin**
```
User: Admin
Setup:
  - system_roles: super_admin

Test:
  1. Login as Admin
  2. Verify can access all orgs
  3. Verify can access all projects
  4. Verify can perform all actions
  
Expected: ✅ Full system access
```

### Test 5: Permission Matrix Verification (30 min)

**Org Roles:**
- org_admin: manage_users, manage_projects, manage_transactions, view ✅
- org_manager: manage_users, manage_projects, view ✅
- org_accountant: manage_transactions, view ✅
- org_auditor: view ✅
- org_viewer: view ✅

**Project Roles:**
- project_manager: manage, create, edit, view ✅
- project_contributor: create, edit, view ✅
- project_viewer: view ✅

---

## ⚡ PHASE 11: FIX REMAINING ISSUES (2-4 hours)

### Common Issues & Solutions

**Issue 1: 400 Error on user_profiles**
```
Error: GET /rest/v1/user_profiles → 400 Bad Request
Solution: Check RLS policies, verify user has permission
```

**Issue 2: RLS Policy Blocking Access**
```
Error: 42501 - permission denied for schema public
Solution: Check RLS policies, verify user has org_role
```

**Issue 3: Scoped Roles Not Loaded**
```
Error: orgRoles is empty array
Solution: Check RPC returns org_roles, verify data migrated
```

**Issue 4: Permission Check Failing**
```
Error: User cannot perform action
Solution: Check permission matrix, verify role assigned
```

### Debug Steps
1. Check browser console for errors
2. Check database logs for RLS errors
3. Run diagnostic SQL queries
4. Verify RPC returns correct data
5. Check frontend hook state

---

## ⚡ PHASE 12: PRODUCTION DEPLOYMENT (1-2 hours)

### Pre-Deployment Checklist
- [ ] All tests pass
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Team notified

### Deployment Steps

**Step 1: Deploy to Staging**
```bash
npm run build
npm run deploy:staging
# Run smoke tests
npm run test:smoke
```

**Step 2: Deploy to Production**
```bash
# Final backup
pg_dump -h db.supabase.co -U postgres -d postgres > backup_before_prod.sql

# Deploy
npm run build
npm run deploy:prod

# Monitor
# - Check error logs
# - Monitor user feedback
# - Check performance metrics
```

**Step 3: Post-Deployment**
- Verify all systems working
- Check error logs
- Monitor performance
- Be ready to rollback if needed

### Rollback Procedure
```bash
# If issues occur:
# 1. Restore database from backup
psql -h db.supabase.co -U postgres -d postgres < backup_before_prod.sql

# 2. Revert frontend changes
git revert <commit-hash>
npm run build
npm run deploy:prod

# 3. Clear browser cache
# Users should clear localStorage
```

---

## 📊 TIMELINE

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 7 | Fix component issues | DONE | ✅ |
| 8 | Deploy scoped roles | 2-3 hrs | ⏳ |
| 9 | Update frontend hook | 1-2 hrs | ⏳ |
| 10 | End-to-end testing | 2-3 hrs | ⏳ |
| 11 | Fix remaining issues | 2-4 hrs | ⏳ |
| 12 | Production deployment | 1-2 hrs | ⏳ |
| **TOTAL** | **Complete Auth System** | **8-14 hrs** | **⏳** |

---

## 📁 KEY FILES

### Migration Files (Phase 8)
- `supabase/migrations/20260126_create_scoped_roles_tables.sql`
- `supabase/migrations/20260126_migrate_to_scoped_roles_data.sql`
- `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`
- `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`

### Code Files (Phase 9)
- `src/hooks/useOptimizedAuth.ts` - Update this file

### Documentation Files
- `PHASE_7_COMPLETE_HANDOFF_AND_REMAINING_AUTH_SYSTEM.md` - Complete guide
- `SCOPED_ROLES_MIGRATION_GUIDE.md` - Detailed migration guide
- `SCOPED_ROLES_QUICK_START.md` - Quick reference

---

## 🚀 START HERE

1. **Read This File** (5 min) ← You are here
2. **Read PHASE_7_COMPLETE_HANDOFF_AND_REMAINING_AUTH_SYSTEM.md** (15 min)
3. **Read SCOPED_ROLES_MIGRATION_GUIDE.md** (10 min)
4. **Start Phase 8: Deploy Migrations** (2-3 hours)
5. **Continue with Phases 9-12** (5-11 hours)

---

## ✅ SUCCESS CRITERIA

**Phase 8 Complete When:**
- ✅ All 4 migrations deployed successfully
- ✅ Data migrated correctly (counts match)
- ✅ RPC function returns org_roles and project_roles
- ✅ RLS policies working

**Phase 9 Complete When:**
- ✅ Hook updated with scoped roles
- ✅ TypeScript compilation: 0 errors
- ✅ All tests pass
- ✅ Build succeeds

**Phase 10 Complete When:**
- ✅ All database tests pass
- ✅ RPC function verification passes
- ✅ Frontend hook verification passes
- ✅ UI component tests pass

**Phase 11 Complete When:**
- ✅ No remaining permission issues
- ✅ All error scenarios handled
- ✅ All edge cases tested

**Phase 12 Complete When:**
- ✅ Deployed to production
- ✅ All systems working
- ✅ No errors in logs
- ✅ Users can access correctly

---

## 💡 TIPS FOR SUCCESS

1. **Deploy migrations one at a time** - Don't run all 4 at once
2. **Verify each migration** - Check data before moving to next
3. **Test thoroughly** - Use multiple user types
4. **Monitor logs** - Watch for RLS errors
5. **Have rollback ready** - Keep backup handy
6. **Document issues** - Note any problems for future reference

---

## 🎯 YOU'VE GOT THIS!

Phase 7 is complete and production-ready. You have everything you need to complete the auth system. The migrations are ready, the documentation is comprehensive, and the testing plan is clear.

**Estimated Time:** 8-12 hours  
**Complexity:** MEDIUM  
**Risk:** LOW (backward compatible, rollback available)  

**Let's complete this! 🚀**

---

**Questions?** Check `PHASE_7_COMPLETE_HANDOFF_AND_REMAINING_AUTH_SYSTEM.md` for detailed information.
