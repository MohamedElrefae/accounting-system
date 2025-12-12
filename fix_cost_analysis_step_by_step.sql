-- Step 1: Create transaction_line_items table first
CREATE TABLE IF NOT EXISTS transaction_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL DEFAULT 1,
    item_code VARCHAR(50),
    item_name VARCHAR(255),
    item_name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    quantity NUMERIC(15,4) NOT NULL DEFAULT 1.0,
    percentage NUMERIC(6,2) NOT NULL DEFAULT 100.00,
    unit_price NUMERIC(15,4) NOT NULL DEFAULT 0.0,
    unit_of_measure VARCHAR(50) DEFAULT 'piece',
    total_amount NUMERIC(15,4) GENERATED ALWAYS AS (quantity * (percentage / 100.0) * unit_price) STORED,
    analysis_work_item_id UUID REFERENCES analysis_work_items(id),
    sub_tree_id UUID REFERENCES expenses_categories(id),
    org_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(transaction_id, line_number),
    CHECK (quantity >= 0),
    CHECK (percentage >= 0 AND percentage <= 999.99),
    CHECK (unit_price >= 0)
);

-- Step 2: Grant permissions on the table
GRANT SELECT, INSERT, UPDATE, DELETE ON transaction_line_items TO authenticated, service_role;

-- Step 3: Create the cost analysis summary view
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
LEFT JOIN transaction_line_items tli ON t.id = tli.transaction_id
GROUP BY t.id, t.entry_number, t.description, t.amount;

-- Step 4: Create the RPC function
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

-- Step 5: Grant permissions on view and function
GRANT SELECT ON v_cost_analysis_summary TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_transaction_analysis_detail(UUID) TO authenticated, service_role, anon;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_id ON transaction_line_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_analysis_work_item_id ON transaction_line_items(analysis_work_item_id);
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_sub_tree_id ON transaction_line_items(sub_tree_id);
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_org_id ON transaction_line_items(org_id);
