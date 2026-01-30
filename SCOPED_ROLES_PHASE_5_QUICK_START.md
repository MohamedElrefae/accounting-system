# Scoped Roles - Phase 5: Quick Start Guide

**Date:** January 26, 2026  
**Status:** ✅ READY TO IMPLEMENT  
**Time:** 2-3 hours

---

## 🚀 Quick Start (Copy-Paste Ready)

### Step 1: Update Hook (30 min)

**File:** `src/hooks/useOptimizedAuth.ts`

Key additions:
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

See: `SCOPED_ROLES_PHASE_5_FRONTEND_PART1.md`

### Step 2: Create Service (15 min)

**File:** `src/services/scopedRolesService.ts`

Key methods:
```typescript
assignOrgRole(assignment)
updateOrgRole(userId, orgId, role)
removeOrgRole(userId, orgId)
assignProjectRole(assignment)
updateProjectRole(userId, projectId, role)
removeProjectRole(userId, projectId)
```

See: `SCOPED_ROLES_PHASE_5_FRONTEND_PART1.md`

### Step 3: Create Components (45 min)

**Files:**
- `src/components/admin/ScopedRoleAssignment.tsx`
- `src/components/admin/OrgRoleAssignment.tsx`
- `src/components/admin/ProjectRoleAssignment.tsx`

See: `SCOPED_ROLES_PHASE_5_FRONTEND_PART2.md`

### Step 4: Integrate (30 min)

**File:** `src/pages/admin/EnterpriseUserManagement.tsx`

Update to use new components:
```typescript
<ScopedRoleAssignment userId={selectedUser} />
<OrgRoleAssignment orgId={selectedOrg} />
<ProjectRoleAssignment projectId={selectedProject} />
```

See: `SCOPED_ROLES_PHASE_5_FRONTEND_PART3.md`

### Step 5: Test (1 hour)

Run test cases from Part 3:
- Test assign org role
- Test assign project role
- Test permission checking
- Test role updates
- Test role removal

---

## 📋 Checklist

### Pre-Implementation
- [ ] Database migrations deployed (Phases 1-4)
- [ ] Data migrated to scoped roles
- [ ] RLS policies verified
- [ ] Auth RPC function updated

### Implementation
- [ ] Hook updated
- [ ] Service created
- [ ] Components created
- [ ] Integration complete
- [ ] Tests passing

### Deployment
- [ ] Code review
- [ ] Staging test
- [ ] Production deploy

---

## 💡 Usage Examples

### Check Permission
```typescript
const { canPerformActionInOrg } = useOptimizedAuth();
if (canPerformActionInOrg(orgId, 'manage_transactions')) {
  // Show transaction form
}
```

### Check Role
```typescript
const { hasRoleInOrg } = useOptimizedAuth();
if (hasRoleInOrg(orgId, 'org_admin')) {
  // Show admin panel
}
```

### Assign User to Org
```typescript
await scopedRolesService.assignOrgRole({
  user_id: userId,
  org_id: orgId,
  role: 'org_admin',
});
```

### Assign User to Project
```typescript
await scopedRolesService.assignProjectRole({
  user_id: userId,
  project_id: projectId,
  role: 'project_manager',
});
```

---

## 🎯 Role Hierarchy

### Org Roles
- `org_admin` - Full control
- `org_manager` - Manage users/projects
- `org_accountant` - Manage transactions
- `org_auditor` - Read-only audit
- `org_viewer` - Read-only

### Project Roles
- `project_manager` - Full control
- `project_contributor` - Create/edit
- `project_viewer` - Read-only

---

## 🧪 Quick Test

```typescript
// Test 1: Assign role
await scopedRolesService.assignOrgRole({
  user_id: 'test-user',
  org_id: 'test-org',
  role: 'org_admin',
});

// Test 2: Check permission
const { canPerformActionInOrg } = useOptimizedAuth();
console.log(canPerformActionInOrg('test-org', 'manage_transactions'));
// Expected: true

// Test 3: Get roles
const { getUserRolesInOrg } = useOptimizedAuth();
console.log(getUserRolesInOrg('test-org'));
// Expected: ['org_admin']
```

---

## 📚 Documentation

### Part 1: Hook & Service
- Update `useOptimizedAuth` hook
- Create `scopedRolesService`
- Add permission functions

### Part 2: UI Components
- `ScopedRoleAssignment` component
- `OrgRoleAssignment` component
- `ProjectRoleAssignment` component

### Part 3: Integration & Testing
- Integration with `EnterpriseUserManagement`
- Usage examples
- Testing guide
- Troubleshooting

---

## ⚡ Common Tasks

### Assign User to Org
```typescript
await scopedRolesService.assignOrgRole({
  user_id: userId,
  org_id: orgId,
  role: 'org_viewer',
});
```

### Update User's Org Role
```typescript
await scopedRolesService.updateOrgRole(
  userId,
  orgId,
  'org_admin'
);
```

### Remove User from Org
```typescript
await scopedRolesService.removeOrgRole(userId, orgId);
```

### Assign User to Project
```typescript
await scopedRolesService.assignProjectRole({
  user_id: userId,
  project_id: projectId,
  role: 'project_viewer',
});
```

### Update User's Project Role
```typescript
await scopedRolesService.updateProjectRole(
  userId,
  projectId,
  'project_manager'
);
```

### Remove User from Project
```typescript
await scopedRolesService.removeProjectRole(userId, projectId);
```

---

## 🐛 Quick Troubleshooting

### Roles Not Loading
- Check RPC function is updated
- Verify data in database
- Check browser console

### Permission Denied
- Check user's roles
- Verify RLS policies
- Check if super_admin

### Component Not Updating
- Call `loadUserRoles()` after changes
- Check state is updating
- Verify hook is used

---

## 📊 Files to Create/Update

| File | Action | Time |
|------|--------|------|
| `src/hooks/useOptimizedAuth.ts` | Update | 30 min |
| `src/services/scopedRolesService.ts` | Create | 15 min |
| `src/components/admin/ScopedRoleAssignment.tsx` | Create | 15 min |
| `src/components/admin/OrgRoleAssignment.tsx` | Create | 15 min |
| `src/components/admin/ProjectRoleAssignment.tsx` | Create | 15 min |
| `src/pages/admin/EnterpriseUserManagement.tsx` | Update | 30 min |
| **Total** | | **2-3 hours** |

---

## ✅ Success Criteria

- [ ] Hook loads scoped roles
- [ ] Service methods work
- [ ] Components render
- [ ] Can assign users to orgs
- [ ] Can assign users to projects
- [ ] Permission checking works
- [ ] All tests pass

---

## 🚀 Deploy

1. Copy code from Part 1, 2, 3
2. Update imports
3. Run tests
4. Deploy to production

---

**Status:** ✅ READY TO IMPLEMENT  
**Time:** 2-3 hours  
**Complexity:** MEDIUM

**Start with:** Part 1 - Update useOptimizedAuth hook

