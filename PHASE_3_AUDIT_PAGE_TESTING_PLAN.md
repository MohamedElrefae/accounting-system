# Phase 3 - Audit Page Testing Plan

## Overview
After fixing the RPC function name issue, the audit page should now load correctly. This document outlines the comprehensive testing plan to verify all functionality.

## Pre-Testing Setup
1. Ensure dev server is running on port 3001
2. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
3. Log in as superadmin user
4. Select an organization from the top bar

## Test Cases

### Test 1: Page Navigation & Loading
**Objective**: Verify the audit page loads without hanging

**Steps**:
1. Navigate to `/admin/audit` in the browser
2. Observe the page loading

**Expected Results**:
- ✅ Page loads within 2-3 seconds
- ✅ No "Loading..." message persists
- ✅ Both tabs are visible (Audit Logs & Analytics)
- ✅ No console errors related to auth or permissions

**Console Checks**:
- Should NOT see: `[OptimizedProtectedRoute] still loading auth for /admin/audit` (repeating)
- Should see: `[OptimizedProtectedRoute] permissions check` with `actionAllowed: true`

---

### Test 2: Audit Logs Tab
**Objective**: Verify audit logs display correctly

**Steps**:
1. Click on "Audit Logs" tab (should be active by default)
2. Observe the table content

**Expected Results**:
- ✅ Table displays with columns: Action, Table, Record ID, Timestamp, Details
- ✅ Audit logs are visible (if any exist in database)
- ✅ Pagination controls work (if more than 10 records)
- ✅ Filters are functional (Action, Table, Date range)
- ✅ Search by Record ID works
- ✅ Export buttons (JSON/CSV) are visible and clickable

**Data Verification**:
- If no audit logs exist, table should show "No records found" message
- If logs exist, verify they contain:
  - Valid action types (role_assigned, role_revoked, etc.)
  - Valid table names
  - Valid timestamps
  - Expandable details showing old/new values

---

### Test 3: Analytics Dashboard Tab
**Objective**: Verify analytics dashboard displays correctly

**Steps**:
1. Click on "Analytics" tab
2. Observe the dashboard content

**Expected Results**:
- ✅ Summary cards display (Total Actions, Unique Users, Tables Modified, etc.)
- ✅ Charts/graphs render correctly
- ✅ Top users list displays
- ✅ Actions distribution shows
- ✅ Tables modified list shows

**Data Verification**:
- If no audit logs exist, cards should show "0" or "No data"
- If logs exist, verify numbers are reasonable and consistent

---

### Test 4: Arabic Language Support
**Objective**: Verify Arabic translations work correctly

**Steps**:
1. Change language to Arabic (if language switcher available)
2. Navigate to `/admin/audit`
3. Verify all text is in Arabic

**Expected Results**:
- ✅ Page title: "إدارة التدقيق"
- ✅ Tab labels: "سجلات التدقيق" and "التحليلات"
- ✅ All button labels in Arabic
- ✅ All column headers in Arabic
- ✅ RTL layout applied correctly

---

### Test 5: Permission Checks
**Objective**: Verify permission system works correctly

**Steps**:
1. Test with superadmin user (should have access)
2. Test with non-superadmin user (should be denied)

**Expected Results**:
- ✅ Superadmin can access `/admin/audit`
- ✅ Non-superadmin is redirected to `/unauthorized`
- ✅ Permission check completes quickly (not hanging)

---

### Test 6: Export Functionality
**Objective**: Verify export features work

**Steps**:
1. Click "Export JSON" button
2. Verify JSON file downloads
3. Click "Export CSV" button
4. Verify CSV file downloads

**Expected Results**:
- ✅ JSON file contains valid JSON structure
- ✅ CSV file contains comma-separated values
- ✅ Both files contain audit log data
- ✅ File names are descriptive (e.g., `audit_logs_2026-01-25.json`)

---

### Test 7: Filtering & Search
**Objective**: Verify filtering and search functionality

**Steps**:
1. Use Action filter to select specific action type
2. Use Table filter to select specific table
3. Use date range filters
4. Use Record ID search box

**Expected Results**:
- ✅ Filters update table results immediately
- ✅ Multiple filters can be combined
- ✅ "Clear Filters" button resets all filters
- ✅ Search by Record ID finds matching records

---

### Test 8: Expandable Details
**Objective**: Verify expandable row details work

**Steps**:
1. Click on a row in the audit logs table
2. Observe the expanded details

**Expected Results**:
- ✅ Row expands to show full details
- ✅ Old values and new values are displayed
- ✅ IP address is shown (if available)
- ✅ Details are formatted readably

---

### Test 9: Pagination
**Objective**: Verify pagination works correctly

**Steps**:
1. If more than 10 audit logs exist, pagination should show
2. Click "Next" button
3. Click "Previous" button
4. Verify page numbers update

**Expected Results**:
- ✅ Pagination controls appear when needed
- ✅ Navigation between pages works
- ✅ Page indicator shows correct page number
- ✅ Records change when navigating pages

---

### Test 10: Legacy Audit Page
**Objective**: Verify legacy audit page still works

**Steps**:
1. Navigate to `/settings/audit`
2. Verify page loads and displays audit data

**Expected Results**:
- ✅ Legacy page still works
- ✅ Data is consistent with new audit page
- ✅ No errors in console

---

## Browser Console Verification

### Expected Console Logs (Development Mode)
```
[OptimizedProtectedRoute] render Object
[OptimizedProtectedRoute] permissions check {
  pathname: "/admin/audit",
  routeAllowed: true,
  actionAllowed: true,
  requiredAction: "settings.audit"
}
AuditManagement rendered with orgId: [org-uuid]
```

### Should NOT See
```
[OptimizedProtectedRoute] still loading auth for /admin/audit
[OptimizedProtectedRoute] no user, redirecting to /login
Error: RPC function not found
```

---

## Performance Benchmarks

### Expected Load Times
- Page load: < 2 seconds
- Auth check: < 500ms
- Audit logs table render: < 1 second
- Analytics dashboard render: < 1 second

### Network Requests
- Should see 1-2 RPC calls to `get_user_auth_data_with_scope`
- Should see 1 query to fetch audit logs
- Should see 1 query to fetch analytics data

---

## Rollback Plan

If issues occur:
1. Revert changes to `src/hooks/useOptimizedAuth.ts`
2. Restore old RPC function calls to `get_user_auth_data`
3. Restart dev server
4. Clear browser cache

---

## Sign-Off Checklist

- [ ] All 10 test cases pass
- [ ] No console errors
- [ ] Page loads within 2-3 seconds
- [ ] Arabic language support works
- [ ] Export functionality works
- [ ] Filtering and search work
- [ ] Pagination works
- [ ] Legacy audit page still works
- [ ] Performance is acceptable
- [ ] Ready for production deployment

---

## Notes
- The fix addresses the root cause: RPC function name mismatch
- All three RPC calls in `useOptimizedAuth.ts` have been updated
- No other code changes were needed
- The new RPC function returns additional data (organizations, projects, org_roles) for future enhancements
