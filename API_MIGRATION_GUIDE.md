# API Migration Guide: transaction_id → transaction_line_id

## Overview
The `transaction_line_items` table has been migrated from a 2-level hierarchy to a proper 3-level hierarchy:

```
transactions
    ↓
transaction_lines (GL lines, new level)
    ↓
transaction_line_items (breakdown items)
```

## Breaking Changes

### 1. Foreign Key Structure
- **Old**: `transaction_line_items.transaction_id` → `transactions.id`
- **New**: `transaction_line_items.transaction_line_id` → `transaction_lines.id`
- The `transaction_id` column no longer exists in `transaction_line_items`

### 2. Service Changes

#### `TransactionLineItemsService`

**Deprecated Methods:**
- `listByTransaction(transactionId)` - Now throws error directing to `listByTransactionLine`

**Updated Methods:**
- `listByTransactionLine(transactionLineId)` - ✅ Use this
- `countByTransactionLine(transactionLineId)` - ✅ Use this
- `upsertMany(transactionLineId, items)` - ✅ Parameter renamed to `transactionLineId`

**Migration Example:**
```typescript
// OLD (no longer works)
const items = await transactionLineItemsService.listByTransaction(txId);

// NEW (correct)
const items = await transactionLineItemsService.listByTransactionLine(txLineId);
```

### 3. Component Updates Needed

#### `TransactionLineItemsSection`
- **Change prop**: `transactionId` → `transactionLineId`
- **Update call**: `upsertMany(transactionLineId, items)` instead of `upsertMany(transactionId, items)`

```typescript
// OLD
export interface TransactionLineItemsSectionProps {
  transactionId: string;  // ✗ No longer exists in DB
  orgId: string;
}

// NEW
export interface TransactionLineItemsSectionProps {
  transactionLineId: string;  // ✓ Correct FK
  orgId: string;
}
```

### 4. Enhanced Service (`transaction-line-items-enhanced.ts`)

All methods that previously accepted `transactionId` now accept `transactionLineId`:

- `getLineItemsTree(transactionLineId)` - scope by transaction line
- `getLineItemsList(transactionLineId)` - scope by transaction line  
- `getCodeSuggestion(transactionLineId, parentCode)` - scope by transaction line
- `createLineItem(transactionLineId, itemData)` - scope by transaction line
- All other CRUD operations

### 5. Querying Transaction Items

To get items for a **specific GL line**, use:
```typescript
const items = await transactionLineItemsService.listByTransactionLine(glLineId);
```

To get items for an **entire transaction** (all GL lines):
```typescript
// Query via transaction_lines first
const { data: glLines } = await supabase
  .from('transaction_lines')
  .select('id')
  .eq('transaction_id', txId);

// Then fetch items for each GL line
const allItems = [];
for (const gl of glLines) {
  const items = await transactionLineItemsService.listByTransactionLine(gl.id);
  allItems.push(...items);
}
```

Or use a direct query with a JOIN:
```typescript
const { data: items } = await supabase
  .from('transaction_line_items')
  .select(`
    *,
    transaction_lines!inner(
      id,
      transaction_id
    )
  `)
  .eq('transaction_lines.transaction_id', txId);
```

## Reporting & Views

The view `v_transaction_line_items_with_transaction_id` provides the transaction ID:
```typescript
const { data: items } = await supabase
  .from('v_transaction_line_items_with_transaction_id')
  .select('*')
  .eq('transaction_id', txId);  // transaction_id available via JOIN
```

## Data Migration Notes

- ✅ Triggers automatically update `transactions.line_items_total`, `line_items_count`, and `has_line_items`
- ✅ Total amounts calculated via `total_amount = quantity * unit_price * (percentage/100) - discount + tax`
- ✅ Tree hierarchy maintained via `path`, `level`, `parent_id` columns
- ⚠️  Ensure all UI components pass `transaction_line_id` not `transaction_id`

## Testing Checklist

- [ ] Insert transaction_line_item with `transaction_line_id` FK
- [ ] Verify trigger updates transaction totals
- [ ] Load items via `listByTransactionLine()`
- [ ] Upsert items with correct `transactionLineId` parameter
- [ ] Verify view returns items with calculated `transaction_id`
- [ ] Test tree operations with proper scoping
