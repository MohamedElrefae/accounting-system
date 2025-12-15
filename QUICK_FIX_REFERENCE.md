# Quick Fix Reference - Fiscal Years Sync

## The Problem
Dashboard shows only 2025, but opening balance import shows 2023, 2024, 2025.

## The Fix (One Line Change)
In `src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx` line ~413:

```typescript
// WRONG ❌
name: y.name_ar || y.name_en || `FY ${y.year_number}`

// CORRECT ✅
name: y.nameAr || y.nameEn || `FY ${y.yearNumber}`
```

## Why?
Service returns **camelCase** (`yearNumber`), not **snake_case** (`year_number`).

## Test
1. Go to `/fiscal/dashboard`
2. Should see all 3 years: 2023, 2024, 2025

## Files
- ✅ Fixed: `src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx`
- 📄 Details: `FISCAL_YEARS_SYNC_FIX.md`
- 📄 Testing: `FISCAL_YEARS_SYNC_TEST.md`
- 📄 Summary: `FISCAL_SYNC_FIX_SUMMARY.md`
- 🔍 Diagnostic: `sql/diagnose_fiscal_years_sync.sql`

## Status
✅ **FIXED** - Ready to test
