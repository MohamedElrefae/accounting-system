# Schema Cleanup Analysis: Remove Duplication

## Current Issue
`transaction_line_items` has merged columns from `line_items` (catalog table). These should be in `line_items` only.

---

## Columns to REMOVE from transaction_line_items

### Catalog/Template Data (Should reference line_items, not store)
- ❌ `item_code` (1) - Query from line_items join
- ❌ `item_name` - Query from line_items join
- ❌ `item_name_ar` - Query from line_items join
- ❌ `line_item_id` - Replace with FK to line_items.id

### Hierarchy Structure (Belongs in line_items only)
- ❌ `parent_id` (2) - Line_items table manages hierarchy
- ❌ `level` (3) - Calculated by line_items trigger
- ❌ `path` (4) - Calculated by line_items trigger
- ❌ `is_selectable` (5) - Property of line_items catalog

### Item Metadata (Belongs in line_items)
- ❌ `item_type` (6) - Catalog property
- ❌ `specifications` (7) - Catalog property
- ❌ `standard_cost` (7) - Catalog property
- ❌ `is_active` (8) - Catalog property

### Ordering/Positioning
- ❌ `position` (9) - Catalog ordering, not transaction ordering

### Descriptions
- ❌ `description` - Why nullable? Belongs in line_items
- ❌ `description_ar` - Why nullable? Belongs in line_items

---

## Columns That SHOULD Stay

| Column | Reason | Type |
|--------|--------|------|
| `id` | Unique identifier | PK |
| `transaction_line_id` | Link to GL line | FK |
| `line_number` | Order within GL line | Meta |
| `quantity` | What the buyer ordered | Transaction-specific |
| `percentage` | Discount/markup % | Transaction-specific |
| `unit_price` | Price paid (may differ from catalog) | Transaction-specific |
| `unit_of_measure` | How it's measured (may override) | Transaction-specific |
| `total_amount` | Calculated total | Derived |
| `analysis_work_item_id` | Cost object for this item | Transaction-specific |
| `sub_tree_id` | Cost center override | Transaction-specific |
| `org_id` | Which organization | Meta |
| `created_at` | Audit | Meta |
| `updated_at` | Audit | Meta |

---

## Correct Design Pattern

### line_items (Catalog Template)
```
id, code, name, name_ar, parent_id, level, path, 
is_selectable, item_type, specifications, 
base_unit_of_measure, standard_cost, is_active, 
org_id, created_at, updated_at
```

### transaction_line_items (Transaction Instance)
```
id, transaction_line_id, line_number, 
quantity, percentage, unit_price, unit_of_measure,
total_amount (GENERATED),
analysis_work_item_id, sub_tree_id,
org_id, created_at, updated_at
```

**Access catalog data via JOIN:**
```sql
SELECT 
  tli.*,
  li.item_code,
  li.item_name,
  li.specifications,
  li.standard_cost
FROM transaction_line_items tli
LEFT JOIN line_items li ON li.id = tli.line_item_id
```

---

## Why These Were Duplicated

### Legacy Merge History
1. Originally: `line_items` (catalog)
2. Merge attempt: Combined into `transaction_line_items`
3. Issue: Lost hierarchy on transactions
4. Revert: Split back into two tables
5. **Current state**: Half-cleaned (columns not removed)

---

## Migration SQL

### Step 1: Remove Duplicate Columns
```sql
ALTER TABLE transaction_line_items
DROP COLUMN IF EXISTS item_code,
DROP COLUMN IF EXISTS item_name,
DROP COLUMN IF EXISTS item_name_ar,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS description_ar,
DROP COLUMN IF EXISTS parent_id,
DROP COLUMN IF EXISTS level,
DROP COLUMN IF EXISTS path,
DROP COLUMN IF EXISTS is_selectable,
DROP COLUMN IF EXISTS item_type,
DROP COLUMN IF EXISTS specifications,
DROP COLUMN IF EXISTS standard_cost,
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS position;
```

### Step 2: Add Correct FK to line_items
```sql
-- Rename line_item_id to match convention
ALTER TABLE transaction_line_items
RENAME COLUMN line_item_id TO line_item_catalog_id;

-- Add FK constraint
ALTER TABLE transaction_line_items
ADD CONSTRAINT fk_tli_line_item 
FOREIGN KEY (line_item_catalog_id) 
REFERENCES line_items(id) ON DELETE SET NULL;
```

### Step 3: Create Updated View
```sql
CREATE OR REPLACE VIEW v_transaction_line_items_full AS
SELECT 
  tli.*,
  tl.transaction_id,
  li.code as item_code,
  li.name as item_name,
  li.name_ar,
  li.specifications,
  li.standard_cost,
  li.is_selectable
FROM transaction_line_items tli
JOIN transaction_lines tl ON tli.transaction_line_id = tl.id
LEFT JOIN line_items li ON tli.line_item_catalog_id = li.id;
```

---

## Why These Patterns Exist

### Nullable Columns (description, description_ar)
**Bad practice** - Should be:
- Either NOT NULL with default
- Or removed entirely and queried from catalog

### Why analysis_work_item_id and sub_tree_id Stay
- **Transaction-specific**: The user may assign different cost objects per line
- **Not in catalog**: This is a runtime assignment, not a template property

### Why line_item_id vs item_code
- `line_item_id`: FK to line_items table (correct)
- `item_code`: Denormalized from line_items (redundant)

---

## Recommended Action

### Option A: Clean Separation (Recommended)
Remove all duplicate columns, force JOINs to get full data.
- ✅ Single source of truth
- ✅ Proper normalization
- ✅ No data duplication

### Option B: Controlled Denormalization
Keep only high-frequency fields (item_code, item_name) for performance.
- ⚠️ Must sync on updates
- ⚠️ Requires triggers
- ✅ Faster queries without JOIN

### Decision
**Go with Option A** - Clean separation. Use views for convenience.

---

## Files to Update

1. Database schema: Remove columns
2. Triggers: May need adjustment
3. Views: Add unified view
4. API: Update to use views/joins
5. Components: No change needed (already using service layer)
