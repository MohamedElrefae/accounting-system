# Test Organization Permissions - Quick Guide

**Purpose:** Verify that accountant users can VIEW organizations but cannot MANAGE them.

---

## 🧪 Test Scenario 1: Accountant User (Read-Only)

### Steps

1. **Login as Accountant:**
   - Use accountant credentials
   - Navigate to dashboard

2. **Access Organizations Page:**
   - Go to `/admin/organizations` or click Organizations in menu
   - **Expected:** Page loads successfully ✅

3. **Verify Read-Only Access:**
   - **Expected Results:**
     - ✅ Can see list of organizations
     - ✅ Sees warning message: "⚠️ وضع القراءة فقط - ليس لديك صلاحية لتعديل المؤسسات"
     - ❌ NO "Add" button in header
     - ❌ NO "Edit" buttons on organization cards
     - ❌ NO "Delete" buttons on organization cards
     - ❌ NO "Purge" buttons on organization cards

4. **Verify Organization Details:**
   - **Expected:** Can see all organization information:
     - Organization code
     - Organization name
     - Description
     - Address
     - Phone
     - Email
     - Tax number
     - Active/Inactive status

---

## 🧪 Test Scenario 2: Admin User (Full Access)

### Steps

1. **Login as Admin:**
   - Use admin credentials
   - Navigate to dashboard

2. **Access Organizations Page:**
   - Go to `/admin/organizations`
   - **Expected:** Page loads successfully ✅

3. **Verify Full Access:**
   - **Expected Results:**
     - ✅ Can see list of organizations
     - ❌ NO read-only warning message
     - ✅ "Add" button visible in header
     - ✅ "Edit" buttons visible on all organization cards
     - ✅ "Delete" buttons visible on all organization cards
     - ✅ "Purge" buttons visible on all organization cards

4. **Test Create Organization:**
   - Click "Add" button
   - Fill in organization details
   - Click "Save"
   - **Expected:** Organization created successfully ✅

5. **Test Edit Organization:**
   - Click "Edit" button on any organization
   - Modify organization details
   - Click "Save"
   - **Expected:** Organization updated successfully ✅

6. **Test Delete Organization:**
   - Click "Delete" button on any organization
   - Confirm deletion
   - **Expected:** Organization deleted successfully ✅

---

## 🧪 Test Scenario 3: Security Test (Accountant)

### Steps

1. **Login as Accountant**

2. **Try to Access Management Functions:**
   - Open browser console (F12)
   - Try to trigger management actions (if possible)
   - **Expected:** Error toast appears with message ❌

3. **Verify Database Protection:**
   - Even if frontend is bypassed, database should reject unauthorized actions
   - **Expected:** API calls fail with permission error ❌

---

## ✅ Success Criteria

### Accountant User
- [x] Can view organizations page
- [x] Sees read-only warning
- [x] Cannot see management buttons
- [x] Cannot perform management actions
- [x] Gets error message if tries to access management functions

### Admin User
- [x] Can view organizations page
- [x] No read-only warning
- [x] Can see all management buttons
- [x] Can create organizations
- [x] Can edit organizations
- [x] Can delete organizations

---

## 🐛 If Tests Fail

### Accountant Cannot View Organizations
**Symptom:** Gets "no permission" message or blank page

**Solution:**
1. Check browser console for errors
2. Verify user has valid session
3. Check database RLS policies
4. Verify auth hook is loading correctly

### Accountant Can See Management Buttons
**Symptom:** Sees "Add", "Edit", or "Delete" buttons

**Solution:**
1. Check permission codes in component
2. Verify `hasActionAccess()` is working correctly
3. Check role assignments in database
4. Clear browser cache and reload

### Admin Cannot Manage Organizations
**Symptom:** Buttons hidden or actions fail

**Solution:**
1. Verify admin role has `settings.manage` or `users.manage` permissions
2. Check database RLS policies
3. Verify auth hook is loading permissions correctly
4. Check browser console for errors

---

## 📊 Test Results Template

```
Date: _______________
Tester: _______________

Accountant User Tests:
[ ] Can view organizations page
[ ] Sees read-only warning
[ ] No "Add" button
[ ] No "Edit" buttons
[ ] No "Delete" buttons
[ ] Organization details visible

Admin User Tests:
[ ] Can view organizations page
[ ] No read-only warning
[ ] "Add" button visible
[ ] "Edit" buttons visible
[ ] "Delete" buttons visible
[ ] Can create organization
[ ] Can edit organization
[ ] Can delete organization

Security Tests:
[ ] Accountant gets error if tries management action
[ ] Database rejects unauthorized API calls

Overall Result: [ ] PASS  [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 After Testing

### If All Tests Pass ✅
1. Mark as tested in deployment checklist
2. Proceed with production deployment
3. Monitor for any issues in production

### If Any Tests Fail ❌
1. Document the failure
2. Report to development team
3. Do NOT deploy to production
4. Wait for fix and retest

---

**Last Updated:** January 26, 2026  
**Status:** Ready for Testing
