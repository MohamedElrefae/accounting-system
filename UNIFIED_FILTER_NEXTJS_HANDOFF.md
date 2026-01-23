# Unified Filter System Replication Handoff (React/Vite -> Next.js App Router)

> **Purpose**: Attach this file to an AI agent to replicate the existing **Unified Filter System** from this repo into a new **Next.js App Router** application.
>
> This document is based on the actual implementation in:
> - `src/components/Common/UnifiedFilterBar.tsx`
> - `src/hooks/useFilterState.ts`
> - `src/hooks/useFilterOptions.ts`
> - `src/hooks/useTransactionsFilters.ts` (example consumer + “Apply” model)
> - `src/contexts/TransactionsDataContext.tsx` (reference-data provider for dropdown options)
> - `src/contexts/ScopeContext.tsx` + `src/contexts/ScopeProvider.tsx` (org/project scope)
>
> **Important**: The new Next.js app expands scope from `org + project` to:
> - `org + branch + project + department`
>
> UI standard for the new app: **React + MUI**, full RTL/Arabic support.

---

## 1) What the Unified Filter System Does (Behavioral Contract)

The “Unified Filter” system provides a consistent way to:

- Render a reusable filter bar (`UnifiedFilterBar`) across multiple pages.
- Manage filter state (`useFilterState`) with local persistence.
- Build dropdown option lists from cached reference data (`useFilterOptions`).
- Allow per-page customization (which filters show + per-filter widths).
- Persist UI customization (visibility/widths) per page via a namespace key (`preferencesKey`).
- Support a “Draft vs Applied” model on heavy pages (edit filters freely, press **Apply** to trigger expensive refetch).

### Key invariants

- The filter bar is **stateless**; it receives `values` and calls `onChange`.
- `useFilterState` is the single unified filter-state primitive; all pages should build on it.
- UI customization is stored under:
  - `${preferencesKey}:widths`
  - `${preferencesKey}:visibility`
- Org/project selection is increasingly **global scope** (TopBar / ScopeContext). Pages can still keep filter fields, but the effective scope should be merged from scope context.

---

## 2) Current Repo Source-of-Truth: Components & Hooks

### 2.1 `useFilterState` (state + persistence + debounce)

File: `src/hooks/useFilterState.ts`

Responsibilities:

- Holds `filters` object in React state.
- Loads initial values from `localStorage` by `storageKey`.
- Saves to `localStorage` on changes.
- Optional debounced callback `onFilterChange(filters)`.
- Exposes helpers:
  - `updateFilter(key, value)` (normalizes empty string to `undefined`)
  - `resetFilters()` (back to `defaultValues`)
  - `setMultipleFilters()`
  - `hasActiveFilters()` / `activeFilterCount()`

Filter fields (current app):

- `search`
- `dateFrom`, `dateTo`
- `amountFrom`, `amountTo`
- `orgId`, `projectId`
- `debitAccountId`, `creditAccountId`
- `classificationId`, `expensesCategoryId`, `workItemId`, `analysisWorkItemId`, `costCenterId`
- `approvalStatus`
- `createdBy`, `scope`

### 2.2 `useFilterOptions` (options builder)

File: `src/hooks/useFilterOptions.ts`

Responsibilities:

- Consumes `useTransactionsData()`.
- Returns memoized option arrays (`SearchableSelectOption[]`) for dropdowns.
- Adds a top “All …” option for most lists.

This is a performance abstraction: it moves sorting/mapping out of pages.

### 2.3 `UnifiedFilterBar` (UI + config modal)

File: `src/components/Common/UnifiedFilterBar.tsx`

Responsibilities:

- Renders controls based on `config` (which filter groups are enabled).
- Applies per-filter visibility (`filterVisibility`) and widths (`customWidths`).
- Persists visibility/widths using a **preference namespace**:
  - `preferenceNamespace = preferencesKey || 'unified_filter_bar'`
  - `${preferenceNamespace}:widths`
  - `${preferenceNamespace}:visibility`
- Shows “config modal” opened via a “⚙️” button.
  - Inside modal: checkbox per filter + width slider per filter.
- Shows active filter count badge on reset button.
- Uses `ScopeChips` to display the current org/project scope from `ScopeContext`.

### 2.4 `useTransactionsFilters` (example “Apply” model + scope merge)

File: `src/hooks/useTransactionsFilters.ts`

Responsibilities:

- Uses `useFilterState` twice:
  - Header filters (`transactions_filters`)
  - Line filters (`transactions_lines_filters`)
- Implements “draft vs applied”:
  - `headerFilters`: current edited values
  - `headerAppliedFilters`: snapshot used for querying
  - `headerFiltersDirty`: whether Apply is needed
- Merges scope from `ScopeContext` into effective filters:
  - Always forces `orgId` from `scope.currentOrg`
  - Forces `projectId` from `scope.currentProject` when available

This pattern is critical for expensive pages in Next.js too.

---

## 3) Data Flow (How It Works End-to-End)

### 3.1 Reference data loading

- `TransactionsDataProvider` loads:
  - `organizations`, `projects`, `accounts`, `classifications`, `currentUserId` via React Query
  - “dimensions” (work items, categories/sub-tree, cost centers, analysis items) via manual accumulation per org
- `useFilterOptions` maps that into dropdown-friendly `options`.

### 3.2 Scope & filter interaction

- Global scope is held in `ScopeProvider` (`org_id`, `project_id` in localStorage).
- Pages may still have org/project filters in UI, but canonical scope should come from `ScopeContext`.
- Consumers merge “local filters” with scope (see `useTransactionsFilters`).

### 3.3 Persistence layers

There are *three* independent persistence concerns:

1. **Filter values** for a page:
   - `useFilterState({ storageKey })`
2. **Filter bar UI customization**:
   - `${preferencesKey}:widths`
   - `${preferencesKey}:visibility`
3. **Global scope selection**:
   - `org_id`
   - `project_id`

---

## 4) Next.js App Router Replication (Recommended Architecture)

### 4.1 Next.js constraints

- `localStorage` and UI state are client-only.
- Therefore:
  - Filter state hooks must be **Client Components**.
  - `UnifiedFilterBar` must be a **Client Component**.
- You can still fetch data server-side, but the *existing behavior* is client-first.

### 4.2 Target folder structure (Next.js)

Suggested structure:

```
src/
  app/
    layout.tsx
    providers.tsx
  components/
    filters/
      UnifiedFilterBar.tsx
      FilterConfigDialog.tsx
  contexts/
    scope/
      ScopeContext.tsx
      ScopeProvider.tsx
    reference-data/
      ReferenceDataContext.tsx
  hooks/
    filters/
      useFilterState.ts
      useFilterOptions.ts
      useAppliedFilters.ts
      useScopedFilters.ts
  services/
    reference-data/
      organizations.ts
      branches.ts
      projects.ts
      departments.ts
  utils/
    supabase/
      client.ts
  theme/
    theme.ts
    rtlCache.ts
```

Notes:

- Split the current “overlay modal” into an MUI `Dialog` component (`FilterConfigDialog.tsx`).
- Create a generic `useAppliedFilters` hook to standardize the “Apply” model.

---

## 5) Expand Scope: org + branch + project + department

### 5.1 New scope model

In the new app, the global scope should be:

- `currentOrg`
- `currentBranch` (optional; depends on org)
- `currentProject` (optional; depends on branch or org depending on business rules)
- `currentDepartment` (optional; depends on org/branch)

### 5.2 Storage keys (proposed)

- `org_id`
- `branch_id`
- `project_id`
- `department_id`

### 5.3 Required invariants (must implement)

- When **org changes**:
  - clear `branch`, `project`, `department`
- When **branch changes**:
  - clear `project`, `department` (unless your business rules allow cross-branch departments)
- When **project changes**:
  - keep org/branch; optionally clear department if department is project-scoped

### 5.4 Filter merge policy (must be explicit)

Recommended policy:

- Scope values always override filter values.
- Filters can still have fields like `projectId`, but effective query must use scope.

Implement as a single helper:

- `mergeScopeIntoFilters(filters, scope)`

Where scope wins:

- `orgId := scope.orgId`
- `branchId := scope.branchId`
- `projectId := scope.projectId ?? filters.projectId`
- `departmentId := scope.departmentId ?? filters.departmentId`

---

## 6) MUI + RTL Requirements (Next.js)

Current repo’s UnifiedFilterBar uses inline styles and a custom select.

For the Next.js app:

- Rebuild `UnifiedFilterBar` using MUI primitives:
  - `Stack`, `Box`, `TextField`, `FormControl`, `Select`, `MenuItem`, `Button`, `Chip`
  - For searchable selects, use **MUI Autocomplete**.
- Implement the config modal with `Dialog`, `DialogTitle`, `DialogContent`, `Switch`/`Checkbox`, and `Slider`.
- Ensure RTL:
  - `<html dir="rtl" lang="ar">`
  - MUI theme direction: `direction: 'rtl'`
  - Use the recommended RTL cache setup.

---

## 7) What to Replicate Exactly vs Improve

### 7.1 Must replicate 1:1

- `useFilterState` API (storageKey, defaultValues, debounce behavior).
- Per-page `preferencesKey` storing:
  - `:widths`
  - `:visibility`
- Config dialog features:
  - Toggle filter visibility
  - Adjust per-filter width
  - Reset customization
- “Apply” pattern for expensive pages.

### 7.2 Recommended improvements for Next.js

- Replace overlay DIV modal with MUI `Dialog`.
- Replace `SearchableSelect` with MUI `Autocomplete`.
- Centralize scope merge logic in one helper/hook.
- Create a single `FilterStateV2` type in the new app that includes new scope fields.

---

## 8) Suggested TypeScript Contracts (Next.js)

### 8.1 `FilterStateV2`

Add new scope-related filter fields (used by pages, but scope may override them):

- `orgId?: string`
- `branchId?: string`
- `projectId?: string`
- `departmentId?: string`

Keep existing dimension filters if needed (cost center, work item, etc.).

### 8.2 `UnifiedFilterBarConfig`

Extend config to include new scope controls:

- `showOrg?: boolean`
- `showBranch?: boolean`
- `showProject?: boolean`
- `showDepartment?: boolean`

But if scope selection is only in TopBar, keep them hidden and use chips.

---

## 9) Testing Checklist (Quick Manual)

- Filter values persistence:
  - change a filter -> reload -> value restored
- Preferences persistence:
  - change widths/visibility -> reload -> restored
- Apply model:
  - edit filter -> `dirty=true` -> Apply -> `dirty=false`
- Scope merge:
  - change org/branch/project/department -> effective filters update
  - org change clears dependent selections
- RTL:
  - components align correctly
  - chips/icons and padding look correct

---

## 10) Open Questions (must clarify in new app)

- Is `branch` a database entity, or a Supabase “branch” concept? (This affects data loading and relationships.)
- Are departments scoped by org, by branch, or by project?
- Should the filter bar allow changing scope, or should it be read-only chips + TopBar selection?

