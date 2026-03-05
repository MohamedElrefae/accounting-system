# Implementation Plan: Cost Analysis Modal

## Overview

This implementation plan breaks down the Cost Analysis Modal feature into discrete, sequential tasks. The feature enables detailed cost breakdown for transaction line items with catalog-based item analysis, approval workflow integration, RTL support, and comprehensive testing.

**Architecture**: Catalog-Based Item Analysis (Path B)  
**Database**: Uses existing `transaction_line_items` table - NO schema changes needed  
**Language**: TypeScript with React  
**Key Features**: Drag-drop reordering, real-time calculations, approval locking, RTL support, offline sync

**IMPORTANT**: This plan has been amended based on consultant review. See `IMPLEMENTATION_PLAN_AMENDMENTS.md` for critical corrections including:
- Task 0 (Pre-flight verification) added before any database changes
- RTL setup moved before component building (Task 2.5)
- Negative value constraints dropped (quantity and unit_price can be negative)
- Trigger code corrected (do not write to GENERATED ALWAYS columns)
- Checkpoints added after Tasks 1, 2, and 4
- Core tests promoted from optional to required

## Tasks

- [x] 0. Pre-Flight Database Verification (MANDATORY FIRST STEP)
  - **FIRST**: Delete `src/components/Transactions/LineItemCostModal.tsx` — this file is no longer needed and must be removed for consistency before any new work begins
  - Run verification queries ONLY - do not create anything yet
  - Check existing RLS policies on transaction_line_items
  - Check existing triggers on transaction_line_items
  - Check existing functions (can_edit_transaction_line, replace_line_items_atomic, fn_calculate_tli_adjustments)
  - Check existing indexes on transaction_line_items
  - Check existing constraints on transaction_line_items
  - Verify line_items catalog is accessible
  - Verify adjustment_types table is accessible
  - Verify transaction_lines has approval_status column (confirmed exists in DB — query to verify values)
  - Report findings to user and WAIT for confirmation before proceeding
  - _Amendment: #1 - Critical pre-flight check_

- [x] 1. Set up database functions and RLS policies
  - Use CREATE OR REPLACE for all functions (never plain CREATE)
  - Use CREATE INDEX IF NOT EXISTS for indexes
  - Use DROP CONSTRAINT IF EXISTS before adding constraints
  - Create `can_edit_transaction_line()` function to check approval status
  - Create `replace_line_items_atomic()` function for atomic save operations
  - CRITICAL: Update `fn_calculate_tli_adjustments()` trigger - DO NOT write to total_amount (GENERATED ALWAYS column)
  - DROP negative value constraints: transaction_line_items_quantity_check and transaction_line_items_unit_price_check
  - Implement RLS policies for org-based access and approval status checks
  - Grant execute permissions to authenticated users
  - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 10.4_
  - _Amendments: #2 (trigger fix), #4 (drop constraints)_
  - **CHECKPOINT**: Run Task 0 queries again, test functions with known line IDs, test negative values, ask user to confirm

- [x] 2. Augment existing service layer for transaction line items
  - **⚠️ ENGINEERING REVIEW NOTE**: `src/services/transaction-line-items.ts`, `src/services/line-items-catalog.ts`, and `src/services/adjustment-types.ts` **already exist**. READ them first. AUGMENT — do NOT overwrite. Overwriting will break existing cost analysis components and reports.

  - [x] 2.1 Augment core CRUD operations in existing `src/services/transaction-line-items.ts`
    - File exists (239 lines) — READ IT FIRST before adding anything
    - `getTransactionLineItems()` already exists — verify it meets the modal's join requirements
    - ADD `canEditTransactionLine(lineId)` — check `transaction_lines.approval_status === 'draft'`; follow patterns in `src/services/transactionPermissions.ts`
    - ADD `replaceLineItems(lineId, items[])` — call the new `replace_line_items_atomic` RPC from Task 1
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 9.1_
  
  - [x] 2.2 Add catalog search to existing `src/services/line-items-catalog.ts`
    - File exists (200 lines) — `lineItemsCatalogService` class with full CRUD already implemented
    - ADD `searchLineItemsCatalog(orgId, query, parentId?, itemType?)` — filter wrapper over existing `list()` with text search and pagination
    - `getAdjustmentTypes()` already exists in `src/services/adjustment-types.ts` — no new file needed
    - _Requirements: 1.3, 6.3_
  
  - [x] 2.3 Add calculation/validation helpers to existing `src/services/transaction-line-items.ts`
    - ADD `calculateTotals(items[])` — client-side preview only, no network call; mirror DB trigger logic
    - ADD `validateLineItem(item)` — ALLOW negative quantity and unit_price (only check isNaN, not range)
    - ADD `formatCurrency(amount, currency?)` and `formatNumber(value, decimals?)` utility helpers
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.5_
    - _Amendment: #4 - No min-value constraints on quantity or unit_price_
  
  - [x] 2.4 Write unit tests for service layer (REQUIRED - NOT OPTIONAL)
    - Test CRUD operations (getLineItems, replaceLineItems, canEditTransactionLine)
    - Test calculation accuracy with multiple scenarios (additions, deductions, percentages)
    - Test validation rules (negative values allowed, percentage ranges)
    - Test catalog search with various filters
    - _Requirements: 2.1, 2.2, 10.1, 10.2, 10.3, 10.4_
    - _Amendment: #8 - Promoted from optional to required_
    - **CHECKPOINT**: All service tests must pass, confirm with user before proceeding

- [x] 2.5 RTL Foundation Setup (MOVED FROM TASK 11 - DO BEFORE COMPONENTS)
  - Set up RTL theme configuration in `src/theme/rtl.ts`
  - Configure emotion cache with rtl-plugin
  - Set up font families for Arabic (Cairo, Tajawal)
  - Update `src/App.tsx` to use CacheProvider
  - Detect language and apply correct theme/cache
  - Set dir attribute on root element
  - Add English translations to en.json
  - Add Arabic translations to ar.json
  - Include all modal labels, buttons, messages, and tooltips
  - Verify theme switches correctly between LTR and RTL
  - _Requirements: 7.1, 7.2_
  - _Amendment: #3 - RTL setup BEFORE building components_

- [x] 3. Build core modal component (WITH RTL FROM START)
  - [x] 3.1 Create CostAnalysisModal component structure
    - Create `src/components/Transactions/CostAnalysisModal.tsx`
    - **USE EXISTING `DraggableResizableDialog`** as the modal shell (`src/components/Common/DraggableResizableDialog.tsx`) — it already provides drag-by-title-bar, corner resize, and localStorage size/position persistence via `storageKey` prop. Do NOT re-implement these features.
    - Implement props interface with all required fields
    - Set up state management (items, loading, saving, error, permissions)
    - Implement modal open/close with unsaved changes detection
    - USE CSS logical properties (margin-inline-start, padding-inline-start, text-align: start)
    - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3_
    - _Amendment: #3 - Built RTL-aware from start_
  
  - [x] 3.2 Implement modal features
    - Modal drag/resize/position-persistence is handled by `DraggableResizableDialog` — no additional work needed for this
    - Implement keyboard shortcuts (Ctrl+S, Ctrl+N, ESC)
    - Add loading and error states with user-friendly messages
    - Display approval status and lock UI when approved (check `approval_status` from `transaction_lines`)
    - _Requirements: 3.1, 3.3, 4.4, 5.1, 5.2, 5.3, 9.2, 9.5_
  
  - [x] 3.3 Implement data loading and saving
    - Load existing items on modal open with editability check
    - Implement save handler calling `replaceLineItems()`
    - Handle save success with callback to parent component
    - Handle save errors with retry capability
    - _Requirements: 1.2, 1.4, 4.4, 12.1, 12.2_
  
  - [x] 3.4 Write component tests for modal (REQUIRED - NOT OPTIONAL)
    - Test modal rendering with correct title and approval status
    - Test loading existing items on open
    - Test disabled editing when approved
    - Test unsaved changes detection and confirmation dialog
    - Test keyboard shortcuts (Ctrl+S, Ctrl+N, ESC)
    - Test modal size persistence
    - Test RTL layout correctness
    - _Requirements: 3.1, 3.3, 4.1, 4.2, 5.1, 5.2, 5.3, 9.2_
    - _Amendment: #8 - Promoted from optional to required_

- [x] 4. Build ItemsTable component
  - [x] 4.1 Create ItemsTable component
    - Create `src/components/Transactions/CostAnalysis/ItemsTable.tsx`
    - Implement table structure with all columns (item, quantity, percentage, price, amounts)
    - **No drag-drop for row reordering** — row order controlled by `line_number` field; provide up/down buttons or direct number editing instead
    - Implement inline editing for all editable fields
    - DO NOT add min={0} to quantity or unit_price inputs (negative values allowed)
    - USE CSS logical properties for all spacing
    - _Requirements: 1.3, 1.4, 1.5, 3.2, 3.4_
    - _Amendments: #3 (RTL CSS), #4 (negative values)_
  
  - [x] 4.2 Implement row reordering
    - **No DnD library needed** — neither `@dnd-kit` nor `react-beautiful-dnd` should be installed
    - Implement up/down arrow buttons on each row to shift `line_number` values
    - Update all line numbers after reorder operation
    - Disable reorder buttons when modal is read-only (approved status)
    - _Requirements: 3.2, 3.4_
  
  - [x] 4.3 Add row actions and expandable panels
    - Implement delete button for each row
    - Create expandable row for additions/deductions panel
    - Add visual indicators (zebra striping, hover states)
    - _Requirements: 1.6, 6.3_
  
  - [x] 4.4 Write tests for ItemsTable (RECOMMENDED)
    - Test rendering items in correct order
    - Test drag-and-drop reordering functionality
    - Test inline editing updates
    - Test delete action
    - Test disabled state when not editable
    - Test RTL layout (drag handle position)
    - _Requirements: 1.4, 1.5, 1.6, 3.2, 3.4_
    - _Amendment: #8 - Recommended (not required for MVP)_
    - **CHECKPOINT**: Render ItemsTable in isolation, test drag-drop, verify RTL, ask user to confirm

- [x] 4.5 Build NumberDisplay component (RTL-SAFE NUMBERS)
  - Create `src/components/Transactions/CostAnalysis/NumberDisplay.tsx`
  - Wrap numbers in `<Box component="span" dir="ltr">` to keep LTR in RTL layouts
  - Use in all numeric displays (quantity, percentage, price, amounts)
  - _Requirements: 7.1, 7.2_
  - _Amendment: #3 - Number formatting for RTL_

- [x] 5. Build LineItemSelector component
  - [x] 5.1 Create LineItemSelector with autocomplete
    - Create `src/components/Transactions/CostAnalysis/LineItemSelector.tsx`
    - Implement autocomplete with search functionality
    - Display item code, name (English/Arabic), and specifications
    - Add hierarchical catalog browsing capability
    - USE CSS logical properties for dropdown alignment
    - _Requirements: 1.3, 6.3_
    - _Amendment: #3 - RTL-aware from start_
  
  - [x] 5.2 Implement catalog filtering
    - Add filter for selectable items only
    - Implement parent-based hierarchical filtering
    - Add item type filtering
    - Implement pagination for large catalogs
    - _Requirements: 1.3_
  
  - [x] 5.3 Write tests for LineItemSelector (DEFERRABLE)
    - Test search functionality
    - Test hierarchical filtering
    - Test item selection and onChange callback
    - Test disabled state
    - _Requirements: 1.3_
    - _Amendment: #8 - Deferrable (post-MVP)_

- [x] 6. Build AdditionDeductionPanel component
  - [x] 6.1 Create AdditionDeductionPanel component
    - Create `src/components/Transactions/CostAnalysis/AdditionDeductionPanel.tsx`
    - Implement expandable panel within item row
    - Add addition type selector from adjustment_types catalog
    - Add deduction type selector from adjustment_types catalog
    - USE CSS logical properties
    - _Requirements: 1.3, 6.3_
  
  - [x] 6.2 Implement percentage inputs and calculations
    - Add percentage input fields for additions and deductions
    - Auto-fill default percentages from adjustment types
    - Display calculated amounts in real-time using NumberDisplay component
    - _Requirements: 2.1, 2.4_
  
  - [x] 6.3 Write tests for AdditionDeductionPanel (RECOMMENDED)
    - Test expansion/collapse functionality
    - Test percentage input updates
    - Test real-time calculation display
    - Test auto-fill from adjustment types
    - _Requirements: 2.1, 2.4_
    - _Amendment: #8 - Recommended (not required for MVP)_

- [x] 7. Build TotalsSummary component
  - [x] 7.1 Create TotalsSummary component
    - Create `src/components/Transactions/CostAnalysis/TotalsSummary.tsx`
    - Display item count, base amount, additions, deductions, net amount
    - Implement color-coded amounts (additions green, deductions red)
    - Add formatted currency display using app settings
    - USE NumberDisplay component for all numeric values
    - USE CSS logical properties
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_
  
  - [x] 7.2 Implement real-time calculation updates
    - Connect to items state for automatic recalculation
    - Use `calculateTotals()` service function
    - Update display immediately when items change
    - _Requirements: 2.1, 2.4_
  
  - [x] 7.3 Write tests for TotalsSummary (RECOMMENDED)
    - Test correct calculation display
    - Test real-time updates when items change
    - Test color coding for additions/deductions
    - Test currency formatting
    - Test RTL number display
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
    - _Amendment: #8 - Recommended (not required for MVP)_

- [x] 8. Build UnsavedChangesDialog component
  - [x] Create `src/components/Transactions/CostAnalysis/UnsavedChangesDialog.tsx`
  - [x] Implement warning dialog with three actions (Save, Discard, Cancel)
  - [x] Add keyboard shortcuts (Enter = Save, ESC = Cancel)
  - [x] Display clear messaging about data loss
  - [x] USE CSS logical properties
  - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - _Amendment: #8 - Covered by modal tests in 3.4 (deferrable standalone tests)_

- [x] 9. Integrate with TransactionWizard
  - [x] 9.1 Add Cost Analysis button to Lines step
    - Modify `src/components/Transactions/TransactionWizard.tsx`
    - Add new column with Cost Analysis button and badge
    - Implement button disabled states (no account, approved line)
    - Add tooltip with item count display
    - _Requirements: 1.1, 6.1, 6.2, 8.4, 9.1_
  
  - [x] 9.2 Implement modal state management in wizard
    - Add state for modal open/close and selected line
    - Track item counts per line for badge display
    - Implement handlers for opening modal and saving
    - Pass correct line data to modal (line ID, account info, org ID)
    - _Requirements: 1.1, 1.2, 6.1, 6.2_
  
  - [x] 9.3 Render modal in wizard
    - Add CostAnalysisModal component to wizard render
    - Wire up all props and callbacks
    - Implement onSave callback to update badge count
    - _Requirements: 1.1, 1.2, 6.1, 6.2_
  
  - [x] 9.4 Write integration tests for wizard integration (REQUIRED - NOT OPTIONAL)
    - Test button opens modal with correct line data
    - Test badge updates after save
    - Test button disabled states
    - Test modal closes after successful save
    - Test wizard state maintained when modal closes
    - _Requirements: 1.1, 6.1, 6.2, 8.4, 9.1_
    - _Amendment: #8 - Promoted from optional to required_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all required tests pass (Tasks 2.4, 3.4, 9.4)
  - Verify full feature works end-to-end
  - Ask the user if questions arise

- [x] 11. Audit RTL implementation
  - [ ] 11.1 Audit all components for CSS logical properties
    - Review all components created in Tasks 3-9
    - Ensure no directional properties used (margin-left, padding-right, etc.)
    - Verify all use logical properties (margin-inline-start, etc.)
    - _Requirements: 7.1, 7.2_
    - _Amendment: #3 - Final audit of RTL CSS_
  
  - [ ] 11.2 Verify RTL tests coverage
    - Ensure RTL layout tests are included in component tests (Tasks 3.4, 4.4, 7.3)
    - Test modal renders correctly in RTL mode
    - Test numbers stay LTR in RTL layout
    - Test calculations correct in RTL
    - Test language switching
    - _Requirements: 7.1, 7.2_
    - _Amendment: #3 - RTL tests merged into component tests_

- [x] 12. Implement offline support
  - [ ] 12.1 Offline sync API — CONFIRMED (no pause needed)
    - **Sync manager**: `src/services/offline/sync/SyncQueueManager.ts`
    - **Method to queue an operation**: `enqueueOperation(operation: SyncOperation): Promise<SyncQueueEntry>`
    - **IndexedDB store**: `syncQueue` (accessed via `getOfflineDB().syncQueue`)
    - **entityType to use**: `'transaction_line_items'` — add priority `70` to `OPERATION_PRIORITY` map in `SyncQueueManager.ts`
    - **Operation strategy**: Queue as single **atomic replace** per save → `operationType: 'replace'`, `data: { transaction_line_id, items[] }`
    - **Pattern to follow**: Search codebase for existing `enqueueOperation` call sites
    - _Amendment: #5 - API confirmed by engineering review_
  
  - [ ] 12.2 Add offline sync queueing
    - Add `queueLineItemsForSync(lineId, items[])` to `src/services/transaction-line-items.ts`
    - Call `enqueueOperation()` with the confirmed shape above
    - Add `transaction_line_items: 70` to `OPERATION_PRIORITY` in `SyncQueueManager.ts`
    - _Requirements: 12.1, 12.4_
  
  - [ ] 12.3 Handle offline save operations
    - Detect offline state in modal
    - Queue save operations when offline
    - Show appropriate user feedback for offline saves
    - _Requirements: 12.1, 12.4_
  
  - [ ] 12.4 Write offline sync tests (DEFERRABLE)
    - Test queueing operations when offline
    - Test sync when coming back online
    - Test data integrity after sync
    - _Requirements: 12.1, 12.4_
    - _Amendment: #8 - Deferrable (post-MVP)_

- [x] 13. Implement mobile responsiveness
  - [ ] 13.1 Create mobile layout for modal
    - Implement single-column layout for mobile screens
    - Make modal full-screen or near-full-screen on mobile
    - Adapt form fields for touch input
    - _Requirements: 7.1, 7.4_
  
  - [ ] 13.2 Optimize touch interactions
    - Ensure buttons are minimum 44x44px for touch
    - Adapt drag-drop for touch gestures
    - Optimize table scrolling for mobile
    - _Requirements: 7.3, 7.5_
  
  - [ ] 13.3 Write mobile responsiveness tests (DEFERRABLE)
    - Test layout on mobile viewport sizes
    - Test touch interactions
    - Test all functionality maintained on mobile
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
    - _Amendment: #8 - Deferrable (post-MVP)_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

- [ ] 15. Write integration tests
  - [ ] 15.1 Write database integration tests (DEFERRABLE - VERIFY MANUALLY)
    - Test RLS policies enforce org-based access
    - Test cascade delete when line deleted
    - Test trigger calculations on insert/update
    - Test approval status prevents editing
    - Test concurrent edit handling
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 12.2, 12.3, 12.4_
    - _Amendment: #8 - Deferrable (verify manually instead)_
  
  - [ ] 15.2 Write end-to-end tests (DEFERRABLE)
    - Test complete flow: add items, save, reopen, verify
    - Test approval workflow: draft → approved → read-only
    - Test offline sync: edit offline, sync when online
    - Test RTL layout: switch language, verify layout
    - Test unsaved changes: edit, close, discard
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 4.1, 4.2, 4.3, 9.1, 9.2, 12.1, 12.4_
    - _Amendment: #8 - Deferrable (post-MVP)_

- [ ] 16. Performance optimization and testing
  - [ ] 16.1 Write performance tests (DEFERRABLE)
    - Test modal opens in < 500ms
    - Test handling 100 items without lag
    - Test calculation updates in < 100ms
    - Test save operation completes in < 2s
    - Test catalog search returns in < 300ms
    - _Requirements: 2.4, 12.1_
    - _Amendment: #8 - Deferrable (post-MVP)_
  
  - [ ] 16.2 Optimize performance bottlenecks
    - Implement memoization for expensive calculations
    - Optimize re-renders with React.memo
    - Add debouncing for search inputs
    - Implement virtual scrolling if needed for large item lists
    - _Requirements: 2.4_

- [ ] 17. Accessibility implementation
  - [ ] 17.1 Implement WCAG 2.1 AA compliance
    - Add proper ARIA labels to all interactive elements
    - Implement keyboard navigation for all features
    - Ensure focus management (trap focus in modal, restore on close)
    - Add screen reader announcements for dynamic changes
    - _Requirements: 5.4, 8.5_
  
  - [ ] 17.2 Write accessibility tests (DEFERRABLE)
    - Run axe accessibility tests (no violations)
    - Test keyboard navigation
    - Test ARIA labels
    - Test screen reader announcements
    - Test focus management
    - Test color contrast ratios
    - _Requirements: 5.4, 6.5, 8.5_
    - _Amendment: #8 - Deferrable (post-MVP)_

- [ ] 18. Final checkpoint and deployment preparation
  - Ensure all required tests pass
  - Verify all amendments have been applied
  - Ask the user if questions arise

## Notes

### Test Priority Classification (Amendment #8)

**🔴 REQUIRED (NOT optional - do not skip)**:
- Task 2.4: Service layer unit tests
- Task 3.4: Modal component tests (core behavior)
- Task 9.4: Integration tests with TransactionWizard

**🟡 RECOMMENDED (skip only for urgent MVP, re-add in next sprint)**:
- Task 4.4: ItemsTable tests
- Task 6.3: AdditionDeductionPanel tests
- Task 7.3: TotalsSummary tests

**🟢 DEFERRABLE (post-MVP - do not block release)**:
- Task 5.3: LineItemSelector tests
- Task 8: UnsavedChangesDialog (covered by modal tests in 3.4)
- Task 12.4: Offline sync tests
- Task 13.3: Mobile responsiveness tests
- Task 15.1: Database integration tests (verify manually)
- Task 15.2: End-to-end tests
- Task 16.1: Performance tests
- Task 17.2: Accessibility tests

### Key Rules for Implementation (From Amendments)

**✅ Always Do**:
- Run Task 0 verification BEFORE any SQL changes
- Use `CREATE OR REPLACE` for functions (never plain `CREATE`)
- Use `CREATE INDEX IF NOT EXISTS` for indexes
- Use `DROP CONSTRAINT IF EXISTS` before adding constraints
- Use CSS logical properties in all new components
- Wrap all number displays in `dir="ltr"` span
- Ask user before starting Task 12 (offline sync API)
- Confirm DnD library before starting Task 4.2
- Report checkpoint results to user before advancing

**❌ Never Do**:
- Write `NEW.total_amount :=` inside any trigger (GENERATED ALWAYS)
- Add `min={0}` to quantity or unit_price input fields
- Add `inputProps={{ min: 0 }}` to quantity or unit_price
- Add `CHECK (quantity >= 0)` or `CHECK (unit_price >= 0)` constraints
- Use `margin-left`, `padding-left` etc. in new component CSS
- Install `react-beautiful-dnd` if not already in the project
- Skip Tasks 2.4, 3.4, 9.4 tests — they are required
- Implement offline sync without confirmed API from user

### Files to Create

**New Files**:
```
src/
├── services/
│   └── transaction-line-items.ts          [Task 2]
├── components/
│   └── Transactions/
│       ├── CostAnalysisModal.tsx           [Task 3]
│       └── CostAnalysis/
│           ├── ItemsTable.tsx              [Task 4]
│           ├── LineItemSelector.tsx        [Task 5]
│           ├── AdditionDeductionPanel.tsx  [Task 6]
│           ├── TotalsSummary.tsx           [Task 7]
│           ├── UnsavedChangesDialog.tsx    [Task 8]
│           └── NumberDisplay.tsx          [Task 4.5]
└── theme/
    └── rtl.ts                             [Task 2.5]
```

**Modified Files**:
```
src/App.tsx                                [Task 2.5]
src/components/Transactions/
    TransactionWizard.tsx                  [Task 9]
public/locales/en/translation.json        [Task 2.5]
public/locales/ar/translation.json        [Task 2.5]
```

### Database Objects

**SQL Functions (NEW)**:
- `can_edit_transaction_line(UUID) → BOOLEAN`
- `replace_line_items_atomic(UUID, JSONB) → JSONB`

**SQL Trigger (REPLACE existing)**:
- `fn_calculate_tli_adjustments()` — corrected version (do not write to total_amount)
- `zz_trigger_calculate_adjustments` — recreate after function update

**SQL Constraints (DROP)**:
- `transaction_line_items_quantity_check`
- `transaction_line_items_unit_price_check`

**SQL Policies (CREATE OR REPLACE)**:
- View policy — org-based access
- Insert policy — org + approval status check
- Update policy — org + approval status check
- Delete policy — org + approval status check

**SQL Indexes (CREATE IF NOT EXISTS)**:
- `idx_tli_transaction_line_id`
- `idx_tli_line_item_id`

---

## Implementation Sequence Summary

```
Task 0:    Pre-flight DB verification
           ↓ [CHECKPOINT: Report findings, wait for user]
Task 1:    Database functions + RLS + DROP constraints
           ↓ [CHECKPOINT: Verify DB, test functions]
Task 2.1:  Service CRUD
Task 2.2:  Catalog functions
Task 2.3:  Calculations + validation (negative values allowed)
Task 2.4:  ✅ REQUIRED unit tests
           ↓ [CHECKPOINT: All service tests pass]
Task 2.5:  RTL Foundation (theme + App.tsx + translations)
Task 3.1:  Modal structure (RTL-aware from start)
Task 3.2:  Modal features
Task 3.3:  Data loading/saving
Task 3.4:  ✅ REQUIRED modal tests
Task 4.1:  ItemsTable (RTL CSS)
Task 4.2:  Drag-drop (confirm DnD library first)
Task 4.3:  Row actions + expandable panels
Task 4.4:  Recommended tests
           ↓ [CHECKPOINT: Render check + RTL check]
Task 4.5:  NumberDisplay component (RTL-safe numbers)
Task 5.1:  LineItemSelector
Task 5.2:  Catalog filtering
Task 6.1:  AdditionDeductionPanel
Task 6.2:  Percentage inputs
Task 7.1:  TotalsSummary (uses NumberDisplay)
Task 7.2:  Real-time updates
Task 8:    UnsavedChangesDialog
Task 9.1:  Wizard button + badge
Task 9.2:  Wizard state management
Task 9.3:  Render modal in wizard
Task 9.4:  ✅ REQUIRED integration tests
           ↓ [CHECKPOINT 10: Full feature works]
Task 11:   Audit RTL implementation
Task 12:   Offline sync (PAUSE — ask user for API first)
Task 13:   Mobile responsiveness
           ↓ [CHECKPOINT 14]
Task 15:   Integration + E2E tests (deferrable)
Task 16:   Performance optimization
Task 17:   Accessibility
Task 18:   Final checkpoint + deployment prep
```

---

**Document Version**: 1.1 (Amended)  
**Last Updated**: March 1, 2026  
**Amendments Applied**: All 8 amendments from IMPLEMENTATION_PLAN_AMENDMENTS.md  
**Status**: ✅ Ready for execution
