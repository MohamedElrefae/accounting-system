-- Apply v_tx_line_items_agg view migration
-- Run this in Supabase SQL Editor

-- Drop view if exists
DROP VIEW IF EXISTS v_tx_line_items_agg;

-- Create aggregation view for transaction line items
CREATE OR REPLACE VIEW v_tx_line_items_agg AS
SELECT 
  tl.transaction_id,
  COUNT(tli.id) AS line_items_count,
  COALESCE(SUM(
    COALESCE(tli.quantity, 0) * COALESCE(tli.unit_price, 0)
  ), 0) AS line_items_total
FROM 
  transaction_line_items tli
  INNER JOIN transaction_lines tl ON tli.transaction_line_id = tl.id
GROUP BY 
  tl.transaction_id;

-- Grant access to authenticated users
GRANT SELECT ON v_tx_line_items_agg TO authenticated;

-- Add comment
COMMENT ON VIEW v_tx_line_items_agg IS 'Aggregates transaction line items count and total amount per transaction';

-- Verify the view was created
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname = 'v_tx_line_items_agg';

-- Test query (should return results if there are line items)
SELECT * FROM v_tx_line_items_agg LIMIT 5;
