# transaction_line_items Schema Reference

## ✅ Actual Database Columns

Based on the current database schema, `transaction_line_items` table contains:

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary Key |
| `transaction_line_id` | UUID | NO | - | Foreign Key to `transaction_lines` (CASCADE DELETE) |
| `line_number` | INTEGER | NO | 1 | Position within transaction line |
| `quantity` | NUMERIC(15,4) | NO | 1.0 | Must be >= 0 |
| `percentage` | NUMERIC(6,2) | NO | 100.00 | 0-999.99 range |
| `unit_price` | NUMERIC(15,4) | NO | 0.0 | Must be >= 0 |
| `unit_of_measure` | VARCHAR(50) | YES | 'piece' | Unit of measurement |
| `total_amount` | NUMERIC(15,4) | YES | - | **GENERATED ALWAYS** (qty * pct/100 * price) |
| `work_item_id` | UUID | YES | NULL | FK to `work_items` |
| `analysis_work_item_id` | UUID | YES | NULL | FK to `analysis_work_items` |
| `sub_tree_id` | UUID | YES | NULL | FK to `cost_centers` |
| `line_item_catalog_id` | UUID | YES | NULL | FK to `line_items` (catalog) |
| `org_id` | UUID | NO | - | Organization ID |
| `created_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |

## ⚠️ Columns That DO NOT EXIST

❌ `position` - **REMOVED** (was being added incorrectly)
❌ `item_code` - Not in transaction_line_items
❌ `item_name` - Not in transaction_line_items
❌ `item_name_ar` - Not in transaction_line_items
❌ `description` - Not in transaction_line_items

*These fields are for the `line_items` catalog table, not transaction line items.*

## 📋 TransactionLineItem Interface (Frontend)

```typescript
interface TransactionLineItem {
  id?: string
  transaction_id?: string // UI-only, not in DB
  transaction_line_id?: string
  line_number?: number
  quantity?: number
  percentage?: number
  unit_price?: number
  unit_of_measure?: string
  total_amount?: number
  
  // Cost Dimensions ✅
  work_item_id?: string | null
  analysis_work_item_id?: string | null
  sub_tree_id?: string | null
  
  // Catalog Reference
  line_item_catalog_id?: string | null
  
  // Metadata
  org_id?: string
  created_at?: string
  updated_at?: string
  
  // Catalog Item Details (when joined from line_items table)
  item_code?: string
  item_name?: string
  item_name_ar?: string
}
```

## 🔑 Foreign Keys

| FK | References | On Delete |
|----|-----------|-----------|
| `fk_tli_work_item` | `work_items(id)` | SET NULL |
| `fk_tli_analysis_work_item` | `analysis_work_items(id)` | SET NULL |
| `fk_tli_cost_center` | `cost_centers(id)` | SET NULL |
| `fk_tli_line_item_catalog` | `line_items(id)` | SET NULL |
| `fk_tli_transaction_line` | `transaction_lines(id)` | CASCADE |

## 📑 Indexes

```sql
-- Unique constraint
ux_tli_txline_line (transaction_line_id, line_number)

-- Single column indexes
idx_transaction_line_items_analysis_work_item_id (analysis_work_item_id)
idx_transaction_line_items_sub_tree_id (sub_tree_id)
idx_transaction_line_items_transaction_line_id (transaction_line_id)
idx_transaction_line_items_org_id (org_id)
idx_tli_work_item_id (work_item_id)
idx_tli_line_item (line_item_catalog_id)

-- Composite index for cost dimensions
idx_tli_cost_dimensions (work_item_id, analysis_work_item_id, sub_tree_id)
  WHERE work_item_id IS NOT NULL 
     OR analysis_work_item_id IS NOT NULL 
     OR sub_tree_id IS NOT NULL
```

## 🔐 Check Constraints

```sql
-- Quantity must be >= 0
transaction_line_items_quantity_check: quantity >= 0

-- Percentage must be 0-999.99
transaction_line_items_percentage_check: percentage >= 0 AND percentage <= 999.99

-- Unit price must be >= 0
transaction_line_items_unit_price_check: unit_price >= 0
```

## 🎯 Cost Dimension Columns (NEW)

These three columns enable cost tracking at the line item level:

1. **`work_item_id`** - Associates line with a work item
2. **`analysis_work_item_id`** - Associates line with an analysis work item
3. **`sub_tree_id`** - Associates line with a cost center

All are **nullable** and can be set independently.

## ✅ Fields to Use in Frontend

### When Inserting New Line Items:
```typescript
{
  transaction_line_id: string,      // Required
  line_number: number,              // Optional (defaults to next)
  quantity: number,                 // Optional (defaults to 1.0)
  percentage: number,               // Optional (defaults to 100.00)
  unit_price: number,               // Optional (defaults to 0.0)
  unit_of_measure: string,          // Optional (defaults to 'piece')
  work_item_id: string | null,      // Optional
  analysis_work_item_id: string | null,  // Optional
  sub_tree_id: string | null,       // Optional
  line_item_catalog_id: string | null,   // Optional
  org_id: string                    // Required
}
```

### When Updating:
```typescript
// Do NOT try to update:
// - id (read-only)
// - total_amount (generated always)
// - created_at (set once on insert)

// CAN update:
// - line_number
// - quantity
// - percentage
// - unit_price
// - unit_of_measure
// - work_item_id
// - analysis_work_item_id
// - sub_tree_id
// - line_item_catalog_id

// Automatically updated:
// - updated_at (set by trigger)
```

## 🚀 Services

### In `src/services/cost-analysis.ts`:

- `listLineItems(transactionId, transactionLineId?)` - Get all line items
- `upsertLineItems(transactionId, items, opts?)` - Insert or update items
- `bulkReplaceLineItems(transactionId, items, opts?)` - Replace all items
- `deleteLineItem(id)` - Delete single item

All services automatically handle:
- Field validation
- org_id resolution
- transaction_line_id defaults
- Timestamp management

## 🛑 IMPORTANT - Schema Cache Notes

**Schema Cache Issues Fixed:**
- ✅ Removed `position` column reference (doesn't exist)
- ✅ Confirmed all FK columns exist
- ✅ Verified all index columns exist
- ✅ Aligned frontend types with actual schema

**If getting "could not find column X" errors:**

1. Check this document for the column name
2. Verify it's in the table above
3. If NOT in the table, remove from frontend code
4. If IS in the table, run Supabase console to check actual schema
5. Update frontend TypeScript interfaces if needed

