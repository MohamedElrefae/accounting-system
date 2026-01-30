# Scoped Roles - Phase 6: Testing Guide

**Date:** January 27, 2026  
**Status:** READY FOR TESTING  
**Duration:** 30-45 minutes

---

## 🧪 Quick Test Checklist

- [ ] RPC returns org_roles and project_roles
- [ ] Hook loads scoped roles correctly
- [ ] Permission functions work correctly
- [ ] Cache persists scoped roles
- [ ] Logout clears scoped roles
- [ ] Super admin override works
- [ ] Permission matrix is correct
- [ ] No console errors
- [ ] Performance is acceptable

---

## 🔍 Test 1: Verify RPC Returns Data

### Prerequisites
- Access to Supabase SQL editor
- User ID to test with

### Steps

1. Open Supabase SQL editor
2. Run this query:
```sql
SELECT * FROM rpc('get_user_auth_data', '{"p_user_id": "YOUR_USER_ID"}');
```

3. Check the response includes:
```json
{
  "profile": {...},
  "roles": ["admin", "manager"],
  "organizations": ["org-1", "org-2"],
  "projects": ["proj-1", "proj-2"],
  "default_org": "org-1",
  "org_roles": [
    {
      "org_id": "org-1",
      "role": "org_admin",
      "can_access_all_projects": true
    }
  ],
  "project_roles": [
    {
      "project_id": "proj-1",
      "role": "project_manager"
    }
  ]
}
```

### Expected Result
✅ RPC returns org_roles and project_roles arrays  
✅ Each org_role has org_id, role, can_access_all_projects  
✅ Each project_role has project_id and role  

---

## 🔍 Test 2: Verify Hook Loads Data

### Prerequisites
- Application running in development mode
- User logged in
- Browser developer console open

### Steps

1. Open browser developer console (F12)
2. Run this command:
```javascript
const auth = useOptimizedAuth();
console.log('Org Roles:', auth.orgRoles);
console.log('Project Roles:', auth.projectRoles);
```

3. Check the output shows:
```javascript
Org Roles: [
  { org_id: "org-1", role: "org_admin", can_access_all_projects: true },
  { org_id: "org-2", role: "org_manager", can_access_all_projects: false }
]

Project Roles: [
  { project_id: "proj-1", role: "project_manager" },
  { project_id: "proj-2", role: "project_contributor" }
]
```

### Expected Result
✅ orgRoles array is populated  
✅ projectRoles array is populated  
✅ Data matches RPC response  

---

## 🔍 Test 3: Test Permission Functions

### Prerequisites
- Application running
- User logged in
- Browser developer console open

### Steps

1. Open browser developer console
2. Get the hook:
```javascript
const auth = useOptimizedAuth();
```

3. Test hasRoleInOrg:
```javascript
// Should return true if user has org_admin role in org-1
console.log(auth.hasRoleInOrg('org-1', 'org_admin')); // true

// Should return false if user doesn't have that role
console.log(auth.hasRoleInOrg('org-1', 'org_viewer')); // false

// Should return true for super admin
console.log(auth.hasRoleInOrg('any-org', 'any-role')); // true (if super admin)
```

4. Test hasRoleInProject:
```javascript
// Should return true if user has project_manager role in proj-1
console.log(auth.hasRoleInProject('proj-1', 'project_manager')); // true

// Should return false if user doesn't have that role
console.log(auth.hasRoleInProject('proj-1', 'project_viewer')); // false
```

5. Test canPerformActionInOrg:
```javascript
// org_admin can manage_users
console.log(auth.canPerformActionInOrg('org-1', 'manage_users')); // true

// org_admin can manage_projects
console.log(auth.canPerformActionInOrg('org-1', 'manage_projects')); // true

// org_accountant can only manage_transactions and view
console.log(auth.canPerformActionInOrg('org-2', 'manage_transactions')); // true/false
```

6. Test canPerformActionInProject:
```javascript
// project_manager can manage
console.log(auth.canPerformActionInProject('proj-1', 'manage')); // true

// project_manager can create
console.log(auth.canPerformActionInProject('proj-1', 'create')); // true

// project_viewer can only view
console.log(auth.canPerformActionInProject('proj-2', 'view')); // true
```

7. Test getUserRolesInOrg:
```javascript
// Should return array of roles in org-1
console.log(auth.getUserRolesInOrg('org-1')); // ['org_admin']

// Should return array of roles in org-2
console.log(auth.getUserRolesInOrg('org-2')); // ['org_manager']
```

8. Test getUserRolesInProject:
```javascript
// Should return array of roles in proj-1
console.log(auth.getUserRolesInProject('proj-1')); // ['project_manager']

// Should return array of roles in proj-2
console.log(auth.getUserRolesInProject('proj-2')); // ['project_contributor']
```

### Expected Result
✅ All permission functions return correct values  
✅ Super admin override works  
✅ Permission matrix is correct  
✅ No errors in console  

---

## 🔍 Test 4: Test Cache Persistence

### Prerequisites
- Application running
- User logged in
- Browser developer console open

### Steps

1. Open browser developer console
2. Check initial load:
```javascript
// Should see cache miss on first load
// Check console for: "[Auth] RPC load completed in XXXms"
```

3. Refresh the page (F5)
4. Check cache hit:
```javascript
// Should see cache hit on refresh
// Check console for: "[Auth] Using cached auth data with stampede protection"
// Check console for: "[Auth] Loaded from cache in XXXms"
```

5. Verify cached data is correct:
```javascript
const auth = useOptimizedAuth();
console.log('Org Roles:', auth.orgRoles);
console.log('Project Roles:', auth.projectRoles);
// Should match previous values
```

6. Wait 30 minutes (or modify cache duration for testing)
7. Refresh page
8. Should see cache miss and fresh data load

### Expected Result
✅ First load: RPC call (cache miss)  
✅ Refresh: Cache hit (fast load)  
✅ After 30 min: Cache miss (fresh data)  
✅ Cached data matches RPC data  

---

## 🔍 Test 5: Test Logout

### Prerequisites
- Application running
- User logged in
- Browser developer console open

### Steps

1. Check initial state:
```javascript
const auth = useOptimizedAuth();
console.log('Before logout:', {
  orgRoles: auth.orgRoles,
  projectRoles: auth.projectRoles,
  user: auth.user
});
```

2. Sign out:
```javascript
await auth.signOut();
```

3. Check state after logout:
```javascript
const auth = useOptimizedAuth();
console.log('After logout:', {
  orgRoles: auth.orgRoles,
  projectRoles: auth.projectRoles,
  user: auth.user
});
```

### Expected Result
✅ Before logout: orgRoles and projectRoles populated  
✅ After logout: orgRoles and projectRoles are empty arrays  
✅ After logout: user is null  
✅ Cache is cleared  

---

## 🔍 Test 6: Test Super Admin Override

### Prerequisites
- Application running
- Super admin user logged in
- Browser developer console open

### Steps

1. Get hook:
```javascript
const auth = useOptimizedAuth();
```

2. Test super admin override:
```javascript
// Super admin should have access to any org
console.log(auth.hasRoleInOrg('any-org-id', 'any-role')); // true

// Super admin should have access to any project
console.log(auth.hasRoleInProject('any-project-id', 'any-role')); // true

// Super admin should be able to perform any action in any org
console.log(auth.canPerformActionInOrg('any-org-id', 'manage_users')); // true

// Super admin should be able to perform any action in any project
console.log(auth.canPerformActionInProject('any-project-id', 'manage')); // true
```

### Expected Result
✅ Super admin has access to all orgs  
✅ Super admin has access to all projects  
✅ Super admin can perform all actions  

---

## 🔍 Test 7: Test Permission Matrix

### Prerequisites
- Application running
- User with different roles
- Browser developer console open

### Steps

1. Test org_admin permissions:
```javascript
const auth = useOptimizedAuth();
const orgId = 'org-with-admin-role';

// org_admin can do everything
console.log(auth.canPerformActionInOrg(orgId, 'manage_users')); // true
console.log(auth.canPerformActionInOrg(orgId, 'manage_projects')); // true
console.log(auth.canPerformActionInOrg(orgId, 'manage_transactions')); // true
console.log(auth.canPerformActionInOrg(orgId, 'view')); // true
```

2. Test org_manager permissions:
```javascript
const orgId = 'org-with-manager-role';

// org_manager can manage users and projects, but not transactions
console.log(auth.canPerformActionInOrg(orgId, 'manage_users')); // true
console.log(auth.canPerformActionInOrg(orgId, 'manage_projects')); // true
console.log(auth.canPerformActionInOrg(orgId, 'manage_transactions')); // false
console.log(auth.canPerformActionInOrg(orgId, 'view')); // true
```

3. Test org_accountant permissions:
```javascript
const orgId = 'org-with-accountant-role';

// org_accountant can only manage transactions and view
console.log(auth.canPerformActionInOrg(orgId, 'manage_users')); // false
console.log(auth.canPerformActionInOrg(orgId, 'manage_projects')); // false
console.log(auth.canPerformActionInOrg(orgId, 'manage_transactions')); // true
console.log(auth.canPerformActionInOrg(orgId, 'view')); // true
```

4. Test org_auditor permissions:
```javascript
const orgId = 'org-with-auditor-role';

// org_auditor can only view
console.log(auth.canPerformActionInOrg(orgId, 'manage_users')); // false
console.log(auth.canPerformActionInOrg(orgId, 'manage_projects')); // false
console.log(auth.canPerformActionInOrg(orgId, 'manage_transactions')); // false
console.log(auth.canPerformActionInOrg(orgId, 'view')); // true
```

5. Test project_manager permissions:
```javascript
const projectId = 'project-with-manager-role';

// project_manager can do everything
console.log(auth.canPerformActionInProject(projectId, 'manage')); // true
console.log(auth.canPerformActionInProject(projectId, 'create')); // true
console.log(auth.canPerformActionInProject(projectId, 'edit')); // true
console.log(auth.canPerformActionInProject(projectId, 'view')); // true
```

6. Test project_contributor permissions:
```javascript
const projectId = 'project-with-contributor-role';

// project_contributor can create, edit, and view
console.log(auth.canPerformActionInProject(projectId, 'manage')); // false
console.log(auth.canPerformActionInProject(projectId, 'create')); // true
console.log(auth.canPerformActionInProject(projectId, 'edit')); // true
console.log(auth.canPerformActionInProject(projectId, 'view')); // true
```

7. Test project_viewer permissions:
```javascript
const projectId = 'project-with-viewer-role';

// project_viewer can only view
console.log(auth.canPerformActionInProject(projectId, 'manage')); // false
console.log(auth.canPerformActionInProject(projectId, 'create')); // false
console.log(auth.canPerformActionInProject(projectId, 'edit')); // false
console.log(auth.canPerformActionInProject(projectId, 'view')); // true
```

### Expected Result
✅ All permission matrices are correct  
✅ Each role has appropriate permissions  
✅ No unexpected permissions granted  

---

## 🔍 Test 8: Performance Test

### Prerequisites
- Application running
- User logged in
- Browser developer console open

### Steps

1. Measure auth load time:
```javascript
// Check console for: "[PERF] Auth: XXXms"
// Should be < 2000ms
```

2. Measure permission check time:
```javascript
const auth = useOptimizedAuth();
const start = performance.now();

for (let i = 0; i < 1000; i++) {
  auth.hasRoleInOrg('org-1', 'org_admin');
}

const end = performance.now();
console.log(`1000 permission checks: ${(end - start).toFixed(2)}ms`);
// Should be < 10ms total (< 0.01ms per check)
```

3. Check memory usage:
```javascript
// Open DevTools Memory tab
// Take heap snapshot
// Check for memory leaks
// Should be < 50MB for auth data
```

### Expected Result
✅ Auth load time < 2 seconds  
✅ Permission check < 10ms for 1000 checks  
✅ No memory leaks  
✅ Cache hit rate > 80%  

---

## 🔍 Test 9: Console Errors

### Prerequisites
- Application running
- Browser developer console open

### Steps

1. Open browser developer console
2. Filter for errors (red messages)
3. Check for any auth-related errors
4. Verify no TypeScript errors
5. Verify no runtime errors

### Expected Result
✅ No console errors  
✅ No TypeScript errors  
✅ No runtime errors  
✅ Only info/debug logs  

---

## 📋 Test Results Template

```markdown
# Phase 6 Testing Results

**Date:** [DATE]  
**Tester:** [NAME]  
**Environment:** [DEV/STAGING/PROD]  

## Test Results

- [ ] Test 1: RPC Returns Data - PASS/FAIL
- [ ] Test 2: Hook Loads Data - PASS/FAIL
- [ ] Test 3: Permission Functions - PASS/FAIL
- [ ] Test 4: Cache Persistence - PASS/FAIL
- [ ] Test 5: Logout - PASS/FAIL
- [ ] Test 6: Super Admin Override - PASS/FAIL
- [ ] Test 7: Permission Matrix - PASS/FAIL
- [ ] Test 8: Performance - PASS/FAIL
- [ ] Test 9: Console Errors - PASS/FAIL

## Issues Found

[List any issues]

## Notes

[Any additional notes]

## Sign-off

Tested by: [NAME]  
Date: [DATE]  
Status: APPROVED / NEEDS FIXES
```

---

## 🚀 Next Steps

After all tests pass:

1. ✅ Run full test suite
2. ✅ Deploy to staging
3. ✅ Run smoke tests
4. ✅ Deploy to production
5. ✅ Monitor for errors
6. ✅ Gather user feedback

---

## 📞 Troubleshooting

### Issue: RPC returns null org_roles
**Solution:** Check that RPC migration was deployed successfully

### Issue: Hook doesn't load scoped roles
**Solution:** Check browser console for errors, verify RPC returns data

### Issue: Permission functions return wrong values
**Solution:** Check permission matrix, verify user roles in database

### Issue: Cache not persisting
**Solution:** Check localStorage is enabled, verify cache duration

### Issue: Performance is slow
**Solution:** Check network tab, verify RPC performance, check cache hit rate

---

**Ready to test Phase 6! Start with Test 1.** ✅

