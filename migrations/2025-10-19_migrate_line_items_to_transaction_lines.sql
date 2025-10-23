-- Migration: Link transaction_line_items to transaction_lines instead of transactions
-- Purpose: Enable document attachments and cost analysis at the line detail level
-- Date: 2025-10-19

-- Step 1: Add transaction_line_id column to transaction_line_items
ALTER TABLE public.transaction_line_items
ADD COLUMN transaction_line_id uuid NULL;

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tli_transaction_line_id 
  ON public.transaction_line_items(transaction_line_id);

CREATE INDEX IF NOT EXISTS idx_tli_tx_line_composite 
  ON public.transaction_line_items(transaction_id, transaction_line_id);

-- Step 3: Add foreign key constraint (initially NOT VALID to allow existing data)
ALTER TABLE public.transaction_line_items
ADD CONSTRAINT fk_tli_transaction_line 
  FOREIGN KEY (transaction_line_id) 
  REFERENCES public.transaction_lines(id) 
  ON DELETE CASCADE 
  NOT VALID;

-- Step 4: Data migration - populate transaction_line_id based on transaction_id and line_number
-- This maps each transaction_line_item to its corresponding transaction_line
UPDATE public.transaction_line_items tli
SET transaction_line_id = tl.id
FROM public.transaction_lines tl
WHERE tli.transaction_id = tl.transaction_id
  AND tli.line_number = tl.line_no
  AND tli.transaction_line_id IS NULL;

-- Step 5: Verify migration success
-- Count records that were successfully mapped
-- SELECT 
--   COUNT(*) as total_line_items,
--   COUNT(transaction_line_id) as mapped_to_lines,
--   COUNT(transaction_id) as still_use_transaction_id,
--   COUNT(*) - COUNT(transaction_line_id) as unmapped
-- FROM public.transaction_line_items;

-- Step 6: Validate foreign key constraint
-- This will check that all transaction_line_id values reference valid transaction_lines
ALTER TABLE public.transaction_line_items
VALIDATE CONSTRAINT fk_tli_transaction_line;

-- Step 7: Verify no orphaned records (commented out - run manually to verify)
-- SELECT tli.* FROM public.transaction_line_items tli
-- WHERE transaction_line_id IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM public.transaction_lines tl 
--     WHERE tl.id = tli.transaction_line_id
--   );

-- Step 8: Create view for easy access to line items with their transaction context
CREATE OR REPLACE VIEW v_transaction_line_items_with_context AS
SELECT 
  tli.id,
  tli.transaction_line_id,
  tli.transaction_id,
  tl.transaction_id as tx_id_from_line,
  tl.line_no,
  tli.org_id,
  tli.line_number,
  tli.item_code,
  tli.item_name,
  tli.item_name_ar,
  tli.description,
  tli.description_ar,
  tli.quantity,
  tli.percentage,
  tli.unit_price,
  tli.unit_of_measure,
  tli.total_amount,
  tli.analysis_work_item_id,
  tli.sub_tree_id,
  tli.line_item_id,
  tli.parent_id,
  tli.level,
  tli.path,
  tli.is_selectable,
  tli.item_type,
  tli.specifications,
  tli.standard_cost,
  tli.is_active,
  tli.position,
  tli.created_at,
  tli.updated_at
FROM public.transaction_line_items tli
LEFT JOIN public.transaction_lines tl ON tli.transaction_line_id = tl.id;

-- Step 9: Rollback plan (if needed)
-- ALTER TABLE public.transaction_line_items DROP CONSTRAINT fk_tli_transaction_line;
-- ALTER TABLE public.transaction_line_items DROP COLUMN transaction_line_id;
-- DROP VIEW IF EXISTS v_transaction_line_items_with_context;
