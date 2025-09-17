-- 064_update_transactions_with_analysis.sql
-- Compute needs_attention using per-org default tolerance from cost_analysis_settings

BEGIN;

CREATE OR REPLACE VIEW public.v_transactions_with_analysis AS
SELECT 
  t.*,
  v.variance_amount,
  COALESCE(s.default_tolerance, 0)::numeric AS effective_tolerance,
  -- Raw flag from cost analysis summary (kept for reference)
  v.needs_attention AS needs_attention_raw,
  -- Effective attention based on per-org tolerance
  (CASE WHEN ABS(COALESCE(v.variance_amount, 0)) > COALESCE(s.default_tolerance, 0) THEN TRUE ELSE FALSE END) AS needs_attention
FROM public.transactions t
LEFT JOIN public.v_cost_analysis_summary v
  ON v.transaction_id = t.id
LEFT JOIN public.cost_analysis_settings s
  ON s.org_id = t.org_id;

GRANT SELECT ON public.v_transactions_with_analysis TO anon, authenticated, service_role;

COMMIT;