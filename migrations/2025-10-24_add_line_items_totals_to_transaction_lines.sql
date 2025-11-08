-- Migration: Add line items totals to transaction_lines
-- Purpose: Track total amount and count of line items per transaction line
-- Date: 2025-10-24

BEGIN;

-- Add columns for line items aggregation to transaction_lines
ALTER TABLE public.transaction_lines
  ADD COLUMN IF NOT EXISTS line_items_total numeric(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_items_count integer NOT NULL DEFAULT 0;

-- Create indexes for performance on the new columns
CREATE INDEX IF NOT EXISTS idx_transaction_lines_line_items_total 
  ON public.transaction_lines(line_items_total)
  WHERE line_items_total > 0;

CREATE INDEX IF NOT EXISTS idx_transaction_lines_line_items_count 
  ON public.transaction_lines(line_items_count)
  WHERE line_items_count > 0;

-- Populate the new columns with existing data
-- Calculate totals from transaction_line_items that are linked to each transaction_line
UPDATE public.transaction_lines tl
SET 
  line_items_total = COALESCE((
    SELECT SUM(total_amount) 
    FROM public.transaction_line_items tli 
    WHERE tli.transaction_line_id = tl.id
      AND tli.transaction_line_id IS NOT NULL
  ), 0),
  line_items_count = COALESCE((
    SELECT COUNT(*) 
    FROM public.transaction_line_items tli 
    WHERE tli.transaction_line_id = tl.id
      AND tli.transaction_line_id IS NOT NULL
  ), 0)
WHERE EXISTS (
  SELECT 1 
  FROM public.transaction_line_items tli 
  WHERE tli.transaction_line_id = tl.id
);

-- Create or replace trigger function to maintain the totals
CREATE OR REPLACE FUNCTION public.update_transaction_line_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process transaction line items that are linked to transaction_lines
  IF COALESCE(NEW.transaction_line_id, OLD.transaction_line_id) IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update the parent transaction_line totals
  UPDATE public.transaction_lines 
  SET 
    line_items_total = COALESCE((
      SELECT SUM(total_amount) 
      FROM public.transaction_line_items 
      WHERE transaction_line_id = COALESCE(NEW.transaction_line_id, OLD.transaction_line_id)
        AND transaction_line_id IS NOT NULL
    ), 0),
    line_items_count = COALESCE((
      SELECT COUNT(*) 
      FROM public.transaction_line_items 
      WHERE transaction_line_id = COALESCE(NEW.transaction_line_id, OLD.transaction_line_id)
        AND transaction_line_id IS NOT NULL
    ), 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.transaction_line_id, OLD.transaction_line_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update totals when line items change
DROP TRIGGER IF EXISTS trigger_update_transaction_line_totals ON public.transaction_line_items;
CREATE TRIGGER trigger_update_transaction_line_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transaction_line_totals();

-- Create view to show transaction lines with their line items summary
CREATE OR REPLACE VIEW v_transaction_lines_with_line_items AS
SELECT 
  tl.id,
  tl.transaction_id,
  tl.line_no,
  tl.account_id,
  tl.debit_amount,
  tl.credit_amount,
  tl.description,
  tl.project_id,
  tl.cost_center_id,
  tl.work_item_id,
  tl.analysis_work_item_id,
  tl.classification_id,
  tl.sub_tree_id,
  tl.line_items_total,
  tl.line_items_count,
  tl.created_at,
  tl.updated_at,
  -- Computed fields
  CASE 
    WHEN tl.line_items_count > 0 THEN tl.line_items_total / tl.line_items_count
    ELSE 0
  END as avg_line_item_amount,
  tl.line_items_count > 0 as has_line_items
FROM public.transaction_lines tl;

-- Verification queries (run to check results)
-- SELECT 
--   COUNT(*) as total_transaction_lines,
--   COUNT(*) FILTER (WHERE line_items_count > 0) as lines_with_items,
--   SUM(line_items_count) as total_line_items_across_all_lines,
--   SUM(line_items_total) as total_amount_across_all_lines
-- FROM public.transaction_lines;

-- Show sample results
-- SELECT 
--   tl.id,
--   tl.line_no,
--   tl.description,
--   tl.line_items_count,
--   tl.line_items_total,
--   t.entry_number
-- FROM public.transaction_lines tl
-- JOIN public.transactions t ON tl.transaction_id = t.id
-- WHERE tl.line_items_count > 0
-- ORDER BY tl.line_items_count DESC
-- LIMIT 10;

COMMIT;

-- Rollback plan (if needed):
-- DROP TRIGGER IF EXISTS trigger_update_transaction_line_totals ON public.transaction_line_items;
-- DROP FUNCTION IF EXISTS public.update_transaction_line_totals();
-- DROP VIEW IF EXISTS v_transaction_lines_with_line_items;
-- ALTER TABLE public.transaction_lines DROP COLUMN IF EXISTS line_items_total;
-- ALTER TABLE public.transaction_lines DROP COLUMN IF EXISTS line_items_count;