-- View: v_tx_line_items_agg
-- Purpose: Aggregate transaction_line_items per transaction via transaction_lines
-- Date: 2025-10-24

CREATE OR REPLACE VIEW public.v_tx_line_items_agg AS
SELECT 
  tl.transaction_id,
  COUNT(tli.id) AS line_items_count,
  COALESCE(SUM(tli.total_amount), 0::numeric) AS line_items_total
FROM public.transaction_line_items tli
JOIN public.transaction_lines tl ON tl.id = tli.transaction_line_id
GROUP BY tl.transaction_id;

-- Helpful index recommendations (optional, not created here):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tli_txline ON public.transaction_line_items(transaction_line_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tl_txid ON public.transaction_lines(transaction_id);
