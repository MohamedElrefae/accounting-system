# Cost Analysis Modal - Quick Summary

## What We're Building

Add a "Cost Analysis" button to each transaction line in the TransactionWizard that opens a modal for detailed item-level cost breakdown using the `transaction_line_items` table.

## Key Components

### 1. New Service Layer
**File**: `src/services/transaction-line-items.ts`
- CRUD operations for transaction_line_items
- Catalog access (line_items table)
- Adjustment types access
- Offline-first support

### 2. New Modal Component
**File**: `src/components/Transactions/CostAnalysisModal.tsx`
- Full-featured dialog for managing line items
- Real-time calculation display
- Addition/deduction support
- Responsive design

### 3. Integration Point
**File**: `src/components/Transactions/TransactionWizard.tsx` (modify)
- Add Cost Analysis button to each line row
- State management for modal
- Cache line items data
- Visual indicators for lines with analysis

## Database Tables Involved

1. **transaction_line_items** - Main table for cost analysis
2. **line_items** - Catalog of items (hierarchical)
3. **adjustment_types** - Addition/deduction types
4. **transaction_lines** - Parent table (existing)

## Timeline

- **Phase 1**: Service Layer (3-5 days)
- **Phase 2**: Modal Component (5-7 days)
- **Phase 3**: Integration (3-4 days)
- **Phase 4**: Testing (5-7 days)
- **Total**: 18-26 days

## Next Steps

1. Review detailed plan: `COST_ANALYSIS_MODAL_ENGINEERING_PLAN.md`
2. Answer questions in Section 9
3. Approve architecture approach
4. Begin Phase 1 implementation

## Key Questions for Review

1. Should calculations be client-side or database-side?
2. How does this integrate with approval workflow?
3. What are the permission requirements?
4. Mobile support needed?
5. Required vs optional feature for certain accounts?

