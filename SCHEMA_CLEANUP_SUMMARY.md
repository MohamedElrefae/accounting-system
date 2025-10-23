# Schema Cleanup Summary: Remove Merged Columns

## Problem Identified ✓

`transaction_line_items` table contains duplicate columns from the `line_items` (catalog) table due to incomplete cleanup after reverting a merge operation.

---

## Column Analysis: Why They Exist & Why They Must Go

### ❌ REMOVE (14 Columns)

#### Catalog Template Data
| Column | Current | Issue | Should Be |
|--------|---------|-------|-----------|
| `item_code` | VARCHAR(50) NULL | Duplicate of line_items.code | Query from line_items via JOIN |
| `item_name` | VARCHAR(255) NULL | Duplicate of line_items.name | Query from line_items via JOIN |
| `item_name_ar` | VARCHAR(255) NULL | Duplicate of line_items.name_ar | Query from line_items via JOIN |
| `description` | TEXT NULL | **Why nullable?** Belongs in line_items | Move to line_items or remove |
| `description_ar` | TEXT NULL | **Why nullable?** Belongs in line_items | Move to line_items or remove |

#### Hierarchy Management
| Column | Current | Issue | Should Be |
|--------|---------|-------|-----------|
| `parent_id` (2) | UUID NULL | Hierarchy belongs in line_items | Query from line_items via JOIN |
| `level` (3) | INT NULL | Calculated by line_items trigger | Query from line_items via JOIN |
| `path` (4) | TEXT NULL | Calculated by line_items trigger | Query from line_items via JOIN |
| `is_selectable` (5) | BOOL NULL | Catalog property | Query from line_items via JOIN |

#### Item Metadata
| Column | Current | Issue | Should Be |
|--------|---------|-------|-----------|
| `item_type` (6) | item_type_enum NULL | Catalog property | Query from line_items via JOIN |
| `specifications` (7) | JSONB NULL | Catalog property | Query from line_items via JOIN |
| `standard_cost` (7) | NUMERIC NULL | Catalog pricing, not transaction price | Query from line_items via JOIN |
| `is_active` (8) | BOOL NULL DEFAULT true | Catalog status | Query from line_items via JOIN |
| `position` (9) | INT NULL | Catalog ordering (not transaction ordering) | Remove entirely |

---

## ✅ KEEP (13 Columns)

| Column | Why Keep | Type |
|--------|----------|------|
| `id` | Unique identifier for this item in this transaction | PK |
| `transaction_line_id` | Link to GL line (transaction_lines.id) | FK |
| `line_number` | Order within GL line (1, 2, 3...) | Meta |
| `quantity` | **Transaction-specific**: What customer ordered | Value |
| `percentage` | **Transaction-specific**: Discount/markup % | Value |
| `unit_price` | **Transaction-specific**: Price customer paid (may differ from catalog standard_cost) | Value |
| `unit_of_measure` | May override catalog base_unit_of_measure per transaction | Value |
| `total_amount` | GENERATED ALWAYS (qty × price × pct - disc + tax) | Derived |
| `analysis_work_item_id` | **Transaction-specific**: Runtime cost object assignment (not in catalog) | FK |
| `sub_tree_id` | **Transaction-specific**: Runtime cost center (not in catalog) | FK |
| `org_id` | Which organization owns this item | Meta |
| `created_at` | Audit trail | Timestamp |
| `updated_at` | Audit trail | Timestamp |

---

## Key Insight: Transaction vs Catalog

### line_items (Catalog Template) - MASTER
```
Code: "ITEM-001"
Name: "Widget"
Standard Cost: $50
Is Active: true
Hierarchy: Level 2, Parent: "CATEGORY-001"
```

### transaction_line_items (Transaction Instance) - REFERENCE
```
Quantity Ordered: 5
Unit Price: $45 (negotiated, differs from standard $50)
Percentage: 90% (special discount)
Total: 5 × $45 × 0.9 = $202.50
References Catalog Item: "ITEM-001"
```

**Pattern**: Transaction uses catalog as reference, not duplicate

---

## Why These Patterns Emerged

### Merge History
1. **v1**: Separate tables (line_items, transaction_line_items)
2. **v2 (Attempted merge)**: Combined into single table
   - Worked: Simplified queries
   - Failed: Lost transaction hierarchy & GL line separation
3. **v3 (Revert)**: Split back into two tables
   - Fixed: Restored proper hierarchy
   - Incomplete: Columns not removed from transaction_line_items
4. **Current state**: Half-cleaned schema (THIS ISSUE)

### Why `line_item_id` Exists
- **Correct**: It's a FK to `line_items` (catalog)
- **Rename needed**: To `line_item_catalog_id` for clarity (FK naming convention)
- **Difference from item_code**: `item_code` is the denormalized string, `line_item_id` is the relationship

---

## Migration Path

### Step 1: Backup
```sql
CREATE TABLE transaction_line_items_backup AS 
SELECT * FROM transaction_line_items;
```

### Step 2: Run Cleanup Script
```bash
psql -U postgres -d accounting_db -f CLEANUP_SCHEMA.sql
```

### Step 3: Verify
```sql
-- Should show ~13 columns, not ~30
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'transaction_line_items';
```

### Step 4: Test View
```sql
SELECT * FROM v_transaction_line_items_full LIMIT 1;
```

### Step 5: Update API if Needed
If any API queries directly referenced removed columns, update to use view.

---

## Query Patterns After Cleanup

### Before (No longer works)
```sql
SELECT tli.item_code, tli.item_name, tli.quantity
FROM transaction_line_items tli
WHERE tli.id = 'xxx';
-- ❌ item_code, item_name don't exist
```

### After (Correct)
```sql
-- Option 1: Use view (recommended)
SELECT item_code, item_name, quantity
FROM v_transaction_line_items_full
WHERE id = 'xxx';

-- Option 2: Manual JOIN
SELECT li.code, li.name, tli.quantity
FROM transaction_line_items tli
LEFT JOIN line_items li ON tli.line_item_catalog_id = li.id
WHERE tli.id = 'xxx';
```

---

## Performance Impact

### Storage
- **Before**: 30 columns with duplicated text
- **After**: 13 columns, cleaner
- **Savings**: ~40% reduction in row size

### Queries
- **Before**: Fast simple queries (no JOIN needed)
- **After**: Slightly slower (JOIN required), but more flexible
- **Mitigation**: View handles JOIN automatically

---

## Files Involved

| File | Action |
|------|--------|
| `CLEANUP_SCHEMA.sql` | Database migration script |
| `SCHEMA_CLEANUP_ANALYSIS.md` | This analysis document |
| `src/services/transaction-line-items.ts` | May need API updates |
| Other services | Check for hard-coded column references |

---

## Checklist Before Deploy

- [ ] Back up transaction_line_items table
- [ ] Review CLEANUP_SCHEMA.sql for your environment
- [ ] Test on staging database first
- [ ] Search codebase for removed column references
- [ ] Update API queries to use view
- [ ] Test views return all expected data
- [ ] Deploy to production
- [ ] Verify application works with new schema

---

## Why This Matters

1. **Data Integrity**: Single source of truth (line_items maintains catalog)
2. **Consistency**: Catalog updates automatically reflected in reports
3. **Maintainability**: No duplicate column updates needed
4. **Normalization**: Proper relational design
5. **Performance**: Smaller row size, fewer columns to update

---

## Final Schema

```
transaction_line_items (CLEAN)
├── id (UUID PK)
├── transaction_line_id (UUID FK → transaction_lines)
├── line_item_catalog_id (UUID FK → line_items) [was line_item_id]
├── line_number (INT)
├── quantity (NUMERIC)
├── percentage (NUMERIC)
├── unit_price (NUMERIC)
├── unit_of_measure (VARCHAR)
├── total_amount (NUMERIC GENERATED)
├── analysis_work_item_id (UUID)
├── sub_tree_id (UUID)
├── org_id (UUID)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

PLUS: v_transaction_line_items_full (view with catalog data)
```

**Status: Ready to Clean** ✅
