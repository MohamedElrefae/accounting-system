-- Fix for cost analysis using existing transaction_line_items table structure
-- The table already exists with transaction_line_id (not transaction_id)

-- Step 1: Create the cost analysis summary view using correct column names
CREATE OR REPLACE VIEW v_cost_analysis_summary AS
SELECT 
    t.id AS transaction_id,
    t.entry_number,
    t.description,
    t.amount AS transaction_amount,
    COALESCE(SUM(tli.total_amount), 0) AS calculated_line_items_total,
    COUNT(tli.id)::INTEGER AS calculated_line_items_count,
    (t.amount - COALESCE(SUM(tli.total_amount), 0)) AS calculated_variance_amount,
    CASE 
        WHEN t.amount = 0 THEN 0::NUMERIC
        ELSE ((t.amount - COALESCE(SUM(tli.total_amount), 0)) / t.amount) * 100
    END AS calculated_variance_pct,
    ABS(t.amount - COALESCE(SUM(tli.total_amount), 0)) < 1.0 AS is_matched,
    ABS(t.amount - COALESCE(SUM(tli.total_amount), 0)) >= 1.0 AS needs_attention,
    COUNT(tli.id) > 0 AS has_line_items
FROM transactions t
LEFT JOIN transaction_lines tl ON tl.transaction_id = t.id  -- Join through transaction_lines
LEFT JOIN transaction_line_items tli ON tli.transaction_line_id = tl.id  -- Then to line_items
GROUP BY t.id, t.entry_number, t.description, t.amount;

-- Step 2: Create the RPC function
CREATE OR REPLACE FUNCTION get_transaction_analysis_detail(p_transaction_id UUID)
RETURNS TABLE (
    transaction_id UUID,
    entry_number TEXT,
    entry_date DATE,
    description TEXT,
    transaction_amount NUMERIC,
    line_items_total NUMERIC,
    line_items_count INTEGER,
    variance_amount NUMERIC,
    variance_pct NUMERIC,
    is_matched BOOLEAN,
    needs_attention BOOLEAN
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
        t.amount AS transaction_amount,
        v.calculated_line_items_total AS line_items_total,
        v.calculated_line_items_count AS line_items_count,
        v.calculated_variance_amount AS variance_amount,
        v.calculated_variance_pct AS variance_pct,
        v.is_matched,
        v.needs_attention
    FROM transactions t
    LEFT JOIN v_cost_analysis_summary v ON v.transaction_id = t.id
    WHERE t.id = p_transaction_id;
$$;

-- Step 3: Grant permissions on view and function
GRANT SELECT ON v_cost_analysis_summary TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_transaction_analysis_detail(UUID) TO authenticated, service_role, anon;

-- Step 4: Test query to verify the view works
-- SELECT * FROM v_cost_analysis_summary WHERE transaction_id = 'your-test-transaction-id' LIMIT 1;
-- SELECT * FROM get_transaction_analysis_detail('your-test-transaction-id');
