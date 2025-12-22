# Enterprise Organization-Project Scope Architecture
## Technical Analysis & Implementation Report

**Prepared by:** Senior Software Engineer  
**Date:** December 17, 2025  
**Status:** ✅ IMPLEMENTED  
**For Review by:** CEO / Technical Leadership  
**Review Tool:** Perplexity AI

---

## Executive Summary

This document describes the enterprise-grade Organization-Project scope selection system that has been implemented. The system ensures data isolation, prevents user errors, and maintains consistency across the application through a centralized ScopeContext.

---

## 1. Current Implementation Analysis

### 1.1 Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TopBar.tsx                               │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  OrgSelector    │    │ ProjectSelector │                     │
│  │  (Independent)  │    │  (Independent)  │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           ▼                      ▼                               │
│     localStorage            localStorage                         │
│     (org_id)               (project_id)                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Current Code Structure

**OrgSelector.tsx:**
```typescript
// Current: Standalone component, no coordination with ProjectSelector
export default function OrgSelector({ value, onChange, ... }) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState<string>('');
  
  // Loads all organizations
  // Persists to localStorage independently
  // No notification to ProjectSelector when org changes
}
```

**ProjectSelector.tsx:**
```typescript
// Current: Reads org from localStorage, but no reactive binding
export default function ProjectSelector({ orgId, ... }) {
  const [effectiveOrg, setEffectiveOrg] = useState<string>(
    orgId || getActiveOrgId() || ''
  );
  
  // Only updates when orgId prop changes
  // Does NOT react to localStorage changes from OrgSelector
  // Can show stale projects from wrong organization
}
```

### 1.3 Identified Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| No reactive binding between selectors | HIGH | Project list doesn't update when org changes |
| localStorage as single source of truth | MEDIUM | Race conditions, no validation |
| No org-project relationship validation | HIGH | User can select project from wrong org |
| No centralized state management | HIGH | Inconsistent state across components |
| No permission-based filtering | MEDIUM | Users see orgs they shouldn't access |
| No audit trail for scope changes | LOW | Compliance gap |

---

## 2. Proposed Enterprise Architecture

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ScopeProvider (React Context)                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    ScopeState                                │    │
│  │  • currentOrg: Organization | null                          │    │
│  │  • currentProject: Project | null                           │    │
│  │  • availableOrgs: Organization[]                            │    │
│  │  • availableProjects: Project[]                             │    │
│  │  • isLoading: boolean                                       │    │
│  │  • error: string | null                                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    ScopeActions                              │    │
│  │  • setOrganization(orgId) → clears project, loads projects  │    │
│  │  • setProject(projectId) → validates org ownership          │    │
│  │  • clearScope() → resets to default                         │    │
│  │  • refreshScope() → reloads from server                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Persistence Layer                         │    │
│  │  • localStorage (offline support)                           │    │
│  │  • Server sync (user preferences table)                     │    │
│  │  • Validation on load                                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         UI Components                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ ScopedOrgSelect │    │ScopedProjectSel │    │  ScopeDisplay   │  │
│  │ (Controlled)    │◄──►│  (Controlled)   │    │  (Read-only)    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User selects Organization
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Validate user has access to org  │
│ 2. Update ScopeState.currentOrg     │
│ 3. Clear ScopeState.currentProject  │
│ 4. Fetch projects for new org       │
│ 5. Update availableProjects         │
│ 6. Persist to localStorage          │
│ 7. Emit scope change event          │
└─────────────────────────────────────┘
         │
         ▼
All consuming components receive update
```

---

## 3. Implementation Specification

### 3.1 ScopeContext Interface

```typescript
// src/contexts/ScopeContext.tsx

interface ScopeState {
  // Current selections
  currentOrg: Organization | null;
  currentProject: Project | null;
  
  // Available options (filtered by permissions)
  availableOrgs: Organization[];
  availableProjects: Project[];
  
  // Loading states
  isLoadingOrgs: boolean;
  isLoadingProjects: boolean;
  
  // Error handling
  error: string | null;
  
  // Metadata
  lastUpdated: Date | null;
}

interface ScopeActions {
  // Primary actions
  setOrganization: (orgId: string | null) => Promise<void>;
  setProject: (projectId: string | null) => Promise<void>;
  
  // Utility actions
  clearScope: () => void;
  refreshScope: () => Promise<void>;
  
  // Validation
  validateProjectBelongsToOrg: (projectId: string, orgId: string) => boolean;
}

interface ScopeContextValue extends ScopeState, ScopeActions {}
```

### 3.2 Key Implementation Rules

1. **Organization Change → Project Reset**
   ```typescript
   async function setOrganization(orgId: string | null) {
     // ALWAYS clear project when org changes
     setCurrentProject(null);
     setActiveProjectId(null);
     
     // Then load new org's projects
     if (orgId) {
       const projects = await getActiveProjectsByOrg(orgId);
       setAvailableProjects(projects);
     }
   }
   ```

2. **Project Validation**
   ```typescript
   async function setProject(projectId: string | null) {
     if (!projectId) {
       setCurrentProject(null);
       return;
     }
     
     // Validate project belongs to current org
     const project = availableProjects.find(p => p.id === projectId);
     if (!project) {
       throw new Error('Invalid project for current organization');
     }
     
     setCurrentProject(project);
   }
   ```

3. **Permission-Based Filtering**
   ```typescript
   async function loadAvailableOrgs() {
     const allOrgs = await getOrganizations();
     
     // Filter by user permissions
     const userOrgIds = await getUserOrganizationAccess(userId);
     const accessibleOrgs = allOrgs.filter(org => 
       userOrgIds.includes(org.id) || isSuperAdmin
     );
     
     setAvailableOrgs(accessibleOrgs);
   }
   ```

### 3.3 UI Component Specification

**ScopedOrgSelector:**
```typescript
// Controlled component that uses ScopeContext
function ScopedOrgSelector() {
  const { 
    currentOrg, 
    availableOrgs, 
    setOrganization,
    isLoadingOrgs 
  } = useScope();
  
  return (
    <TextField
      select
      value={currentOrg?.id || ''}
      onChange={(e) => setOrganization(e.target.value)}
      disabled={isLoadingOrgs}
    >
      {availableOrgs.map(org => (
        <MenuItem key={org.id} value={org.id}>
          {org.code} - {org.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
```

**ScopedProjectSelector:**
```typescript
// Automatically disabled when no org selected
function ScopedProjectSelector() {
  const { 
    currentOrg,
    currentProject, 
    availableProjects, 
    setProject,
    isLoadingProjects 
  } = useScope();
  
  return (
    <TextField
      select
      value={currentProject?.id || ''}
      onChange={(e) => setProject(e.target.value || null)}
      disabled={!currentOrg || isLoadingProjects}
      helperText={!currentOrg ? 'Select organization first' : undefined}
    >
      <MenuItem value="">All Projects</MenuItem>
      {availableProjects.map(project => (
        <MenuItem key={project.id} value={project.id}>
          {project.code} - {project.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
```

---

## 4. Database Considerations

### 4.1 Current Schema Relationship

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Projects table (linked to organizations)
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  org_id UUID REFERENCES organizations(id),  -- Foreign key
  status VARCHAR(20) DEFAULT 'active'
);

-- Constraint: project.org_id must match transaction.org_id
```

### 4.2 RLS Policy Recommendations

```sql
-- Ensure users can only see projects for their accessible orgs
CREATE POLICY "Users see projects for their orgs" ON projects
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_organization_access 
      WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role_name = 'super_admin'
    )
  );
```

---

## 5. Migration Path

### Phase 1: Create ScopeContext (Week 1)
- [ ] Create `ScopeContext.tsx` and `ScopeProvider.tsx`
- [ ] Implement core state management
- [ ] Add localStorage persistence
- [ ] Unit tests for context

### Phase 2: Create New Components (Week 1)
- [ ] Create `ScopedOrgSelector.tsx`
- [ ] Create `ScopedProjectSelector.tsx`
- [ ] Create `ScopeDisplay.tsx` (shows current scope)
- [ ] Integration tests

### Phase 3: Integrate into TopBar (Week 2)
- [ ] Replace current selectors with scoped versions
- [ ] Add scope change event handling
- [ ] Update dependent components
- [ ] E2E tests

### Phase 4: Deprecate Old Components (Week 2)
- [ ] Mark old selectors as deprecated
- [ ] Update all usages across app
- [ ] Remove old components
- [ ] Documentation update

---

## 6. Benefits Summary

| Benefit | Business Impact |
|---------|-----------------|
| Data Isolation | Prevents cross-org data leakage |
| User Error Prevention | Reduces support tickets |
| Consistent State | Improves reliability |
| Audit Trail | Compliance readiness |
| Permission Integration | Security enhancement |
| Reactive Updates | Better UX |

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Phased rollout with feature flags |
| Performance impact | Caching and memoization |
| Migration complexity | Backward-compatible API |
| User confusion | Clear UI feedback |

---

## 8. Recommendation

**Proceed with implementation** of the ScopeContext architecture. The current implementation has critical gaps that can lead to:
- Data integrity issues (wrong project selected)
- User confusion (stale project lists)
- Security concerns (no permission filtering)

The proposed architecture follows enterprise patterns used by:
- Salesforce (org/workspace switching)
- Jira (project context)
- QuickBooks (company switching)

---

## 9. Approval Request

Please review this proposal and provide:
1. ✅ Approval to proceed
2. ❌ Rejection with feedback
3. 🔄 Request for modifications

**Estimated Implementation Time:** 2 weeks  
**Estimated Testing Time:** 1 week  
**Total Timeline:** 3 weeks

---

*Document prepared for CEO review via Perplexity AI*


---

## 10. IMPLEMENTATION STATUS (COMPLETED)

### 10.1 Files Created

| File | Purpose |
|------|---------|
| `src/contexts/ScopeContext.tsx` | Context definition and types |
| `src/contexts/ScopeProvider.tsx` | State management and business logic |
| `src/components/Scope/ScopedOrgSelector.tsx` | Organization dropdown component |
| `src/components/Scope/ScopedProjectSelector.tsx` | Project dropdown component |
| `src/components/Scope/index.ts` | Barrel exports |
| `src/hooks/useScopedFilters.ts` | Hook for accessing scope in any component |
| `src/lib/queryKeys.ts` | Updated with scope query keys |

### 10.2 Files Modified

| File | Changes |
|------|---------|
| `src/main.tsx` | Added ScopeProvider to provider tree |
| `src/components/layout/TopBar.tsx` | Replaced old selectors with scoped versions |
| `src/hooks/useAppSync.ts` | Integrated scope refresh into sync manager |

### 10.3 Key Features Implemented

1. **Automatic Project Clearing**
   - When organization changes, project is automatically cleared
   - Prevents invalid org/project combinations

2. **Validation**
   - Project selection validates against current org's projects
   - Invalid selections are rejected

3. **Unified Sync Manager Integration**
   - `useAppSync` now refreshes scope context
   - Query keys include scope for proper cache invalidation

4. **localStorage Persistence**
   - Org/project selections persist across sessions
   - Invalid stored values are automatically cleared

5. **Loading States**
   - Visual feedback during org/project loading
   - Disabled states prevent premature selection

### 10.4 Usage Examples

**In TopBar (already integrated):**
```tsx
import { ScopedOrgSelector, ScopedProjectSelector } from '../Scope';

// Renders controlled dropdowns
<ScopedOrgSelector size="small" />
<ScopedProjectSelector size="small" allowAll />
```

**In any component needing scope:**
```tsx
import { useScope } from '../contexts/ScopeContext';

function MyComponent() {
  const { currentOrg, currentProject, getOrgId, getProjectId } = useScope();
  
  // Use for filtering data
  const orgId = getOrgId();
  const projectId = getProjectId();
}
```

**Using the filters hook:**
```tsx
import { useScopedFilters } from '../hooks/useScopedFilters';

function TransactionList() {
  const { orgId, projectId, hasOrg } = useScopedFilters();
  
  // Use in queries
  const { data } = useQuery({
    queryKey: queryKeys.transactions.by({ orgId, projectId }),
    enabled: hasOrg,
  });
}
```

---

## 11. SQL Schema Reference (VERIFIED)

### Organizations Table Schema
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| code | varchar | NO | - |
| name | varchar | NO | - |
| name_ar | text | YES | - |
| is_active | boolean | YES | - |
| status | varchar | NO | 'active' |
| parent_org_id | uuid | YES | FK → organizations |
| description, address, phone, email, tax_number, website, registration_number, logo_url | various | YES | - |

### Projects Table Schema
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| code | varchar | NO | - |
| name | varchar | NO | - |
| name_ar | text | YES | - |
| org_id | uuid | YES | FK → organizations |
| status | varchar | NO | 'active' |
| budget_amount | numeric | YES | - |
| start_date, end_date | date | YES | - |

### Data Isolation (50+ tables use org_id)
Key tables with org_id foreign key:
- transactions, accounts, cost_centers
- fiscal_years, fiscal_periods, opening_balances
- documents, inventory_*, materials
- approval_workflows, work_items, analysis_work_items
- And 40+ more tables

### Current Data
- **3 Organizations**: MAIN (المؤسسة الرئيسية), 131 (mohamed marey), etc.
- **2 Projects**: Properly linked to their organizations

---

## 12. Dashboard Integration (COMPLETED)

The Dashboard page has been updated to use ScopeContext instead of its own legacy org/project selectors:

### Changes Made:
1. **Removed legacy state variables**: `selectedOrgId`, `selectedProjectId`, `orgOptions`, `projectOptions`
2. **Added ScopeContext integration**: `useScope()` hook for `currentOrg`, `currentProject`, `getOrgId`, `getProjectId`
3. **Replaced legacy selectors with Chips**: Dashboard now shows current scope as read-only chips
4. **Updated data loading**: Uses `getOrgId()` and `getProjectId()` from context
5. **Cleaned up unused imports**: Removed `Select`, `MenuItem`, `getOrganizations`, `getActiveProjects`

### UI Changes:
- Org/Project selection is now ONLY in TopBar (single source of truth)
- Dashboard shows current scope as informational chips
- Date filters remain in Dashboard for report-specific filtering

---

## 13. Testing Checklist

### Manual Testing Steps
1. Open browser to http://localhost:3002 (or current dev port)
2. Login to the app
3. Open browser DevTools (F12) → Console tab
4. Look for logs starting with `[ScopeProvider]`

### Expected Console Logs on Page Load
```
[ScopeProvider] Mounting, loading organizations...
[ScopeProvider] Loading organizations...
[ScopeProvider] Loaded organizations: 3 ['MAIN', '131', ...]
[ScopeProvider] Stored org ID: <uuid or null>
[ScopeProvider] Restored org from storage: MAIN
[ScopeProvider] Loading projects for org: <uuid>
[ScopeProvider] Loaded projects: 2
```

### Verification Checklist
- [ ] Organization dropdown shows organizations
- [ ] Project dropdown shows projects for selected org
- [ ] Changing org clears project selection automatically
- [ ] Changing org loads new projects for that org
- [ ] Selections persist after page refresh
- [ ] Sync button refreshes scope data
- [ ] Loading indicators show during fetch
- [ ] Project dropdown disabled when no org selected
- [ ] "Select organization first" helper text shows when no org

### Test File
See `test-scope-selection.js` for detailed testing instructions.

---

## 13. Next Steps for Full App Integration

To use the scope in other pages (Transactions, Reports, etc.):

```tsx
import { useScopedFilters } from '../hooks/useScopedFilters';

function TransactionsPage() {
  const { orgId, projectId, hasOrg } = useScopedFilters();
  
  // Use in your data fetching
  const { data } = useQuery({
    queryKey: ['transactions', { orgId, projectId }],
    queryFn: () => fetchTransactions({ orgId, projectId }),
    enabled: hasOrg, // Only fetch when org is selected
  });
}
```

---

## 14. Page Migration Status

### Migrated Pages (Using ScopeContext)

| Page | Status | Notes |
|------|--------|-------|
| `TopBar.tsx` | ✅ Complete | Uses ScopedOrgSelector/ScopedProjectSelector |
| `Dashboard.tsx` | ✅ Complete | Uses ScopeChips, data fetching via useScope() |
| `Transactions.tsx` | ✅ Complete | useTransactionsFilters syncs with ScopeContext |
| `TrialBalanceAllLevels.tsx` | ✅ Complete | Uses ScopeChips, removed local org/project state |
| `UnifiedFilterBar.tsx` | ✅ Complete | Shows ScopeChips, org/project selectors hidden by default |

### Components Created

| Component | Purpose |
|-----------|---------|
| `ScopeChips` | Display current org/project as read-only chips |
| `ScopedOrgSelector` | Controlled org dropdown using ScopeContext |
| `ScopedProjectSelector` | Controlled project dropdown using ScopeContext |

### Hooks Updated

| Hook | Changes |
|------|---------|
| `useTransactionsFilters` | Now syncs with ScopeContext automatically |
| `useScopedFilters` | Provides easy access to current scope |

### Migration Pattern

For any page that needs org/project filtering:

1. **Remove local org/project state** - No more `useState` for orgId/projectId
2. **Import useScope()** - Get centralized state
3. **Add ScopeChips** - Show current scope as read-only chips
4. **Use scope values** - `currentOrg?.id`, `currentProject?.id` for data fetching

```tsx
// Before (legacy)
const [orgId, setOrgId] = useState('');
const [projectId, setProjectId] = useState('');
// ... local selectors

// After (ScopeContext)
import { useScope } from '../contexts/ScopeContext';
import { ScopeChips } from '../components/Scope/ScopeChips';

const { currentOrg, currentProject } = useScope();
const orgId = currentOrg?.id || '';
const projectId = currentProject?.id || '';
// ... ScopeChips in UI
```

---

*Implementation completed December 17, 2025*
*Last updated: December 17, 2025 - Added page migration status*
