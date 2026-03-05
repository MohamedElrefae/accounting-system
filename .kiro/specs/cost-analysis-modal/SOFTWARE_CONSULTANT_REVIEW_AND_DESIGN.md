# Software Consultant Review & Design Phase
## Cost Analysis Modal Feature

**Date**: March 1, 2026  
**Consultant**: Software Architecture Consultant  
**Status**: ✅ **APPROVED FOR IMPLEMENTATION**  
**Risk Level**: 🟢 **LOW**

---

## Executive Summary

This document contains the comprehensive software consultant review of the Cost Analysis Modal feature, including critical issue resolution, architectural decisions, detailed design specifications, and implementation roadmap. The feature has been approved to proceed to implementation phase with all critical concerns addressed.

---

## Table of Contents

1. [Critical Issues & Resolutions](#1-critical-issues--resolutions)
2. [Stakeholder Decisions](#2-stakeholder-decisions)
3. [System Architecture Design](#3-system-architecture-design)
4. [Database Design](#4-database-design)
5. [Service Layer Design](#5-service-layer-design)
6. [Component Architecture](#6-component-architecture)
7. [Integration Design](#7-integration-design)
8. [RTL Support Implementation](#8-rtl-support-implementation)
9. [Testing Strategy](#9-testing-strategy)
10. [Implementation Timeline](#10-implementation-timeline)
11. [Quality Assurance](#11-quality-assurance)
12. [Next Steps](#12-next-steps)

---

## 1. Critical Issues & Resolutions

### Issue #1: Requirements-Engineering Mismatch ✅ RESOLVED

**Original Problem**: Requirements document described simple cost breakdown while engineering plan described catalog-based item analysis.

**Decision**: 
- ✅ **Path B: Catalog-Based Item Analysis** (Engineering Plan)
- Proceed with full implementation as specified in engineering plan
- Use `line_items` catalog with hierarchical structure
- Include `adjustment_types` for additions/deductions
- Complex calculation model with quantity, percentage, unit_price

**Rationale**: Better for structured costing, inventory tracking, and standardized data.

---

### Issue #2: Calculation Model Clarification ✅ RESOLVED

**Original Concern**: Misunderstanding about `total_amount` vs `net_amount` relationship.

**Clarification Provided**:
```typescript
// CORRECT CALCULATION FLOW:
total_amount = quantity × percentage × unit_price  // Base amount
addition_amount = total_amount × addition_percentage
deduction_amount = total_amount × deduction_percentage
net_amount = total_amount + addition_amount - deduction_amount

// PURPOSE:
// - total_amount: Base value BEFORE adjustments
// - net_amount: Final value AFTER adjustments
// - Both values needed for audit trail and reporting
```

**Database Schema Verified**: ✅ No changes needed
- `total_amount` as GENERATED ALWAYS column is CORRECT
- Trigger calculates adjustments properly
- `net_amount` stores final calculated value

---

### Issue #3: Approval Workflow Integration ✅ RESOLVED

**Decision Confirmed**:

| Aspect | Implementation |
|--------|----------------|
| **Approval Status Location** | `transaction_lines.approval_status` |
| **Locking Scope** | When line approved → ALL related `transaction_line_items` locked |
| **Permission Check** | Query `approval_status` before allowing edits |
| **UI Behavior** | Modal opens in read-only mode for approved lines |
| **RLS Enforcement** | Database-level policy checks approval status |

**Database Function Created**:
```sql
CREATE OR REPLACE FUNCTION can_edit_transaction_line(
  p_transaction_line_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_approval_status VARCHAR;
BEGIN
  SELECT approval_status INTO v_approval_status
  FROM transaction_lines
  WHERE id = p_transaction_line_id;
  
  -- Can edit only if status is 'draft' or 'pending'
  RETURN v_approval_status IN ('draft', 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Stakeholder Decisions

### Confirmed Requirements

| Requirement | Decision | Justification |
|-------------|----------|---------------|
| **Architecture Approach** | Path B: Catalog-Based Item Analysis | Structured data, better reporting |
| **Approval Locking** | Line + all related items locked | Data integrity, audit compliance |
| **Concurrency Control** | Manual merge via existing offline sync | Use proven infrastructure |
| **Audit Trail** | Line-level only (not item-level) | Reduced complexity, sufficient for compliance |
| **Internationalization** | Full RTL support for Arabic | Core user base requirement |
| **Number Formatting** | Use existing app settings | Consistency across application |
| **Data Migration** | None - manual entry for new data | Existing system remains unchanged |
| **Calculation Model** | total_amount ≠ net_amount | Both values serve different purposes |

### Deferred Requirements

| Requirement | Status | Timeline |
|-------------|--------|----------|
| **Auto-save functionality** | Phase 2 | Post-MVP |
| **Undo/redo operations** | Phase 2 | Post-MVP |
| **Advanced validation rules** | Phase 2 | Iterate based on feedback |
| **Item-level audit trail** | Future | Only if compliance requires |
| **Budget limit checks** | Future | Business rule definition needed |

---

## 3. System Architecture Design

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TransactionWizard (Existing)                                   │
│    └─ Lines Step                                                │
│        └─ Line Row                                              │
│            ├─ Dimensional Analysis Fields (Existing)            │
│            └─ [NEW] Cost Analysis Button (Badge)                │
│                └─ Opens Modal                                   │
│                                                                 │
│  CostAnalysisModal (NEW)                                        │
│    ├─ Header (Line info, approval status)                       │
│    ├─ ItemsTable (Drag-drop, inline edit)                      │
│    │   ├─ LineItemSelector (Catalog browser)                   │
│    │   ├─ Quantity/Percentage/Price inputs                     │
│    │   └─ AdditionDeductionPanel (Expandable)                  │
│    ├─ TotalsSummary (Real-time calculations)                   │
│    └─ Actions (Save, Close, Keyboard shortcuts)                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Service Layer                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  transaction-line-items.ts (NEW)                                │
│    ├─ CRUD Operations                                           │
│    │   ├─ getLineItems()                                        │
│    │   ├─ replaceLineItems() [Atomic]                          │
│    │   └─ canEditTransactionLine()                             │
│    ├─ Catalog Access                                            │
│    │   ├─ searchLineItemsCatalog()                             │
│    │   └─ getAdjustmentTypes()                                 │
│    ├─ Calculations                                              │
│    │   └─ calculateTotals()                                     │
│    └─ Offline Support                                           │
│        └─ queueLineItemsForSync()                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Database Layer                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tables:                                                        │
│    ├─ transaction_lines (approval_status)                       │
│    ├─ transaction_line_items (cost breakdown)                   │
│    ├─ line_items (catalog - master data)                        │
│    └─ adjustment_types (additions/deductions)                   │
│                                                                 │
│  Functions:                                                     │
│    ├─ can_edit_transaction_line()                               │
│    ├─ replace_line_items_atomic()                               │
│    └─ fn_calculate_tli_adjustments() [Existing trigger]         │
│                                                                 │
│  RLS Policies:                                                  │
│    ├─ View items in org                                         │
│    ├─ Insert/Update if line not approved                        │
│    └─ Delete if line not approved                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
User Action Flow:
─────────────────

1. User clicks "Cost Analysis" button on transaction line
   ↓
2. System checks approval_status from transaction_lines
   ↓
3. If approved → Modal opens READ-ONLY
   If draft/pending → Modal opens EDITABLE
   ↓
4. System loads transaction_line_items via getLineItems()
   ↓
5. User adds/edits items in modal
   ↓
6. Real-time calculation updates (client-side)
   ↓
7. User clicks Save
   ↓
8. System calls replaceLineItems() [Atomic transaction]
   ↓
9. Database trigger calculates adjustments
   ↓
10. Success → Modal closes, badge updates
    Error → Show error message, allow retry


Calculation Flow:
─────────────────

Input: quantity, percentage, unit_price, addition_%, deduction_%
  ↓
[Client Preview]
  total_amount = quantity × (percentage/100) × unit_price
  addition_amount = total_amount × (addition_%/100)
  deduction_amount = total_amount × (deduction_%/100)
  net_amount = total_amount + addition_amount - deduction_amount
  ↓
[Save to Database]
  ↓
[Database Trigger: fn_calculate_tli_adjustments]
  1. Calculates total_amount (via GENERATED column)
  2. Calculates addition_amount
  3. Calculates deduction_amount
  4. Calculates net_amount
  5. Stores all values
  ↓
[Return Summary]
  item_count, total_net_amount
```

---

## 4. Database Design

### 4.1 Schema Verification

**Existing Schema - NO CHANGES NEEDED ✅**

```sql
-- transaction_line_items table
CREATE TABLE transaction_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_line_id UUID NOT NULL REFERENCES transaction_lines(id) ON DELETE CASCADE,
  line_item_id UUID REFERENCES line_items(id) ON DELETE SET NULL,
  line_number INTEGER NOT NULL DEFAULT 1,
  
  -- Quantity and pricing
  quantity NUMERIC(15,4) NOT NULL DEFAULT 1.0,
  percentage NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  unit_price NUMERIC(15,4) NOT NULL DEFAULT 0.0,
  unit_of_measure VARCHAR(50) DEFAULT 'piece',
  
  -- Base calculation (GENERATED ALWAYS - correct as-is)
  total_amount NUMERIC(15,4) GENERATED ALWAYS AS 
    (((quantity * (percentage / 100.0)) * unit_price)) STORED,
  
  -- Adjustments
  addition_percentage NUMERIC(10,6),
  addition_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  deduction_percentage NUMERIC(10,6),
  deduction_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  
  -- Final amount
  net_amount NUMERIC(15,4) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT transaction_line_items_percentage_check 
    CHECK (percentage >= 0 AND percentage <= 999.99),
  CONSTRAINT transaction_line_items_quantity_check 
    CHECK (quantity >= 0),
  CONSTRAINT transaction_line_items_unit_price_check 
    CHECK (unit_price >= 0)
);

-- Indexes for performance
CREATE INDEX idx_tli_transaction_line_id 
  ON transaction_line_items(transaction_line_id);

CREATE INDEX idx_tli_line_item_id 
  ON transaction_line_items(line_item_id);
```

### 4.2 New Database Functions

#### A. Approval Status Check

```sql
-- Check if transaction line can be edited
CREATE OR REPLACE FUNCTION can_edit_transaction_line(
  p_transaction_line_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_approval_status VARCHAR;
BEGIN
  SELECT approval_status INTO v_approval_status
  FROM transaction_lines
  WHERE id = p_transaction_line_id;
  
  -- Can edit only if status is 'draft' or 'pending'
  RETURN v_approval_status IN ('draft', 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION can_edit_transaction_line(UUID) 
  TO authenticated;
```

#### B. Atomic Replace Function

```sql
-- Atomic replace operation for line items
CREATE OR REPLACE FUNCTION replace_line_items_atomic(
  p_transaction_line_id UUID,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_can_edit BOOLEAN;
  v_result JSONB;
  v_org_id UUID;
BEGIN
  -- Verify user has access to this transaction line's org
  SELECT t.org_id INTO v_org_id
  FROM transaction_lines tl
  JOIN transactions t ON tl.transaction_id = t.id
  WHERE tl.id = p_transaction_line_id;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Transaction line not found';
  END IF;
  
  IF v_org_id != (SELECT org_id FROM user_profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: different organization';
  END IF;
  
  -- Check if line can be edited
  v_can_edit := can_edit_transaction_line(p_transaction_line_id);
  
  IF NOT v_can_edit THEN
    RAISE EXCEPTION 'Cannot edit approved transaction line';
  END IF;
  
  -- Begin atomic operation: delete existing items
  DELETE FROM transaction_line_items 
  WHERE transaction_line_id = p_transaction_line_id;
  
  -- Insert new items (trigger will calculate amounts)
  INSERT INTO transaction_line_items (
    transaction_line_id,
    line_number,
    line_item_id,
    quantity,
    percentage,
    unit_price,
    unit_of_measure,
    addition_percentage,
    deduction_percentage
  )
  SELECT 
    p_transaction_line_id,
    (item->>'line_number')::INTEGER,
    NULLIF(item->>'line_item_id', '')::UUID,
    COALESCE((item->>'quantity')::NUMERIC, 1.0),
    COALESCE((item->>'percentage')::NUMERIC, 100.0),
    COALESCE((item->>'unit_price')::NUMERIC, 0.0),
    COALESCE(item->>'unit_of_measure', 'piece'),
    NULLIF(item->>'addition_percentage', '')::NUMERIC,
    NULLIF(item->>'deduction_percentage', '')::NUMERIC
  FROM jsonb_array_elements(p_items) AS item;
  
  -- Return summary
  SELECT jsonb_build_object(
    'success', true,
    'item_count', COUNT(*)::INTEGER,
    'base_amount', COALESCE(SUM(total_amount), 0),
    'addition_amount', COALESCE(SUM(addition_amount), 0),
    'deduction_amount', COALESCE(SUM(deduction_amount), 0),
    'net_amount', COALESCE(SUM(net_amount), 0)
  ) INTO v_result
  FROM transaction_line_items
  WHERE transaction_line_id = p_transaction_line_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION replace_line_items_atomic(UUID, JSONB) 
  TO authenticated;
```

### 4.3 RLS Policies

```sql
-- Enable RLS
ALTER TABLE transaction_line_items ENABLE ROW LEVEL SECURITY;

-- View policy: users can view items in their org
CREATE POLICY "Users can view line items in their org"
ON transaction_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM transaction_lines tl
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE tl.id = transaction_line_items.transaction_line_id
      AND t.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  )
);

-- Insert policy: users can insert items if line not approved
CREATE POLICY "Users can insert line items if not approved"
ON transaction_line_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM transaction_lines tl
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE tl.id = transaction_line_items.transaction_line_id
      AND t.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
      AND can_edit_transaction_line(tl.id) = true
  )
);

-- Update policy: users can update items if line not approved
CREATE POLICY "Users can update line items if not approved"
ON transaction_line_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM transaction_lines tl
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE tl.id = transaction_line_items.transaction_line_id
      AND t.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  can_edit_transaction_line(transaction_line_id) = true
);

-- Delete policy: users can delete items if line not approved
CREATE POLICY "Users can delete line items if not approved"
ON transaction_line_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM transaction_lines tl
    JOIN transactions t ON tl.transaction_id = t.id
    WHERE tl.id = transaction_line_items.transaction_line_id
      AND t.org_id = (SELECT org_id FROM user_profiles WHERE user_id = auth.uid())
      AND can_edit_transaction_line(tl.id) = true
  )
);
```

### 4.4 Existing Triggers (Verified)

```sql
-- This trigger already exists and works correctly
CREATE OR REPLACE FUNCTION fn_calculate_tli_adjustments()
RETURNS TRIGGER AS $$
BEGIN
  -- total_amount is calculated by GENERATED ALWAYS column
  -- We just need to calculate adjustments based on it
  
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
  
  -- Update timestamp
  NEW.updated_at := CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists
CREATE TRIGGER zz_trigger_calculate_adjustments
  BEFORE INSERT OR UPDATE ON transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_tli_adjustments();
```

---

## 5. Service Layer Design

### File: `src/services/transaction-line-items.ts` (NEW)

```typescript
import { supabase } from '../utils/supabase'

// ═══════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface TransactionLineItem {
  id?: string
  transaction_line_id: string
  line_number: number
  line_item_id: string | null
  line_item?: LineItemCatalog // Populated from JOIN
  quantity: number
  percentage: number
  unit_price: number
  unit_of_measure: string
  total_amount: number // Computed by database
  addition_percentage: number | null
  addition_amount: number
  deduction_percentage: number | null
  deduction_amount: number
  net_amount: number
  created_at?: string
  updated_at?: string
}

export interface LineItemCatalog {
  id: string
  code: string
  name: string
  name_ar: string
  parent_id: string | null
  level: number
  path: string
  is_selectable: boolean
  item_type: string
  specifications: any
  base_unit_of_measure: string
  standard_cost: number
  is_active: boolean
  org_id: string
}

export interface AdjustmentType {
  id: string
  code: string
  name: string
  name_ar: string
  default_percentage: number
  description?: string
  org_id: string
}

export interface CostAnalysisSummary {
  success: boolean
  item_count: number
  base_amount: number
  addition_amount: number
  deduction_amount: number
  net_amount: number
}

export interface EditabilityCheck {
  canEdit: boolean
  status?: string
  reason?: string
}

// ═══════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get all line items for a transaction line with catalog data joined
 */
export async function getLineItems(
  transactionLineId: string
): Promise<TransactionLineItem[]> {
  const { data, error } = await supabase
    .from('transaction_line_items')
    .select(`
      *,
      line_item:line_items(*)
    `)
    .eq('transaction_line_id', transactionLineId)
    .order('line_number', { ascending: true })

  if (error) {
    console.error('Error fetching line items:', error)
    throw new Error(`Failed to load cost analysis items: ${error.message}`)
  }

  return data || []
}

/**
 * Check if transaction line is editable (not approved)
 */
export async function canEditTransactionLine(
  transactionLineId: string
): Promise<EditabilityCheck> {
  const { data, error } = await supabase
    .from('transaction_lines')
    .select('approval_status')
    .eq('id', transactionLineId)
    .single()

  if (error) {
    console.error('Error checking editability:', error)
    throw new Error(`Failed to check line status: ${error.message}`)
  }

  const canEdit = ['draft', 'pending'].includes(data.approval_status)
  
  return {
    canEdit,
    status: data.approval_status,
    reason: canEdit 
      ? undefined 
      : 'This transaction line is approved and cannot be edited'
  }
}

/**
 * Atomic replace all line items (delete existing + insert new)
 * Uses database function to ensure atomicity
 */
export async function replaceLineItems(
  transactionLineId: string,
  items: Omit<TransactionLineItem, 'id' | 'created_at' | 'updated_at' | 'total_amount' | 'addition_amount' | 'deduction_amount' | 'net_amount'>[]
): Promise<CostAnalysisSummary> {
  
  // Prepare items with sequential line numbers
  const itemsWithNumbers = items.map((item, idx) => ({
    transaction_line_id: transactionLineId,
    line_number: idx + 1,
    line_item_id: item.line_item_id || null,
    quantity: item.quantity || 1,
    percentage: item.percentage || 100,
    unit_price: item.unit_price || 0,
    unit_of_measure: item.unit_of_measure || 'piece',
    addition_percentage: item.addition_percentage || null,
    deduction_percentage: item.deduction_percentage || null
  }))

  // Call atomic database function
  const { data, error } = await supabase.rpc('replace_line_items_atomic', {
    p_transaction_line_id: transactionLineId,
    p_items: itemsWithNumbers
  })

  if (error) {
    console.error('Error replacing line items:', error)
    throw new Error(`Failed to save cost analysis: ${error.message}`)
  }

  return data as CostAnalysisSummary
}

/**
 * Calculate totals for items (client-side preview before save)
 * Matches database calculation logic
 */
export function calculateTotals(
  items: TransactionLineItem[]
): Omit<CostAnalysisSummary, 'success'> {
  let baseAmount = 0
  let additionAmount = 0
  let deductionAmount = 0

  items.forEach(item => {
    // Base calculation
    const itemTotal = item.quantity * (item.percentage / 100) * item.unit_price
    baseAmount += itemTotal

    // Additions
    if (item.addition_percentage) {
      additionAmount += itemTotal * (item.addition_percentage / 100)
    }

    // Deductions
    if (item.deduction_percentage) {
      deductionAmount += itemTotal * (item.deduction_percentage / 100)
    }
  })

  const netAmount = baseAmount + additionAmount - deductionAmount

  return {
    item_count: items.length,
    base_amount: baseAmount,
    addition_amount: additionAmount,
    deduction_amount: deductionAmount,
    net_amount: netAmount
  }
}

// ═══════════════════════════════════════════════════════════
// CATALOG & MASTER DATA
// ═══════════════════════════════════════════════════════════

/**
 * Search line items catalog with filters
 */
export async function searchLineItemsCatalog(
  orgId: string,
  filters?: {
    search?: string
    selectableOnly?: boolean
    parentId?: string | null
    itemType?: string
    limit?: number
  }
): Promise<LineItemCatalog[]> {
  let query = supabase
    .from('line_items')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('code', { ascending: true })
    .limit(filters?.limit || 100)

  // Search filter
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    query = query.or(
      `code.ilike.${searchTerm},name.ilike.${searchTerm},name_ar.ilike.${searchTerm}`
    )
  }

  // Selectable only filter
  if (filters?.selectableOnly) {
    query = query.eq('is_selectable', true)
  }

  // Parent filter (for hierarchical browsing)
  if (filters?.parentId !== undefined) {
    if (filters.parentId === null) {
      query = query.is('parent_id', null)
    } else {
      query = query.eq('parent_id', filters.parentId)
    }
  }

  // Item type filter
  if (filters?.itemType) {
    query = query.eq('item_type', filters.itemType)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error searching catalog:', error)
    throw new Error(`Failed to search catalog: ${error.message}`)
  }

  return data || []
}

/**
 * Get adjustment types for organization
 */
export async function getAdjustmentTypes(
  orgId: string
): Promise<AdjustmentType[]> {
  const { data, error } = await supabase
    .from('adjustment_types')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching adjustment types:', error)
    throw new Error(`Failed to load adjustment types: ${error.message}`)
  }

  return data || []
}

// ═══════════════════════════════════════════════════════════
// OFFLINE SUPPORT
// ═══════════════════════════════════════════════════════════

/**
 * Queue line items for offline sync
 * Integrates with existing offline sync manager
 */
export function queueLineItemsForSync(
  transactionLineId: string,
  items: TransactionLineItem[]
): void {
  // Check if offline sync is available
  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    const syncData = {
      type: 'replace_line_items',
      table: 'transaction_line_items',
      operation: 'replace',
      data: {
        transaction_line_id: transactionLineId,
        items: items
      },
      timestamp: Date.now(),
      retryCount: 0
    }

    // Store in IndexedDB queue (implementation depends on existing sync manager)
    // This is a placeholder for integration with existing system
    console.log('Queued for offline sync:', syncData)
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Validate line item data before save
 */
export function validateLineItem(item: Partial<TransactionLineItem>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (item.quantity !== undefined && item.quantity < 0) {
    errors.push('Quantity must be non-negative')
  }

  if (item.percentage !== undefined) {
    if (item.percentage < 0 || item.percentage > 999.99) {
      errors.push('Percentage must be between 0 and 999.99')
    }
  }

  if (item.unit_price !== undefined && item.unit_price < 0) {
    errors.push('Unit price must be non-negative')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Format currency for display
 * Uses app settings for locale-specific formatting
 */
export function formatCurrency(
  amount: number,
  locale: string = 'en-US',
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format number for display
 * Keeps numbers LTR even in RTL layouts
 */
export function formatNumber(
  value: number,
  decimals: number = 2
): string {
  return value.toFixed(decimals)
}
```

---

## 6. Component Architecture

### 6.1 Main Modal Component

**File**: `src/components/Transactions/CostAnalysisModal.tsx`

**Key Features**:
- ✅ Resizable and draggable
- ✅ Persistent size in localStorage
- ✅ Keyboard shortcuts (Ctrl+S, Ctrl+N, ESC)
- ✅ Unsaved changes detection
- ✅ RTL support
- ✅ Approval status display
- ✅ Real-time calculation preview
- ✅ Loading and error states

**Props Interface**:
```typescript
interface CostAnalysisModalProps {
  open: boolean
  onClose: () => void
  transactionLineId: string
  lineNumber: number
  accountCode: string
  accountName: string
  orgId: string
  onSave?: (summary: { itemCount: number; netAmount: number }) => void
}
```

**State Management**:
```typescript
// Items state
const [items, setItems] = useState<TransactionLineItem[]>([])
const [originalItems, setOriginalItems] = useState<TransactionLineItem[]>([])

// UI state
const [loading, setLoading] = useState(false)
const [saving, setSaving] = useState(false)
const [error, setError] = useState<string | null>(null)

// Permission state
const [isEditable, setIsEditable] = useState(true)
const [approvalStatus, setApprovalStatus] = useState<string>('')

// Change tracking
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

// Modal customization
const [modalSize, setModalSize] = useState<{ width: number; height: number }>()
```

### 6.2 Sub-Components

#### A. ItemsTable Component

**File**: `src/components/Transactions/CostAnalysis/ItemsTable.tsx`

**Features**:
- Drag-and-drop reordering (`react-beautiful-dnd`)
- Inline editing for all fields
- Expandable rows for additions/deductions
- Responsive column widths
- Zebra striping for readability

**Columns**:
1. Drag handle (if editable)
2. Item selector (catalog browser)
3. Quantity (numeric input)
4. Percentage (numeric input, 0-999.99)
5. Unit Price (numeric input)
6. Unit of Measure (dropdown)
7. Total Amount (calculated, read-only)
8. Net Amount (calculated, read-only, bold)
9. Actions (expand, delete)

#### B. LineItemSelector Component

**File**: `src/components/Transactions/CostAnalysis/LineItemSelector.tsx`

**Features**:
- Autocomplete with search
- Hierarchical catalog browsing
- Shows code + name (English/Arabic)
- Filters: selectable items only
- Pagination for large catalogs
- Displays item specifications

**Implementation**:
```typescript
interface LineItemSelectorProps {
  value: string | null
  orgId: string
  disabled: boolean
  onChange: (lineItemId: string | null, lineItem: LineItemCatalog | null) => void
}
```

#### C. AdditionDeductionPanel Component

**File**: `src/components/Transactions/CostAnalysis/AdditionDeductionPanel.tsx`

**Features**:
- Expandable panel within item row
- Addition type selector (from adjustment_types)
- Deduction type selector (from adjustment_types)
- Percentage inputs
- Auto-fill default percentages
- Real-time amount calculation display

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Additions/Deductions                                │
├─────────────────────────────────────────────────────┤
│ Addition Type: [Tax ▼]      Percentage: [10.00] %  │
│ Addition Amount: 100.00 (calculated)                │
│                                                     │
│ Deduction Type: [Discount ▼] Percentage: [5.00] %  │
│ Deduction Amount: 50.00 (calculated)                │
└─────────────────────────────────────────────────────┘
```

#### D. TotalsSummary Component

**File**: `src/components/Transactions/CostAnalysis/TotalsSummary.tsx`

**Features**:
- Prominent display of totals
- Color-coded amounts (additions green, deductions red)
- Real-time updates as items change
- Formatted currency display
- RTL-aware alignment

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Cost Analysis Summary                               │
├─────────────────────────────────────────────────────┤
│ Items Count:          5                             │
│ Base Amount:          5,000.00                      │
│ Additions:            + 250.00 (5%)                 │
│ Deductions:           - 150.00 (3%)                 │
│ ─────────────────────────────────────              │
│ Net Amount:           5,100.00                      │
└─────────────────────────────────────────────────────┘
```

#### E. UnsavedChangesDialog Component

**File**: `src/components/Transactions/CostAnalysis/UnsavedChangesDialog.tsx`

**Features**:
- Warning dialog before discarding changes
- Three actions: Save, Discard, Cancel
- Clear messaging about data loss
- Keyboard shortcuts (Enter = Save, ESC = Cancel)

---

## 7. Integration Design

### 7.1 TransactionWizard Modifications

**File**: `src/components/Transactions/TransactionWizard.tsx` (MODIFY)

#### A. Add State Management

```typescript
// Cost Analysis Modal state
const [costAnalysisModal, setCostAnalysisModal] = useState<{
  open: boolean
  lineId: string | null
  lineIndex: number | null
}>({
  open: false,
  lineId: null,
  lineIndex: null
})

// Track item counts per line for badge display
const [lineItemCounts, setLineItemCounts] = useState<Record<string, number>>({})
```

#### B. Add Button to Line Rows

```typescript
// In the Lines step table rendering, add new column:
<TableCell align="center" width={60}>
  <Tooltip title={t('costAnalysis.openModal')}>
    <span>
      <IconButton
        onClick={() => handleOpenCostAnalysis(line.id, lineIndex)}
        disabled={!line.id || !line.account_id}
        size="small"
      >
        <Badge 
          badgeContent={lineItemCounts[line.id] || 0} 
          color="primary"
          showZero={false}
          max={99}
        >
          <CalculateIcon />
        </Badge>
      </IconButton>
    </span>
  </Tooltip>
</TableCell>
```

#### C. Handler Functions

```typescript
/**
 * Open cost analysis modal for specific line
 */
const handleOpenCostAnalysis = (lineId: string, lineIndex: number) => {
  setCostAnalysisModal({
    open: true,
    lineId,
    lineIndex
  })
}

/**
 * Handle save from cost analysis modal
 */
const handleCostAnalysisSave = (summary: { 
  itemCount: number
  netAmount: number 
}) => {
  if (costAnalysisModal.lineId) {
    // Update badge count
    setLineItemCounts(prev => ({
      ...prev,
      [costAnalysisModal.lineId!]: summary.itemCount
    }))
    
    // Optional: Update line amount from cost analysis total
    // (Business decision: should net_amount replace line amount?)
    if (costAnalysisModal.lineIndex !== null) {
      // Uncomment if business wants to sync amounts:
      // setLines(prev => prev.map((line, idx) =>
      //   idx === costAnalysisModal.lineIndex
      //     ? { 
      //         ...line, 
      //         debit_amount: line.debit_amount ? summary.netAmount : null,
      //         credit_amount: line.credit_amount ? summary.netAmount : null
      //       }
      //     : line
      // ))
    }
  }
  
  // Close modal
  setCostAnalysisModal({ open: false, lineId: null, lineIndex: null })
}

/**
 * Get account information for modal header
 */
const getAccountInfo = (lineIndex: number | null): {
  code: string
  name: string
} => {
  if (lineIndex === null) {
    return { code: '', name: '' }
  }
  
  const line = lines[lineIndex]
  // Lookup account from accounts array or cache
  const account = accounts.find(a => a.id === line.account_id)
  
  return {
    code: account?.code || '',
    name: account?.name || ''
  }
}
```

#### D. Render Modal

```typescript
// At end of TransactionWizard component, before closing tags:
<CostAnalysisModal
  open={costAnalysisModal.open}
  onClose={() => setCostAnalysisModal({ 
    open: false, 
    lineId: null, 
    lineIndex: null 
  })}
  transactionLineId={costAnalysisModal.lineId || ''}
  lineNumber={(costAnalysisModal.lineIndex ?? -1) + 1}
  accountCode={getAccountInfo(costAnalysisModal.lineIndex).code}
  accountName={getAccountInfo(costAnalysisModal.lineIndex).name}
  orgId={headerData.org_id}
  onSave={handleCostAnalysisSave}
/>
```

### 7.2 Visual Indicators

#### A. Badge Display

```typescript
// Badge shows:
// - Item count when items exist
// - Hidden when count is 0
// - Max 99 (shows "99+" for 100+)
// - Primary color for visibility

<Badge 
  badgeContent={lineItemCounts[line.id] || 0} 
  color="primary"
  showZero={false}
  max={99}
>
  <CalculateIcon />
</Badge>
```

#### B. Button States

| Condition | Button State | Tooltip |
|-----------|--------------|---------|
| Line not saved (no id) | Disabled | "Save line first" |
| No account selected | Disabled | "Select account first" |
| Line approved | Disabled | "Line is approved" |
| Has items | Badge visible | "Cost Analysis (N items)" |
| No items | Badge hidden | "Cost Analysis" |
| Editable | Enabled | "Cost Analysis" |

---

## 8. RTL Support Implementation

### 8.1 Theme Configuration

**File**: `src/theme/rtl.ts` (NEW or MODIFY)

```typescript
import { createTheme, ThemeOptions } from '@mui/material/styles'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'

/**
 * Create theme with RTL support
 */
export const createRTLTheme = (direction: 'ltr' | 'rtl'): ThemeOptions => {
  return createTheme({
    direction,
    typography: {
      fontFamily: direction === 'rtl' 
        ? "'Cairo', 'Tajawal', 'Arial', sans-serif" 
        : "'Roboto', 'Inter', 'Arial', sans-serif"
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: direction === 'rtl' ? `
          * {
            direction: rtl;
          }
          body {
            font-family: 'Cairo', 'Tajawal', 'Arial', sans-serif;
          }
        ` : undefined
      },
      // Adjust table cell padding for RTL
      MuiTableCell: {
        styleOverrides: {
          root: {
            textAlign: direction === 'rtl' ? 'right' : 'left'
          }
        }
      }
    }
  })
}
```

**File**: `src/App.tsx` (MODIFY)

```typescript
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'
import { ThemeProvider } from '@mui/material/styles'
import { createRTLTheme } from './theme/rtl'

// Create RTL cache
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
})

// Create LTR cache
const cacheLtr = createCache({
  key: 'muiltr',
})

function App() {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  
  const cache = isRTL ? cacheRtl : cacheLtr
  const theme = createRTLTheme(isRTL ? 'rtl' : 'ltr')
  
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          {/* App content */}
        </div>
      </ThemeProvider>
    </CacheProvider>
  )
}
```

### 8.2 CSS Logical Properties

**Use logical properties for RTL-safe styling:**

```css
/* WRONG: Fixed directional properties */
.element {
  margin-left: 16px;
  padding-right: 8px;
  text-align: left;
}

/* CORRECT: Logical properties */
.element {
  margin-inline-start: 16px;
  padding-inline-end: 8px;
  text-align: start;
}
```

### 8.3 Number Formatting in RTL

**Keep numbers LTR even in RTL context:**

```typescript
// Component for number display
export const NumberDisplay: React.FC<{ value: number }> = ({ value }) => {
  return (
    <span dir="ltr" style={{ display: 'inline-block' }}>
      {value.toFixed(2)}
    </span>
  )
}

// In modal and tables:
<TableCell>
  <NumberDisplay value={item.total_amount} />
</TableCell>
```

### 8.4 Icon Mirroring

**Some icons should mirror in RTL, others should not:**

```typescript
// Icons that should mirror in RTL:
// - Arrows (forward/back)
// - Chevrons
// - Navigation icons

// Icons that should NOT mirror:
// - Numbers
// - Calculators
// - Locks
// - Most action icons

// Implementation:
import { makeStyles } from '@mui/styles'

const useStyles = makeStyles((theme) => ({
  mirrorInRTL: {
    transform: theme.direction === 'rtl' ? 'scaleX(-1)' : 'none'
  },
  noMirror: {
    transform: 'none'
  }
}))
```

### 8.5 Translation Keys

**Add to translation files:**

```json
// en.json
{
  "costAnalysis": {
    "title": "Cost Analysis",
    "lineInfo": "Line {{lineNumber}} - {{accountName}} ({{accountCode}})",
    "openModal": "Open Cost Analysis",
    "addItem": "Add Item",
    "shortcuts": "Shortcuts",
    "approvedLocked": "This line is approved and locked",
    "itemCount": "{{count}} items"
  },
  "approval": {
    "status": {
      "draft": "Draft",
      "pending": "Pending",
      "approved": "Approved",
      "rejected": "Rejected"
    }
  },
  "common": {
    "save": "Save",
    "saving": "Saving...",
    "close": "Close",
    "unsavedChanges": "Unsaved Changes"
  }
}

// ar.json
{
  "costAnalysis": {
    "title": "تحليل التكلفة",
    "lineInfo": "السطر {{lineNumber}} - {{accountName}} ({{accountCode}})",
    "openModal": "فتح تحليل التكلفة",
    "addItem": "إضافة بند",
    "shortcuts": "الاختصارات",
    "approvedLocked": "هذا السطر معتمد ومغلق",
    "itemCount": "{{count}} بنود"
  },
  "approval": {
    "status": {
      "draft": "مسودة",
      "pending": "قيد المراجعة",
      "approved": "معتمد",
      "rejected": "مرفوض"
    }
  },
  "common": {
    "save": "حفظ",
    "saving": "جاري الحفظ...",
    "close": "إغلاق",
    "unsavedChanges": "تغييرات غير محفوظة"
  }
}
```

---

## 9. Testing Strategy

### 9.1 Test Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /  (5)  \
                /──────────\
               /            \
              / Integration  \
             /      (15)      \
            /──────────────────\
           /                    \
          /    Component (30)    \
         /                        \
        /──────────────────────────\
       /                            \
      /         Unit (50)            \
     /________________________________\
```

### 9.2 Unit Tests (50 tests)

**Service Layer Tests** (`transaction-line-items.test.ts`):

```typescript
describe('transaction-line-items service', () => {
  describe('getLineItems', () => {
    test('should fetch items with catalog data', async () => {})
    test('should return empty array when no items', async () => {})
    test('should throw error on database failure', async () => {})
  })
  
  describe('canEditTransactionLine', () => {
    test('should return true for draft status', async () => {})
    test('should return true for pending status', async () => {})
    test('should return false for approved status', async () => {})
    test('should return false for rejected status', async () => {})
    test('should include reason when not editable', async () => {})
  })
  
  describe('replaceLineItems', () => {
    test('should save items atomically', async () => {})
    test('should renumber items sequentially', async () => {})
    test('should throw error if line approved', async () => {})
    test('should return correct summary', async () => {})
  })
  
  describe('calculateTotals', () => {
    test('should calculate base amount correctly', () => {
      const items = [
        { quantity: 10, percentage: 100, unit_price: 100, 
          addition_percentage: null, deduction_percentage: null }
      ]
      const result = calculateTotals(items)
      expect(result.base_amount).toBe(1000)
    })
    
    test('should include additions in net amount', () => {})
    test('should subtract deductions from net amount', () => {})
    test('should handle multiple items', () => {})
    test('should handle percentage < 100', () => {})
    test('should handle decimal quantities', () => {})
  })
  
  describe('validateLineItem', () => {
    test('should reject negative quantity', () => {})
    test('should reject percentage > 999.99', () => {})
    test('should reject negative unit price', () => {})
    test('should accept valid data', () => {})
  })
})
```

**Calculation Tests**:

```typescript
describe('Cost calculation accuracy', () => {
  const scenarios = [
    {
      name: 'Basic calculation',
      input: { qty: 10, pct: 100, price: 100, add: null, ded: null },
      expected: { total: 1000, net: 1000 }
    },
    {
      name: 'With 10% addition',
      input: { qty: 10, pct: 100, price: 100, add: 10, ded: null },
      expected: { total: 1000, net: 1100 }
    },
    {
      name: 'With 5% deduction',
      input: { qty: 10, pct: 100, price: 100, add: null, ded: 5 },
      expected: { total: 1000, net: 950 }
    },
    {
      name: 'With both addition and deduction',
      input: { qty: 10, pct: 100, price: 100, add: 10, ded: 5 },
      expected: { total: 1000, net: 1050 }
    },
    {
      name: 'Partial percentage',
      input: { qty: 5, pct: 50, price: 200, add: null, ded: null },
      expected: { total: 500, net: 500 }
    },
    {
      name: 'Decimal quantities',
      input: { qty: 2.5, pct: 100, price: 40, add: null, ded: null },
      expected: { total: 100, net: 100 }
    }
  ]
  
  scenarios.forEach(scenario => {
    test(scenario.name, () => {
      const item = createTestItem(scenario.input)
      const result = calculateTotals([item])
      expect(result.base_amount).toBeCloseTo(scenario.expected.total, 2)
      expect(result.net_amount).toBeCloseTo(scenario.expected.net, 2)
    })
  })
})
```

### 9.3 Component Tests (30 tests)

**Modal Component Tests**:

```typescript
describe('CostAnalysisModal', () => {
  test('should render with correct title', () => {})
  test('should display approval status', () => {})
  test('should load existing items on open', () => {})
  test('should disable editing when approved', () => {})
  test('should calculate totals in real-time', () => {})
  test('should detect unsaved changes', () => {})
  test('should show confirmation on close with changes', () => {})
  test('should persist modal size to localStorage', () => {})
  test('should support keyboard shortcut Ctrl+S', () => {})
  test('should support keyboard shortcut Ctrl+N', () => {})
  test('should support keyboard shortcut ESC', () => {})
  test('should display error messages', () => {})
  test('should show loading state', () => {})
  test('should render in RTL for Arabic', () => {})
})
```

**ItemsTable Tests**:

```typescript
describe('ItemsTable', () => {
  test('should render items in correct order', () => {})
  test('should support drag-and-drop reordering', () => {})
  test('should expand/collapse addition panel', () => {})
  test('should call onUpdateItem on field change', () => {})
  test('should call onDeleteItem on delete click', () => {})
  test('should disable actions when not editable', () => {})
  test('should display calculated amounts', () => {})
})
```

### 9.4 Integration Tests (15 tests)

**Modal Integration with Wizard**:

```typescript
describe('Cost Analysis integration with TransactionWizard', () => {
  test('should open modal when button clicked', () => {})
  test('should pass correct line data to modal', () => {})
  test('should update badge count after save', () => {})
  test('should close modal after successful save', () => {})
  test('should disable button for lines without account', () => {})
  test('should disable button for approved lines', () => {})
  test('should maintain wizard state when modal closes', () => {})
})
```

**Database Integration**:

```typescript
describe('Database integration', () => {
  test('should enforce RLS policies', async () => {})
  test('should cascade delete items when line deleted', async () => {})
  test('should trigger calculations on insert', async () => {})
  test('should prevent editing approved lines', async () => {})
  test('should handle concurrent edits', async () => {})
})
```

### 9.5 E2E Tests (5 tests)

**Critical User Flows**:

```typescript
describe('Cost Analysis E2E', () => {
  test('Complete flow: Add items, save, reopen, verify', async () => {
    // 1. Create transaction
    // 2. Add line with account
    // 3. Open cost analysis
    // 4. Add 3 items with different calculations
    // 5. Save and close
    // 6. Verify badge shows "3"
    // 7. Reopen modal
    // 8. Verify items persisted correctly
  })
  
  test('Approval workflow: Draft → Approved → Read-only', async () => {
    // 1. Create transaction with cost analysis
    // 2. Submit for approval
    // 3. Approve transaction
    // 4. Reopen cost analysis
    // 5. Verify modal is read-only
    // 6. Verify save button disabled
  })
  
  test('Offline sync: Edit offline, sync when online', async () => {
    // 1. Go offline
    // 2. Edit cost analysis
    // 3. Save changes
    // 4. Go online
    // 5. Verify sync completes
    // 6. Verify data matches
  })
  
  test('RTL layout: Switch language, verify layout', async () => {
    // 1. Open cost analysis in English
    // 2. Switch to Arabic
    // 3. Verify RTL layout
    // 4. Verify numbers stay LTR
    // 5. Edit item
    // 6. Verify calculations correct
  })
  
  test('Unsaved changes: Edit, close, discard', async () => {
    // 1. Open cost analysis
    // 2. Add item
    // 3. Click close
    // 4. Verify warning dialog
    // 5. Click discard
    // 6. Verify modal closes
    // 7. Reopen
    // 8. Verify changes not saved
  })
})
```

### 9.6 Performance Tests

```typescript
describe('Performance benchmarks', () => {
  test('Modal should open in < 500ms', async () => {})
  test('Should handle 100 items without lag', async () => {})
  test('Calculation should update in < 100ms', async () => {})
  test('Save operation should complete in < 2s', async () => {})
  test('Catalog search should return in < 300ms', async () => {})
})
```

### 9.7 Accessibility Tests

```typescript
describe('Accessibility (WCAG 2.1 AA)', () => {
  test('should have no axe violations', async () => {})
  test('should support keyboard navigation', () => {})
  test('should have proper ARIA labels', () => {})
  test('should announce dynamic changes to screen readers', () => {})
  test('should maintain focus management', () => {})
  test('should have sufficient color contrast', () => {})
})
```

---

## 10. Implementation Timeline

### Revised Timeline (Realistic Estimate)

| Phase | Tasks | Duration | Resources | Dependencies |
|-------|-------|----------|-----------|--------------|
| **Phase 1: Database** | Functions, RLS policies, testing | **3 days** | 1 Backend Dev | None |
| **Phase 2: Service Layer** | transaction-line-items.ts + tests | **6-7 days** | 1 Frontend Dev | Phase 1 complete |
| **Phase 3: Modal Components** | All sub-components + styling | **8-10 days** | 1 Frontend Dev | Phase 2 complete |
| **Phase 4: Integration** | Wizard modifications + testing | **5-6 days** | 1 Frontend Dev | Phase 3 complete |
| **Phase 5: RTL Support** | Theme, CSS, translations | **3-4 days** | 1 Frontend Dev | Phase 4 complete |
| **Phase 6: Testing** | Unit, Integration, E2E, Performance | **10-12 days** | 1 QA Engineer | Phase 5 complete |
| **Phase 7: Documentation** | User guide, API docs, training | **3-4 days** | 1 Tech Writer | Phase 6 complete |
| **TOTAL** | | **38-46 days** | | |
| **Buffer (20%)** | | **+8-9 days** | | |
| **FINAL ESTIMATE** | | **46-55 days (9-11 weeks)** | | |

### Weekly Milestones

**Week 1**:
- ✅ Database functions created
- ✅ RLS policies implemented
- ✅ Service layer foundation complete

**Week 2**:
- ✅ All service functions implemented
- ✅ Service layer tests passing
- ✅ Modal component structure created

**Week 3-4**:
- ✅ All modal sub-components complete
- ✅ Drag-drop working
- ✅ Real-time calculations working

**Week 5**:
- ✅ TransactionWizard integration complete
- ✅ Badge display working
- ✅ Modal opening/closing tested

**Week 6**:
- ✅ RTL support implemented
- ✅ Arabic translations added
- ✅ Layout verified in both directions

**Week 7-8**:
- ✅ All unit tests passing
- ✅ Integration tests passing
- ✅ E2E tests passing
- ✅ Performance benchmarks met

**Week 9**:
- ✅ User documentation complete
- ✅ API documentation complete
- ✅ Training materials ready
- ✅ Feature ready for deployment

---

## 11. Quality Assurance

### 11.1 Code Quality Standards

**ESLint Rules**:
```json
{
  "rules": {
    "no-console": ["warn", { "allow": ["error", "warn"] }],
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**TypeScript Strict Mode**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 11.2 Performance Budget

| Metric | Target | Maximum |
|--------|--------|---------|
| **Modal Open Time** | < 300ms | 500ms |
| **Calculation Update** | < 50ms | 100ms |
| **Save Operation** | < 1s | 2s |
| **Catalog Search** | < 200ms | 300ms |
| **Bundle Size (gzipped)** | < 50KB | 75KB |
| **Items Before Pagination** | 50 | 100 |

### 11.3 Security Checklist

- [ ] RLS policies enforce org_id scoping
- [ ] Approval status checked before updates
- [ ] Input validation on client and server
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React auto-escaping)
- [ ] CSRF protection (Supabase handles)
- [ ] Rate limiting on API calls
- [ ] Audit logging for all changes

### 11.4 Accessibility Checklist (WCAG 2.1 AA)

- [ ] Keyboard navigation works for all actions
- [ ] Focus indicators visible
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] ARIA labels on all interactive elements
- [ ] Screen reader announcements for dynamic content
- [ ] Form labels properly associated with inputs
- [ ] Error messages announced and visible
- [ ] Modal traps focus correctly
- [ ] ESC key closes modal

### 11.5 Browser Compatibility

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | Latest 2 versions | ✅ Full support |
| Firefox | Latest 2 versions | ✅ Full support |
| Safari | Latest 2 versions | ✅ Full support |
| Edge | Latest 2 versions | ✅ Full support |
| Mobile Safari (iOS) | iOS 14+ | ✅ Full support |
| Chrome Mobile (Android) | Android 10+ | ✅ Full support |

---

## 12. Next Steps

### 12.1 Immediate Actions

**For AI Agent**:
1. ✅ Review this consultant document
2. 🔄 Adjust requirements document based on decisions
3. 🔄 Update engineering plan with resolved issues
4. 🔄 Incorporate missing phases (Database, RTL, Testing details)
5. ✅ Proceed to Phase 1 implementation

**For Development Team**:
1. Set up development environment
2. Create feature branch: `feature/cost-analysis-modal`
3. Begin Phase 1 (Database functions)
4. Schedule daily standups for coordination

### 12.2 Phase 1 Implementation (Week 1)

**Tasks**:
1. Create database migration file
2. Implement `can_edit_transaction_line()` function
3. Implement `replace_line_items_atomic()` function
4. Add RLS policies for transaction_line_items
5. Test functions with SQL scripts
6. Document database changes

**Deliverables**:
- Migration script
- Function documentation
- Test SQL scripts
- RLS policy verification

### 12.3 Risk Mitigation Plan

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Performance issues with large catalogs** | Medium | High | Implement pagination, lazy loading, indexing |
| **Offline sync conflicts** | Low | High | Use existing manual merge, add conflict UI |
| **RTL layout bugs** | Medium | Medium | Dedicated RTL testing, Arabic QA reviewer |
| **Calculation rounding errors** | Low | Medium | Use consistent decimal precision, unit tests |
| **Browser compatibility** | Low | Medium | Cross-browser testing in CI/CD |

### 12.4 Success Criteria

**Feature is considered complete when**:
- ✅ All 100+ tests passing
- ✅ Code review approved
- ✅ Performance benchmarks met
- ✅ Accessibility audit passed
- ✅ Security review approved
- ✅ Documentation complete
- ✅ User acceptance testing passed
- ✅ No critical or high-severity bugs

### 12.5 Deployment Strategy

**Phased Rollout**:
1. **Internal Testing** (Week 9): Development team only
2. **Beta Users** (Week 10): 5-10 power users
3. **Soft Launch** (Week 11): 25% of user base
4. **Full Rollout** (Week 12): All users

**Rollback Plan**:
- Feature flag: `enable_cost_analysis_modal`
- Can be disabled instantly via admin panel
- Database changes are backward compatible
- No data migration needed (new feature only)

---

## 13. Appendix

### 13.1 Glossary

| Term | Definition |
|------|------------|
| **Transaction Line** | A single accounting entry (debit or credit) in a transaction |
| **Line Item** | A catalog entry representing a product, service, or cost element |
| **Transaction Line Item** | A detailed breakdown of a transaction line using catalog items |
| **Cost Analysis** | The process of breaking down a transaction line into detailed items |
| **Total Amount** | Base calculated amount (quantity × percentage × unit_price) |
| **Net Amount** | Final amount after additions and deductions |
| **Addition** | Percentage-based increase to the base amount |
| **Deduction** | Percentage-based decrease from the base amount |
| **Approval Status** | Current state of transaction line (draft/pending/approved/rejected) |
| **RLS** | Row Level Security - database access control |
| **RTL** | Right-to-Left - layout direction for Arabic |

### 13.2 References

**Existing System Documentation**:
- Transaction Wizard Component
- Offline Sync Manager
- RLS Policy Standards
- Translation System
- Theme Configuration

**External Resources**:
- Material-UI Documentation: https://mui.com
- React Beautiful DnD: https://github.com/atlassian/react-beautiful-dnd
- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

### 13.3 Decision Log

| Date | Decision | Reason | Stakeholder |
|------|----------|--------|-------------|
| 2026-03-01 | Use Path B (Catalog-Based) | Better structured data | Product Owner |
| 2026-03-01 | Keep total_amount ≠ net_amount | Audit trail requirement | Engineering |
| 2026-03-01 | Store approval in transaction_lines | Existing system pattern | Engineering |
| 2026-03-01 | Manual merge for concurrency | Use proven infrastructure | Engineering |
| 2026-03-01 | Line-level audit only | Reduce complexity | Product Owner |
| 2026-03-01 | Full RTL support | Core user requirement | Product Owner |
| 2026-03-01 | No data migration | New feature only | Engineering |

---

## Document Control

**Version**: 1.0  
**Status**: ✅ **APPROVED FOR IMPLEMENTATION**  
**Date**: March 1, 2026  
**Prepared By**: Software Architecture Consultant  
**Reviewed By**: Pending (Head of Engineering, Product Owner, Technical Lead)  
**Next Review**: After Phase 1 completion  

**Approval Signatures**:
- [ ] Software Consultant: ✅ **APPROVED**
- [ ] Head of Engineering: Pending
- [ ] Product Owner: Pending
- [ ] Technical Lead: Pending
- [ ] QA Lead: Pending

---

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-01 | Software Consultant | Initial consultant review and design phase document |

---

**END OF DOCUMENT**

**Next Document**: Updated Engineering Plan (to be created by AI Agent)