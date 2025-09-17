-- 061_transactions_with_analysis_view.sql
-- Adds a lightweight view to expose analysis flags on transactions list
-- And a simple RPC to fetch per-transaction analysis header for the modal

BEGIN;

-- View: v_transactions_with_analysis
-- Left-join transactions to v_cost_analysis_summary by transaction_id
CREATE OR REPLACE VIEW public.v_transactions_with_analysis AS
SELECT 
  t.*,
  v.needs_attention,
  v.variance_amount,
  v.line_items_total
FROM public.transactions t
LEFT JOIN public.v_cost_analysis_summary v
  ON v.transaction_id = t.id;

GRANT SELECT ON public.v_transactions_with_analysis TO anon, authenticated, service_role;

-- RPC: get_transaction_analysis_detail
-- Returns header metrics for a single transaction from v_cost_analysis_summary
CREATE OR REPLACE FUNCTION public.get_transaction_analysis_detail(
  p_transaction_id uuid
)
RETURNS TABLE (
  transaction_id uuid,
  entry_number text,
  entry_date date,
  description text,
  transaction_amount numeric,
  line_items_total numeric,
  line_items_count integer,
  variance_amount numeric,
  variance_pct numeric,
  is_matched boolean,
  needs_attention boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id AS transaction_id,
    t.entry_number,
    t.entry_date,
    t.description,
    v.transaction_amount,
    v.line_items_total,
    v.line_items_count,
    v.variance_amount,
    v.variance_pct,
    v.is_matched,
    v.needs_attention
  FROM public.transactions t
  LEFT JOIN public.v_cost_analysis_summary v
    ON v.transaction_id = t.id
  WHERE t.id = p_transaction_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_transaction_analysis_detail(uuid) TO anon, authenticated, service_role;

COMMIT;