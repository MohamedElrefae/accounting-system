-- ================================================================
-- SCHEMA CLEANUP: Remove duplicate columns from transaction_line_items
-- Restore proper separation between line_items (catalog) and 
-- transaction_line_items (transaction instance)
-- ================================================================

BEGIN;

-- Step 1: Identify current state
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items'
ORDER BY ordinal_position;

-- Step 2: Drop redundant columns that belong to line_items (catalog)
-- These should be queried via JOIN, not stored

ALTER TABLE transaction_line_items
DROP COLUMN IF EXISTS item_code CASCADE,
DROP COLUMN IF EXISTS item_name CASCADE,
DROP COLUMN IF EXISTS item_name_ar CASCADE,
DROP COLUMN IF EXISTS description CASCADE,
DROP COLUMN IF EXISTS description_ar CASCADE,
DROP COLUMN IF EXISTS parent_id CASCADE,
DROP COLUMN IF EXISTS level CASCADE,
DROP COLUMN IF EXISTS path CASCADE,
DROP COLUMN IF EXISTS is_selectable CASCADE,
DROP COLUMN IF EXISTS item_type CASCADE,
DROP COLUMN IF EXISTS specifications CASCADE,
DROP COLUMN IF EXISTS standard_cost CASCADE,
DROP COLUMN IF EXISTS is_active CASCADE,
DROP COLUMN IF EXISTS position CASCADE;

-- Step 3: Drop existing FK and triggers for line_item_id (will recreate properly)
ALTER TABLE transaction_line_items
DROP CONSTRAINT IF EXISTS fk_tli_line_item CASCADE;

-- Step 4: Rename line_item_id to follow FK naming convention
ALTER TABLE transaction_line_items
RENAME COLUMN line_item_id TO line_item_catalog_id;

-- Step 5: Add proper FK constraint to line_items
ALTER TABLE transaction_line_items
ADD CONSTRAINT fk_tli_line_item_catalog 
FOREIGN KEY (line_item_catalog_id) 
REFERENCES public.line_items(id) ON DELETE SET NULL;

-- Step 6: Create index on the FK
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_line_item_catalog_id
ON public.transaction_line_items(line_item_catalog_id);

-- Step 7: Verify cleanup
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items'
ORDER BY ordinal_position;

-- Step 8: Create comprehensive view with catalog data
DROP VIEW IF EXISTS v_transaction_line_items_full CASCADE;

CREATE OR REPLACE VIEW v_transaction_line_items_full AS
SELECT 
  -- Transaction line items fields
  tli.id,
  tli.transaction_line_id,
  tli.line_number,
  tli.quantity,
  tli.percentage,
  tli.unit_price,
  tli.unit_of_measure,
  tli.total_amount,
  tli.analysis_work_item_id,
  tli.sub_tree_id,
  tli.org_id,
  tli.created_at,
  tli.updated_at,
  tli.line_item_catalog_id,
  
  -- GL line fields
  tl.transaction_id,
  
  -- Catalog (line_items) fields - NOW QUERIED FROM line_items TABLE
  li.code as item_code,
  li.name as item_name,
  li.name_ar,
  li.parent_id as catalog_parent_id,
  li.level as catalog_level,
  li.path as catalog_path,
  li.is_selectable,
  li.item_type,
  li.specifications,
  li.base_unit_of_measure as catalog_unit_of_measure,
  li.standard_cost,
  li.is_active as catalog_is_active
FROM public.transaction_line_items tli
JOIN public.transaction_lines tl ON tli.transaction_line_id = tl.id
LEFT JOIN public.line_items li ON tli.line_item_catalog_id = li.id;

-- Step 9: Verify view works
SELECT COUNT(*) as total_items FROM v_transaction_line_items_full;

-- Step 10: Summary
SELECT 
  'Cleaned transaction_line_items table' as status,
  COUNT(*) as remaining_columns
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items';

COMMIT;

-- ================================================================
-- FINAL STATE
-- ================================================================
-- transaction_line_items now contains ONLY:
--   - id (PK)
--   - transaction_line_id (FK to transaction_lines)
--   - line_number (ordering within GL line)
--   - quantity, percentage, unit_price (transaction-specific pricing)
--   - unit_of_measure (override from catalog)
--   - total_amount (GENERATED ALWAYS)
--   - analysis_work_item_id, sub_tree_id (cost object assignments)
--   - org_id (which organization)
--   - created_at, updated_at (audit)
--   - line_item_catalog_id (FK to line_items for catalog data)
-- 
-- Catalog data (item_code, item_name, hierarchy, etc.) is now
-- queried from line_items table via the new view.
-- ================================================================
