# Phase 7 - Browser Testing Quick Start

**Date**: January 27, 2026  
**Status**: Ready to Test ✅  
**Dev Server**: Running on port 3000 ✅

---

## Quick Start (5 Minutes)

### 1. Open Browser
```
URL: http://localhost:3000/settings/user-management
```

### 2. Navigate to Scoped Roles
```
Click Tab 5: "الأدوار المحدودة"
```

### 3. Test Each Tab
```
Organization Roles Tab:
  ✓ Click "Add Role"
  ✓ Select organization
  ✓ Select role
  ✓ Click "Add"
  ✓ Verify success

Project Roles Tab:
  ✓ Click "Add Role"
  ✓ Select project
  ✓ Select role
  ✓ Click "Add"
  ✓ Verify success

System Roles Tab:
  ✓ Click "Add Super Admin"
  ✓ Verify no 400 error
  ✓ Click "Add System Auditor"
  ✓ Verify no 400 error
```

### 4. Check Console
```
F12 → Console tab
Expected: NO errors, NO warnings
```

---

## What to Look For

### ✅ Good Signs
- Components display correctly
- Buttons work without errors
- No 400 errors in console
- No Tooltip warnings
- Success messages appear
- Data updates correctly

### ❌ Bad Signs
- Component doesn't display
- Buttons don't work
- 400 errors in console
- Tooltip warnings
- Error messages appear
- Data doesn't update

---

## If You See 400 Errors

### Check These
1. Browser console (F12)
2. Network tab (F12 → Network)
3. Look for failed requests to system_roles
4. Check the error message

### Common Causes
- `.select('*')` query (should be fixed)
- Supabase connection issue
- RLS policy blocking access
- Invalid column names

### Solution
1. Hard refresh: Ctrl+Shift+R
2. Check dev server logs
3. Verify Supabase connection
4. Check RLS policies

---

## If You See Tooltip Warnings

### Check These
1. Browser console (F12)
2. Look for "MUI: You are providing a disabled `button`"
3. Check which button is causing it

### Solution
1. Verify disabled buttons are wrapped with `<span>`
2. Hard refresh: Ctrl+Shift+R
3. Check component code

---

## Testing Scenarios

### Scenario 1: Add Organization Role
```
1. Go to Organization Roles tab
2. Click "Add Role"
3. Select a user (or use demo user)
4. Select an organization
5. Select a role (e.g., org_admin)
6. Click "Add"
Expected: Role added, success message, no errors
```

### Scenario 2: Add Project Role
```
1. Go to Project Roles tab
2. Click "Add Role"
3. Select a user (or use demo user)
4. Select a project
5. Select a role (e.g., project_manager)
6. Click "Add"
Expected: Role added, success message, no errors
```

### Scenario 3: Add System Role
```
1. Go to System Roles tab
2. Click "Add Super Admin"
Expected: Role added, success message, NO 400 error
3. Click "Add System Auditor"
Expected: Role added, success message, NO 400 error
```

### Scenario 4: Remove Role
```
1. Go to any tab
2. Find a role in the table
3. Click delete/remove button
4. Confirm deletion
Expected: Role removed, success message, no errors
```

### Scenario 5: Error Handling
```
1. Try adding role without selecting user
Expected: Error message "Please select a user"
2. Try invalid operation
Expected: Appropriate error message
3. Dismiss error
Expected: Error message disappears
```

---

## Performance Check

### What to Monitor
1. **Load Time**: Component should load in < 2 seconds
2. **Response Time**: Actions should complete in < 1 second
3. **Memory**: No memory leaks (check DevTools)
4. **Network**: No failed requests

### How to Check
1. Open DevTools (F12)
2. Go to Performance tab
3. Record a session
4. Perform actions
5. Stop recording
6. Check metrics

---

## Mobile Responsive Check

### What to Test
1. **Tablet View**: 768px width
2. **Mobile View**: 375px width
3. **Landscape**: 667px width

### How to Check
1. Open DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Select device or custom size
4. Verify layout works
5. Verify buttons are clickable
6. Verify text is readable

---

## RTL/Arabic Check

### What to Test
1. **Text Direction**: Should be right-to-left
2. **Button Positions**: Should be on right side
3. **Icons**: Should be mirrored
4. **Labels**: Should be in Arabic

### How to Check
1. Look at component layout
2. Verify Arabic text displays
3. Verify buttons are on right
4. Verify layout is mirrored

---

## Audit Logging Check

### What to Test
1. Perform an action (add/remove role)
2. Check Supabase for audit log

### How to Check
1. Go to: https://app.supabase.com
2. Select project
3. Go to: SQL Editor
4. Run query:
```sql
SELECT * FROM permission_audit_logs 
ORDER BY created_at DESC 
LIMIT 10;
```
5. Verify entry exists with:
   - Correct action (ASSIGN/REVOKE/MODIFY)
   - Correct resource_type
   - Correct user_id
   - Correct old_value and new_value

---

## Success Criteria

### All Tests Pass ✅
- [ ] Component displays
- [ ] All tabs work
- [ ] Add role works
- [ ] Remove role works
- [ ] No 400 errors
- [ ] No Tooltip warnings
- [ ] No console errors
- [ ] Success messages display
- [ ] Error messages display
- [ ] Audit logs created
- [ ] RTL layout works
- [ ] Mobile responsive
- [ ] Performance good

### Ready for Task 7.4
Once all tests pass, proceed to:
- Update EnterpriseUserManagement component
- Create scoped-roles view mode
- Integrate all three role assignment components

---

## Quick Commands

### Dev Server
```bash
# Already running on port 3000
# To stop: Ctrl+C in terminal
# To restart: npm run dev
```

### Type Check
```bash
npm run type-check
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

---

## Important Notes

### Demo Mode
- Using sample data for testing
- In production, select real users
- Demo user ID: (check in component)

### Browser Cache
- If seeing old code, hard refresh: Ctrl+Shift+R
- Clear cache if needed: Ctrl+Shift+Delete

### Dev Server
- Running on port 3000
- Hot reload enabled
- Changes auto-refresh browser

---

## Summary

**Status**: Ready for Browser Testing ✅

1. Open: http://localhost:3000/settings/user-management
2. Click Tab 5: "الأدوار المحدودة"
3. Test each tab (Org, Project, System)
4. Check console for errors
5. Verify all functionality works

**Expected**: All tests pass, no errors, ready for Task 7.4

---

**Date**: January 27, 2026  
**Time**: ~15 minutes for full testing  
**Status**: Ready ✅
