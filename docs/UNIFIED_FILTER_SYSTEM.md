# نظام الفلاتر الموحد - Unified Filter System

## الملفات المنشأة

| الملف | الوصف |
|-------|-------|
| `src/contexts/TransactionsDataContext.tsx` | Context لتوفير البيانات المرجعية |
| `src/components/Common/UnifiedFilterBar.tsx` | مكون شريط الفلاتر الموحد (مع بحث، تاريخ، حالة اعتماد محسنة) |
| `src/hooks/useFilterState.ts` | Hook لإدارة حالة الفلاتر مع حفظ localStorage |
| `docs/UNIFIED_FILTER_SYSTEM.md` | هذا الملف - التوثيق |

---

## الميزات المحسنة

### 🔍 البحث المحسن
- أيقونة بحث مدمجة
- زر مسح البحث (✕)
- دعم البحث الفوري

### 📅 نطاق التاريخ
- تسميات واضحة (من / إلى)
- أيقونة تقويم
- تجميع بصري للحقول

### ✅ حالة الاعتماد المحسنة (Line-Level Aware)
- دعم نظام الاعتماد على مستوى السطر
- أيقونات ملونة لكل حالة:
  - 📝 مسودة (رمادي)
  - 📤 مُرسلة (أزرق)
  - ⏳ قيد الانتظار (برتقالي)
  - ✅ معتمدة (أخضر)
  - 📊 مرحلة (بنفسجي)
  - 🔄 طلب تعديل (برتقالي)
  - ❌ مرفوضة (أحمر)
  - 🚫 ملغاة (رمادي)

### 🗑️ زر إعادة التعيين
- شارة عدد الفلاتر النشطة
- تعطيل تلقائي عند عدم وجود فلاتر
- لون أحمر للتنبيه

### ♻️ خيارات الفلاتر الممهدة
- تم نقل بناء خيارات القوائم إلى hook مستقل `useFilterOptions`
- يقلل عمليات الفرز/التجهيز داخل كل مكوّن
- يمهّد الطريق لإعادة استخدام القوائم عبر جميع الصفحات

---

## ملاحظات الأداء والجاهزية للتعميم

1. **تجهيز البيانات مرة واحدة**: `useFilterOptions` يستخدم بيانات `TransactionsDataContext` ليعيد قوائم مفروزة وقابلة للبحث. هذا يقلل إعادة الحساب في كل رندر ويضمن اتساق النصوص العربية/الإنجليزية.
2. **تخزين تفضيلات العرض بكفاءة**: تم تعديل `UnifiedFilterBar` ليقرأ تفضيلات العرض/العرض مرة واحدة لكل مفتاح (`preferencesKey`) ويحدث التخزين المحلي فقط عند التغيير، مما يقلل عمليات القراءة/الكتابة على `localStorage`.
3. **فصل حِمل العرض عن التطبيق**: صفحتك (مثل `TransactionsEnriched`) تُدير حالة الفلاتر المؤقتة وتضغط على `onApply` فقط عند الحاجة، ما يمنع عمليات إعادة تحميل البيانات المكلفة على كل تغيير صغير.
4. **جاهزية التعميم**: بمجرد تمرير `preferencesKey` مختلف لكل صفحة، سيحصل كل فريق على إعدادات عرض مستقلة، بينما تحتفظ المؤسسة بمظهر موحد عبر Tailwind/shadcn وRTL.
5. **رصد الاختناقات**: قبل تعميم المكوّن على صفحات تحتوي آلاف الخيارات (الحسابات/المشاريع)، ننصح بتفعيل React Profiler للتأكد من أن قوائم البحث و`SearchableSelect` لا تحتاج Virtualization إضافي.

---

## ملخص المشكلة

حالياً، كل صفحة تقوم بتحميل بيانات الفلاتر (المؤسسات، المشاريع، الحسابات، مراكز التكلفة، إلخ) بشكل مستقل، مما يؤدي إلى:
- تكرار الكود في كل صفحة
- طلبات API متعددة لنفس البيانات
- عدم اتساق البيانات بين الصفحات
- صعوبة الصيانة والتحديث

## الحل: TransactionsDataContext

تم إنشاء `TransactionsDataContext` كمصدر موحد للبيانات المرجعية:

```typescript
// src/contexts/TransactionsDataContext.tsx
const {
  organizations,      // المؤسسات
  projects,           // المشاريع
  accounts,           // الحسابات
  costCenters,        // مراكز التكلفة
  workItems,          // عناصر العمل
  categories,         // الشجرة الفرعية (التصنيفات)
  classifications,    // تصنيفات القيود
  analysisItemsMap,   // بنود التحليل
  currentUserId,      // معرف المستخدم الحالي
  isLoading,          // حالة التحميل
} = useTransactionsData()
```

---

## خطوات تطبيق النظام الموحد على صفحة جديدة

### الخطوة 1: إضافة Provider في App.tsx

تأكد من أن `TransactionsDataProvider` يغلف الصفحات التي تحتاج الفلاتر:

```tsx
// src/App.tsx
import { TransactionsDataProvider } from './contexts/TransactionsDataContext'

function App() {
  return (
    <TransactionsDataProvider>
      <Routes>
        <Route path="/transactions/*" element={<TransactionsRoutes />} />
        <Route path="/reports/*" element={<ReportsRoutes />} />
        {/* ... */}
      </Routes>
    </TransactionsDataProvider>
  )
}
```

### الخطوة 2: استخدام Context في الصفحة

```tsx
// src/pages/YourPage.tsx
import { useTransactionsData } from '../../contexts/TransactionsDataContext'

const YourPage: React.FC = () => {
  const {
    organizations,
    projects,
    accounts,
    costCenters,
    workItems,
    categories,
    classifications,
    analysisItemsMap,
    currentUserId,
    isLoading: contextLoading,
  } = useTransactionsData()

  // انتظر تحميل البيانات قبل عرض الصفحة
  useEffect(() => {
    if (contextLoading) return
    // تحميل بيانات الصفحة الخاصة
    loadPageData()
  }, [contextLoading])

  if (contextLoading) {
    return <div>جاري التحميل...</div>
  }

  return (
    // ... محتوى الصفحة
  )
}
```

### الخطوة 3: إزالة الكود المكرر

**قبل (الكود القديم):**
```tsx
// ❌ لا تفعل هذا
const [organizations, setOrganizations] = useState<Organization[]>([])
const [projects, setProjects] = useState<Project[]>([])
const [accounts, setAccounts] = useState<Account[]>([])

useEffect(() => {
  getOrganizations().then(setOrganizations)
  getProjects().then(setProjects)
  getAccounts().then(setAccounts)
}, [])
```

**بعد (الكود الجديد):**
```tsx
// ✅ افعل هذا
const { organizations, projects, accounts, isLoading } = useTransactionsData()
```

---

## مكون UnifiedFilterBar (مقترح)

لتوحيد شريط الفلاتر عبر جميع الصفحات، يمكن إنشاء مكون موحد:

### الملف: `src/components/Common/UnifiedFilterBar.tsx`

```tsx
import React, { useMemo } from 'react'
import { useTransactionsData } from '../../contexts/TransactionsDataContext'
import SearchableSelect, { type SearchableSelectOption } from './SearchableSelect'

export interface FilterValues {
  search?: string
  dateFrom?: string
  dateTo?: string
  amountFrom?: string
  amountTo?: string
  orgId?: string
  projectId?: string
  debitAccountId?: string
  creditAccountId?: string
  classificationId?: string
  expensesCategoryId?: string
  workItemId?: string
  analysisWorkItemId?: string
  costCenterId?: string
  approvalStatus?: string
}

export interface FilterConfig {
  // أي الفلاتر يجب عرضها
  showSearch?: boolean
  showDateRange?: boolean
  showAmountRange?: boolean
  showOrg?: boolean
  showProject?: boolean
  showDebitAccount?: boolean
  showCreditAccount?: boolean
  showClassification?: boolean
  showExpensesCategory?: boolean
  showWorkItem?: boolean
  showAnalysisWorkItem?: boolean
  showCostCenter?: boolean
  showApprovalStatus?: boolean
}

interface UnifiedFilterBarProps {
  values: FilterValues
  onChange: (key: keyof FilterValues, value: string) => void
  onReset?: () => void
  config?: FilterConfig
  storageKey?: string // لحفظ تفضيلات العرض
}

const defaultConfig: FilterConfig = {
  showSearch: true,
  showDateRange: true,
  showOrg: true,
  showProject: true,
  showDebitAccount: true,
  showCreditAccount: true,
  showClassification: true,
  showExpensesCategory: true,
  showWorkItem: true,
  showCostCenter: true,
  showApprovalStatus: true,
}

export const UnifiedFilterBar: React.FC<UnifiedFilterBarProps> = ({
  values,
  onChange,
  onReset,
  config = defaultConfig,
}) => {
  const {
    organizations,
    projects,
    accounts,
    costCenters,
    workItems,
    categories,
    classifications,
    analysisItemsMap,
  } = useTransactionsData()

  // بناء خيارات الحسابات
  const accountOptions: SearchableSelectOption[] = useMemo(() => {
    return accounts
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a => ({
        value: a.id,
        label: `${a.code} - ${a.name_ar || a.name}`,
        searchText: `${a.code} ${a.name_ar || a.name}`.toLowerCase(),
      }))
  }, [accounts])

  // بناء خيارات المؤسسات
  const orgOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'جميع المؤسسات', searchText: '' },
      ...organizations.map(o => ({
        value: o.id,
        label: `${o.code} - ${o.name}`,
        searchText: `${o.code} ${o.name}`,
      }))
    ]
  }, [organizations])

  // بناء خيارات المشاريع
  const projectOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'جميع المشاريع', searchText: '' },
      ...projects.map(p => ({
        value: p.id,
        label: `${p.code} - ${p.name}`,
        searchText: `${p.code} ${p.name}`,
      }))
    ]
  }, [projects])

  // بناء خيارات التصنيفات
  const classificationOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'جميع التصنيفات', searchText: '' },
      ...classifications.map(c => ({
        value: c.id,
        label: `${c.code} - ${c.name}`,
        searchText: `${c.code} ${c.name}`,
      }))
    ]
  }, [classifications])

  // بناء خيارات الشجرة الفرعية
  const categoryOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'جميع الشجرة الفرعية', searchText: '' },
      ...categories
        .slice()
        .sort((a, b) => `${a.code}`.localeCompare(`${b.code}`))
        .map(cat => ({
          value: cat.id,
          label: `${cat.code} - ${cat.description}`,
          searchText: `${cat.code} ${cat.description}`,
        }))
    ]
  }, [categories])

  // بناء خيارات عناصر العمل
  const workItemOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'جميع عناصر العمل', searchText: '' },
      ...workItems
        .slice()
        .sort((a, b) => `${a.code}`.localeCompare(`${b.code}`))
        .map(w => ({
          value: w.id,
          label: `${w.code} - ${w.name}`,
          searchText: `${w.code} ${w.name}`,
        }))
    ]
  }, [workItems])

  // بناء خيارات بنود التحليل
  const analysisOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'جميع بنود التحليل', searchText: '' },
      ...Object.entries(analysisItemsMap)
        .sort((a, b) => `${a[1].code}`.localeCompare(`${b[1].code}`))
        .map(([id, a]) => ({
          value: id,
          label: `${a.code} - ${a.name}`,
          searchText: `${a.code} ${a.name}`,
        }))
    ]
  }, [analysisItemsMap])

  // بناء خيارات مراكز التكلفة
  const costCenterOptions: SearchableSelectOption[] = useMemo(() => {
    return [
      { value: '', label: 'جميع مراكز التكلفة', searchText: '' },
      ...costCenters
        .slice()
        .sort((a, b) => `${a.code}`.localeCompare(`${b.code}`))
        .map(cc => ({
          value: cc.id,
          label: `${cc.code} - ${cc.name}`,
          searchText: `${cc.code} ${cc.name}`,
        }))
    ]
  }, [costCenters])

  // خيارات حالة الاعتماد
  const approvalOptions: SearchableSelectOption[] = [
    { value: '', label: 'جميع الحالات', searchText: '' },
    { value: 'draft', label: 'مسودة', searchText: 'مسودة' },
    { value: 'submitted', label: 'مُرسلة', searchText: 'مُرسلة' },
    { value: 'approved', label: 'معتمدة', searchText: 'معتمدة' },
    { value: 'posted', label: 'مرحلة', searchText: 'مرحلة' },
    { value: 'revision_requested', label: 'طلب تعديل', searchText: 'طلب تعديل' },
    { value: 'rejected', label: 'مرفوضة', searchText: 'مرفوضة' },
    { value: 'cancelled', label: 'ملغاة', searchText: 'ملغاة' },
  ]

  return (
    <div className="unified-filter-bar" style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '0.5rem', 
      padding: '0.5rem',
      alignItems: 'center'
    }}>
      {/* البحث */}
      {config.showSearch && (
        <input
          type="text"
          value={values.search || ''}
          onChange={e => onChange('search', e.target.value)}
          placeholder="بحث..."
          className="filter-input"
          style={{ minWidth: 150 }}
        />
      )}

      {/* نطاق التاريخ */}
      {config.showDateRange && (
        <>
          <input
            type="date"
            value={values.dateFrom || ''}
            onChange={e => onChange('dateFrom', e.target.value)}
            className="filter-input"
            style={{ minWidth: 120 }}
          />
          <input
            type="date"
            value={values.dateTo || ''}
            onChange={e => onChange('dateTo', e.target.value)}
            className="filter-input"
            style={{ minWidth: 120 }}
          />
        </>
      )}

      {/* المؤسسة */}
      {config.showOrg && (
        <div style={{ minWidth: 180 }}>
          <SearchableSelect
            id="filter.org"
            value={values.orgId || ''}
            options={orgOptions}
            onChange={v => onChange('orgId', v)}
            placeholder="جميع المؤسسات"
            clearable
          />
        </div>
      )}

      {/* المشروع */}
      {config.showProject && (
        <div style={{ minWidth: 180 }}>
          <SearchableSelect
            id="filter.project"
            value={values.projectId || ''}
            options={projectOptions}
            onChange={v => onChange('projectId', v)}
            placeholder="جميع المشاريع"
            clearable
          />
        </div>
      )}

      {/* الحساب المدين */}
      {config.showDebitAccount && (
        <div style={{ minWidth: 200 }}>
          <SearchableSelect
            id="filter.debit"
            value={values.debitAccountId || ''}
            options={[{ value: '', label: 'جميع الحسابات المدينة', searchText: '' }, ...accountOptions]}
            onChange={v => onChange('debitAccountId', v)}
            placeholder="جميع الحسابات المدينة"
            clearable
          />
        </div>
      )}

      {/* الحساب الدائن */}
      {config.showCreditAccount && (
        <div style={{ minWidth: 200 }}>
          <SearchableSelect
            id="filter.credit"
            value={values.creditAccountId || ''}
            options={[{ value: '', label: 'جميع الحسابات الدائنة', searchText: '' }, ...accountOptions]}
            onChange={v => onChange('creditAccountId', v)}
            placeholder="جميع الحسابات الدائنة"
            clearable
          />
        </div>
      )}

      {/* التصنيف */}
      {config.showClassification && (
        <div style={{ minWidth: 180 }}>
          <SearchableSelect
            id="filter.classification"
            value={values.classificationId || ''}
            options={classificationOptions}
            onChange={v => onChange('classificationId', v)}
            placeholder="جميع التصنيفات"
            clearable
          />
        </div>
      )}

      {/* الشجرة الفرعية */}
      {config.showExpensesCategory && (
        <div style={{ minWidth: 180 }}>
          <SearchableSelect
            id="filter.expenses"
            value={values.expensesCategoryId || ''}
            options={categoryOptions}
            onChange={v => onChange('expensesCategoryId', v)}
            placeholder="جميع الشجرة الفرعية"
            clearable
          />
        </div>
      )}

      {/* عنصر العمل */}
      {config.showWorkItem && (
        <div style={{ minWidth: 180 }}>
          <SearchableSelect
            id="filter.workitem"
            value={values.workItemId || ''}
            options={workItemOptions}
            onChange={v => onChange('workItemId', v)}
            placeholder="جميع عناصر العمل"
            clearable
          />
        </div>
      )}

      {/* بند التحليل */}
      {config.showAnalysisWorkItem && (
        <div style={{ minWidth: 180 }}>
          <SearchableSelect
            id="filter.analysis"
            value={values.analysisWorkItemId || ''}
            options={analysisOptions}
            onChange={v => onChange('analysisWorkItemId', v)}
            placeholder="جميع بنود التحليل"
            clearable
          />
        </div>
      )}

      {/* مركز التكلفة */}
      {config.showCostCenter && (
        <div style={{ minWidth: 180 }}>
          <SearchableSelect
            id="filter.costcenter"
            value={values.costCenterId || ''}
            options={costCenterOptions}
            onChange={v => onChange('costCenterId', v)}
            placeholder="جميع مراكز التكلفة"
            clearable
          />
        </div>
      )}

      {/* حالة الاعتماد */}
      {config.showApprovalStatus && (
        <div style={{ minWidth: 140 }}>
          <SearchableSelect
            id="filter.approval"
            value={values.approvalStatus || ''}
            options={approvalOptions}
            onChange={v => onChange('approvalStatus', v)}
            placeholder="حالة الاعتماد"
            clearable
          />
        </div>
      )}

      {/* زر إعادة التعيين */}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="ultimate-btn ultimate-btn-neutral"
          style={{ padding: '0.5rem 1rem' }}
        >
          إعادة تعيين
        </button>
      )}
    </div>
  )
}

export default UnifiedFilterBar
```

---

## استخدام UnifiedFilterBar في صفحة

```tsx
import { useState, useCallback } from 'react'
import { UnifiedFilterBar, type FilterValues, type FilterConfig } from '../../components/Common/UnifiedFilterBar'

const MyPage: React.FC = () => {
  const [filters, setFilters] = useState<FilterValues>({})

  const handleFilterChange = useCallback((key: keyof FilterValues, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setFilters({})
  }, [])

  // تحديد الفلاتر المطلوبة لهذه الصفحة
  const filterConfig: FilterConfig = {
    showSearch: true,
    showDateRange: true,
    showOrg: true,
    showProject: true,
    showDebitAccount: false,  // إخفاء فلتر الحساب المدين
    showCreditAccount: false, // إخفاء فلتر الحساب الدائن
    showApprovalStatus: true,
  }

  return (
    <div>
      <UnifiedFilterBar
        values={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
        config={filterConfig}
      />
      
      {/* محتوى الصفحة */}
    </div>
  )
}
```

---

## الصفحات التي تحتاج تحديث

| الصفحة | الحالة | الملاحظات |
|--------|--------|-----------|
| `Transactions.tsx` | ✅ محدثة | تستخدم TransactionsDataContext |
| `TransactionsEnriched.tsx` | ✅ محدثة | تستخدم TransactionsDataContext |
| `AccountExplorer.tsx` | ⚠️ تحتاج تحديث | تحمل البيانات محلياً |
| `EnhancedOpeningBalanceImport.tsx` | ⚠️ تحتاج تحديث | تحمل البيانات محلياً |
| `WorkItems.tsx` | ⚠️ تحتاج تحديث | تحمل البيانات محلياً |
| `ExportDatabase.tsx` | ⚠️ تحتاج تحديث | تحمل البيانات محلياً |

---

## Hook مخصص لإدارة حالة الفلاتر

### الملف: `src/hooks/useFilterState.ts`

```typescript
import { useState, useCallback, useEffect } from 'react'

export interface FilterState {
  search?: string
  dateFrom?: string
  dateTo?: string
  amountFrom?: string
  amountTo?: string
  orgId?: string
  projectId?: string
  debitAccountId?: string
  creditAccountId?: string
  classificationId?: string
  expensesCategoryId?: string
  workItemId?: string
  analysisWorkItemId?: string
  costCenterId?: string
  approvalStatus?: string
}

interface UseFilterStateOptions {
  storageKey?: string
  defaultValues?: Partial<FilterState>
  onFilterChange?: (filters: FilterState) => void
}

export function useFilterState(options: UseFilterStateOptions = {}) {
  const { storageKey, defaultValues = {}, onFilterChange } = options

  // تحميل القيم المحفوظة
  const [filters, setFilters] = useState<FilterState>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          return { ...defaultValues, ...JSON.parse(saved) }
        }
      } catch {}
    }
    return defaultValues
  })

  // حفظ القيم عند التغيير
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filters))
      } catch {}
    }
    onFilterChange?.(filters)
  }, [filters, storageKey, onFilterChange])

  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultValues)
  }, [defaultValues])

  const setMultipleFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  return {
    filters,
    updateFilter,
    resetFilters,
    setMultipleFilters,
    setFilters,
  }
}
```

### استخدام Hook:

```tsx
import { useFilterState } from '../../hooks/useFilterState'

const MyPage: React.FC = () => {
  const { filters, updateFilter, resetFilters } = useFilterState({
    storageKey: 'my_page_filters',
    defaultValues: {
      approvalStatus: 'all',
    },
    onFilterChange: (newFilters) => {
      // إعادة تحميل البيانات عند تغيير الفلاتر
      loadData(newFilters)
    }
  })

  return (
    <UnifiedFilterBar
      values={filters}
      onChange={updateFilter}
      onReset={resetFilters}
    />
  )
}
```

---

## خطة التنفيذ المقترحة

### المرحلة 1: البنية التحتية (مكتملة)
- [x] إنشاء `TransactionsDataContext`
- [x] تحديث `Transactions.tsx`
- [x] تحديث `TransactionsEnriched.tsx`

### المرحلة 2: المكونات الموحدة
- [x] إنشاء `UnifiedFilterBar` component
- [x] إنشاء `useFilterState` hook
- [x] إضافة CSS موحد للفلاتر

### المرحلة 3: تحديث الصفحات
- [ ] تحديث `AccountExplorer.tsx`
- [ ] تحديث `EnhancedOpeningBalanceImport.tsx`
- [ ] تحديث `WorkItems.tsx`
- [ ] تحديث `ExportDatabase.tsx`

### المرحلة 4: التحسينات (مكتملة)
- [x] إضافة حفظ تفضيلات عرض الفلاتر (localStorage persistence)
- [x] إضافة تخصيص عرض الفلاتر (modal with visibility toggles and width sliders)
- [x] إضافة فلاتر مخصصة لكل صفحة (via `config` prop and `preferencesKey`)

---

## ملاحظات مهمة

1. **الأداء**: Context يحمل البيانات مرة واحدة ويشاركها بين جميع الصفحات
2. **الاتساق**: جميع الصفحات تستخدم نفس البيانات المرجعية
3. **الصيانة**: تغيير واحد في Context يؤثر على جميع الصفحات
4. **RTL**: جميع المكونات تدعم اللغة العربية والاتجاه من اليمين لليسار
5. **التخزين**: يمكن حفظ تفضيلات الفلاتر في localStorage أو قاعدة البيانات

---

## ميزات التخصيص (المرحلة 4)

### 1. حفظ تفضيلات عرض الفلاتر

يتم حفظ تفضيلات الفلاتر تلقائياً في `localStorage` باستخدام `preferencesKey`:

```tsx
<UnifiedFilterBar
  values={filters}
  onChange={updateFilter}
  onReset={resetFilters}
  preferencesKey="my_page_filters"  // مفتاح فريد لكل صفحة
/>
```

يتم حفظ:
- **عرض كل فلتر** (`{preferencesKey}:widths`)
- **إظهار/إخفاء كل فلتر** (`{preferencesKey}:visibility`)

### 2. نافذة تخصيص الفلاتر

يحتوي `UnifiedFilterBar` على زر "⚙️ عرض الفلاتر" الذي يفتح نافذة تخصيص تتيح:
- ✅ تفعيل/إلغاء تفعيل كل فلتر
- ✅ تعديل عرض كل فلتر بالبكسل
- ✅ إعادة تعيين للإعدادات الافتراضية

### 3. فلاتر مخصصة لكل صفحة

استخدم `config` لتحديد الفلاتر المطلوبة لكل صفحة:

```tsx
// صفحة المعاملات - جميع الفلاتر
const transactionsConfig: FilterConfig = {
  showSearch: true,
  showDateRange: true,
  showAmountRange: true,
  showOrg: true,
  showProject: true,
  showDebitAccount: true,
  showCreditAccount: true,
  showClassification: true,
  showExpensesCategory: true,
  showWorkItem: true,
  showAnalysisWorkItem: true,
  showCostCenter: true,
  showApprovalStatus: true,
}

// صفحة سطور المعاملات - فلاتر محددة
const linesConfig: FilterConfig = {
  showSearch: true,
  showAmountRange: true,
  showDebitAccount: true,
  showCreditAccount: true,
  showProject: true,
  showCostCenter: true,
  showWorkItem: true,
  showClassification: true,
  showExpensesCategory: true,
  showAnalysisWorkItem: true,
  // إخفاء الفلاتر غير المطلوبة
  showDateRange: false,
  showOrg: false,
  showApprovalStatus: false,
}
```

---

## مثال سريع للاستخدام

```tsx
// src/pages/MyNewPage.tsx
import React, { useEffect, useCallback } from 'react'
import { useTransactionsData } from '../../contexts/TransactionsDataContext'
import { UnifiedFilterBar, type FilterConfig } from '../../components/Common/UnifiedFilterBar'
import { useFilterState } from '../../hooks/useFilterState'

const MyNewPage: React.FC = () => {
  // 1. استخدام Context للبيانات المرجعية
  const { isLoading: contextLoading } = useTransactionsData()

  // 2. استخدام Hook لإدارة حالة الفلاتر
  const { filters, updateFilter, resetFilters } = useFilterState({
    storageKey: 'my_page_filters',
    defaultValues: { approvalStatus: '' },
  })

  // 3. تحميل البيانات عند تغيير الفلاتر
  const loadData = useCallback(async () => {
    if (contextLoading) return
    // ... تحميل البيانات باستخدام filters
  }, [contextLoading, filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 4. تحديد الفلاتر المطلوبة
  const filterConfig: FilterConfig = {
    showSearch: true,
    showDateRange: true,
    showOrg: true,
    showProject: true,
    showApprovalStatus: true,
    // إخفاء الفلاتر غير المطلوبة
    showDebitAccount: false,
    showCreditAccount: false,
  }

  if (contextLoading) {
    return <div>جاري التحميل...</div>
  }

  return (
    <div className="page-container">
      {/* 5. استخدام شريط الفلاتر الموحد مع التخصيص */}
      <UnifiedFilterBar
        values={filters}
        onChange={updateFilter}
        onReset={resetFilters}
        config={filterConfig}
        preferencesKey="my_page_filters"  // لحفظ تفضيلات المستخدم
      />
      
      {/* محتوى الصفحة */}
      <div className="content">
        {/* ... */}
      </div>
    </div>
  )
}

export default MyNewPage
```

---

## الخلاصة

باستخدام هذا النظام الموحد:
- ✅ كود أقل وأنظف
- ✅ أداء أفضل (تحميل البيانات مرة واحدة)
- ✅ اتساق عبر جميع الصفحات
- ✅ سهولة الصيانة والتحديث
- ✅ دعم كامل للغة العربية و RTL
