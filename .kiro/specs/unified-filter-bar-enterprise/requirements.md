# Unified Filter Bar - Enterprise Accounting System
## Requirements & Architecture

### Core Requirements

#### 1. Multi-User Conflict Prevention
- **User Isolation**: Each user's filters stored separately in localStorage with userId key
- **No Cross-User Interference**: Filters from one user never affect another
- **Session-Based Storage**: Filters persist across page navigation within same session

#### 2. Page Isolation
- **Independent State**: Each page maintains its own filter state
- **Page-Specific Keys**: Filters stored with pageId/pageName as part of key
- **No Bleed-Through**: Filters on TransactionsEnriched don't affect AllLinesEnriched

#### 3. User-Specific Storage
- **Storage Key Format**: `filters_${userId}_${pageId}`
- **Supabase Sync**: Optional sync to user_preferences table for cross-device
- **LocalStorage Fallback**: Works offline, syncs when available

#### 4. Smart Reset Behavior
- **Page Navigation**: Reset page-specific filters when leaving page
- **Manual Reset**: User can reset current page filters
- **Preserve Global**: Global org/project filters persist across pages
- **Scope-Aware**: Reset respects current scope (org/project context)

### Filter Types

#### Global Filters (Persist Across Pages)
- Organization
- Project
- Fiscal Year/Period

#### Page-Specific Filters (Reset on Navigation)
- Date Range
- Amount Range
- Account Selection
- Approval Status
- Search Text
- Custom Dimensions

### UI Components

#### Filter Bar Sections
1. **Action Buttons** (Always Visible)
   - Apply Filters
   - Reset Filters
   - Save as Default

2. **Filter Inputs** (Collapsible)
   - Date Range Picker
   - Amount Range Slider
   - Account Selector
   - Status Dropdown
   - Search Box
   - Dimension Selectors

3. **Status Display**
   - Active Filter Count
   - Dirty State Indicator
   - Last Applied Time

### Storage Architecture

```
localStorage:
  filters_${userId}_${pageId} = {
    global: {
      orgId: string
      projectId: string
      fiscalYearId: string
    },
    page: {
      dateFrom: string
      dateTo: string
      amountFrom: number
      amountTo: number
      accountId: string
      approvalStatus: string
      search: string
      [customDimensions]: any
    },
    metadata: {
      lastApplied: timestamp
      isDirty: boolean
      savedAsDefault: boolean
    }
  }

Supabase (user_preferences):
  {
    user_id: uuid
    page_id: string
    filter_config: jsonb
    is_default: boolean
    created_at: timestamp
    updated_at: timestamp
  }
```

### Hook Interface

```typescript
usePageFilters(pageId: string) => {
  // State
  filters: FilterState
  appliedFilters: FilterState
  isDirty: boolean
  
  // Actions
  updateFilter: (key: string, value: any) => void
  applyFilters: () => void
  resetFilters: () => void
  saveAsDefault: () => void
  
  // Utilities
  getActiveFilterCount: () => number
  hasValidFilter: () => boolean
}
```

### Component Props

```typescript
interface UnifiedFilterBarProps {
  pageId: string
  userId: string
  filters: FilterState
  appliedFilters: FilterState
  isDirty: boolean
  onFilterChange: (key: string, value: any) => void
  onApply: () => void
  onReset: () => void
  config?: FilterConfig
  showAdvanced?: boolean
}
```

### Key Features

1. **Conflict Prevention**
   - userId + pageId composite key
   - No shared state between users
   - No shared state between pages

2. **Smart Defaults**
   - Load last applied filters on page load
   - Option to save as default
   - Auto-apply saved defaults

3. **Performance**
   - Debounced filter updates
   - Lazy load filter options
   - Memoized selectors

4. **UX**
   - Visual feedback for dirty state
   - Active filter count badge
   - Quick reset button
   - Save/Load presets

5. **Enterprise Features**
   - Audit trail of filter changes
   - Filter sharing between users (optional)
   - Filter templates by role
   - Compliance logging
