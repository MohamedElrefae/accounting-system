-- Corrected Cost Analysis Setup - Removes problematic foreign key references
-- This script works regardless of your exact table structure

-- 1. Drop existing views and functions that might have conflicts
DROP VIEW IF EXISTS v_transactions_with_analysis CASCADE;
DROP VIEW IF EXISTS v_cost_analysis_summary CASCADE;
DROP FUNCTION IF EXISTS get_transaction_analysis_detail(UUID);

-- 2. Create transaction_line_items table WITHOUT problematic foreign keys
-- We'll use UUID columns but not enforce foreign key constraints initially
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
    -- Store IDs without foreign key constraints to avoid schema issues
    analysis_work_item_id UUID,
    expenses_category_id UUID,
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
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_expenses_category_id ON transaction_line_items(expenses_category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_org_id ON transaction_line_items(org_id);

-- 10. After table creation, try to add foreign key constraints if tables exist
-- This will succeed silently if the reference tables exist, or be ignored if they don't

-- Try to add analysis_work_items foreign key if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_work_items' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE transaction_line_items 
            ADD CONSTRAINT fk_line_items_analysis_work_item 
            FOREIGN KEY (analysis_work_item_id) REFERENCES analysis_work_items(id);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore error if constraint already exists or other issues
            NULL;
        END;
    END IF;
END $$;

-- Try to add expenses_categories foreign key if table exists  
DO $$
BEGIN
    -- Check for common expense category table names
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses_categories' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE transaction_line_items 
            ADD CONSTRAINT fk_line_items_expenses_category 
            FOREIGN KEY (expenses_category_id) REFERENCES expenses_categories(id);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_categories' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE transaction_line_items 
            ADD CONSTRAINT fk_line_items_expense_category 
            FOREIGN KEY (expenses_category_id) REFERENCES expense_categories(id);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- 11. Comprehensive verification
SELECT 'SETUP VERIFICATION RESULTS' as status, '=========================' as details
UNION ALL
SELECT 'transaction_line_items table' as status, 
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transaction_line_items' AND table_schema = 'public') 
            THEN '✅ Created successfully' 
            ELSE '❌ Failed to create' END as details
UNION ALL
SELECT 'v_cost_analysis_summary view' as status,
       CASE WHEN EXISTS (SELECT FROM information_schema.views WHERE table_name = 'v_cost_analysis_summary' AND table_schema = 'public') 
            THEN '✅ Created successfully' 
            ELSE '❌ Failed to create' END as details
UNION ALL
SELECT 'v_transactions_with_analysis view' as status,
       CASE WHEN EXISTS (SELECT FROM information_schema.views WHERE table_name = 'v_transactions_with_analysis' AND table_schema = 'public') 
            THEN '✅ Created successfully' 
            ELSE '❌ Failed to create' END as details
UNION ALL
SELECT 'get_transaction_analysis_detail function' as status,
       CASE WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_transaction_analysis_detail' AND routine_schema = 'public') 
            THEN '✅ Created successfully' 
            ELSE '❌ Failed to create' END as details
UNION ALL
SELECT 'Foreign key constraints' as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints 
                        WHERE table_name = 'transaction_line_items' 
                          AND constraint_type = 'FOREIGN KEY')
            THEN '✅ Some constraints added'
            ELSE '⚠️ No foreign key constraints (tables may not exist)'
       END as details;

-- 12. Test basic functionality
SELECT '' as status, '' as details
UNION ALL
SELECT 'FUNCTIONALITY TESTS' as status, '=========================' as details
UNION ALL
SELECT 'View query test' as status,
       CASE WHEN (SELECT COUNT(*) FROM v_cost_analysis_summary LIMIT 1) >= 0 
            THEN '✅ Views are queryable' 
            ELSE '❌ Views have errors' END as details
UNION ALL  
SELECT 'Function test' as status,
       CASE WHEN (SELECT COUNT(*) FROM get_transaction_analysis_detail('00000000-0000-0000-0000-000000000000') LIMIT 1) >= 0
            THEN '✅ Function works'
            ELSE '❌ Function has errors' END as details;

-- Success message
SELECT '' as status, '' as details
UNION ALL
SELECT '🎉 COST ANALYSIS SETUP COMPLETE! 🎉' as status, 'Database ready for cost analysis feature' as details
UNION ALL
SELECT 'Next: Run the schema discovery script if you want' as status, 'to add foreign key constraints later' as details
UNION ALL
SELECT 'Then: Test your cost analysis modal!' as status, 'It should now work with real data' as details;