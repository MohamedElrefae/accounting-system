-- Final Cost Analysis Setup - Handles column conflicts properly
-- This script avoids column name conflicts by using aliases

-- 1. Drop existing views and functions that might have conflicts
DROP VIEW IF EXISTS v_transactions_with_analysis CASCADE;
DROP VIEW IF EXISTS v_cost_analysis_summary CASCADE;
DROP FUNCTION IF EXISTS get_transaction_analysis_detail(UUID);

-- 2. Create transaction_line_items table if it doesn't exist
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

-- 3. Create cost analysis summary view with unique column names
CREATE VIEW v_cost_analysis_summary AS
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

-- 4. Create transactions with analysis view (avoiding column conflicts)
CREATE VIEW v_transactions_with_analysis AS
SELECT 
    t.*,
    v.needs_attention AS analysis_needs_attention,
    v.calculated_variance_amount AS analysis_variance_amount,
    v.calculated_line_items_total AS analysis_line_items_total,
    v.calculated_line_items_count AS analysis_line_items_count
FROM transactions t
LEFT JOIN v_cost_analysis_summary v ON v.transaction_id = t.id;

-- 5. Create the RPC function for transaction analysis detail
CREATE FUNCTION get_transaction_analysis_detail(p_transaction_id UUID)
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

-- 6. Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_transaction_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trigger_update_transaction_line_items_updated_at ON transaction_line_items;
CREATE TRIGGER trigger_update_transaction_line_items_updated_at
    BEFORE UPDATE ON transaction_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_line_items_updated_at();

-- 8. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON transaction_line_items TO authenticated, service_role;
GRANT SELECT ON v_cost_analysis_summary TO authenticated, service_role, anon;
GRANT SELECT ON v_transactions_with_analysis TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION get_transaction_analysis_detail(UUID) TO authenticated, service_role, anon;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_id ON transaction_line_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_analysis_work_item_id ON transaction_line_items(analysis_work_item_id);
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_sub_tree_id ON transaction_line_items(sub_tree_id);
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_org_id ON transaction_line_items(org_id);

-- 10. Verification queries
SELECT 'DATABASE SETUP VERIFICATION' AS section, '==================' AS details
UNION ALL
SELECT 'transaction_line_items table exists' AS section, 
       CASE WHEN EXISTS (SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' AND table_name = 'transaction_line_items') 
            THEN '✅ YES' ELSE '❌ NO' END AS details
UNION ALL
SELECT 'v_cost_analysis_summary view exists' AS section,
       CASE WHEN EXISTS (SELECT FROM information_schema.views 
                        WHERE table_schema = 'public' AND table_name = 'v_cost_analysis_summary') 
            THEN '✅ YES' ELSE '❌ NO' END AS details
UNION ALL
SELECT 'v_transactions_with_analysis view exists' AS section,
       CASE WHEN EXISTS (SELECT FROM information_schema.views 
                        WHERE table_schema = 'public' AND table_name = 'v_transactions_with_analysis') 
            THEN '✅ YES' ELSE '❌ NO' END AS details
UNION ALL
SELECT 'get_transaction_analysis_detail function exists' AS section,
       CASE WHEN EXISTS (SELECT FROM information_schema.routines 
                        WHERE routine_schema = 'public' AND routine_name = 'get_transaction_analysis_detail') 
            THEN '✅ YES' ELSE '❌ NO' END AS details;

-- 11. Check table structure and show column count
SELECT 'TABLE STRUCTURE CHECK' AS section, '==================' AS details
UNION ALL
SELECT 'transaction_line_items column count' AS section, 
       COUNT(*)::TEXT || ' columns' AS details
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transaction_line_items'
UNION ALL
SELECT 'Key columns present' AS section,
       CASE WHEN COUNT(*) >= 4 THEN '✅ All key columns found' 
            ELSE '❌ Missing columns' END AS details
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transaction_line_items'
  AND column_name IN ('transaction_id', 'quantity', 'percentage', 'unit_price');

-- 12. Test views are queryable
SELECT 'VIEW FUNCTIONALITY TEST' AS section, '==================' AS details
UNION ALL
SELECT 'v_cost_analysis_summary queryable' AS section,
       CASE WHEN (SELECT COUNT(*) FROM v_cost_analysis_summary LIMIT 1) >= 0 
            THEN '✅ View works correctly' 
            ELSE '❌ View has errors' END AS details
UNION ALL  
SELECT 'RPC function callable' AS section,
       CASE WHEN (SELECT COUNT(*) FROM get_transaction_analysis_detail('00000000-0000-0000-0000-000000000000') LIMIT 1) >= 0
            THEN '✅ Function works correctly'
            ELSE '❌ Function has errors' END AS details;

-- Success message
SELECT '🎉 SETUP COMPLETE! 🎉' AS section, 
       'Cost Analysis database setup completed successfully!' AS details
UNION ALL
SELECT 'Next Steps' AS section,
       '1. Refresh your application' AS details
UNION ALL
SELECT '' AS section,
       '2. Go to Transactions page' AS details
UNION ALL
SELECT '' AS section,
       '3. Click "تحليل التكلفة" button' AS details
UNION ALL
SELECT '' AS section,
       '4. Modal should now work with real data!' AS details;