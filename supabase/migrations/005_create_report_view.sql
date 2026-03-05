-- 005_create_report_view.sql
-- Step 7: Create reporting view for transaction line items with adjustments
-- Thin view: no calculations, joins only for human-readable labels.
-- All amounts come directly from stored columns.

CREATE OR REPLACE VIEW v_transaction_line_items_report AS
SELECT
  tli.id,
  tli.line_number,

  -- Parent chain
  tl.id                       AS transaction_line_id,
  tl.transaction_id,
  tl.description              AS transaction_line_description,

  -- Catalog info
  li.code                     AS line_item_code,
  li.name                     AS line_item_name,
  li.name_ar                  AS line_item_name_ar,

  -- Quantity / price
  tli.quantity,
  tli.percentage,
  tli.unit_price,
  tli.unit_of_measure,

  -- Pre-stored amounts (no calculation in this view)
  tli.total_amount,
  tli.deduction_percentage,
  tli.deduction_amount,
  tli.addition_percentage,
  tli.addition_amount,
  tli.net_amount,

  -- Cost context
  tl.project_id,
  tl.cost_center_id,
  tl.work_item_id,
  tl.analysis_work_item_id,

  -- Metadata
  tl.org_id,
  tli.created_at,
  tli.updated_at

FROM public.transaction_line_items tli
JOIN public.transaction_lines tl ON tli.transaction_line_id = tl.id
LEFT JOIN public.line_items li   ON tli.line_item_id = li.id;
