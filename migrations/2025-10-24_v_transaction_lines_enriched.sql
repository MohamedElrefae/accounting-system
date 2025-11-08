-- View: v_transaction_lines_enriched
-- Purpose: Return transaction_lines with aggregated child line item counts and totals
-- Date: 2025-10-24

CREATE OR REPLACE VIEW public.v_transaction_lines_enriched AS
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
  -- Optional cost fields may not exist in this schema; expose as NULLs for compatibility
  NULL::numeric AS discount_amount,
  NULL::numeric AS tax_amount,
  NULL::numeric AS total_cost,
  NULL::numeric AS standard_cost,
  tl.created_at,
  tl.updated_at,
  -- Aggregates from transaction_line_items
  COALESCE(agg.line_items_count, 0) AS line_items_count,
  COALESCE(agg.line_items_total, 0::numeric) AS line_items_total
FROM public.transaction_lines tl
LEFT JOIN (
  SELECT 
    tli.transaction_line_id AS tl_id,
    COUNT(*) AS line_items_count,
    COALESCE(SUM(tli.total_amount), 0::numeric) AS line_items_total
  FROM public.transaction_line_items tli
  WHERE tli.transaction_line_id IS NOT NULL
  GROUP BY tli.transaction_line_id
) agg ON agg.tl_id = tl.id;
