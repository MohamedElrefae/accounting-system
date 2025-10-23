# ✅ FIX: line_item_catalog_id Not Saving

## Problem

When you select a material from the catalog dropdown in TransactionAnalysisModal:
- ✅ Material details (code, name, price) save correctly
- ❌ `line_item_catalog_id` stays NULL in the database

## Root Cause

The code was extracting material properties (code, name, price) but **NOT** storing the reference to the catalog item (`line_item_catalog_id`).

### Schema Architecture
```
line_items (catalog)                transaction_line_items (transactions)
├── id ✅ primary key              ├── id
├── code                           ├── line_item_catalog_id ← FK to line_items.id
├── name                           ├── item_code (display only, denormalized)
├── name_ar                        ├── item_name (display only, denormalized)
├── base_unit_of_measure           ├── unit_of_measure
├── standard_cost                  └── ... other transaction fields
└── ... catalog fields
```

**Key Point:** `line_items.id` is the source of truth. When you select a catalog item, you MUST store its ID in `line_item_catalog_id`.

## Solution

### Change 1: Add `line_item_catalog_id` when adding from catalog dropdown

**File:** `src/components/Transactions/TransactionAnalysisModal.tsx` (Line 1765-1771)

**Before:**
```typescript
updateLineItem(index, {
  item_code: catalogItem.item_code,
  item_name: catalogItem.item_name,
  item_name_ar: catalogItem.item_name_ar,
  unit_price: catalogItem.unit_price || 0,
  unit_of_measure: catalogItem.unit_of_measure || 'piece',
})
```

**After:**
```typescript
updateLineItem(index, {
  line_item_catalog_id: catalogItem.id,  // ✅ ADD THIS
  item_code: catalogItem.item_code,
  item_name: catalogItem.item_name,
  item_name_ar: catalogItem.item_name_ar,
  unit_price: catalogItem.unit_price || 0,
  unit_of_measure: catalogItem.unit_of_measure || 'piece',
})
```

### Change 2: Add `line_item_catalog_id` when adding new item from catalog selector

**File:** `src/components/Transactions/TransactionAnalysisModal.tsx` (Line 996-997)

**Before:**
```typescript
const newItem: TransactionLineItem = {
  transaction_id: transactionId!,
  transaction_line_id: transactionLineId || undefined,
  line_number: lineItems.length + 1,
  item_code: catalogItem.item_code,
  ...
}
```

**After:**
```typescript
const newItem: TransactionLineItem = {
  transaction_id: transactionId!,
  transaction_line_id: transactionLineId || undefined,
  line_number: lineItems.length + 1,
  line_item_catalog_id: catalogItem.id,  // ✅ ADD THIS
  item_code: catalogItem.item_code,
  ...
}
```

## How It Works Now

1. User clicks catalog dropdown → selects a material
2. `catalogItem.id` (from `line_items` table) is now saved
3. Call `updateLineItem(index, { line_item_catalog_id: catalogItem.id, ...})`
4. Item saves with both:
   - ✅ `line_item_catalog_id` → links to `line_items` catalog
   - ✅ `item_code`, `item_name`, etc. → denormalized display fields
5. User clicks "Save Changes" → `upsertLineItems()` persists to database
6. Database now has `line_item_catalog_id` populated correctly

## Data Flow

```
Catalog Selection (line_items table)
         ↓
   catalogItem.id = "abc123"
         ↓
   updateLineItem(index, {
     line_item_catalog_id: "abc123",  ✅
     item_code: "MAT001",
     item_name: "Steel Plate",
     ...
   })
         ↓
   setLineItems() updates state
         ↓
   User clicks "Save Changes"
         ↓
   upsertLineItems(transactionId, lineItems)
         ↓
   INSERT/UPDATE transaction_line_items WITH line_item_catalog_id
         ↓
   Database: line_item_catalog_id = "abc123" ✅
```

## Testing Checklist

- [ ] Open transaction modal
- [ ] Select a catalog item from dropdown
- [ ] Check database: `SELECT line_item_catalog_id FROM transaction_line_items WHERE id = 'YOUR_ID'`
- [ ] ✅ Should show the catalog item ID (not NULL)
- [ ] Click another item dropdown
- [ ] Verify it also gets the correct `line_item_catalog_id`
- [ ] Add multiple items
- [ ] Each should have its own `line_item_catalog_id` pointing to `line_items` table

## Query to Verify

```sql
SELECT 
  tli.id,
  tli.item_code,
  tli.item_name_ar,
  tli.line_item_catalog_id,
  li.code as catalog_code,
  li.name as catalog_name
FROM transaction_line_items tli
LEFT JOIN line_items li ON li.id = tli.line_item_catalog_id
ORDER BY tli.line_number;
```

Expected result: `line_item_catalog_id` is NOT NULL, and joins to correct `line_items` record.

## Impact

- ✅ Materials now properly linked to catalog
- ✅ Can track which catalog item was used for each transaction line
- ✅ Enables reporting by catalog material
- ✅ Proper data referential integrity maintained

## Files Changed

| File | Line | Change |
|------|------|--------|
| `src/components/Transactions/TransactionAnalysisModal.tsx` | 1766 | Add `line_item_catalog_id: catalogItem.id` |
| `src/components/Transactions/TransactionAnalysisModal.tsx` | 997 | Add `line_item_catalog_id: catalogItem.id` |

## Status: FIXED ✅

Materials now save with proper catalog reference in database!
