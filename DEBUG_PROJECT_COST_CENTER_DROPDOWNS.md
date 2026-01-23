# Debug Project/Cost Center Dropdown Issue

## Problem
Project Code and Cost Center dropdowns are showing empty despite having 9 projects and 10 cost centers in the database.

## Debug Steps Added

### 1. Console Logging
Added console.log to show what data is being loaded:
```javascript
console.log('Debug - Loaded data:', { 
  accountsCount: acc.length, 
  projectsCount: prj.length, 
  costCentersCount: cc.length,
  projects: prj.slice(0, 3), // Show first 3 projects
  costCenters: cc.slice(0, 3) // Show first 3 cost centers
})
```

### 2. Visual Debug Info
Added debug text in the first row to show:
- How many projects are loaded: `Debug: {projectFlatOptions.length} projects loaded`
- How many cost centers are loaded: `Debug: {ccFlatOptions.length} cost centers loaded`

### 3. TypeScript Fixes
Fixed type errors by changing `|| ''` to `|| undefined` for proper type compatibility.

## How to Test

1. **Open browser console** (F12)
2. **Open manual entry** (click "Manual Entry" button)
3. **Check console output** - should show loaded data counts
4. **Check debug text** in the table - should show option counts

## Expected Results

**If data loads correctly:**
- Console should show: `projectsCount: 9, costCentersCount: 10`
- Debug text should show: `Debug: 9 projects loaded` and `Debug: 10 cost centers loaded`
- Dropdowns should contain actual project/cost center options

**If data doesn't load:**
- Console might show: `projectsCount: 0, costCentersCount: 0`
- Debug text would show: `Debug: 0 projects loaded` and `Debug: 0 cost centers loaded`
- This indicates a data loading or permissions issue

## Next Steps

Based on debug results:
- **If counts are 0**: Check service functions, permissions, or RLS policies
- **If counts are correct but dropdowns empty**: Check SearchableSelect component or data format
- **If everything works**: Remove debug code

The debugging will help identify exactly where the issue occurs.
