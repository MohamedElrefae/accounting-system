# Fiscal System - Perplexity AI Quick Reference Card

> **For**: CEO using Perplexity AI for implementation  
> **Project**: Fiscal Year & Periods Modernization  
> **Duration**: 4 Weeks

---

## 🎯 Copy-Paste Prompts for Perplexity

### WEEK 1: Create Services

**Prompt 1 - Create Types**:
```
I'm working on a React/TypeScript project with Supabase. Create a types.ts file 
for fiscal year and period management with these interfaces:
- FiscalYear (id, orgId, yearNumber, nameEn, nameAr, startDate, endDate, status, isCurrent, etc.)
- FiscalPeriod (id, orgId, fiscalYearId, periodNumber, periodCode, nameEn, status, etc.)
- FiscalYearStatus = 'draft' | 'active' | 'closed' | 'archived'
- FiscalPeriodStatus = 'open' | 'locked' | 'closed'
- CreateFiscalYearInput, UpdateFiscalYearInput DTOs
Use camelCase for TypeScript, the database uses snake_case.
```

**Prompt 2 - Create Fiscal Year Service**:
```
Create a FiscalYearService class in TypeScript for Supabase with these methods:
- canManage(orgId) - calls fn_can_manage_fiscal_v2 RPC
- getAll(orgId) - fetches from fiscal_years table
- getById(id) - fetches single record
- getCurrent(orgId) - fetches where is_current=true
- create(input) - calls create_fiscal_year RPC
- update(id, input) - updates record
- delete(id) - deletes draft records only
- setCurrent(orgId, fiscalYearId) - sets is_current flag
- activate(id), close(id) - status changes
Include a mapFromDb helper to convert snake_case to camelCase.
```

**Prompt 3 - Create Period Service**:
```
Create a FiscalPeriodService class in TypeScript for Supabase with these methods:
- getAll(orgId, fiscalYearId) - fetches from fiscal_periods table
- getById(id), getCurrent(orgId)
- getActivity(periodId) - calls get_period_activity RPC
- lock(periodId), unlock(periodId) - status changes
- close(periodId, notes) - calls close_fiscal_period RPC
- setCurrent(orgId, periodId), update(id, input)
Include mapFromDb helper for snake_case to camelCase conversion.
```

**Prompt 4 - Create React Query Hooks**:
```
Create React Query hooks for fiscal year management:
- useFiscalYears(orgId) - fetches all fiscal years
- useFiscalYear(id) - fetches single
- useCurrentFiscalYear(orgId) - fetches current
- useCreateFiscalYear() - mutation
- useUpdateFiscalYear(orgId) - mutation
- useDeleteFiscalYear(orgId) - mutation
Include proper query key management for cache invalidation.
Use @tanstack/react-query.
```


### WEEK 2: Update UI Components

**Prompt 5 - Update Selector Component**:
```
Update this React component to use React Query instead of direct Supabase calls.
Replace useState + useEffect with useFiscalYears hook.
Keep the same props interface for backward compatibility.
The component is FiscalYearSelector that shows a dropdown of fiscal years.
```

**Prompt 6 - Consolidate Dashboard**:
```
I have two React components: FiscalYearDashboard (basic) and EnhancedFiscalYearDashboard.
Help me consolidate them into one unified component that:
- Uses React Query hooks (useFiscalYears, useCreateFiscalYear)
- Supports RTL/Arabic language
- Shows real data from Supabase (not hardcoded)
- Uses MUI components with theme tokens
```

**Prompt 7 - Update Routes**:
```
Update my React Router configuration to:
- Remove duplicate routes (/fiscal/enhanced/*)
- Point /fiscal/dashboard to unified FiscalYearDashboard
- Point /fiscal/periods to unified FiscalPeriodManager
- Keep specialized routes unchanged (construction, validation, etc.)
```

### WEEK 3: Cleanup

**Prompt 8 - Find Old Imports**:
```
Help me find and replace all imports in my React/TypeScript codebase:
OLD: import { FiscalYearService } from '@/services/FiscalYearService'
NEW: import { FiscalYearService } from '@/services/fiscal'

OLD: import { FiscalPeriodService } from '@/services/FiscalPeriodService'
NEW: import { FiscalPeriodService } from '@/services/fiscal'

Give me grep commands to find these and sed commands to replace them.
```

**Prompt 9 - Create Dashboard Hook**:
```
Convert this function to a React Query hook:
summarizeFiscal(orgId, fiscalYearId) that returns:
- periodsOpen, periodsLocked, periodsClosed counts
- importsCount
- validationWarnings, validationErrors counts
It should query fiscal_periods and opening_balance_imports tables,
and call validate_opening_balances RPC.
```

### WEEK 4: Enterprise Features

**Prompt 10 - Validation Service**:
```
Create a ValidationService class for Supabase with:
- validateOpeningBalances(orgId, fiscalYearId) - calls validate_opening_balances RPC
- validateConstructionBalances(orgId, fiscalYearId) - calls validate_construction_opening_balances RPC
- getActiveRules(orgId) - fetches from opening_balance_validation_rules table
Return proper TypeScript types for validation results.
```

**Prompt 11 - Bulk Operations**:
```
Create a BulkOperationService class for Supabase with:
- lockMultiplePeriods(periodIds: string[]) - updates multiple periods to 'locked'
- unlockMultiplePeriods(periodIds: string[]) - updates multiple periods to 'open'
- closeMultiplePeriods(operations: Array<{periodId, notes}>) - closes multiple periods
Use Supabase .in() for bulk updates.
```

---

## ✅ Verification Commands

After each phase, run these:

```bash
# Check TypeScript
npx tsc --noEmit

# Check for old imports
grep -r "FiscalYearService" src/ --include="*.tsx" --include="*.ts" | grep -v "fiscal/"

# Build test
npm run build

# Start dev server
npm run dev
```

---

## 🗄️ Database Reference

### Tables
- `fiscal_years` - Main fiscal year records
- `fiscal_periods` - Periods within fiscal years
- `opening_balance_imports` - Import tracking
- `opening_balances` - Balance data

### Key RPCs
- `create_fiscal_year()` - Creates year with auto-periods
- `close_fiscal_period()` - Closes a period
- `fn_can_manage_fiscal_v2()` - Permission check
- `validate_opening_balances()` - Validation
- `get_period_activity()` - Period stats

---

## 📁 File Structure After Implementation

```
src/services/fiscal/
├── index.ts              # Exports
├── types.ts              # TypeScript interfaces
├── fiscalYearService.ts  # Fiscal year CRUD
├── fiscalPeriodService.ts # Period CRUD
├── validationService.ts  # Validation (Week 4)
├── bulkOperationService.ts # Bulk ops (Week 4)
└── hooks/
    ├── useFiscalYear.ts    # Year hooks
    ├── useFiscalPeriods.ts # Period hooks
    └── useFiscalDashboard.ts # Dashboard hook
```

---

## 🚨 Files to DELETE

```
❌ src/services/FiscalYearService.ts (STUB)
❌ src/services/FiscalPeriodService.ts (STUB)
❌ src/services/FiscalYearManagementService.ts (merge)
❌ src/services/FiscalDashboardService.ts (merge)
❌ src/pages/Fiscal/FiscalYearDashboard.tsx (old basic)
❌ src/pages/Fiscal/FiscalPeriodManager.tsx (old basic)
```

---

## 📞 If Something Goes Wrong

**Rollback Command**:
```bash
git checkout HEAD~1 -- src/services/FiscalYearService.ts
git checkout HEAD~1 -- src/services/FiscalPeriodService.ts
```

**Check Supabase Connection**:
```sql
SELECT * FROM fiscal_years LIMIT 1;
SELECT fn_can_manage_fiscal_v2('your-org-id', 'your-user-id');
```

---

**Ready to start? Begin with Week 1, Prompt 1!**
