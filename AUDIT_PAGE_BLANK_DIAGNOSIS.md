# Audit Page Blank - Diagnosis & Solution

**Date**: January 25, 2026  
**Issue**: `/admin/audit` page appears blank

---

## Root Cause Analysis

The page is NOT actually blank - it's showing the correct behavior:

### What's Happening
1. User navigates to `/admin/audit`
2. `AuditManagement` component loads
3. Component calls `useScope()` to get `orgId`
4. If `orgId` is empty/null, component shows: **"يرجى اختيار منظمة أولاً"** (Please select an organization first)
5. This appears as a blank page because it's just text in the center

### Why This is Correct
- The audit system is organization-scoped
- Users must select an organization before viewing audit logs
- This prevents data leakage between organizations

---

## Solution

### For Testing
1. **Select an organization first**:
   - Go to Dashboard
   - Use the organization selector in the top bar
   - Select an organization
   - Then navigate to `/admin/audit`

2. **Expected Result**:
   - Page should show header: "إدارة التدقيق" (Audit Management)
   - Two tabs should appear: "سجلات التدقيق" (Logs) and "التحليلات" (Analytics)
   - Audit logs should display in the table

### For Users
- Always select an organization from the top bar before accessing audit logs
- The page will automatically load audit data for the selected organization

---

## Component Flow

```
User navigates to /admin/audit
    ↓
AuditManagement component loads
    ↓
useScope() hook called
    ↓
orgId = getOrgId() || ''
    ↓
if (!orgId) {
  Show: "يرجى اختيار منظمة أولاً"
} else {
  Show: Audit page with tabs and data
}
```

---

## Verification Steps

### Step 1: Check Organization Selection
- [ ] Open browser DevTools (F12)
- [ ] Go to Console tab
- [ ] Type: `localStorage.getItem('selectedOrgId')`
- [ ] Should return an organization ID (not null/empty)

### Step 2: Check ScopeContext
- [ ] In Console, check if ScopeContext is providing orgId
- [ ] Navigate to Dashboard first
- [ ] Select an organization from the selector
- [ ] Then navigate to `/admin/audit`

### Step 3: Verify Page Loads
- [ ] Page should show header text
- [ ] Two tabs should be visible
- [ ] Audit logs table should appear
- [ ] No console errors

---

## Testing Procedure

### Correct Way to Test
1. Open http://localhost:3001/
2. Log in if needed
3. Look for organization selector in top bar
4. Click and select an organization
5. Navigate to Settings → Audit Management (New)
6. OR directly go to http://localhost:3001/admin/audit
7. Page should now show audit data

### What You Should See
- Header: "إدارة التدقيق"
- Subtitle: "عرض وتحليل سجلات التدقيق والأنشطة الأمنية"
- Two tabs: "سجلات التدقيق" and "التحليلات"
- Audit logs table with columns: Action, Table, Record ID, Timestamp, Details
- Export buttons: JSON, CSV
- Filters: Action, Table, Record ID, Date range

---

## If Still Blank After Selecting Organization

### Troubleshooting

1. **Check Browser Console for Errors**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for red error messages
   - Report any errors found

2. **Check Network Tab**
   - Go to Network tab
   - Look for failed requests
   - Check if API calls to Supabase are failing

3. **Check if Audit Logs Table Exists**
   - Open Supabase dashboard
   - Check if `audit_logs` table exists
   - Check if table has data for the selected organization

4. **Clear Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clear browser cache
   - Close and reopen browser

5. **Check Permission**
   - Verify user has `settings.audit` permission
   - Check in database: `user_permissions` table
   - Look for permission code: `settings.audit`

---

## Expected Behavior Summary

| Scenario | Expected Result |
|----------|-----------------|
| No org selected | Shows: "يرجى اختيار منظمة أولاً" |
| Org selected, no audit logs | Shows: Empty table with headers |
| Org selected, has audit logs | Shows: Table with audit log entries |
| No permission | Shows: Unauthorized page |
| Permission denied | Redirected to /unauthorized |

---

## Files Involved

- `src/pages/admin/AuditManagement.tsx` - Main page component
- `src/components/AuditLogViewer.tsx` - Logs viewer
- `src/components/AuditAnalyticsDashboard.tsx` - Analytics dashboard
- `src/contexts/ScopeContext.tsx` - Organization scope management
- `src/routes/AdminRoutes.tsx` - Route configuration
- `src/data/navigation.ts` - Navigation menu

---

## Next Steps

1. **Test with organization selected** - This is the key step
2. **Check browser console** - Look for any errors
3. **Verify audit logs exist** - Check Supabase database
4. **Test permission check** - Verify user has `settings.audit` permission
5. **Test language support** - Switch between Arabic/English

---

## Success Criteria

✅ Page loads without errors  
✅ Shows "Please select organization" message when no org selected  
✅ Shows audit data when org is selected  
✅ Both tabs work (Logs & Analytics)  
✅ Filters work correctly  
✅ Export buttons work  
✅ Arabic/English support works  
✅ Permission check works  

