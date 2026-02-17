# Filter Architecture Redesign - Enterprise Solution

## Problem Analysis

The current unified filter system has critical UX and scalability issues:

1. **Global State Pollution**: All pages share the same localStorage keys
2. **Multi-User Conflicts**: Users interfere with each other's filter preferences  
3. **Cross-Page Filter Bleeding**: Filters persist across unrelated pages
4. **Poor Mental Model**: Users expect page-specific contexts

## Industry Best Practices Analysis

### Similar Applications Patterns

**1. Jira/Linear (Issue Tracking)**
- **Page-Specific Filters**: Each view (My Issues, All Issues, Sprint Board) has independent filters
- **Named Filter Sets**: Users can save and name filter combinations
- **Default Views**: System provides sensible defaults per page type
- **Filter Inheritance**: Some filters (like Project) inherit from navigation context

**2. Salesforce (CRM)**
- **View-Based Filtering**: Each list view has its own filter state
- **User Preferences**: Filters are user-specific, not shared across sessions
- **Context Preservation**: Filters persist within a user session but reset appropriately
- **Smart Defaults**: System suggests relevant filters based on page context

**3. Tableau/PowerBI (Analytics)**
- **Dashboard-Specific Filters**: Each dashboard maintains independent filter state
- **Filter Scope**: Clear indication of which filters affect which visualizations
- **Session vs Persistent**: Distinction between temporary and saved filter states

**4. GitHub (Code Repository)**
- **Page-Scoped Filters**: Issues, PRs, and Code Search have separate filter contexts
- **URL-Based State**: Filters are reflected in URL for shareability
- **Smart Persistence**: Some filters persist (like repository scope), others reset

## Recommended Architecture

### 1. **Hierarchical Filter Scoping**

```typescript
interface FilterScope {
  level: 'global' | 'module' | 'page' | 'session'
  key: string
  persistence: 'none' | 'session' | 'user' | 'shared'
}

// Examples:
const scopes = {
  // Global - affects all pages (org/project selection)
  organization: { level: 'global', key: 'app_scope', persistence: 'user' },
  
  // Module - shared within transaction-related pages
  transactionModule: { level: 'module', key: 'transactions_common', persistence: 'user' },
  
  // Page - specific to individual pages
  transactionLinesReport: { level: 'page', key: 'transaction_lines_report', persistence: 'session' },
  allLinesEnriched: { level: 'page', key: 'all_lines_enriched', persistence: 'session' },
  
  // Session - temporary, not persisted
  temporarySearch: { level: 'session', key: 'temp_search', persistence: 'none' }
}
```

### 2. **Filter Inheritance Model**

```typescript
interface FilterInheritance {
  inherits: FilterScope[]
  overrides: string[] // Which filters can be overridden at this level
  resets: string[]    // Which filters reset when entering this scope
}

// Transaction Lines Report inherits org/project but has its own search/date filters
const transactionLinesReportFilters: FilterInheritance = {
  inherits: ['organization'], // Gets org/project from global scope
  overrides: ['search', 'dateFrom', 'dateTo', 'classificationId'], // Page-specific
  resets: ['search'] // Search resets when entering page
}
```

### 3. **User-Specific Storage Strategy**

```typescript
interface FilterStorageStrategy {
  storageType: 'localStorage' | 'sessionStorage' | 'indexedDB' | 'server'
  keyPattern: string
  userIsolation: boolean
  expirationMs?: number
}

// User-specific keys prevent conflicts
const generateStorageKey = (scope: FilterScope, userId?: string, pageId?: string) => {
  const parts = [scope.key]
  
  if (scope.persistence === 'user' && userId) {
    parts.push(`user_${userId}`)
  }
  
  if (scope.level === 'page' && pageId) {
    parts.push(`page_${pageId}`)
  }
  
  return parts.join('_')
}
```

### 4. **Smart Filter Defaults**

```typescript
interface SmartDefaults {
  contextual: boolean    // Use page context to set defaults
  temporal: boolean      // Use time-based defaults (current month, etc.)
  userBased: boolean     // Use user's historical preferences
  organizational: boolean // Use org-level defaults
}

// Example: Transaction Lines Report smart defaults
const getSmartDefaults = (context: PageContext): FilterState => {
  return {
    // Always inherit current org/project
    orgId: context.currentOrg?.id || '',
    projectId: context.currentProject?.id || '',
    
    // Default to current month for date-sensitive reports
    dateFrom: startOfMonth(new Date()).toISOString().split('T')[0],
    dateTo: endOfMonth(new Date()).toISOString().split('T')[0],
    
    // Clear search and specific filters (page-specific context)
    search: '',
    classificationId: '',
    costCenterId: '',
    
    // Keep approval status from user's last session
    approvalStatus: getUserPreference('lastApprovalFilter') || ''
  }
}
```

## Implementation Strategy

### Phase 1: Filter Scope Separation (Immediate)

1. **Create Page-Specific Storage Keys**
   ```typescript
   const STORAGE_KEYS = {
     transactionLinesReport: 'filters_transaction_lines_report',
     allLinesEnriched: 'filters_all_lines_enriched', 
     myLinesEnriched: 'filters_my_lines_enriched',
     transactionsEnriched: 'filters_transactions_enriched',
     runningBalance: 'filters_running_balance'
   }
   ```

2. **Add User ID to Storage Keys**
   ```typescript
   const getUserSpecificKey = (baseKey: string, userId: string) => 
     `${baseKey}_user_${userId}`
   ```

3. **Implement Filter Reset on Page Navigation**
   ```typescript
   const usePageSpecificFilters = (pageKey: string) => {
     useEffect(() => {
       // Reset search and page-specific filters when entering page
       resetPageSpecificFilters(['search', 'classificationId', 'costCenterId'])
     }, [pageKey])
   }
   ```

### Phase 2: Smart Inheritance (Short-term)

1. **Global Scope Context**
   - Organization and Project selection remain global
   - Managed by ScopeContext (already exists)

2. **Page-Specific Overrides**
   - Each page can override specific filters
   - Clear visual indication of inherited vs. page-specific filters

3. **Filter Categories**
   ```typescript
   const FILTER_CATEGORIES = {
     global: ['orgId', 'projectId'], // Inherited from global scope
     contextual: ['dateFrom', 'dateTo'], // Smart defaults based on page
     specific: ['search', 'classificationId', 'costCenterId'], // Page-specific
     persistent: ['approvalStatus'] // User preference, persists across pages
   }
   ```

### Phase 3: Advanced Features (Medium-term)

1. **Named Filter Sets**
   - Users can save and name filter combinations
   - "My Pending Approvals", "Q4 Transactions", etc.

2. **Filter Sharing**
   - Share filter configurations via URL
   - Team-level filter templates

3. **Smart Suggestions**
   - AI-powered filter suggestions based on user behavior
   - "You usually filter by Classification X on this page"

## UX Design Patterns

### 1. **Visual Filter Scope Indicators**

```typescript
// Filter bar shows scope with visual cues
<FilterBar>
  <FilterSection scope="global" label="Organization Context">
    <OrgSelector inherited />
    <ProjectSelector inherited />
  </FilterSection>
  
  <FilterSection scope="page" label="Report Filters">
    <SearchFilter />
    <DateRangeFilter />
    <ClassificationFilter />
  </FilterSection>
</FilterBar>
```

### 2. **Filter State Persistence Options**

```typescript
interface FilterPersistenceUI {
  showSaveOptions: boolean
  allowReset: boolean
  showInheritance: boolean
  persistenceLevel: 'session' | 'permanent' | 'shared'
}

// UI shows clear options
<FilterActions>
  <Button onClick={saveAsDefault}>Save as My Default</Button>
  <Button onClick={resetToDefaults}>Reset to Page Defaults</Button>
  <Button onClick={shareFilters}>Share Filter Set</Button>
</FilterActions>
```

### 3. **Context-Aware Defaults**

```typescript
// Page shows why certain defaults are set
<FilterExplanation>
  "Showing current month transactions for {orgName} - {projectName}"
  <Link onClick={changeDefaults}>Change defaults</Link>
</FilterExplanation>
```

## Migration Strategy

### Step 1: Immediate Fix (This Sprint)
- Add page-specific storage keys
- Add user ID isolation
- Implement basic filter reset on navigation

### Step 2: Enhanced UX (Next Sprint)  
- Add visual scope indicators
- Implement smart defaults
- Add filter inheritance logic

### Step 3: Advanced Features (Future)
- Named filter sets
- Filter sharing
- Advanced persistence options

## Code Changes Required

### 1. Update useFilterState Hook
```typescript
interface UseFilterStateOptions {
  storageKey?: string
  pageScope: string // NEW: Required page identifier
  userScope?: string // NEW: User ID for isolation
  inheritFrom?: string[] // NEW: Which scopes to inherit from
  resetOnNavigation?: string[] // NEW: Which filters to reset
  smartDefaults?: (context: any) => Partial<FilterState> // NEW
}
```

### 2. Update Each Page Component
```typescript
// Each page specifies its filter scope
const TransactionLinesReportPage = () => {
  const filters = useTransactionsFilters({
    pageScope: 'transaction_lines_report',
    inheritFrom: ['global_scope'],
    resetOnNavigation: ['search', 'classificationId'],
    smartDefaults: getTransactionLinesDefaults
  })
}
```

### 3. Add Filter Migration Utility
```typescript
// Migrate existing localStorage to new structure
const migrateFilterStorage = () => {
  // Move existing filters to user-specific keys
  // Provide smooth transition for existing users
}
```

## Benefits of This Approach

1. **User Experience**
   - Predictable filter behavior per page
   - No unexpected filter states
   - Clear mental model of filter scope

2. **Multi-User Support**
   - Complete user isolation
   - No conflicts between users
   - Scalable to enterprise environments

3. **Developer Experience**
   - Clear filter architecture
   - Easy to add new pages with appropriate filter scope
   - Maintainable and testable

4. **Performance**
   - Reduced localStorage conflicts
   - Efficient filter state management
   - Better caching strategies

## Risk Mitigation

1. **Migration Risk**: Provide smooth transition from current system
2. **User Confusion**: Clear UI indicators and documentation
3. **Performance Impact**: Minimal - mostly localStorage key changes
4. **Backward Compatibility**: Maintain existing filter functionality during transition

This architecture follows enterprise software patterns and provides a scalable foundation for filter management across the application.