# Enterprise Running Balance - Implementation Plan

## ✅ IMPLEMENTATION COMPLETE

### Files Created
1. `src/services/reports/runningBalanceService.ts` - Service layer with direct Supabase queries
2. `src/hooks/useRunningBalanceFilters.ts` - Filter state management with scope integration
3. `src/pages/Reports/RunningBalanceEnriched.tsx` - Main page component replicating AllLinesEnriched pattern

### Files Modified
1. `src/routes/ReportRoutes.tsx` - Added route `/reports/running-balance`
2. `src/data/navigation.ts` - Added navigation item

### Files Deleted (Cleanup)
- `src/pages/Reports/EnterpriseRunningBalance.tsx` (tree sidebar version)
- `src/pages/Reports/EnterpriseRunningBalanceSimple.tsx` (mock data version)
- `src/pages/Reports/EnterpriseRunningBalanceTest.tsx` (test version)
- `src/services/running-balance.ts`
- `src/services/running-balance-enterprise.ts`
- `src/services/reports/hierarchical-balance.ts`

### Route
- **URL:** `/reports/running-balance`
- **Navigation:** Reports → الرصيد الجاري (Running Balance)

---

## ✅ Sub-Tree (Expenses Category) Filter Support - COMPLETE

The running balance page now supports flexible filtering:

### Filter Options (Any combination works)
- **Account** (`debitAccountId`) - Filter by specific account from accounts tree
- **Sub-Tree / Expenses Category** (`expensesCategoryId`) - Filter by sub_tree from `/main-data/sub-tree` page
- **Project** - Filter by project
- **Classification** - Filter by classification
- **Cost Center** - Filter by cost center
- **Work Item** - Filter by work item
- **Analysis Work Item** - Filter by analysis item
- **Date Range** - Filter by date from/to

### Key Changes Made
1. **Service Layer** (`runningBalanceService.ts`):
   - `accountId` is now optional (not required)
   - Added `subTreeId` filter support
   - Added `expensesCategoryId` as alias for `subTreeId`
   - `hasValidFilter()` function checks if at least one filter is selected

2. **Filter Hook** (`useRunningBalanceFilters.ts`):
   - Changed `hasRequiredAccount` to `hasValidFilter`
   - Checks for any valid filter (account, sub_tree, project, etc.)
   - Legacy `hasRequiredAccount` alias maintained for compatibility

3. **Page Component** (`RunningBalanceEnriched.tsx`):
   - Uses `hasValidFilter` instead of `hasRequiredAccount`
   - Updated empty state message to reflect flexible filtering
   - Passes `subTreeId` to service layer

### Database Mapping
- `expensesCategoryId` in filters → `sub_tree_id` in `transaction_lines` table
- The sub-tree data comes from `/main-data/sub-tree` page (الشجرة الفرعية)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EnterpriseRunningBalancePage                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    UnifiedFilterBar                          │   │
│  │  [Account*] [DateFrom] [DateTo] [Project] [Classification]   │   │
│  │  [CostCenter] [WorkItem] [AnalysisItem] [Apply] [Reset]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Summary Cards                             │   │
│  │  [Opening] [Debits] [Credits] [Net Change] [Closing] [Count] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Toolbar                                   │   │
│  │  [Column Config] [Export] [Wrap Toggle] [Refresh] [Reset]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ResizableTable                            │   │
│  │  Date | Entry# | Account | Description | Debit | Credit | Bal│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Pagination                                │   │
│  │  [Prev] Page X of Y [Next] [PageSize: 20▼]                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

### 1. New Page Component
**File:** `src/pages/Reports/RunningBalanceEnriched.tsx`

Replicates AllLinesEnriched pattern with:
- `useTransactionsData` for context (accounts, projects, etc.)
- `useTransactionsFilters` for filter state management
- `UnifiedFilterBar` for consistent filtering
- `ResizableTable` for data display
- `ColumnConfiguration` for column customization
- `useColumnPreferences` for persistence
- `ExportButtons` for exports
- `useQuery` for data fetching
- `useUnifiedSync` for real-time updates

### 2. New Service Layer
**File:** `src/services/reports/runningBalanceService.ts`

```typescript
interface RunningBalanceFilters {
  accountId: string        // Required - the account or subtree root
  dateFrom?: string
  dateTo?: string
  orgId?: string
  projectId?: string
  classificationId?: string
  costCenterId?: string
  workItemId?: string
  analysisWorkItemId?: string
  expensesCategoryId?: string
  postedOnly?: boolean
}

interface RunningBalanceRow {
  transaction_id: string
  entry_date: string
  entry_number: string
  description: string
  account_id: string
  account_code: string
  account_name_ar: string
  debit: number
  credit: number
  running_balance: number
  opening_balance: number
  project_id?: string
  org_id?: string
}

interface RunningBalanceSummary {
  openingBalance: number
  totalDebits: number
  totalCredits: number
  netChange: number
  closingBalance: number
  transactionCount: number
}

// Uses existing get_hierarchical_ledger_report RPC
async function fetchRunningBalance(filters, limit, offset): Promise<{rows, summary, total}>
```

### 3. New Hook
**File:** `src/hooks/useRunningBalanceFilters.ts`

Similar to `useTransactionsFilters` but with:
- Required `accountId` field
- Storage key: `running_balance_filters`
- Scope integration

### 4. Route Registration
**File:** `src/routes/ReportsRoutes.tsx` (or App.tsx)

```typescript
<Route path="/reports/running-balance" element={<RunningBalanceEnriched />} />
```

---

## Database Layer

### Existing Function (Already Available)
```sql
get_hierarchical_ledger_report(
  p_subtree_id uuid,           -- Account ID (required)
  p_date_from date,
  p_date_to date,
  p_org_id uuid,
  p_project_id uuid,
  p_include_opening boolean,
  p_posted_only boolean,
  p_limit integer,
  p_offset integer,
  p_classification_id uuid,
  p_analysis_work_item_id uuid,
  p_expenses_category_id uuid,
  p_cost_center_id uuid
)
```

This function already:
- Calculates running balance with window functions
- Supports subtree aggregation (parent account includes children)
- Returns opening/closing balances
- Supports all dimension filters
- Has pagination support

**No new database migration needed!**

---

## Column Configuration

```typescript
const defaultColumns: ColumnConfig[] = [
  { key: 'entry_date', label: 'التاريخ', visible: true, width: 120, type: 'date' },
  { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, type: 'text' },
  { key: 'account_label', label: 'الحساب', visible: true, width: 200, type: 'text' },
  { key: 'description', label: 'البيان', visible: true, width: 250, type: 'text' },
  { key: 'debit', label: 'مدين', visible: true, width: 130, type: 'currency' },
  { key: 'credit', label: 'دائن', visible: true, width: 130, type: 'currency' },
  { key: 'running_balance', label: 'الرصيد الجاري', visible: true, width: 150, type: 'currency' },
  { key: 'project_label', label: 'المشروع', visible: false, width: 180, type: 'text' },
  { key: 'cost_center_label', label: 'مركز التكلفة', visible: false, width: 180, type: 'text' },
  { key: 'classification_label', label: 'التصنيف', visible: false, width: 160, type: 'text' },
]
```

---

## Filter Configuration

```typescript
// UnifiedFilterBar config for Running Balance
const filterConfig: FilterConfig = {
  showSearch: true,
  showDateRange: true,
  showAmountRange: false,
  showOrg: false,           // From ScopeContext
  showProject: true,
  showDebitAccount: true,   // This becomes the required "Account" filter
  showCreditAccount: false, // Not needed for running balance
  showClassification: true,
  showExpensesCategory: true,
  showWorkItem: true,
  showAnalysisWorkItem: true,
  showCostCenter: true,
  showApprovalStatus: false, // Not relevant for running balance
}
```

---

## Export Configuration

```typescript
const exportConfig = {
  title: 'تقرير الرصيد الجاري',
  subtitle: `حساب: ${selectedAccountLabel}`,
  rtlLayout: true,
  useArabicNumerals: true,
  includeTimestamp: true,
  includeSummary: true,
  summaryData: {
    'الرصيد الافتتاحي': summary.openingBalance,
    'إجمالي المدين': summary.totalDebits,
    'إجمالي الدائن': summary.totalCredits,
    'صافي التغيير': summary.netChange,
    'الرصيد الختامي': summary.closingBalance,
  }
}
```

---

## ✅ Universal Export System - COMPLETE

The Running Balance page includes a comprehensive export system with two export button groups:

### Standard Export (Left Button Group)
- **PDF Export** - Basic PDF with title and data
- **Excel Export** - Spreadsheet format
- **CSV Export** - Comma-separated values

### Enhanced Export with Summary (Right Button Group)
- **PDF Export** - Includes summary data in footer
- **Customized PDF** - Opens modal for PDF customization
- **Excel Export** - Includes summary data
- **CSV Export** - Includes summary data

### Export Features
- **RTL Layout Support** - Arabic text properly aligned
- **Arabic Numerals** - Numbers formatted in Arabic style
- **Dynamic Subtitle** - Shows applied filters (account, date range, project)
- **Summary Data Included** (Enhanced Export):
  - Opening Balance (الرصيد الافتتاحي)
  - Total Debits (إجمالي المدين)
  - Total Credits (إجمالي الدائن)
  - Net Change (صافي التغيير)
  - Closing Balance (الرصيد الختامي)
  - Transaction Count (عدد الحركات)
- **Landscape Orientation** - Better for wide data tables
- **Customizable PDF** - Modal for advanced PDF options

### Export Data Preparation
- Uses `createStandardColumns()` to standardize column definitions
- Uses `prepareTableData()` to format data for export
- Visible columns only (respects column configuration)
- Proper currency formatting
- Date formatting support

### Implementation
Two separate `ExportButtons` components:
1. **Standard Export** - Basic export without summary
2. **Enhanced Export** - Export with summary data and customization options

---

## Implementation Steps

### Phase 1: Service Layer (30 min)
1. Create `src/services/reports/runningBalanceService.ts`
2. Implement `fetchRunningBalance()` using existing RPC
3. Add summary calculation helper

### Phase 2: Filter Hook (20 min)
1. Create `src/hooks/useRunningBalanceFilters.ts`
2. Copy pattern from `useTransactionsFilters`
3. Make `accountId` required

### Phase 3: Page Component (1 hour)
1. Create `src/pages/Reports/RunningBalanceEnriched.tsx`
2. Copy structure from `AllLinesEnriched.tsx`
3. Adapt for running balance data
4. Add summary cards section
5. Wire up all components

### Phase 4: Route & Navigation (10 min)
1. Add route to App.tsx or ReportsRoutes.tsx
2. Add navigation link

### Phase 5: Testing (30 min)
1. Test with real account data
2. Verify running balance calculations
3. Test exports
4. Test column configuration persistence

---

## Files to Delete (Cleanup)

After implementation, remove:
- `src/pages/Reports/EnterpriseRunningBalanceSimple.tsx` (mock data version)
- `src/pages/Reports/EnterpriseRunningBalanceTest.tsx` (test version)
- `src/services/running-balance-enterprise.ts` (orphaned service)

Keep:
- `src/pages/Reports/EnterpriseRunningBalance.tsx` (tree sidebar version - different use case)
- `src/services/reports/hierarchical-balance.ts` (used by tree version)

---

## Key Differences from AllLinesEnriched

| Aspect | AllLinesEnriched | RunningBalanceEnriched |
|--------|------------------|------------------------|
| Data Source | `transaction_lines` table | `get_hierarchical_ledger_report` RPC |
| Required Filter | None | Account ID |
| Running Balance | Not shown | Core feature |
| Summary Cards | Not shown | Opening/Closing/Totals |
| Approval Status | Shown | Not relevant |
| Row Click | Navigate to transaction | Navigate to transaction |

---

## Success Criteria

- [ ] Page loads without errors
- [ ] Account selection is required before showing data
- [ ] Running balance calculates correctly
- [ ] All filters work (date, project, classification, etc.)
- [ ] Column configuration persists
- [ ] Export produces correct PDF/Excel/CSV
- [ ] Real-time sync updates data
- [ ] Arabic RTL layout works correctly
- [ ] Summary cards show accurate totals

---

## Estimated Time: 2-3 hours

Ready to implement?
