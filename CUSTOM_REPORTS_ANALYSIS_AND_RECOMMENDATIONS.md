# Custom Reports Analysis & Recommendations

## Executive Summary

This document provides a comprehensive analysis of the `/reports/custom` page (CustomReports.tsx) comparing it with the reference implementation at `/transactions/my-enriched` (TransactionsEnriched.tsx). The goal is to identify issues, gaps, and provide actionable recommendations for achieving feature parity and improved user experience.

---

## 1. Current State Analysis

### 1.1 CustomReports.tsx - Issues Identified

| Issue | Severity | Description |
|-------|----------|-------------|
| **Data Sync** | 🔴 Critical | Data not syncing with database; falls back to mock data when `report_datasets` table is empty |
| **Wizard Flow** | 🟠 High | Stepper wizard is functional but lacks validation feedback and real-time preview |
| **Table Format** | 🟠 High | Results table lacks proper formatting (currency, dates, RTL support) |
| **No Pagination** | 🟠 High | Results limited to `limit` parameter, no server-side pagination |
| **No Unified Filters** | 🟡 Medium | Uses custom FilterBuilder instead of UnifiedFilterBar |
| **Column Configuration** | 🟢 Low | Has ColumnConfiguration but lacks persistence consistency |

### 1.2 TransactionsEnriched.tsx - Reference Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **UnifiedFilterBar** | Full integration with TransactionsDataContext | ✅ |
| **Column Configuration** | useColumnPreferences with localStorage persistence | ✅ |
| **Pagination** | Server-side with page/pageSize controls | ✅ |
| **Export** | ExportButtons with multiple formats (CSV, Excel, PDF, JSON) | ✅ |
| **Real-time Refresh** | CustomEvent-based refresh mechanism | ✅ |
| **RTL Support** | Full Arabic/RTL layout support | ✅ |
| **Cell Formatting** | Custom renderCell for badges, tooltips, multi-value display | ✅ |

---

## 2. Gap Analysis

### 2.1 Data Layer Issues

```
CustomReports                    TransactionsEnriched
─────────────────────────────    ─────────────────────────────
report_datasets table            transactions_enriched_v2 view
↓                                ↓
getReportDatasets()              getTransactionsEnrichedView()
↓                                ↓
Falls back to MOCK data          Direct Supabase query
when table empty                 with proper RLS
```

**Root Cause**: The `report_datasets` table may not be populated, causing fallback to mock data.

**Solution**: 
1. Ensure `report_datasets` table is populated via migration
2. Add proper seeding script for datasets
3. Remove mock data fallback in production

### 2.2 UI/UX Feature Gaps

| Feature | CustomReports | TransactionsEnriched | Gap |
|---------|--------------|---------------------|-----|
| Filter Bar | Custom FilterBuilder | UnifiedFilterBar | Replace with UnifiedFilterBar |
| Pagination | Client-side limit | Server-side pagination | Add pagination controls |
| Column Resize | Via ColumnConfiguration | useColumnPreferences | Already implemented |
| Export | Basic CSV | Multi-format ExportButtons | Upgrade to ExportButtons |
| Refresh | Manual button | Auto + Manual refresh | Add real-time sync |
| Cell Rendering | Basic formatCellValue | Custom renderCell | Add custom renderers |

---

## 3. Recommended Architecture

### 3.1 Proposed Component Structure

```
CustomReports (Refactored)
├── Header
│   ├── Title
│   ├── Save Report Button
│   └── Refresh Button
├── UnifiedFilterBar (NEW)
│   ├── Dataset Selector (integrated)
│   ├── Field Filters
│   └── Apply/Reset Buttons
├── Toolbar
│   ├── Record Count
│   ├── Pagination Controls (NEW)
│   ├── Column Config Button
│   └── ExportButtons (UPGRADED)
├── ResizableTable
│   ├── Custom Cell Renderers
│   └── Column Preferences
└── Modals
    ├── ColumnConfiguration
    └── SaveReportDialog
```

### 3.2 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CustomReports Page                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Dataset      │───▶│ Field        │───▶│ Filter       │  │
│  │ Selection    │    │ Selection    │    │ Configuration│  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              runCustomReport() API                   │   │
│  │  - Server-side pagination (page, pageSize)          │   │
│  │  - Applied filters                                   │   │
│  │  - Sort configuration                                │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ReportResults Component                 │   │
│  │  - ResizableTable with column preferences           │   │
│  │  - Custom cell renderers (currency, date, badge)    │   │
│  │  - ExportButtons (CSV, Excel, PDF, JSON)            │   │
│  │  - Pagination controls                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Plan

### Phase 1: Data Layer Fix (Priority: Critical)

**Task 1.1: Database Schema Verification**
```sql
-- Verify report_datasets table exists and has data
SELECT COUNT(*) FROM report_datasets;

-- If empty, run seeding migration
INSERT INTO report_datasets (key, name, description, base_view, fields, is_active)
VALUES 
  ('transactions', 'المعاملات', 'جميع المعاملات المالية', 'transactions_enriched_v2', 
   '[{"key":"entry_number","label":"رقم القيد","type":"text"},...]'::jsonb, true),
  ('accounts', 'الحسابات', 'دليل الحسابات', 'accounts', 
   '[{"key":"code","label":"الكود","type":"text"},...]'::jsonb, true);
```

**Task 1.2: Remove Mock Data Fallback**
```typescript
// In src/services/reports.ts
export async function getReportDatasets(): Promise<ReportDataset[]> {
  const { data, error } = await supabase
    .from('report_datasets')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching datasets:', error);
    throw new Error('فشل في تحميل مصادر البيانات');
  }

  if (!data || data.length === 0) {
    throw new Error('لا توجد مصادر بيانات متاحة. يرجى التواصل مع المسؤول.');
  }

  return data.map(normalizeDatasetRow);
}
```

### Phase 2: UI Enhancement (Priority: High)

**Task 2.1: Add Pagination to ReportResults**
```typescript
// Add to ReportResults.tsx
interface ReportResultsProps {
  // ... existing props
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// Add pagination controls
<div className="pagination-controls">
  <button onClick={() => onPageChange(page - 1)} disabled={page === 1}>
    السابق
  </button>
  <span>صفحة {page} من {Math.ceil(totalCount / pageSize)}</span>
  <button onClick={() => onPageChange(page + 1)} disabled={page >= Math.ceil(totalCount / pageSize)}>
    التالي
  </button>
  <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
    <option value={10}>10</option>
    <option value={20}>20</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
  </select>
</div>
```

**Task 2.2: Integrate UnifiedFilterBar**
```typescript
// Replace FilterBuilder with UnifiedFilterBar
import UnifiedFilterBar from '../components/Common/UnifiedFilterBar';
import { useFilterState } from '../hooks/useFilterState';

const { filters, updateFilter, resetFilters } = useFilterState({
  storageKey: 'custom_reports_filters',
  defaultValues: { /* ... */ }
});

<UnifiedFilterBar
  values={filters}
  onChange={updateFilter}
  onReset={resetFilters}
  onApply={handleApplyFilters}
  config={{
    showSearch: true,
    showDateRange: true,
    showAmountRange: true,
    // ... configure based on selected dataset
  }}
/>
```

**Task 2.3: Upgrade Export Functionality**
```typescript
// Replace basic export with ExportButtons
import ExportButtons from '../components/Common/ExportButtons';
import { prepareTableData, createStandardColumns } from '../hooks/useUniversalExport';

const exportData = useMemo(() => {
  const visibleCols = columns.filter(c => c.visible);
  const defs = visibleCols.map(col => ({
    key: col.key,
    header: col.label,
    type: col.type as any,
  }));
  return prepareTableData(createStandardColumns(defs), data.data);
}, [columns, data]);

<ExportButtons
  data={exportData}
  config={{ title: 'تقرير مخصص', rtlLayout: true, useArabicNumerals: true }}
  size="small"
  layout="horizontal"
/>
```

### Phase 3: Cell Formatting (Priority: Medium)

**Task 3.1: Add Custom Cell Renderers**
```typescript
const renderCell = (value: any, column: ColumnConfig, row: any) => {
  // Currency formatting
  if (column.type === 'currency') {
    return (
      <span dir="ltr" style={{ fontFamily: 'monospace' }}>
        {typeof value === 'number' 
          ? value.toLocaleString('ar-SA', { minimumFractionDigits: 2 })
          : value || '—'}
      </span>
    );
  }

  // Date formatting
  if (column.type === 'date') {
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toLocaleDateString('ar-SA');
    } catch {
      return value;
    }
  }

  // Badge/Status formatting
  if (column.type === 'badge') {
    const statusConfig = {
      active: { label: 'نشط', color: '#10b981', bg: '#d1fae5' },
      inactive: { label: 'غير نشط', color: '#ef4444', bg: '#fee2e2' },
      // ... more statuses
    };
    const cfg = statusConfig[value] || { label: value, color: '#6b7280', bg: '#f3f4f6' };
    return (
      <span style={{ 
        backgroundColor: cfg.bg, 
        color: cfg.color, 
        padding: '4px 8px', 
        borderRadius: '4px' 
      }}>
        {cfg.label}
      </span>
    );
  }

  return value ?? '—';
};
```

---

## 5. Database Schema Requirements

### 5.1 report_datasets Table

```sql
CREATE TABLE IF NOT EXISTS report_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_view TEXT NOT NULL,
  table_name TEXT,
  fields JSONB DEFAULT '[]'::jsonb,
  allowed_fields TEXT[] DEFAULT '{}',
  required_permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sample data
INSERT INTO report_datasets (key, name, description, base_view, fields, is_active)
VALUES 
  ('transactions_enriched', 'المعاملات المحسّنة', 'عرض شامل للمعاملات مع التفاصيل', 
   'transactions_enriched_v2',
   '[
     {"key": "entry_number", "label": "رقم القيد", "type": "text"},
     {"key": "entry_date", "label": "التاريخ", "type": "date"},
     {"key": "description", "label": "البيان", "type": "text"},
     {"key": "amount", "label": "المبلغ", "type": "currency"},
     {"key": "debit_account_code", "label": "الحساب المدين", "type": "text"},
     {"key": "credit_account_code", "label": "الحساب الدائن", "type": "text"},
     {"key": "approval_status", "label": "حالة الاعتماد", "type": "badge"}
   ]'::jsonb,
   true),
  
  ('accounts', 'دليل الحسابات', 'جميع الحسابات في النظام',
   'accounts',
   '[
     {"key": "code", "label": "الكود", "type": "text"},
     {"key": "name", "label": "الاسم", "type": "text"},
     {"key": "type", "label": "النوع", "type": "text"},
     {"key": "balance", "label": "الرصيد", "type": "currency"},
     {"key": "is_active", "label": "نشط", "type": "boolean"}
   ]'::jsonb,
   true),

  ('cost_centers', 'مراكز التكلفة', 'جميع مراكز التكلفة',
   'cost_centers',
   '[
     {"key": "code", "label": "الكود", "type": "text"},
     {"key": "name", "label": "الاسم", "type": "text"},
     {"key": "description", "label": "الوصف", "type": "text"},
     {"key": "is_active", "label": "نشط", "type": "boolean"}
   ]'::jsonb,
   true);
```

---

## 6. Testing Checklist

### 6.1 Functional Tests

- [ ] Dataset selection loads fields correctly
- [ ] Field selection updates preview
- [ ] Filters apply correctly to results
- [ ] Pagination works (next/prev/page size)
- [ ] Column configuration persists
- [ ] Export generates correct files (CSV, Excel, PDF)
- [ ] Save report definition works
- [ ] Load saved report works

### 6.2 UI/UX Tests

- [ ] RTL layout displays correctly
- [ ] Arabic numerals display properly
- [ ] Currency formatting is correct
- [ ] Date formatting is correct
- [ ] Status badges display with correct colors
- [ ] Responsive layout on mobile
- [ ] Loading states display properly
- [ ] Error states display properly

### 6.3 Performance Tests

- [ ] Large dataset (10,000+ rows) loads within 3 seconds
- [ ] Pagination doesn't cause memory leaks
- [ ] Column resize is smooth
- [ ] Export doesn't freeze UI

---

## 7. Migration Path

### Step 1: Database Setup
1. Run migration to create/update `report_datasets` table
2. Seed with initial datasets
3. Verify data in Supabase dashboard

### Step 2: Code Updates
1. Update `src/services/reports.ts` to remove mock fallback
2. Update `src/components/Reports/ReportResults.tsx` with pagination
3. Update `src/pages/CustomReports.tsx` with UnifiedFilterBar
4. Add custom cell renderers

### Step 3: Testing
1. Test all datasets load correctly
2. Test filters work with real data
3. Test export functionality
4. Test pagination with large datasets

### Step 4: Deployment
1. Deploy database migrations first
2. Deploy frontend changes
3. Monitor for errors
4. Rollback plan if issues

---

## 8. Appendix: Code Snippets for Perplexity Review

### A. Current CustomReports.tsx Issues

```typescript
// ISSUE 1: Mock data fallback masks real database issues
if (!data || data.length === 0) {
  console.warn('No datasets found in database, using mock data');
  return getMockReportDatasets(); // ❌ Should throw error instead
}

// ISSUE 2: No pagination in results
const result = await runCustomReport({
  // ...
  limit: builderState.limit, // ❌ Only limits, no offset/page
});

// ISSUE 3: Basic cell formatting
const formatCellValue = (value: any): string => {
  // ❌ Missing currency formatting
  // ❌ Missing badge/status rendering
  // ❌ Missing tooltip support
};
```

### B. Reference TransactionsEnriched.tsx Patterns

```typescript
// PATTERN 1: Server-side pagination
const { rows, total } = await getTransactionsEnrichedView(
  filtersToUse, 
  page,      // ✅ Page number
  pageSize   // ✅ Page size
);

// PATTERN 2: UnifiedFilterBar integration
<UnifiedFilterBar
  values={unifiedFilters}
  onChange={updateFilter}
  onReset={handleResetFilters}
  onApply={handleApplyFilters}
  config={{ showAmountRange: true }}
/>

// PATTERN 3: Custom cell rendering
renderCell={(value, column, row) => {
  if (column.key === 'approval_status') {
    // ✅ Rich badge rendering with colors and icons
  }
  if (column.key === 'amount') {
    // ✅ Currency formatting with RTL support
  }
}}
```

---

## 9. Conclusion

The Custom Reports page requires significant updates to match the quality and functionality of the TransactionsEnriched page. The primary issues are:

1. **Data sync** - Mock data fallback masks real issues
2. **No pagination** - Large datasets will cause performance issues
3. **Basic formatting** - Missing currency, date, and badge formatting
4. **No unified filters** - Inconsistent UX with other pages

Following this implementation plan will bring the Custom Reports page to feature parity with the reference implementation while maintaining code consistency across the application.

---

*Document prepared for Perplexity AI code review and approval*
*Version: 1.0*
*Date: December 6, 2025*
