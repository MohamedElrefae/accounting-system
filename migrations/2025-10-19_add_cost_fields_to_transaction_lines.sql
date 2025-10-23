-- Migration: Move cost fields from transactions to transaction_lines
-- Purpose: Enable per-line-item cost tracking (discounts, taxes, etc.)
-- Date: 2025-10-19

-- Step 1: Add cost-related columns to transaction_lines table
-- These columns track cost/discount/tax at the line level
ALTER TABLE public.transaction_lines
ADD COLUMN IF NOT EXISTS discount_amount numeric(15, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric(15, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost numeric(15, 4) NULL,
ADD COLUMN IF NOT EXISTS standard_cost numeric(15, 4) NULL;

-- Step 2: Create indexes for cost-related queries
CREATE INDEX IF NOT EXISTS idx_transaction_lines_discount 
  ON public.transaction_lines(discount_amount)
  WHERE discount_amount > 0;

CREATE INDEX IF NOT EXISTS idx_transaction_lines_tax 
  ON public.transaction_lines(tax_amount)
  WHERE tax_amount > 0;

CREATE INDEX IF NOT EXISTS idx_transaction_lines_total_cost 
  ON public.transaction_lines(total_cost)
  WHERE total_cost IS NOT NULL;

-- Step 3: Populate cost fields from transaction_line_items if data exists
-- This aggregates costs from line items to the line level
UPDATE public.transaction_lines tl
SET 
  discount_amount = COALESCE((
    SELECT SUM(discount_amount) 
    FROM public.transaction_line_items tli 
    WHERE tli.transaction_line_id = tl.id
  ), 0),
  tax_amount = COALESCE((
    SELECT SUM(tax_amount) 
    FROM public.transaction_line_items tli 
    WHERE tli.transaction_line_id = tl.id
  ), 0)
WHERE EXISTS (
  SELECT 1 
  FROM public.transaction_line_items tli 
  WHERE tli.transaction_line_id = tl.id
);

-- Step 4: Create view for line-level cost analysis
CREATE OR REPLACE VIEW v_transaction_lines_with_costs AS
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
  tl.discount_amount,
  tl.tax_amount,
  tl.total_cost,
  tl.standard_cost,
  tl.created_at,
  tl.updated_at,
  -- Computed fields
  (tl.debit_amount + tl.credit_amount) as line_amount,
  CASE 
    WHEN tl.debit_amount > 0 THEN tl.debit_amount - COALESCE(tl.discount_amount, 0) + COALESCE(tl.tax_amount, 0)
    WHEN tl.credit_amount > 0 THEN tl.credit_amount - COALESCE(tl.discount_amount, 0) + COALESCE(tl.tax_amount, 0)
    ELSE 0
  END as net_amount
FROM public.transaction_lines tl;

-- Step 5: Create aggregated costs view (per transaction)
CREATE OR REPLACE VIEW v_transaction_costs AS
SELECT 
  t.id as transaction_id,
  t.entry_number,
  t.entry_date,
  SUM(tl.discount_amount) as total_discounts,
  SUM(tl.tax_amount) as total_taxes,
  SUM(tl.total_cost) as total_line_costs,
  COUNT(tl.id) as line_count
FROM public.transactions t
LEFT JOIN public.transaction_lines tl ON t.id = tl.transaction_id
GROUP BY t.id, t.entry_number, t.entry_date;

-- Step 6: Verification query (commented - run manually to verify)
-- SELECT 
--   COUNT(*) as total_lines,
--   COUNT(*) FILTER (WHERE discount_amount > 0) as lines_with_discount,
--   COUNT(*) FILTER (WHERE tax_amount > 0) as lines_with_tax,
--   SUM(discount_amount) as total_discounts,
--   SUM(tax_amount) as total_taxes
-- FROM public.transaction_lines;

-- Step 7: Rollback plan (if needed)
-- ALTER TABLE public.transaction_lines DROP COLUMN discount_amount;
-- ALTER TABLE public.transaction_lines DROP COLUMN tax_amount;
-- ALTER TABLE public.transaction_lines DROP COLUMN total_cost;
-- ALTER TABLE public.transaction_lines DROP COLUMN standard_cost;
-- DROP VIEW IF EXISTS v_transaction_lines_with_costs;
-- DROP VIEW IF EXISTS v_transaction_costs;
