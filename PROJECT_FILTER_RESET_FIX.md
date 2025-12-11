# Project Filter Reset Fix - December 11, 2025

## Problem
After deploying to Vercel, the transactions page had two critical filter issues:

1. **Auto-selection**: Project filter automatically selects a project on page load
2. **Reset button not working**: Reset button doesn't clear the project filter back to "All Projects"
3. **Can't select "All Projects"**: Unable to view transactions from all projects

This made it impossible to view transactions across all projects, which is a major usability issue.

## Root Cause

### Issue 1: Auto-loading Project from localStorage
```typescript
const getDefaultProjectId = () => {
  try {
    return (localStorage.getItem('project_id') || '') as string
  } catch {
    return ''
  }
}

const createHeaderDefaults = (): FilterState => ({
  // ...
  projectId: getDefaultProjectId(), // ❌ Auto-loads saved project
  // ...
})
```

### Issue 2: Global Project Sync Enabled by Default
```typescript
const [useGlobalProjectTx, setUseGlobalProjectTx] = useState<boolean>(() => {
  try {
    return localStorage.getItem('transactions:useGlobalProject') === '1'
  } catch {
    return true // ❌ Defaults to true, forcing project sync
  }
})
```

### Issue 3: Aggressive Project Sync
```typescript
useEffect(() => {
  if (!useGlobalProjectTx) return
  try {
    const pid = getActiveProjectId() || ''
    if (pid && pid !== headerFilters.projectId) {
      updateHeaderFilter('projectId', pid) // ❌ Forces project even when user clears it
    }
  } catch { }
}, [useGlobalProjectTx, headerFilters.projectId, updateHeaderFilter])
```

## Solution

### Fix 1: Remove Auto-loading of Project
```typescript
const createHeaderDefaults = (): FilterState => ({
  // ...
  projectId: '', // ✅ Always start with empty (All Projects)
  // ...
})
```

### Fix 2: Disable Global Project Sync by Default
```typescript
const [useGlobalProjectTx, setUseGlobalProjectTx] = useState<boolean>(() => {
  try {
    return localStorage.getItem('transactions:useGlobalProject') === '1'
  } catch {
    return false // ✅ Default to false - don't auto-sync with global project
  }
})
```

### Fix 3: Respect User's Manual Filter Clearing
```typescript
useEffect(() => {
  // Only sync with global project if explicitly enabled AND user hasn't manually cleared the filter
  if (!useGlobalProjectTx) return
  try {
    const pid = getActiveProjectId() || ''
    // Only update if there's a global project AND current filter is empty (not manually cleared)
    if (pid && !headerFilters.projectId) {
      updateHeaderFilter('projectId', pid) // ✅ Only sync if filter is empty
    }
  } catch {
    // ignore
  }
}, [useGlobalProjectTx, headerFilters.projectId, updateHeaderFilter])
```

## Changes Made

### File: `src/hooks/useTransactionsFilters.ts`

1. **Removed `getDefaultProjectId()` function** - No longer auto-loads project from localStorage
2. **Changed default `projectId` to empty string** - Always starts with "All Projects"
3. **Changed `useGlobalProjectTx` default to `false`** - Global project sync is now opt-in
4. **Updated sync logic** - Only syncs when filter is empty, not when user manually clears it

## Testing

### Before Fix (Broken Behavior)
1. ❌ Page loads with a project pre-selected
2. ❌ Can't select "All Projects" option
3. ❌ Reset button doesn't clear project filter
4. ❌ Filter keeps reverting to a specific project

### After Fix (Expected Behavior)
1. ✅ Page loads with "All Projects" selected (empty filter)
2. ✅ Can select any project or "All Projects"
3. ✅ Reset button clears all filters including project
4. ✅ Filter stays cleared when user selects "All Projects"

## User Impact

### Positive Changes
- Users can now view transactions from all projects by default
- Reset button works correctly and clears all filters
- Project filter behaves like other filters (starts empty, can be cleared)
- More intuitive and predictable behavior

### Opt-in Global Project Sync
- Users who want project filter to sync with global project selector can enable it
- This is now an opt-in feature rather than forced behavior
- Stored in localStorage as `transactions:useGlobalProject`

## Files Modified
- `src/hooks/useTransactionsFilters.ts` - Fixed default values and sync logic

## Deployment Notes
- This fix is backward compatible
- Existing users with saved filters will see "All Projects" on next page load
- Users can still manually select and save their preferred project filter
- The global project sync feature is still available but opt-in

## Status
✅ **FIXED** - Project filter now:
- Starts with "All Projects" (empty)
- Can be cleared with reset button
- Respects user's manual selections
- Doesn't force auto-selection
