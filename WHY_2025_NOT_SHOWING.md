# Why 2025 Year Not Showing in Dashboard - Debugging Guide

## The Question
"Why is 2025 year not showing in the dashboard even though it exists in the database?"

## Possible Causes & Solutions

### 1. No Organization Selected

**Symptom**: Dashboard shows warning "Please select an organization first"

**Cause**: The `getActiveOrgId()` function returns null or empty string

**Solution**:
1. Check if you're logged in
2. Check if you have an organization assigned
3. Check browser console for: `Dashboard: Initialized with orgId: <empty or null>`

**Fix**:
```sql
-- Check your user's organization membership
SELECT * FROM user_organizations 
WHERE user_id = auth.uid();

-- If no results, you need to be added to an organization
```

### 2. RLS Policy Blocking Access

**Symptom**: Console shows "Dashboard: Loaded fiscal years { count: 0, years: [] }"

**Cause**: Row-Level Security policy is blocking your access

**Solution**:
```sql
-- Check if you can see the fiscal year directly
SELECT * FROM fiscal_years 
WHERE org_id = 'YOUR_ORG_ID';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'fiscal_years';

-- Test the RLS function
SELECT check_fiscal_org_access('YOUR_ORG_ID');
```

**Fix**: Ensure you have proper permissions in the organization

### 3. Service Error

**Symptom**: Console shows error message

**Cause**: The `FiscalYearService.getAll()` is throwing an error

**Solution**: Check browser console for detailed error message

**Common Errors**:
- "Failed to fetch" → Network/Supabase connection issue
- "PGRST..." → PostgREST/RLS policy issue
- "Invalid organization ID" → orgId is malformed

### 4. Property Mapping Issue (FIXED)

**Symptom**: Console shows data loaded but UI is empty

**Cause**: Property names don't match (snake_case vs camelCase)

**Status**: ✅ FIXED in latest code update

**What was fixed**:
```typescript
// BEFORE (wrong)
name: y.name_ar || y.name_en || `FY ${y.year_number}`

// AFTER (correct)
name: y.nameAr || y.nameEn || `FY ${y.yearNumber}`
```

### 5. Component Not Rendering

**Symptom**: Blank page or loading forever

**Cause**: React component error or infinite loop

**Solution**: Check browser console for React errors

## Debugging Steps

### Step 1: Open Browser Console
Press F12 and look for these messages:

```javascript
// Good signs:
Dashboard: Initialized with orgId: <uuid>
Dashboard: loadDashboardData called with orgId: <uuid>
Dashboard: Fetching fiscal years for orgId: <uuid>
Dashboard: Loaded fiscal years { count: 1, years: [...] }
Dashboard: Mapped fiscal years { list: [...] }

// Bad signs:
Dashboard: Initialized with orgId: (empty)
Dashboard: No orgId available
Dashboard: Failed to load fiscal years <error>
```

### Step 2: Check Network Tab
1. Open DevTools → Network
2. Filter by "fiscal_years"
3. Look for the API request
4. Check the response:
   - Status 200 → Success
   - Status 401 → Not authenticated
   - Status 403 → No permission
   - Status 404 → Not found

### Step 3: Verify Database
Run this query in Supabase SQL Editor:

```sql
-- Replace with your actual org_id
SELECT 
  id,
  year_number,
  name_en,
  start_date,
  end_date,
  status,
  is_current
FROM fiscal_years
WHERE org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'
ORDER BY year_number DESC;
```

Expected result:
```
id: c70526d2-c65d-4176-a6a1-274ddbaabce9
year_number: 2025
name_en: 2025
start_date: 2025-01-01
end_date: 2025-12-31
status: active
is_current: false
```

### Step 4: Test RLS Policies
```sql
-- Test if you can access the fiscal year
SELECT check_fiscal_org_access('bc16bacc-4fbe-4aeb-8ab1-fef2d895b441');
-- Should return: true

-- Check your user's org membership
SELECT * FROM user_organizations 
WHERE user_id = auth.uid()
  AND org_id = 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441';
-- Should return at least one row
```

## Expected Console Output (Working)

When everything is working correctly, you should see:

```javascript
Dashboard: Initialized with orgId: bc16bacc-4fbe-4aeb-8ab1-fef2d895b441
Dashboard: loadDashboardData called with orgId: bc16bacc-4fbe-4aeb-8ab1-fef2d895b441
Dashboard: Fetching fiscal years for orgId: bc16bacc-4fbe-4aeb-8ab1-fef2d895b441
Dashboard: Loaded fiscal years {
  count: 1,
  years: [{
    id: "c70526d2-c65d-4176-a6a1-274ddbaabce9",
    orgId: "bc16bacc-4fbe-4aeb-8ab1-fef2d895b441",
    yearNumber: 2025,
    nameEn: "2025",
    nameAr: null,
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    status: "active",
    isCurrent: false
  }]
}
Dashboard: Mapped fiscal years {
  list: [{
    id: "c70526d2-c65d-4176-a6a1-274ddbaabce9",
    name: "2025",
    range: "2025-01-01 — 2025-12-31",
    status: "active",
    yearNumber: 2025,
    isCurrent: false
  }]
}
```

And the UI should show:

```
┌─────────────────────────────┐
│ 2025                        │
│ 2025-01-01 — 2025-12-31    │
│ [active]                    │
└─────────────────────────────┘
```

## Quick Fixes

### If orgId is empty:
1. Make sure you're logged in
2. Check if you're assigned to an organization
3. Try refreshing the page

### If RLS is blocking:
```sql
-- Grant yourself access (run as admin)
INSERT INTO user_organizations (user_id, org_id, role)
VALUES (
  'YOUR_USER_ID',
  'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441',
  'admin'
);
```

### If data loads but UI is empty:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check for React errors in console

### If nothing works:
1. Check all console logs
2. Check network tab for API errors
3. Run diagnostic SQL queries
4. Verify RLS policies
5. Contact support with console logs

## Summary

The most common reasons 2025 doesn't show:

1. ❌ **No orgId** → Not logged in or no organization assigned
2. ❌ **RLS blocking** → No permission to view fiscal years
3. ❌ **Service error** → API/network issue
4. ✅ **Property mapping** → FIXED in latest code
5. ❌ **Component error** → React rendering issue

**Next Step**: Open the dashboard and check browser console for the exact error message.
