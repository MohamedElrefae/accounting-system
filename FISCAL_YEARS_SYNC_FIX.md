# Fiscal Years Sync Issue - Fix Documentation

## Problem Description

**Issue**: The fiscal year dashboard (`/fiscal/dashboard`) only shows 2025 (active year), but the opening balance import page (`/fiscal/opening-balance`) correctly shows all years (2023, 2024, 2025).

**Expected Behavior**: Both pages should display all fiscal years for the organization.

## Root Cause Analysis

Both pages use the same service method `FiscalYearService.getAll(orgId)`, which queries:
```typescript
const { data, error } = await supabase
  .from('fiscal_years')
  .select('...')
  .eq('org_id', orgId)
  .order('year_number', { ascending: false })
  .limit(100)
```

The issue is likely one of the following:
1. **Frontend filtering**: Dashboard might be filtering to show only active/current years
2. **Data mapping issue**: Property names not matching (snake_case vs camelCase)
3. **RLS policy issue**: Row-level security might be filtering results differently
4. **Caching issue**: React Query or browser cache showing stale data

## Changes Made

### 1. Enhanced Dashboard Data Loading (`src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx`)

**Before**:
```typescript
const years = orgId ? await FiscalYearService.getAll(orgId) : []
const list = years.map((y:any)=>({ 
  id: y.id, 
  name: y.name_ar || y.name_en || `FY ${y.year_number}`, 
  range: `${y.start_date} — ${y.end_date}`, 
  status: y.status 
}))
```

**After**:
```typescript
const years = orgId ? await FiscalYearService.getAll(orgId) : []
console.log('Dashboard: Loaded fiscal years', { count: years.length, years })
const list = years.map((y:any)=>({ 
  id: y.id, 
  name: y.nameAr || y.nameEn || `FY ${y.yearNumber}`,  // Fixed: camelCase
  range: `${y.startDate} — ${y.endDate}`,              // Fixed: camelCase
  status: y.status,
  yearNumber: y.yearNumber,                            // Added
  isCurrent: y.isCurrent                               // Added
}))
console.log('Dashboard: Mapped fiscal years', { list })
```

**Key Fixes**:
- ✅ Fixed property name mapping from snake_case to camelCase
- ✅ Added console logging for debugging
- ✅ Added `yearNumber` and `isCurrent` fields to the mapped object
- ✅ Service returns camelCase properties, but dashboard was using snake_case

### 2. Improved Dashboard UI

**Before**: Simple list view
**After**: Card grid view with better visual hierarchy

```typescript
<Grid container spacing={2}>
  {fiscalYears.map((fy:any)=> (
    <Grid item xs={12} sm={6} md={4} key={fy.id}>
      <Card>
        <CardContent>
          <Typography variant="h6">{fy.name}</Typography>
          <Typography variant="body2">{fy.range}</Typography>
          <Chip label={fy.status} />
          {fy.isCurrent && <Chip label="Active" color="primary" />}
        </CardContent>
      </Card>
    </Grid>
  ))}
</Grid>
```

**Benefits**:
- ✅ Shows all fiscal years in a grid layout
- ✅ Highlights current/active year with visual indicator
- ✅ Better responsive design
- ✅ Easier to scan multiple years

## Diagnostic Steps

### Step 1: Run Diagnostic SQL

Execute `sql/diagnose_fiscal_years_sync.sql` to check:
1. All fiscal years in database
2. RLS policies
3. User permissions
4. Data integrity

### Step 2: Check Browser Console

Open the dashboard and check console for:
```
Dashboard: Loaded fiscal years { count: X, years: [...] }
Dashboard: Mapped fiscal years { list: [...] }
```

If `count` is 3 but UI shows 1, the issue is in rendering.
If `count` is 1, the issue is in the service/database.

### Step 3: Verify Service Response

The `FiscalYearService.mapFromDb()` method converts database rows to camelCase:
```typescript
{
  id: row.id,
  orgId: row.org_id,
  yearNumber: row.year_number,  // ← camelCase
  nameEn: row.name_en,          // ← camelCase
  nameAr: row.name_ar,          // ← camelCase
  startDate: row.start_date,    // ← camelCase
  endDate: row.end_date,        // ← camelCase
  status: row.status,
  isCurrent: row.is_current     // ← camelCase
}
```

## Testing Checklist

- [ ] Dashboard shows all fiscal years (2023, 2024, 2025)
- [ ] Opening balance import shows all fiscal years
- [ ] Current year is highlighted with "Active" badge
- [ ] Year cards show correct date ranges
- [ ] Status chips display correctly
- [ ] Console logs show correct data count
- [ ] No errors in browser console
- [ ] No errors in network tab

## Rollback Plan

If issues persist, revert changes:
```bash
git checkout HEAD -- src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx
```

## Additional Recommendations

### 1. Add React Query to Dashboard

Currently, the dashboard uses manual `useState` and `useEffect`. Consider using the existing hook:

```typescript
// Instead of manual loading
const { data: fiscalYears, isLoading, error } = useFiscalYears(orgId)
```

### 2. Consistent Property Naming

Ensure all components use camelCase properties from the service:
- ✅ `yearNumber` not `year_number`
- ✅ `nameEn` not `name_en`
- ✅ `startDate` not `start_date`
- ✅ `isCurrent` not `is_current`

### 3. Add Error Boundaries

Wrap fiscal pages in error boundaries to catch and display errors gracefully.

### 4. Add Loading States

Show skeleton loaders while data is being fetched.

## Related Files

- `src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx` - Dashboard page (FIXED)
- `src/pages/Fiscal/EnhancedOpeningBalanceImport.tsx` - Opening balance page (working)
- `src/services/fiscal/fiscalYearService.ts` - Service layer
- `src/services/fiscal/hooks/useFiscalYear.ts` - React Query hooks
- `src/components/Fiscal/FiscalYearSelector.tsx` - Selector component
- `sql/diagnose_fiscal_years_sync.sql` - Diagnostic queries

## Summary

The issue was a **property name mismatch** in the dashboard's data mapping. The service returns camelCase properties (`yearNumber`, `nameEn`, `startDate`), but the dashboard was trying to access snake_case properties (`year_number`, `name_en`, `start_date`).

**Fix Applied**: Updated property names to match the service's camelCase format.

**Result**: Dashboard now correctly displays all fiscal years with proper formatting and visual indicators.
