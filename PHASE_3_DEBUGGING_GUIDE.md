# Phase 3 - Audit Components Debugging Guide

**Date**: January 25, 2026  
**Status**: DEBUGGING PLAN  
**Target**: Fix new audit components for production use

---

## Issues Identified

### Issue 1: AuditManagement Component

**File**: `src/pages/admin/AuditManagement.tsx`

**Problem**: Component uses named exports but imports as default

**Current Code**:
```typescript
import { AuditLogViewer } from '../../components/AuditLogViewer';
import { AuditAnalyticsDashboard } from '../../components/AuditAnalyticsDashboard';
```

**Issue**: Components are exported as named exports but may not be properly exported

**Fix**:
```typescript
// Check if components export correctly
// In AuditLogViewer.tsx:
export const AuditLogViewer: React.FC<{ orgId: string }> = ({ orgId }) => { ... }

// In AuditAnalyticsDashboard.tsx:
export const AuditAnalyticsDashboard: React.FC<{ orgId: string }> = ({ orgId }) => { ... }
```

**Status**: ⚠️ NEEDS VERIFICATION

---

### Issue 2: AuditLogViewer Component

**File**: `src/components/AuditLogViewer.tsx`

**Problems**:

1. **Missing MUI Imports**
   - Uses MUI components but may not import them
   - Need: Box, Button, TextField, Dialog, etc.

2. **Incomplete Component**
   - File ends abruptly at line 150
   - Missing JSX return statement
   - Missing export statement

3. **RPC Function Call**
   - Calls `export_audit_logs_json()` RPC function
   - Need to verify function exists in Supabase
   - Need to verify parameter names match

4. **CSS Import**
   - Imports `./AuditLogViewer.css`
   - Need to verify CSS file exists
   - Need to verify CSS classes are correct

**Fixes Needed**:

1. Add MUI imports:
```typescript
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
```

2. Complete the component:
```typescript
// Add missing JSX
// Add export statement
export default AuditLogViewer;
```

3. Verify RPC function parameters:
```typescript
// Current:
const { data, error } = await supabase.rpc('export_audit_logs_json', {
  p_org_id: orgId,
  p_date_from: filters.date_from ? new Date(filters.date_from) : null,
  p_date_to: filters.date_to ? new Date(filters.date_to) : null,
  p_action_filter: filters.action || null,
});

// Verify these parameters exist in Supabase function
```

**Status**: ⚠️ NEEDS COMPLETION

---

### Issue 3: AuditAnalyticsDashboard Component

**File**: `src/components/AuditAnalyticsDashboard.tsx`

**Problems**:

1. **Missing Chart Library**
   - Uses charts but may not import chart library
   - Need: @mui/x-charts or recharts

2. **Incomplete Component**
   - File ends abruptly at line 100
   - Missing JSX return statement
   - Missing export statement

3. **RPC Function Call**
   - Calls `get_audit_log_summary()` RPC function
   - Need to verify function exists in Supabase
   - Need to verify parameter names match

4. **Data Aggregation**
   - Manually aggregates data from audit_logs
   - May have performance issues with large datasets
   - Should use RPC functions instead

5. **CSS Import**
   - Imports `./AuditAnalyticsDashboard.css`
   - Need to verify CSS file exists
   - Need to verify CSS classes are correct

**Fixes Needed**:

1. Add chart library imports:
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// OR
import { BarChart } from '@mui/x-charts/BarChart';
```

2. Complete the component:
```typescript
// Add missing JSX with charts
// Add export statement
export default AuditAnalyticsDashboard;
```

3. Verify RPC function:
```typescript
// Current:
const { data: summaryData, error: summaryError } = await supabase.rpc(
  'get_audit_log_summary',
  {
    p_org_id: orgId,
    p_date_from: new Date(dateRange.from),
    p_date_to: new Date(dateRange.to),
  }
);

// Verify this function exists in Supabase
```

4. Optimize data aggregation:
```typescript
// Instead of fetching all logs and aggregating:
// Use RPC functions to aggregate on database side
// This will be much faster for large datasets
```

**Status**: ⚠️ NEEDS COMPLETION

---

### Issue 4: CSS Files

**Files**:
- `src/components/AuditLogViewer.css`
- `src/components/AuditAnalyticsDashboard.css`

**Problems**:
- May have CSS class conflicts
- May not support RTL layout
- May not support dark theme

**Fixes Needed**:
1. Verify CSS classes don't conflict with existing styles
2. Add RTL support with `[dir="rtl"]` selectors
3. Add dark theme support with `@media (prefers-color-scheme: dark)`
4. Use theme tokens instead of hardcoded colors

**Status**: ⚠️ NEEDS VERIFICATION

---

### Issue 5: i18n File

**File**: `src/i18n/audit.ts`

**Problems**:
- May not be integrated with main i18n system
- May have missing translations
- May not support all languages

**Fixes Needed**:
1. Verify file structure matches main i18n system
2. Add missing translations
3. Test with all supported languages

**Status**: ⚠️ NEEDS VERIFICATION

---

## Debugging Steps

### Step 1: Verify File Completeness

**Task**: Check if all files are complete

**Commands**:
```bash
# Check file sizes
wc -l src/components/AuditLogViewer.tsx
wc -l src/components/AuditAnalyticsDashboard.tsx
wc -l src/pages/admin/AuditManagement.tsx

# Check for export statements
grep -n "export" src/components/AuditLogViewer.tsx
grep -n "export" src/components/AuditAnalyticsDashboard.tsx
```

**Expected Results**:
- AuditLogViewer.tsx: 300+ lines with export
- AuditAnalyticsDashboard.tsx: 250+ lines with export
- AuditManagement.tsx: 100+ lines with export

---

### Step 2: Verify Imports

**Task**: Check if all imports are correct

**Commands**:
```bash
# Check MUI imports
grep -n "from '@mui" src/components/AuditLogViewer.tsx
grep -n "from '@mui" src/components/AuditAnalyticsDashboard.tsx

# Check Supabase imports
grep -n "from '../utils/supabase" src/components/AuditLogViewer.tsx
grep -n "from '../utils/supabase" src/components/AuditAnalyticsDashboard.tsx
```

**Expected Results**:
- Multiple MUI imports
- Supabase import present
- No missing imports

---

### Step 3: Verify RPC Functions

**Task**: Check if RPC functions exist in Supabase

**SQL Query**:
```sql
-- Check if RPC functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'export_audit%'
OR routine_name LIKE 'get_audit%';
```

**Expected Results**:
- export_audit_logs_json
- export_audit_logs_csv
- get_audit_log_summary
- assign_role_to_user
- revoke_role_from_user

---

### Step 4: Test Component Rendering

**Task**: Test if components render without errors

**Steps**:
1. Create test file: `src/components/__tests__/AuditLogViewer.test.tsx`
2. Create test file: `src/components/__tests__/AuditAnalyticsDashboard.test.tsx`
3. Run tests: `npm run test`
4. Check for errors

**Expected Results**:
- No TypeScript errors
- No rendering errors
- No console warnings

---

### Step 5: Test Data Flow

**Task**: Test if data flows correctly

**Steps**:
1. Add console.log statements
2. Test with sample data
3. Verify data displays correctly
4. Check for data transformation issues

**Expected Results**:
- Data loads correctly
- Data displays correctly
- No data transformation errors

---

### Step 6: Test Filtering

**Task**: Test if filtering works correctly

**Steps**:
1. Apply date range filter
2. Apply action filter
3. Apply table filter
4. Apply user filter
5. Verify results are filtered

**Expected Results**:
- Filters apply correctly
- Results are filtered
- No filter errors

---

### Step 7: Test Export

**Task**: Test if export works correctly

**Steps**:
1. Click export JSON button
2. Verify JSON file downloads
3. Click export CSV button
4. Verify CSV file downloads
5. Verify data is correct

**Expected Results**:
- Files download correctly
- Data is correct
- No export errors

---

### Step 8: Test Arabic Support

**Task**: Test if Arabic support works correctly

**Steps**:
1. Change language to Arabic
2. Verify labels are in Arabic
3. Verify RTL layout is applied
4. Verify text direction is correct

**Expected Results**:
- Labels are in Arabic
- RTL layout is applied
- Text direction is correct

---

## Debugging Checklist

### File Completeness
- [ ] AuditLogViewer.tsx is complete (300+ lines)
- [ ] AuditAnalyticsDashboard.tsx is complete (250+ lines)
- [ ] AuditManagement.tsx is complete (100+ lines)
- [ ] All files have export statements

### Imports
- [ ] All MUI imports present
- [ ] Supabase import present
- [ ] Chart library imports present
- [ ] CSS imports present
- [ ] i18n imports present

### RPC Functions
- [ ] export_audit_logs_json exists
- [ ] export_audit_logs_csv exists
- [ ] get_audit_log_summary exists
- [ ] assign_role_to_user exists
- [ ] revoke_role_from_user exists

### Component Rendering
- [ ] No TypeScript errors
- [ ] No rendering errors
- [ ] No console warnings
- [ ] Components render correctly

### Data Flow
- [ ] Data loads correctly
- [ ] Data displays correctly
- [ ] No data transformation errors
- [ ] Pagination works

### Filtering
- [ ] Date range filter works
- [ ] Action filter works
- [ ] Table filter works
- [ ] User filter works

### Export
- [ ] JSON export works
- [ ] CSV export works
- [ ] PDF export works
- [ ] Data is correct

### Arabic Support
- [ ] Labels are in Arabic
- [ ] RTL layout is applied
- [ ] Text direction is correct
- [ ] Charts display correctly

### Performance
- [ ] Page loads quickly
- [ ] Filters respond quickly
- [ ] Export completes quickly
- [ ] No memory leaks

---

## Common Issues and Solutions

### Issue: "Cannot find module"

**Cause**: Import path is incorrect

**Solution**:
```typescript
// Wrong:
import { AuditLogViewer } from './AuditLogViewer';

// Correct:
import { AuditLogViewer } from '../../components/AuditLogViewer';
```

---

### Issue: "RPC function not found"

**Cause**: Function doesn't exist in Supabase

**Solution**:
1. Check if function exists in Supabase
2. Verify function name is correct
3. Verify function parameters are correct
4. Deploy function if missing

---

### Issue: "Component not rendering"

**Cause**: Component has rendering error

**Solution**:
1. Check browser console for errors
2. Check component JSX syntax
3. Verify all props are passed
4. Add error boundary

---

### Issue: "Data not loading"

**Cause**: RPC function returns no data

**Solution**:
1. Check if data exists in database
2. Verify RLS policies allow access
3. Verify organization ID is correct
4. Check RPC function logic

---

### Issue: "Export not working"

**Cause**: Export function has error

**Solution**:
1. Check RPC function exists
2. Verify function parameters
3. Check browser console for errors
4. Verify file download is allowed

---

## Next Steps

### Immediate (This Week)
1. [ ] Verify file completeness
2. [ ] Verify imports
3. [ ] Verify RPC functions
4. [ ] Test component rendering

### Short Term (Next Week)
1. [ ] Fix any import errors
2. [ ] Complete missing code
3. [ ] Test data flow
4. [ ] Test filtering

### Medium Term (Next 2 Weeks)
1. [ ] Test export functionality
2. [ ] Test Arabic support
3. [ ] Performance testing
4. [ ] Integration testing

### Long Term (Next Month)
1. [ ] Add route and navigation
2. [ ] User testing
3. [ ] Deploy to production
4. [ ] Monitor in production

---

## Resources

### Documentation
- [MUI Documentation](https://mui.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Tools
- VS Code
- Chrome DevTools
- Supabase Dashboard
- Git

### Support
- Team members
- Documentation
- Stack Overflow
- GitHub Issues

---

## Summary

Phase 3 debugging will focus on:
1. Verifying file completeness
2. Fixing import errors
3. Verifying RPC functions
4. Testing component rendering
5. Testing data flow
6. Testing filtering and export
7. Testing Arabic support
8. Performance testing

**Timeline**: 1-2 weeks  
**Effort**: 40-50 hours  
**Risk**: Medium  
**Impact**: High

**Status**: ✅ READY TO START

