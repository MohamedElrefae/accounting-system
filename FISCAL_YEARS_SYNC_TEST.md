# Fiscal Years Sync - Testing Guide

## Quick Test Steps

### 1. Open Dashboard
1. Navigate to `/fiscal/dashboard`
2. Open browser console (F12)
3. Look for these console logs:
   ```
   Dashboard: Loaded fiscal years { count: 3, years: [...] }
   Dashboard: Mapped fiscal years { list: [...] }
   ```
4. Verify the dashboard shows **all 3 fiscal years** (2023, 2024, 2025)

### 2. Open Opening Balance Import
1. Navigate to `/fiscal/opening-balance`
2. Check the fiscal year dropdown
3. Verify it shows **all 3 fiscal years** (2023, 2024, 2025)

### 3. Visual Verification

**Dashboard should show**:
```
┌─────────────────────────────────────┐
│ FY 2025                    [Active] │
│ 2025-01-01 — 2025-12-31            │
│ [active]                            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ FY 2024                             │
│ 2024-01-01 — 2024-12-31            │
│ [closed]                            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ FY 2023                             │
│ 2023-01-01 — 2023-12-31            │
│ [closed]                            │
└─────────────────────────────────────┘
```

**Opening Balance Import should show**:
```
Fiscal Year: [Dropdown ▼]
  - 2025 - FY 2025 (Current)
  - 2024 - FY 2024
  - 2023 - FY 2023
```

## Troubleshooting

### If Dashboard Still Shows Only 2025

**Check Console Logs**:
```javascript
// If you see:
Dashboard: Loaded fiscal years { count: 1, years: [...] }
// → Database/RLS issue, run diagnostic SQL

// If you see:
Dashboard: Loaded fiscal years { count: 3, years: [...] }
Dashboard: Mapped fiscal years { list: [1 item] }
// → Mapping/filtering issue in frontend
```

**Run Diagnostic SQL**:
```bash
# Execute sql/diagnose_fiscal_years_sync.sql
# Replace YOUR_ORG_ID_HERE with actual org ID
```

**Check Network Tab**:
1. Open DevTools → Network
2. Filter by "fiscal_years"
3. Check the response - should contain all 3 years

**Clear Cache**:
```javascript
// In browser console:
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### If Opening Balance Import Shows All Years But Dashboard Doesn't

This confirms the issue is in the dashboard component, not the service.

**Verify the fix was applied**:
```typescript
// Check src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx
// Line ~413 should have:
name: y.nameAr || y.nameEn || `FY ${y.yearNumber}`,  // camelCase ✓
range: `${y.startDate} — ${y.endDate}`,              // camelCase ✓

// NOT:
name: y.name_ar || y.name_en || `FY ${y.year_number}`,  // snake_case ✗
range: `${y.start_date} — ${y.end_date}`,              // snake_case ✗
```

## Expected Console Output

```javascript
Dashboard: Loaded fiscal years {
  count: 3,
  years: [
    {
      id: "uuid-1",
      orgId: "org-uuid",
      yearNumber: 2025,
      nameEn: "FY 2025",
      nameAr: "السنة المالية 2025",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      status: "active",
      isCurrent: true
    },
    {
      id: "uuid-2",
      orgId: "org-uuid",
      yearNumber: 2024,
      nameEn: "FY 2024",
      nameAr: "السنة المالية 2024",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      status: "closed",
      isCurrent: false
    },
    {
      id: "uuid-3",
      orgId: "org-uuid",
      yearNumber: 2023,
      nameEn: "FY 2023",
      nameAr: "السنة المالية 2023",
      startDate: "2023-01-01",
      endDate: "2023-12-31",
      status: "closed",
      isCurrent: false
    }
  ]
}

Dashboard: Mapped fiscal years {
  list: [
    {
      id: "uuid-1",
      name: "FY 2025",
      range: "2025-01-01 — 2025-12-31",
      status: "active",
      yearNumber: 2025,
      isCurrent: true
    },
    {
      id: "uuid-2",
      name: "FY 2024",
      range: "2024-01-01 — 2024-12-31",
      status: "closed",
      yearNumber: 2024,
      isCurrent: false
    },
    {
      id: "uuid-3",
      name: "FY 2023",
      range: "2023-01-01 — 2023-12-31",
      status: "closed",
      yearNumber: 2023,
      isCurrent: false
    }
  ]
}
```

## Success Criteria

✅ Dashboard displays all 3 fiscal years (2023, 2024, 2025)
✅ Opening balance import displays all 3 fiscal years
✅ Current year (2025) is highlighted with "Active" badge
✅ All years show correct date ranges
✅ No console errors
✅ Console logs show correct data count (3)

## Next Steps After Verification

1. Remove console.log statements (optional, for production)
2. Test with different organizations
3. Test with different user roles
4. Verify RLS policies are working correctly
5. Document the fix in release notes
