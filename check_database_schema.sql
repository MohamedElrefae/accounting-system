-- Check if cost analysis tables and views exist
-- Run these queries to verify your database schema

-- 1. Check if transaction_line_items table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transaction_line_items'
) AS transaction_line_items_exists;

-- 2. Check if v_cost_analysis_summary view exists
SELECT EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'v_cost_analysis_summary'
) AS cost_analysis_summary_view_exists;

-- 3. Check if v_transactions_with_analysis view exists  
SELECT EXISTS (
    SELECT FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'v_transactions_with_analysis'
) AS transactions_with_analysis_view_exists;

-- 4. Check transaction_line_items table structure (if exists)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transaction_line_items'
ORDER BY ordinal_position;

-- 5. Check if get_transaction_analysis_detail function exists
SELECT EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'get_transaction_analysis_detail'
) AS analysis_function_exists;

-- 6. Test data check - Count transactions and line items
SELECT 
    (SELECT COUNT(*) FROM transactions) as total_transactions,
    (SELECT COUNT(*) FROM transaction_line_items WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_line_items')) as total_line_items;