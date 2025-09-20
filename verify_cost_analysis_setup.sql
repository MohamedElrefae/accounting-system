-- Verification SQL for Cost Analysis Setup
-- Run this to verify that your database has all required components

-- 1. Create transaction_line_items table if it doesn't exist
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

-- 2. Create or replace cost analysis summary view
CREATE OR REPLACE VIEW v_cost_analysis_summary AS
SELECT 
    t.id AS transaction_id,
    t.entry_number,
    t.description,
    t.amount AS transaction_amount,
    COALESCE(SUM(tli.total_amount), 0) AS line_items_total,
    COUNT(tli.id) AS line_items_count,
    (t.amount - COALESCE(SUM(tli.total_amount), 0)) AS variance_amount,
    CASE 
        WHEN t.amount = 0 THEN 0
        ELSE ((t.amount - COALESCE(SUM(tli.total_amount), 0)) / t.amount) * 100
    END AS variance_pct,
    ABS(t.amount - COALESCE(SUM(tli.total_amount), 0)) < 1.0 AS is_matched,
    ABS(t.amount - COALESCE(SUM(tli.total_amount), 0)) >= 1.0 AS needs_attention,
    COUNT(tli.id) > 0 AS has_line_items
FROM transactions t
LEFT JOIN transaction_line_items tli ON t.id = tli.transaction_id
GROUP BY t.id, t.entry_number, t.description, t.amount;

-- 3. Create or replace the RPC function for transaction analysis detail
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
        v.transaction_amount,
        v.line_items_total,
        v.line_items_count,
        v.variance_amount,
        v.variance_pct,
        v.is_matched,
        v.needs_attention
    FROM transactions t
    LEFT JOIN v_cost_analysis_summary v ON v.transaction_id = t.id
    WHERE t.id = p_transaction_id;
$$;

-- 4. Add updated_at trigger for transaction_line_items
CREATE OR REPLACE FUNCTION update_transaction_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_line_items_updated_at
    BEFORE UPDATE ON transaction_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_line_items_updated_at();

-- 5. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON transaction_line_items TO authenticated, service_role;
GRANT SELECT ON v_cost_analysis_summary TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_transaction_analysis_detail(UUID) TO authenticated, service_role, anon;

-- 6. Verification queries - run these to check everything is working
SELECT 'transaction_line_items table exists' AS check_name, 
       EXISTS (SELECT FROM information_schema.tables 
               WHERE table_name = 'transaction_line_items') AS result;

SELECT 'v_cost_analysis_summary view exists' AS check_name,
       EXISTS (SELECT FROM information_schema.views 
               WHERE table_name = 'v_cost_analysis_summary') AS result;

SELECT 'get_transaction_analysis_detail function exists' AS check_name,
       EXISTS (SELECT FROM information_schema.routines 
               WHERE routine_name = 'get_transaction_analysis_detail') AS result;

-- 7. Sample data test (optional)
-- Test with an existing transaction ID (replace 'your-transaction-id' with actual ID)
/*
-- Insert sample line items
INSERT INTO transaction_line_items (
    transaction_id, line_number, item_name_ar, quantity, percentage, unit_price, unit_of_measure, org_id
) VALUES 
    ('your-transaction-id', 1, 'مواد بناء - أسمنت', 10, 100, 45.50, 'bag', 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'),
    ('your-transaction-id', 2, 'عمالة - تركيب', 8, 75, 25.00, 'hour', 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441');

-- Test the analysis function
SELECT * FROM get_transaction_analysis_detail('your-transaction-id');
*/

-- Success message
SELECT 'Cost Analysis setup verification completed successfully!' AS status;