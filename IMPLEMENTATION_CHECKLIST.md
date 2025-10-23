# Implementation Checklist - Dual-Table Transactions Page

## ✅ COMPLETED
- [x] Created `TransactionsHeaderTable.tsx` component (T1 - headers table)
- [x] Created `TransactionLinesTable.tsx` component (T2 - lines table)  
- [x] Created `DUAL_TABLE_ARCHITECTURE.md` (comprehensive guide)
- [x] Designed state management structure
- [x] Designed column configuration strategy
- [x] Designed layout and CSS structure
- [x] Created data flow documentation

## 🔄 IN PROGRESS / TODO

### Phase 1: State & Data Management
- [ ] Add new state variables to Transactions.tsx:
  - `selectedTransactionId`
  - `selectedLineId`
  - `lineColumnsConfigOpen`
  - Rename `columnConfigOpen` → `headersColumnConfigOpen`

- [ ] Create default line columns configuration:
  ```typescript
  const defaultLineColumns: ColumnConfig[] = useMemo(() => [
    // 10 columns defined in DUAL_TABLE_ARCHITECTURE.md Step 3
  ], [])
  ```

- [ ] Setup useColumnPreferences hook for lines table:
  ```typescript
  const {
    columns: lineColumns,
    handleColumnResize: handleLineColumnResize,
    handleColumnConfigChange: handleLineColumnConfigChange,
    resetToDefaults: resetLineColumnsToDefaults
  } = useColumnPreferences({
    storageKey: 'transactions_lines_table',
    defaultColumns: defaultLineColumns,
    userId: currentUserId || undefined
  })
  ```

### Phase 2: Line Fetching & Selection
- [ ] Add useEffect to fetch lines when selectedTransactionId changes:
  ```typescript
  useEffect(() => {
    // Fetch from transaction_lines table
    // Filter by transaction_id
    // Order by line_no
  }, [selectedTransactionId])
  ```

- [ ] Import new components at top of Transactions.tsx:
  ```typescript
  import TransactionsHeaderTable from './TransactionsHeaderTable'
  import TransactionLinesTable, { type TransactionLineRecord } from './TransactionLinesTable'
  ```

### Phase 3: Layout Restructuring
- [ ] Replace single ResizableTable in render with:
  - `<div className="transactions-content">`
    - `<div className="transactions-section headers-section">`
      - Section header with "المعاملات (رؤوس القيود)"
      - Toolbar (existing code)
      - `<TransactionsHeaderTable ... />`
    - `<div className="transactions-section-divider">`
    - `<div className="transactions-section lines-section">`
      - Section header with "القيود التفصيلية"
      - `<TransactionLinesTable ... />`

- [ ] Move existing ResizableTable renderCell logic into TransactionsHeaderTable component

- [ ] Add all callback handlers to TransactionsHeaderTable props:
  - onSelectTransaction
  - onEdit
  - onDelete
  - onOpenDetails
  - onOpenDocuments
  - onOpenCostAnalysis
  - onSubmit
  - onApprove
  - onRevise
  - onReject
  - onResubmit
  - onPost
  - onCancelSubmission

### Phase 4: Line Operations
- [ ] Implement onEditLine handler in TransactionLinesTable:
  ```typescript
  onEditLine={(line) => {
    // Set lineForm state with line data
    // Set editingLine = true
    // Show line editor form
  }}
  ```

- [ ] Implement onDeleteLine handler:
  ```typescript
  onDeleteLine={async (id) => {
    // Confirm deletion
    // Delete from transaction_lines table
    // Refresh lines for selected transaction
    // Show toast
  }}
  ```

- [ ] Implement onSelectLine handler:
  ```typescript
  onSelectLine={(line) => setSelectedLineId(line.id)}
  ```

### Phase 5: CSS Updates
- [ ] Add to `Transactions.css`:
  - `.transactions-content` (flex container)
  - `.transactions-section` (styling)
  - `.headers-section` (sizing)
  - `.lines-section` (sizing with max-height)
  - `.transactions-section-divider` (visual separator)
  - `.section-header` (flex layout)
  - `.section-controls` (buttons layout)
  - `.section-controls button:disabled` (disabled state)

### Phase 6: Column Configuration Modals
- [ ] Add two ColumnConfiguration modals in render:
  - One for headers table (columnConfigOpen)
  - One for lines table (lineColumnsConfigOpen)

- [ ] Wire up modal callbacks to call appropriate handlers:
  - `handleColumnConfigChange` for headers
  - `handleLineColumnConfigChange` for lines
  - `resetToDefaults` for headers
  - `resetLineColumnsToDefaults` for lines

### Phase 7: Testing
- [ ] Test header table:
  - [ ] Filters work (date, account, classification, etc.)
  - [ ] Pagination works
  - [ ] Export works
  - [ ] Row selection highlights correctly
  - [ ] All action buttons work (edit, delete, submit, approve, etc.)
  - [ ] Column resizing works
  - [ ] Wrap mode toggle works
  - [ ] Column config modal works

- [ ] Test lines table:
  - [ ] Shows empty message when no transaction selected
  - [ ] Fetches and displays lines when transaction selected
  - [ ] Edit button opens line editor form
  - [ ] Delete button removes line and refreshes table
  - [ ] Column resizing works
  - [ ] Wrap mode toggle works
  - [ ] Column config modal works
  - [ ] Row selection highlights correctly

- [ ] Test integration:
  - [ ] Selecting transaction in T1 loads lines in T2
  - [ ] Clearing selection clears T2
  - [ ] Creating new line updates T2
  - [ ] Editing existing line updates T2
  - [ ] Deleting line updates T2
  - [ ] Line form persists when interacting with T1
  - [ ] Both tables maintain separate column preferences

- [ ] Test responsiveness:
  - [ ] Resize browser window
  - [ ] Check mobile view
  - [ ] Verify scrolling works for both tables

### Phase 8: Performance Verification
- [ ] Check React DevTools Profiler:
  - [ ] No unnecessary re-renders
  - [ ] Column preference updates are efficient
  - [ ] Line fetching doesn't block UI

- [ ] Monitor localStorage:
  - [ ] Headers columns save to 'transactions_table'
  - [ ] Lines columns save to 'transactions_lines_table'
  - [ ] Both persist and restore correctly

### Phase 9: Bug Fixes & Polish
- [ ] Fix any lint errors
- [ ] Fix any TypeScript errors
- [ ] Verify all aria labels and titles are in Arabic
- [ ] Add loading indicators where needed
- [ ] Add error messages for failed operations
- [ ] Test keyboard navigation (Tab, Enter, Escape)

### Phase 10: Documentation
- [ ] Update README if needed
- [ ] Add inline code comments for complex logic
- [ ] Document new props and component exports
- [ ] Create migration guide if needed

## Key Files to Modify

```
src/pages/Transactions/
├── Transactions.tsx              ← MAIN REFACTORING (Steps 1-6)
├── TransactionsHeaderTable.tsx   ← NEW (already created)
├── TransactionLinesTable.tsx     ← NEW (already created)
└── Transactions.css              ← UPDATE (Step 5)

Reference Files:
├── DUAL_TABLE_ARCHITECTURE.md    ← Implementation guide
└── IMPLEMENTATION_CHECKLIST.md   ← This file
```

## Critical Implementation Notes

1. **State Selection**: selectedTransactionId must trigger line fetch
2. **Column Preferences**: Use different storage keys to avoid conflicts
3. **Empty State**: Lines table should show message when no tx selected
4. **Row Highlighting**: Use selectedTransactionId/selectedLineId for highlighting
5. **Form Integration**: Line form should remain open when switching between tables
6. **Permissions**: All existing permission checks must still apply
7. **Callbacks**: Handler functions must maintain existing error handling/toasts

## Estimated Time

- Phase 1-2: 30 minutes (state setup)
- Phase 3-4: 60 minutes (layout + callbacks)
- Phase 5-6: 30 minutes (CSS + modals)
- Phase 7-8: 60 minutes (testing + perf)
- Phase 9-10: 30 minutes (polish + docs)
- **Total: ~3.5 hours**

## Rollback Strategy

If issues arise, revert changes to:
1. Keep original Transactions.tsx as backup
2. Remove the two new component files
3. The old single-table layout will work unchanged
4. No database changes required (just UI restructuring)

## Support Resources

- `DUAL_TABLE_ARCHITECTURE.md` - Detailed step-by-step guide
- `TransactionsHeaderTable.tsx` - T1 component template
- `TransactionLinesTable.tsx` - T2 component template
- Existing `Transactions.tsx` - Reference for patterns/handlers
