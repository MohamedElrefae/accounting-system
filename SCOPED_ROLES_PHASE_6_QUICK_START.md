# Scoped Roles - Phase 6: Quick Start

**Status:** READY TO IMPLEMENT  
**Time:** 3-4 hours  
**Complexity:** MEDIUM

---

## 🎯 What Phase 6 Does

Transforms Phase 5 from a UI framework into a fully functional scoped roles system.

**Before Phase 6:**
- Users can assign roles ✅
- UI shows role assignment ✅
- Permission functions exist ✅
- But permissions still use global roles ❌

**After Phase 6:**
- Users can assign roles ✅
- UI shows role assignment ✅
- Permission functions exist ✅
- Permissions use actual org/project roles ✅

---

## 🚀 Quick Implementation

### 1. Update RPC Function (30 min)
Add to `get_user_auth_data` RPC:
```sql
org_roles: SELECT org_id, role, can_access_all_projects FROM org_roles WHERE user_id = p_user_id
project_roles: SELECT project_id, role FROM project_roles WHERE user_id = p_user_id
```

### 2. Update Hook State (20 min)
Add to `useOptimizedAuth.ts`:
```typescript
orgRoles: OrgRole[];
projectRoles: ProjectRole[];
```

### 3. Update Permission Functions (1 hour)
Replace 6 functions to check org_roles/project_roles instead of global roles:
- `hasRoleInOrg()` - Check org_roles table
- `hasRoleInProject()` - Check project_roles table
- `canPerformActionInOrg()` - Use org role permissions
- `canPerformActionInProject()` - Use project role permissions
- `getUserRolesInOrg()` - Return org-specific roles
- `getUserRolesInProject()` - Return project-specific roles

### 4. Update Cache Functions (15 min)
Add orgRoles and projectRoles to cache

### 5. Test & Deploy (1 hour)
- Test RPC returns data
- Test hook loads data
- Test permission functions
- Deploy to production

---

## 📋 Files to Modify

1. **Database:** `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`
2. **Frontend:** `src/hooks/useOptimizedAuth.ts`

That's it! Only 2 files.

---

## ✅ Testing

### Quick Test
```typescript
const { orgRoles, projectRoles, hasRoleInOrg, canPerformActionInOrg } = useOptimizedAuth();

// Should show actual roles
console.log(orgRoles);
console.log(projectRoles);

// Should check actual roles
console.log(hasRoleInOrg('org-id', 'org_admin'));
console.log(canPerformActionInOrg('org-id', 'manage_users'));
```

### Manual Test
1. Assign user org_admin role
2. Verify they can manage users
3. Assign user org_accountant role
4. Verify they can only manage transactions
5. Verify permissions change correctly

---

## 🎯 Success Criteria

✅ RPC returns org_roles and project_roles  
✅ Hook loads org_roles and project_roles  
✅ Permission functions check actual roles  
✅ All tests pass  
✅ No console errors  

---

## 📊 Before & After

### Before Phase 6
```typescript
// Permission functions use global roles
const canPerformActionInOrg = (orgId, action) => {
  // Uses authState.roles (global)
  return authState.roles.includes('admin');
};
```

### After Phase 6
```typescript
// Permission functions use org-specific roles
const canPerformActionInOrg = (orgId, action) => {
  // Uses authState.orgRoles (org-specific)
  const orgRole = authState.orgRoles.find(r => r.org_id === orgId);
  return orgRole?.role === 'org_admin';
};
```

---

## 🔄 Rollback

If issues occur:
1. Revert RPC function
2. Revert hook changes
3. Clear browser cache
4. Investigate root cause

---

## 📞 Support

### Common Issues

**Q: Permission functions still return false**
- A: Check if RPC returns org_roles/project_roles data

**Q: orgRoles is empty**
- A: Verify org_roles records exist in database

**Q: Role inheritance not working**
- A: Check can_access_all_projects flag is set

---

## 🚀 Next Steps

1. Review implementation guide
2. Update RPC function
3. Update hook
4. Test thoroughly
5. Deploy to production

**Estimated Time:** 3-4 hours  
**Ready to start? Go to SCOPED_ROLES_PHASE_6_IMPLEMENTATION_GUIDE.md**

---

## 📚 Documentation

- `SCOPED_ROLES_PHASE_6_IMPLEMENTATION_PLAN.md` - Detailed plan
- `SCOPED_ROLES_PHASE_6_IMPLEMENTATION_GUIDE.md` - Step-by-step guide
- `SCOPED_ROLES_PHASE_6_TESTING_GUIDE.md` - Testing procedures (coming soon)

---

**Phase 6 makes scoped roles fully functional and enterprise-ready!**
