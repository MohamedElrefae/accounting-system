-- Migration: Create v_tx_line_items_agg view
-- Purpose: Aggregate transaction line items count and total for each transaction
-- Date: 2025-01-19

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
