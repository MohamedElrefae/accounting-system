# Cost Analysis Modal - Engineering Implementation Plan

## Executive Summary

**Project**: Integration of Cost Analysis Modal for Transaction Line Items  
**Date**: March 1, 2026  
**Prepared By**: Head of Engineering Department  
**Status**: Ready for Software Consultant Review

## 1. Current System Analysis

### 1.1 Database Schema Overview

#### Core Tables

**transactions** (Header Level)
- Primary transaction metadata
- Organization and project scoping
- Approval workflow status
- Entry date, description, reference numbers

**transaction_lines** (Line Level - Accounting Dimensions)
- Links to transactions table
- Account assignments (debit/credit)
- Dimensional analysis fields:
  - org_id, project_id
  - cost_center_id, work_item_id
  - analysis_work_item_id, classification_id
  - sub_tree_id

**transaction_line_items** (Item Level - Cost Analysis)
- Links to transaction_lines table via `transaction_line_id`
- Item-level cost breakdown:
  - line_item_id (FK to line_items catalog)
  - quantity, percentage, unit_price
  - unit_of_measure
  - deduction_percentage, deduction_amount
  - addition_percentage, addition_amount
  - net_amount (computed)
  - total_amount (generated column)

**line_items** (Catalog/Master Data)
- Hierarchical catalog of items
- code, name, name_ar
- parent_id, level, path (tree structure)
- is_selectable flag
- item_type, specifications (JSONB)
- base_unit_of_measure, standard_cost

**adjustment_types** (Addition/Deduction Types)
- code, name, name_ar
- default_percentage
- org_id scoped

### 1.2 Current Transaction Wizard Flow

**Location**: `src/components/Transactions/TransactionWizard.tsx`

**Current Steps**:
1. Basic Info (Header data)
2. Lines (transaction_lines with dimensions)
3. Review & Submit

**Key Features**:
- Multi-line editor with dimensional analysis
- Column configuration (show/hide dimensions)
- Draft save capability
- Approval workflow integration
- Document attachment support

### 1.3 Existing Services

**Transaction Services** (`src/services/transactions.ts`)
- createTransactionWithLines()
- getTransactionWithLines()
- Offline-first architecture support

**Transaction Lines Service** (`src/services/transaction-lines.ts`)
- getTransactionLines()
- replaceTransactionLines()
- CRUD operations for lines

**Missing**: Service layer for transaction_line_items table


## 2. Proposed Solution Architecture

### 2.1 Feature Overview

**Goal**: Add cost analysis capability to transaction lines by enabling detailed item-level breakdown using the `transaction_line_items` table.

**User Flow**:
1. User creates/edits transaction in wizard
2. On Lines step, user sees new "Cost Analysis" button per line
3. Clicking button opens modal showing transaction_line_items for that line
4. Modal provides CRUD interface for line items with:
   - Item selection from catalog (line_items table)
   - Quantity, percentage, unit price inputs
   - Addition/deduction configuration
   - Real-time calculation of totals
5. Modal saves changes to transaction_line_items table
6. Line total updates based on item analysis

### 2.2 Component Architecture

```
TransactionWizard (existing)
  └─ Lines Step (existing)
      └─ Line Row (existing)
          └─ [NEW] Cost Analysis Button
              └─ [NEW] CostAnalysisModal
                  ├─ [NEW] LineItemSelector (catalog browser)
                  ├─ [NEW] ItemRow (quantity, price, adjustments)
                  ├─ [NEW] AdditionDeductionPanel
                  └─ [NEW] TotalsSummary
```

### 2.3 Data Flow

```
transaction_lines (1) ──→ (N) transaction_line_items
                              ├─ line_item_id → line_items (catalog)
                              └─ Calculations:
                                  base_amount = quantity × percentage × unit_price
                                  net_amount = base_amount + additions - deductions
                                  total_amount = SUM(net_amount) per line
```

### 2.4 Database Triggers & Calculations

**Existing Triggers**:
- `zz_trigger_calculate_adjustments` - Calculates deduction/addition amounts
- `trigger_calculate_transaction_line_item_total` - Updates total_amount

**Constraint**: `total_amount` is a GENERATED ALWAYS column
```sql
total_amount GENERATED ALWAYS AS 
  (((quantity * (percentage / 100.0)) * unit_price)) STORED
```


## 3. Implementation Plan

### 3.1 Phase 1: Service Layer (Foundation)

**File**: `src/services/transaction-line-items.ts` (NEW)

**Required Functions**:

```typescript
// Types
export interface TransactionLineItem {
  id?: string
  transaction_line_id: string
  line_number: number
  line_item_id: string | null
  quantity: number
  percentage: number
  unit_price: number
  unit_of_measure: string
  deduction_percentage: number | null
  addition_percentage: number | null
  deduction_amount: number
  addition_amount: number
  net_amount: number
  total_amount: number // computed
  created_at?: string
  updated_at?: string
}

// CRUD Operations
export async function getLineItems(transactionLineId: string): Promise<TransactionLineItem[]>
export async function createLineItem(item: Omit<TransactionLineItem, 'id'>): Promise<TransactionLineItem>
export async function updateLineItem(id: string, item: Partial<TransactionLineItem>): Promise<TransactionLineItem>
export async function deleteLineItem(id: string): Promise<void>
export async function replaceLineItems(transactionLineId: string, items: TransactionLineItem[]): Promise<void>

// Catalog Access
export async function getLineItemsCatalog(orgId: string, filters?: {
  search?: string
  selectableOnly?: boolean
  parentId?: string
}): Promise<LineItemCatalog[]>

// Adjustment Types
export async function getAdjustmentTypes(orgId: string): Promise<AdjustmentType[]>
```

**Key Considerations**:
- Offline-first support (IndexedDB caching)
- RLS policy compliance (org_id scoping)
- Optimistic updates for better UX
- Batch operations for performance

### 3.2 Phase 2: Modal Component

**File**: `src/components/Transactions/CostAnalysisModal.tsx` (NEW)

**Props Interface**:
```typescript
interface CostAnalysisModalProps {
  open: boolean
  onClose: () => void
  transactionLineId: string
  lineNumber: number
  accountName: string
  orgId: string
  onSave?: (items: TransactionLineItem[], totalAmount: number) => void
}
```

**Features**:
- Material-UI Dialog with full-screen option
- Responsive grid layout
- Real-time calculation display
- Validation feedback
- Loading states
- Error handling

**Sub-Components**:

1. **LineItemSelector** - Searchable dropdown with catalog hierarchy
2. **ItemRow** - Editable row for each line item
3. **AdditionDeductionPanel** - Collapsible panel for adjustments
4. **TotalsSummary** - Read-only totals display


### 3.3 Phase 3: Integration with TransactionWizard

**File**: `src/components/Transactions/TransactionWizard.tsx` (MODIFY)

**Changes Required**:

1. **Add Cost Analysis Button to Line Rows**
```typescript
// In the lines step rendering
<IconButton 
  onClick={() => handleOpenCostAnalysis(lineIndex)}
  disabled={!line.id || !line.account_id}
  title="تحليل التكلفة"
>
  <CalculateIcon />
</IconButton>
```

2. **State Management**
```typescript
const [costAnalysisModal, setCostAnalysisModal] = useState<{
  open: boolean
  lineId: string | null
  lineIndex: number | null
}>({ open: false, lineId: null, lineIndex: null })

const [lineItemsCache, setLineItemsCache] = useState<Record<string, TransactionLineItem[]>>({})
```

3. **Modal Integration**
```typescript
<CostAnalysisModal
  open={costAnalysisModal.open}
  onClose={() => setCostAnalysisModal({ open: false, lineId: null, lineIndex: null })}
  transactionLineId={costAnalysisModal.lineId || ''}
  lineNumber={costAnalysisModal.lineIndex ? costAnalysisModal.lineIndex + 1 : 0}
  accountName={getAccountName(costAnalysisModal.lineIndex)}
  orgId={headerData.org_id}
  onSave={handleCostAnalysisSave}
/>
```

4. **Save Handler**
```typescript
const handleCostAnalysisSave = async (
  items: TransactionLineItem[], 
  totalAmount: number
) => {
  // Update line items cache
  if (costAnalysisModal.lineId) {
    setLineItemsCache(prev => ({
      ...prev,
      [costAnalysisModal.lineId!]: items
    }))
  }
  
  // Optionally update line amount based on analysis
  if (costAnalysisModal.lineIndex !== null) {
    setLines(prev => prev.map((line, idx) => 
      idx === costAnalysisModal.lineIndex 
        ? { ...line, /* update amount if needed */ }
        : line
    ))
  }
  
  setCostAnalysisModal({ open: false, lineId: null, lineIndex: null })
}
```

**UI/UX Considerations**:
- Button only enabled when line has account_id and line.id exists
- Visual indicator when line has cost analysis items
- Tooltip showing item count and total
- Confirmation dialog if unsaved changes exist


### 3.4 Phase 4: Database & RLS Policies

**Verification Required**:

1. **Check Existing RLS Policies**
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'transaction_line_items';
```

2. **Ensure Proper Policies Exist**
```sql
-- View policy
CREATE POLICY "Users can view line items in their org"
ON transaction_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM transaction_lines tl
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE tl.id = transaction_line_items.transaction_line_id
    AND t.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  )
);

-- Insert policy
CREATE POLICY "Users can insert line items in their org"
ON transaction_line_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM transaction_lines tl
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE tl.id = transaction_line_items.transaction_line_id
    AND t.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  )
);

-- Update/Delete policies similar pattern
```

3. **Verify Indexes**
```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tli_transaction_line_id 
ON transaction_line_items(transaction_line_id);

CREATE INDEX IF NOT EXISTS idx_tli_line_item_id 
ON transaction_line_items(line_item_id);

CREATE INDEX IF NOT EXISTS idx_tli_has_deduction 
ON transaction_line_items(deduction_percentage) 
WHERE deduction_percentage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tli_has_addition 
ON transaction_line_items(addition_percentage) 
WHERE addition_percentage IS NOT NULL;
```

4. **Verify Triggers**
```sql
-- Check trigger exists
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'transaction_line_items'::regclass;

-- Verify trigger function
SELECT prosrc FROM pg_proc 
WHERE proname = 'fn_calculate_tli_adjustments';
```


## 4. Technical Specifications

### 4.1 Modal UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Cost Analysis - Line 1: Account 1010 - Cash                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [+ Add Item]                                    [Save] [Cancel]│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Item | Qty | % | Unit Price | UOM | Subtotal | Actions │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ [Select Item ▼] | 1.00 | 100 | 0.00 | piece | 0.00 | 🗑 │ │
│ │   └─ [+ Additions/Deductions]                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Totals Summary                                          │ │
│ │ Base Amount:        1,000.00                            │ │
│ │ Additions:            100.00                            │ │
│ │ Deductions:          (50.00)                            │ │
│ │ ─────────────────────────────                           │ │
│ │ Net Total:          1,050.00                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Calculation Logic

**Base Amount Calculation**:
```typescript
const baseAmount = quantity * (percentage / 100) * unitPrice
```

**Adjustments**:
```typescript
// Additions
const additionAmount = baseAmount * (additionPercentage / 100)

// Deductions
const deductionAmount = baseAmount * (deductionPercentage / 100)

// Net Amount
const netAmount = baseAmount + additionAmount - deductionAmount
```

**Line Total**:
```typescript
const lineTotal = items.reduce((sum, item) => sum + item.net_amount, 0)
```

### 4.3 Validation Rules

1. **Required Fields**:
   - line_item_id (if using catalog)
   - quantity > 0
   - percentage between 0 and 999.99
   - unit_price >= 0

2. **Business Rules**:
   - At least one item required to save
   - Percentage cannot exceed 999.99%
   - Deduction cannot exceed base amount
   - Unit of measure must be valid

3. **Constraints**:
   - Unique line_number per transaction_line_id
   - Foreign key integrity (transaction_line_id, line_item_id)


## 5. Implementation Checklist

### 5.1 Backend/Database Tasks

- [ ] Verify transaction_line_items table schema
- [ ] Verify RLS policies for transaction_line_items
- [ ] Verify indexes for performance
- [ ] Verify triggers (fn_calculate_tli_adjustments)
- [ ] Test CRUD operations via SQL
- [ ] Verify line_items catalog table structure
- [ ] Verify adjustment_types table structure
- [ ] Create database migration if schema changes needed

### 5.2 Service Layer Tasks

- [ ] Create `src/services/transaction-line-items.ts`
- [ ] Implement getLineItems()
- [ ] Implement createLineItem()
- [ ] Implement updateLineItem()
- [ ] Implement deleteLineItem()
- [ ] Implement replaceLineItems() (batch operation)
- [ ] Implement getLineItemsCatalog()
- [ ] Implement getAdjustmentTypes()
- [ ] Add offline-first support (IndexedDB)
- [ ] Add error handling and retry logic
- [ ] Write unit tests for service functions

### 5.3 Component Tasks

- [ ] Create `src/components/Transactions/CostAnalysisModal.tsx`
- [ ] Create `src/components/Transactions/LineItemSelector.tsx`
- [ ] Create `src/components/Transactions/ItemRow.tsx`
- [ ] Create `src/components/Transactions/AdditionDeductionPanel.tsx`
- [ ] Create `src/components/Transactions/TotalsSummary.tsx`
- [ ] Add CSS styling (Material-UI theme integration)
- [ ] Implement responsive design
- [ ] Add loading states
- [ ] Add error states
- [ ] Add validation feedback

### 5.4 Integration Tasks

- [ ] Modify TransactionWizard.tsx to add Cost Analysis button
- [ ] Add state management for modal
- [ ] Add state management for line items cache
- [ ] Implement handleOpenCostAnalysis()
- [ ] Implement handleCostAnalysisSave()
- [ ] Add visual indicators for lines with cost analysis
- [ ] Add tooltip showing item count and total
- [ ] Test integration with existing wizard flow
- [ ] Test with draft save functionality
- [ ] Test with approval workflow

### 5.5 Testing Tasks

- [ ] Unit tests for service layer
- [ ] Component tests for modal
- [ ] Integration tests for wizard
- [ ] E2E tests for complete flow
- [ ] Test offline functionality
- [ ] Test with different user permissions
- [ ] Test with different org/project scopes
- [ ] Performance testing with large datasets
- [ ] Browser compatibility testing
- [ ] Mobile responsiveness testing

### 5.6 Documentation Tasks

- [ ] Update API documentation
- [ ] Create user guide for cost analysis feature
- [ ] Update developer documentation
- [ ] Create training materials
- [ ] Update database schema documentation


## 6. Code Examples

### 6.1 Service Layer Example

```typescript
// src/services/transaction-line-items.ts
import { supabase } from '../utils/supabase'

export interface TransactionLineItem {
  id?: string
  transaction_line_id: string
  line_number: number
  line_item_id: string | null
  quantity: number
  percentage: number
  unit_price: number
  unit_of_measure: string
  deduction_percentage: number | null
  addition_percentage: number | null
  deduction_amount: number
  addition_amount: number
  net_amount: number
  total_amount: number
}

export async function getLineItems(
  transactionLineId: string
): Promise<TransactionLineItem[]> {
  const { data, error } = await supabase
    .from('transaction_line_items')
    .select('*')
    .eq('transaction_line_id', transactionLineId)
    .order('line_number', { ascending: true })

  if (error) throw error
  return data || []
}

export async function replaceLineItems(
  transactionLineId: string,
  items: Omit<TransactionLineItem, 'id'>[]
): Promise<void> {
  // Delete existing items
  const { error: deleteError } = await supabase
    .from('transaction_line_items')
    .delete()
    .eq('transaction_line_id', transactionLineId)

  if (deleteError) throw deleteError

  // Insert new items
  if (items.length > 0) {
    const { error: insertError } = await supabase
      .from('transaction_line_items')
      .insert(items)

    if (insertError) throw insertError
  }
}
```

### 6.2 Modal Component Example

```typescript
// src/components/Transactions/CostAnalysisModal.tsx
import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert
} from '@mui/material'
import { Add, Delete, Close } from '@mui/icons-material'
import {
  getLineItems,
  replaceLineItems,
  type TransactionLineItem
} from '../../services/transaction-line-items'

interface CostAnalysisModalProps {
  open: boolean
  onClose: () => void
  transactionLineId: string
  lineNumber: number
  accountName: string
  orgId: string
  onSave?: (items: TransactionLineItem[], totalAmount: number) => void
}

export const CostAnalysisModal: React.FC<CostAnalysisModalProps> = ({
  open,
  onClose,
  transactionLineId,
  lineNumber,
  accountName,
  orgId,
  onSave
}) => {
  const [items, setItems] = useState<TransactionLineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing items
  useEffect(() => {
    if (open && transactionLineId) {
      loadItems()
    }
  }, [open, transactionLineId])

  const loadItems = async () => {
    try {
      setLoading(true)
      const data = await getLineItems(transactionLineId)
      setItems(data.length > 0 ? data : [createEmptyItem()])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createEmptyItem = (): TransactionLineItem => ({
    transaction_line_id: transactionLineId,
    line_number: items.length + 1,
    line_item_id: null,
    quantity: 1,
    percentage: 100,
    unit_price: 0,
    unit_of_measure: 'piece',
    deduction_percentage: null,
    addition_percentage: null,
    deduction_amount: 0,
    addition_amount: 0,
    net_amount: 0,
    total_amount: 0
  })

  const totals = useMemo(() => {
    const baseAmount = items.reduce((sum, item) => 
      sum + (item.quantity * (item.percentage / 100) * item.unit_price), 0
    )
    const additions = items.reduce((sum, item) => sum + item.addition_amount, 0)
    const deductions = items.reduce((sum, item) => sum + item.deduction_amount, 0)
    const netTotal = baseAmount + additions - deductions

    return { baseAmount, additions, deductions, netTotal }
  }, [items])

  const handleSave = async () => {
    try {
      setLoading(true)
      await replaceLineItems(transactionLineId, items)
      onSave?.(items, totals.netTotal)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Cost Analysis - Line {lineNumber}: {accountName}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        
        {/* Items table */}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>%</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>UOM</TableCell>
              <TableCell>Subtotal</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                {/* Item row cells */}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals summary */}
        <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
          <Typography>Base Amount: {totals.baseAmount.toFixed(2)}</Typography>
          <Typography>Additions: {totals.additions.toFixed(2)}</Typography>
          <Typography>Deductions: ({totals.deductions.toFixed(2)})</Typography>
          <Typography variant="h6">Net Total: {totals.netTotal.toFixed(2)}</Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```


## 7. Risk Assessment & Mitigation

### 7.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| RLS policy conflicts | High | Medium | Thorough testing with different user roles |
| Performance with large datasets | Medium | Medium | Implement pagination, lazy loading |
| Offline sync conflicts | High | Low | Implement conflict resolution strategy |
| Trigger calculation errors | High | Low | Comprehensive unit tests for triggers |
| Browser compatibility issues | Medium | Low | Cross-browser testing |

### 7.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User confusion with new feature | Medium | Medium | Clear UI/UX, training materials |
| Data migration issues | High | Low | Backward compatibility, gradual rollout |
| Performance degradation | Medium | Low | Load testing, optimization |
| Integration with approval workflow | High | Medium | Thorough integration testing |

### 7.3 Mitigation Strategies

1. **Phased Rollout**:
   - Phase 1: Internal testing
   - Phase 2: Beta users
   - Phase 3: Full deployment

2. **Monitoring**:
   - Performance metrics
   - Error tracking
   - User feedback collection

3. **Rollback Plan**:
   - Feature flag to disable modal
   - Database backup before deployment
   - Quick rollback procedure documented


## 8. Timeline & Resource Allocation

### 8.1 Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Service Layer | 3-5 days | Database verification |
| Phase 2: Modal Component | 5-7 days | Service layer complete |
| Phase 3: Integration | 3-4 days | Modal component complete |
| Phase 4: Testing | 5-7 days | All phases complete |
| Phase 5: Documentation | 2-3 days | Testing complete |
| **Total** | **18-26 days** | - |

### 8.2 Resource Requirements

**Development Team**:
- 1 Senior Frontend Developer (Modal & Integration)
- 1 Backend Developer (Service Layer & Database)
- 1 QA Engineer (Testing)
- 1 Technical Writer (Documentation)

**Infrastructure**:
- Development environment
- Staging environment
- Testing database

### 8.3 Milestones

1. **Week 1**: Service layer complete, database verified
2. **Week 2**: Modal component complete, basic integration
3. **Week 3**: Full integration, testing begins
4. **Week 4**: Testing complete, documentation ready, deployment


## 9. Questions for Software Consultant Review

### 9.1 Architecture Questions

1. **Service Layer Design**:
   - Should we use a unified CRUD service or separate services for line_items catalog vs transaction_line_items?
   - Do we need caching strategy beyond offline-first IndexedDB?

2. **State Management**:
   - Should line items be cached in TransactionWizard state or fetched on-demand?
   - How should we handle unsaved changes when user closes modal?

3. **Calculation Logic**:
   - Should calculations be done client-side or rely on database triggers?
   - Do we need real-time validation of totals against line amounts?

### 9.2 Business Logic Questions

1. **Workflow Integration**:
   - Should cost analysis be required for certain account types?
   - How does cost analysis interact with approval workflow?
   - Can users edit cost analysis after line approval?

2. **Data Validation**:
   - What are the business rules for minimum/maximum quantities?
   - Are there restrictions on which items can be used together?
   - Should we validate total amounts against budget limits?

3. **User Permissions**:
   - Do we need separate permissions for cost analysis vs transaction lines?
   - Can users view cost analysis without edit permissions?

### 9.3 UI/UX Questions

1. **Modal Behavior**:
   - Should modal be full-screen or dialog-sized?
   - Should we support keyboard shortcuts for adding items?
   - How should we handle very long item lists (pagination)?

2. **Visual Indicators**:
   - How should we indicate lines with cost analysis in the wizard?
   - Should we show item count badge on the button?
   - Do we need color coding for different item types?

3. **Mobile Experience**:
   - Should cost analysis be available on mobile devices?
   - Do we need a simplified mobile layout?


## 10. Appendix

### 10.1 Database Schema Reference

**transaction_line_items Table**:
```sql
CREATE TABLE transaction_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_number INTEGER NOT NULL DEFAULT 1,
  quantity NUMERIC(15,4) NOT NULL DEFAULT 1.0,
  percentage NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  unit_price NUMERIC(15,4) NOT NULL DEFAULT 0.0,
  unit_of_measure VARCHAR(50) DEFAULT 'piece',
  total_amount NUMERIC(15,4) GENERATED ALWAYS AS 
    (((quantity * (percentage / 100.0)) * unit_price)) STORED,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  line_item_id UUID REFERENCES line_items(id) ON DELETE SET NULL,
  transaction_line_id UUID NOT NULL REFERENCES transaction_lines(id) ON DELETE CASCADE,
  deduction_percentage NUMERIC(10,6),
  addition_percentage NUMERIC(10,6),
  deduction_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  addition_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  net_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  
  CONSTRAINT transaction_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_line_items_percentage_check 
    CHECK (percentage >= 0 AND percentage <= 999.99),
  CONSTRAINT transaction_line_items_quantity_check 
    CHECK (quantity >= 0),
  CONSTRAINT transaction_line_items_unit_price_check 
    CHECK (unit_price >= 0)
);
```

### 10.2 Related Tables

**line_items (Catalog)**:
```sql
CREATE TABLE line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  parent_id UUID REFERENCES line_items(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1,
  path TEXT NOT NULL,
  is_selectable BOOLEAN NOT NULL DEFAULT FALSE,
  item_type item_type_enum,
  specifications JSONB,
  base_unit_of_measure VARCHAR(50),
  standard_cost NUMERIC(15,4),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  org_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT line_items_pkey PRIMARY KEY (id),
  CONSTRAINT line_items_org_id_code_key UNIQUE (org_id, code)
);
```

**adjustment_types**:
```sql
CREATE TABLE adjustment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  default_percentage NUMERIC(10,6) NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT adjustment_types_pkey PRIMARY KEY (id),
  CONSTRAINT uk_adj_types_org_code UNIQUE (org_id, code)
);
```

### 10.3 Existing Triggers

**fn_calculate_tli_adjustments**:
```sql
CREATE OR REPLACE FUNCTION fn_calculate_tli_adjustments()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate base amount
  NEW.total_amount := (NEW.quantity * (NEW.percentage / 100.0)) * NEW.unit_price;
  
  -- Calculate addition amount
  IF NEW.addition_percentage IS NOT NULL THEN
    NEW.addition_amount := NEW.total_amount * (NEW.addition_percentage / 100.0);
  ELSE
    NEW.addition_amount := 0;
  END IF;
  
  -- Calculate deduction amount
  IF NEW.deduction_percentage IS NOT NULL THEN
    NEW.deduction_amount := NEW.total_amount * (NEW.deduction_percentage / 100.0);
  ELSE
    NEW.deduction_amount := 0;
  END IF;
  
  -- Calculate net amount
  NEW.net_amount := NEW.total_amount + NEW.addition_amount - NEW.deduction_amount;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zz_trigger_calculate_adjustments
  BEFORE INSERT OR UPDATE ON transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_tli_adjustments();
```

### 10.4 Glossary

- **Transaction Line**: A single accounting entry (debit or credit) in a transaction
- **Line Item**: A catalog entry representing a product, service, or cost element
- **Transaction Line Item**: A detailed breakdown of a transaction line using catalog items
- **Cost Analysis**: The process of breaking down a transaction line into detailed items
- **Addition**: A percentage-based increase to the base amount (e.g., tax, markup)
- **Deduction**: A percentage-based decrease from the base amount (e.g., discount)
- **Net Amount**: Final amount after additions and deductions
- **Base Amount**: Initial calculated amount (quantity × percentage × unit price)

---

## Document Control

**Version**: 1.0  
**Last Updated**: March 1, 2026  
**Status**: Ready for Review  
**Next Review Date**: After Software Consultant Feedback  

**Approval Required From**:
- [ ] Software Consultant
- [ ] Technical Lead
- [ ] Product Owner
- [ ] QA Lead

