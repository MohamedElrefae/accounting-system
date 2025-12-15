# Inventory Unification Implementation Plan

## Executive Summary
Consolidate fragmented Inventory Management module by:
- Creating missing view wrappers for 16 legacy pages
- Unifying 7 service files into single `InventoryService` class
- Implementing proper error boundaries and lazy loading
- Adding database foreign keys for data integrity

## Current State Analysis

### Services (src/services/inventory/)
✅ **Existing Files:**
- `documents.ts` - Document CRUD, posting, approval (400+ lines)
- `materials.ts` - Material master data (60 lines)
- `locations.ts` - Location master data (50 lines)
- `reconciliation.ts` - Reconciliation sessions (120 lines)
- `reports.ts` - Reporting queries (100 lines)
- `uoms.ts` - Unit of measure (20 lines)
- `config.ts` - GL mapping configuration (30 lines)

### Views (src/pages/Inventory/views/)
✅ **Existing Wrappers (7):**
- DashboardView, DocumentDetailsView, DocumentsView
- InventorySettingsView, LocationsView, MaterialsView, ReceiveView

❌ **Missing Wrappers (16):**
- IssueView, TransferView, AdjustView, ReturnsView
- MovementsView, OnHandReportView, ValuationReportView, AgeingReportView
- ReconciliationView, ReconciliationSessionView
- MovementSummaryView, MovementDetailView
- ProjectMovementSummaryView, ValuationByProjectView
- KPIDashboardView

### Routes
✅ InventoryRoutes.tsx - Already has ErrorBoundary + Suspense
✅ InventoryModule.tsx - Nested routing configured, needs view files

## Implementation Phases

### Phase 1: Create Missing View Wrappers ⚡ PRIORITY
**Goal:** Restore broken navigation by creating all 16 missing view files

**Files to Create:**
```
src/pages/Inventory/views/
├── IssueView.tsx
├── TransferView.tsx
├── AdjustView.tsx
├── ReturnsView.tsx
├── MovementsView.tsx
├── OnHandReportView.tsx
├── ValuationReportView.tsx
├── AgeingReportView.tsx
├── ReconciliationView.tsx
├── ReconciliationSessionView.tsx
├── MovementSummaryView.tsx
├── MovementDetailView.tsx
├── ProjectMovementSummaryView.tsx
├── ValuationByProjectView.tsx
└── KPIDashboardView.tsx
```

**Pattern:** Each wrapper imports and renders the legacy page component:
```tsx
import React from 'react'
import LegacyPage from '../LegacyPage'

const ViewWrapper: React.FC = () => {
  return <LegacyPage />
}

export default ViewWrapper
```

### Phase 2: Service Unification
**Goal:** Create unified `InventoryService` class

**New File:** `src/services/inventory/index.ts`

```typescript
import * as documentsService from './documents'
import * as materialsService from './materials'
import * as locationsService from './locations'
import * as reconciliationService from './reconciliation'
import * as reportsService from './reports'
import * as uomsService from './uoms'
import * as configService from './config'

class InventoryService {
  // Namespace-based organization
  public documents = documentsService
  public materials = materialsService
  public locations = locationsService
  public reconciliation = reconciliationService
  public reports = reportsService
  public uoms = uomsService
  public config = configService
}

export const inventoryService = new InventoryService()
export default inventoryService

// Re-export types for convenience
export type * from './documents'
export type * from './materials'
export type * from './locations'
export type * from './reconciliation'
export type * from './reports'
export type * from './uoms'
export type * from './config'
```

**Migration Strategy:**
- ✅ Keep existing service files unchanged (backward compatible)
- ✅ New code uses `inventoryService.documents.createInventoryDocument()`
- ✅ Legacy code continues using direct imports
- ⏰ Gradual migration over time

### Phase 3: UI Consolidation (Future)
**Goal:** Shared layout and context

**Files to Create:**
- `src/pages/Inventory/InventoryLayout.tsx` - Shared header, breadcrumbs
- `src/pages/Inventory/InventoryContext.tsx` - Shared state (org, filters)

### Phase 4: Database Optimization (Requires DBA Approval)
**Goal:** Add foreign keys for data integrity

**Proposed Migrations:**
```sql
-- inventory_documents
ALTER TABLE inventory_documents
  ADD CONSTRAINT fk_inv_doc_location_from 
    FOREIGN KEY (location_from_id) REFERENCES inventory_locations(id),
  ADD CONSTRAINT fk_inv_doc_location_to 
    FOREIGN KEY (location_to_id) REFERENCES inventory_locations(id),
  ADD CONSTRAINT fk_inv_doc_project 
    FOREIGN KEY (project_id) REFERENCES projects(id),
  ADD CONSTRAINT fk_inv_doc_cost_center 
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

-- inventory_document_lines
ALTER TABLE inventory_document_lines
  ADD CONSTRAINT fk_inv_line_document 
    FOREIGN KEY (document_id) REFERENCES inventory_documents(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_inv_line_material 
    FOREIGN KEY (material_id) REFERENCES materials(id),
  ADD CONSTRAINT fk_inv_line_uom 
    FOREIGN KEY (uom_id) REFERENCES uoms(id),
  ADD CONSTRAINT fk_inv_line_location 
    FOREIGN KEY (location_id) REFERENCES inventory_locations(id);

-- materials
ALTER TABLE materials
  ADD CONSTRAINT fk_material_base_uom 
    FOREIGN KEY (base_uom_id) REFERENCES uoms(id),
  ADD CONSTRAINT fk_material_cost_center 
    FOREIGN KEY (default_cost_center_id) REFERENCES cost_centers(id);
```

## Verification Plan

### Automated Tests
```bash
# TypeScript compilation
npm run type-check

# Build verification
npm run build

# Unit tests (if available)
npm test
```

### Manual Testing Checklist
- [ ] Navigate to /inventory/dashboard
- [ ] Click each sidebar item (25 routes)
- [ ] Create Receipt document
- [ ] Add line items
- [ ] Approve document
- [ ] Post document
- [ ] Verify in reports
- [ ] Test reconciliation flow
- [ ] Test transfer between locations
- [ ] Test adjustment (increase/decrease)
- [ ] Test returns flow

### Performance Metrics
- [ ] Initial load time < 2s
- [ ] Route transitions < 500ms
- [ ] No console errors
- [ ] No memory leaks

## Risk Assessment

### Low Risk ✅
- Creating view wrappers (no logic changes)
- Service unification (backward compatible)
- Adding ErrorBoundary (safety improvement)

### Medium Risk ⚠️
- Lazy loading (may expose circular dependencies)
- Route refactoring (may break bookmarks)

### High Risk 🔴
- Database foreign keys (may fail if orphaned data exists)
- Requires data cleanup first
- Needs rollback plan

## Rollback Plan

### If Phase 1 Fails:
```bash
git revert <commit-hash>
npm run build
```

### If Database Migration Fails:
```sql
-- Drop constraints
ALTER TABLE inventory_documents
  DROP CONSTRAINT IF EXISTS fk_inv_doc_location_from,
  DROP CONSTRAINT IF EXISTS fk_inv_doc_location_to;
-- etc.
```

## Success Criteria
✅ All 25 inventory routes load without errors
✅ TypeScript compiles with zero errors
✅ Build completes successfully
✅ No runtime console errors
✅ Navigation works smoothly
✅ Document posting workflow functional

## Timeline
- **Phase 1:** 30 minutes (create view wrappers)
- **Phase 2:** 15 minutes (service unification)
- **Phase 3:** Future (UI consolidation)
- **Phase 4:** Pending DBA approval (database FKs)

## Next Steps
1. ✅ Create this plan document
2. ⏳ Execute Phase 1 (create missing views)
3. ⏳ Execute Phase 2 (unify services)
4. ⏳ Run verification tests
5. ⏳ Document results
