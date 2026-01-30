# Phase 7 Task 7.1: Testing Guide - ScopedRoleAssignment Component

**Status**: Ready for Testing  
**Date**: January 27, 2026  
**Route**: `/settings/user-management`

---

## Testing Environment

### Prerequisites
- ✅ Dev server running (`npm run dev`)
- ✅ Browser open to application
- ✅ Logged in as admin user
- ✅ Browser console open (F12)

### Route Location
```
Settings → User Management → (Add scoped roles tab)
```

**URL**: `http://localhost:3001/settings/user-management`

---

## Integration Points

### Current Structure
The `UserManagementSystem.tsx` component has 4 tabs:
1. **المستخدمين** (Users) - EnterpriseUserManagement
2. **الأدوار** (Roles) - EnterpriseRoleManagement
3. **الصلاحيات** (Permissions) - EnterprisePermissionsManagement
4. **طلبات الوصول** (Access Requests) - AccessRequestManagement

### Where to Add Scoped Roles
Add a 5th tab in `UserManagementSystem.tsx`:
```typescript
{
  label: 'الأدوار المحدودة',
  labelEn: 'Scoped Roles',
  icon: <SecurityIcon />,
  color: theme.palette.success.main,
  description: 'إدارة أدوار المستخدمين على مستوى المنظمة والمشروع'
}
```

---

## Testing Steps

### Step 1: Navigate to User Management
1. Open browser to `http://localhost:3001`
2. Navigate to Settings
3. Click "User Management" or go to `/settings/user-management`
4. Verify page loads without errors

### Step 2: Verify Component Renders
1. Check browser console (F12) for errors
2. Verify all 4 existing tabs visible
3. Verify no TypeScript errors
4. Verify no network errors

### Step 3: Test EnterpriseUserManagement Tab
1. Click "المستخدمين" (Users) tab
2. Verify users list displays
3. Verify search works
4. Verify filters work
5. Verify no errors in console

### Step 4: Test EnterpriseRoleManagement Tab
1. Click "الأدوار" (Roles) tab
2. Verify roles list displays
3. Verify role management works
4. Verify no errors in console

### Step 5: Test EnterprisePermissionsManagement Tab
1. Click "الصلاحيات" (Permissions) tab
2. Verify permissions display
3. Verify permission management works
4. Verify no errors in console

### Step 6: Test AccessRequestManagement Tab
1. Click "طلبات الوصول" (Access Requests) tab
2. Verify access requests display
3. Verify request management works
4. Verify no errors in console

---

## Integration Testing

### Test 1: Add Scoped Roles Tab to UserManagementSystem

**File**: `src/pages/admin/UserManagementSystem.tsx`

**Changes**:
```typescript
// Add import
import { ScopedRoleAssignmentEnhanced } from '../../components/admin/ScopedRoleAssignment_Enhanced';

// Add to tabsData array
{
  label: 'الأدوار المحدودة',
  labelEn: 'Scoped Roles',
  icon: <SecurityIcon />,
  color: theme.palette.success.main,
  description: 'إدارة أدوار المستخدمين على مستوى المنظمة والمشروع'
}

// Add to CustomTabPanel
<CustomTabPanel value={value} index={4}>
  <ScopedRoleAssignmentEnhanced 
    userId={selectedUserId}
    userName={selectedUserName}
    userEmail={selectedUserEmail}
  />
</CustomTabPanel>
```

### Test 2: Verify Component Renders in Tab
1. Add the tab to UserManagementSystem
2. Navigate to `/settings/user-management`
3. Click the new "الأدوار المحدودة" tab
4. Verify component renders
5. Verify no console errors

### Test 3: Test Org Roles Tab
1. In Scoped Roles tab, click "Organization Roles" tab
2. Verify org roles table displays
3. Click "Add Organization Role"
4. Select organization and role
5. Click "Add"
6. Verify role appears in table
7. Click delete button
8. Confirm deletion
9. Verify role removed

### Test 4: Test Project Roles Tab
1. In Scoped Roles tab, click "Project Roles" tab
2. Verify project roles table displays
3. Click "Add Project Role"
4. Select project and role
5. Click "Add"
6. Verify role appears in table
7. Click delete button
8. Confirm deletion
9. Verify role removed

### Test 5: Test System Roles Tab
1. In Scoped Roles tab, click "System Roles" tab
2. Verify system roles display
3. Click "Add Super Admin"
4. Verify role appears
5. Click delete button
6. Confirm deletion
7. Verify role removed
8. Repeat for "Add System Auditor"

---

## Browser Console Testing

### Check for Errors
```javascript
// Open browser console (F12)
// Should see NO errors

// Check for warnings
// Should see minimal warnings

// Check for API calls
// Should see successful Supabase calls
```

### Verify Data Loading
```javascript
// In browser console, check:
console.log('Org roles loaded');
console.log('Project roles loaded');
console.log('System roles loaded');
console.log('Organizations loaded');
console.log('Projects loaded');
```

### Verify Audit Logging
```sql
-- In Supabase, check audit logs:
SELECT * FROM permission_audit_logs 
WHERE user_id = '[test_user_id]' 
ORDER BY created_at DESC 
LIMIT 10;

-- Should see entries for:
-- - CREATE org_role
-- - DELETE org_role
-- - CREATE project_role
-- - DELETE project_role
-- - CREATE system_role
-- - DELETE system_role
```

---

## Manual Testing Checklist

### Component Rendering
- [ ] Component renders without errors
- [ ] All tabs visible (Org, Project, System)
- [ ] Tables render correctly
- [ ] Buttons are clickable
- [ ] Dialogs open/close properly
- [ ] Loading spinner displays during operations
- [ ] Error messages display on failures

### Organization Roles
- [ ] Can view current org roles
- [ ] Can add new org role
- [ ] Can toggle "Can Access All Projects"
- [ ] Can delete org role
- [ ] Confirmation dialog appears before delete
- [ ] Role removed after confirmation
- [ ] Audit log created for add
- [ ] Audit log created for delete

### Project Roles
- [ ] Can view current project roles
- [ ] Can add new project role
- [ ] Can delete project role
- [ ] Confirmation dialog appears before delete
- [ ] Role removed after confirmation
- [ ] Audit log created for add
- [ ] Audit log created for delete

### System Roles
- [ ] Can add super_admin role
- [ ] Can add system_auditor role
- [ ] Cannot add duplicate roles
- [ ] Can delete system roles
- [ ] Confirmation dialog appears before delete
- [ ] Role removed after confirmation
- [ ] Audit log created for add
- [ ] Audit log created for delete

### UI/UX
- [ ] RTL layout correct
- [ ] Arabic labels display correctly
- [ ] English labels display correctly
- [ ] Colors consistent with theme
- [ ] Spacing consistent
- [ ] Typography correct
- [ ] Icons display correctly
- [ ] Mobile responsive (test on 375px width)

### Error Handling
- [ ] Error messages clear and helpful
- [ ] Can dismiss error messages
- [ ] Errors don't break component
- [ ] Can retry after error
- [ ] Loading state clears after error

### Performance
- [ ] Page loads quickly
- [ ] No lag when interacting
- [ ] No memory leaks
- [ ] No unnecessary re-renders
- [ ] API calls optimized
- [ ] Images optimized
- [ ] Bundle size acceptable

---

## Troubleshooting

### Issue: Component Not Rendering
**Solution**:
1. Check browser console for errors
2. Verify imports are correct
3. Check TypeScript compilation
4. Verify Supabase connection
5. Check network tab for failed requests

### Issue: Buttons Not Working
**Solution**:
1. Check browser console for errors
2. Verify API calls in Network tab
3. Check Supabase RLS policies
4. Verify user permissions
5. Check database tables exist

### Issue: Data Not Loading
**Solution**:
1. Check Supabase connection
2. Verify RLS policies
3. Check database tables exist
4. Verify data in tables
5. Check network tab for failed requests

### Issue: Audit Logging Not Working
**Solution**:
1. Check permissionAuditService
2. Verify org_id is available
3. Check permission_audit_logs table
4. Verify user has permission to log
5. Check Supabase connection

### Issue: RTL Layout Broken
**Solution**:
1. Add dir="rtl" to parent Box
2. Check text alignment
3. Verify Arabic fonts loaded
4. Check MUI RTL support
5. Test in different browsers

---

## Success Criteria

✅ Component renders without errors  
✅ All tabs functional  
✅ Org roles management works  
✅ Project roles management works  
✅ System roles management works  
✅ Audit logging works  
✅ Error handling works  
✅ RTL layout correct  
✅ Mobile responsive  
✅ No console errors  

---

## Next Steps After Testing

### If All Tests Pass
1. ✅ Component ready for integration
2. ✅ Component ready for code review
3. ✅ Component ready for deployment
4. ⏳ Move to Task 7.2

### If Issues Found
1. ⏳ Document issues
2. ⏳ Fix issues
3. ⏳ Re-test
4. ⏳ Repeat until all tests pass

---

## Test Results Template

```
Date: [Date]
Tester: [Name]
Component: ScopedRoleAssignment_Enhanced
Route: /settings/user-management

Component Rendering: [PASS/FAIL]
Organization Roles: [PASS/FAIL]
Project Roles: [PASS/FAIL]
System Roles: [PASS/FAIL]
UI/UX: [PASS/FAIL]
Error Handling: [PASS/FAIL]
Performance: [PASS/FAIL]
Accessibility: [PASS/FAIL]

Overall: [PASS/FAIL]

Issues Found:
- [Issue 1]
- [Issue 2]
- [Issue 3]

Notes:
[Any additional notes]
```

---

## Quick Reference

### Component File
```
src/components/admin/ScopedRoleAssignment_Enhanced.tsx
```

### Integration File
```
src/pages/admin/UserManagementSystem.tsx
```

### Route
```
/settings/user-management
```

### Services Used
```
scopedRolesService
permissionAuditService
useOptimizedAuth
```

### Database Tables
```
org_roles
project_roles
system_roles
organizations
projects
permission_audit_logs
```

---

## Contact

**Questions?** Refer to:
- [Phase 7 Quick Start](PHASE_7_QUICK_START.md)
- [Phase 7 Code Examples](PHASE_7_TASK_7_1_CODE_EXAMPLES.md)
- [Phase 7 Implementation Plan](PHASE_7_SCOPED_ROLES_UI_IMPLEMENTATION_PLAN.md)

---

**Status**: Ready for Testing  
**Next Action**: Integrate component into UserManagementSystem and test
