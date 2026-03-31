-- Verification script for Cost Analysis Report implementation
-- Run this script to verify that the database changes are working correctly

-- Step 1: Verify the views exist
SELECT 
    'v_transaction_line_items_cost_analysis' as view_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'v_transaction_line_items_cost_analysis') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
    END as status

UNION ALL

SELECT 
    'v_transactions_enriched_cost_analysis' as view_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'v_transactions_enriched_cost_analysis') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
    END as status;

-- Step 2: Verify the function exists
SELECT 
    'get_cost_analysis_data' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_cost_analysis_data') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
    END as status;

-- Step 3: Test the view with sample data (if transactions exist)
SELECT 'Sample data from v_transactions_enriched_cost_analysis' as test_description,
       COUNT(*) as record_count
FROM v_transactions_enriched_cost_analysis
LIMIT 1000;

-- Step 4: Test the function with basic parameters
SELECT 'Testing get_cost_analysis_data function' as test_description;
-- Uncomment the line below to test the function
-- SELECT * FROM get_cost_analysis_data(p_page_size := 5) LIMIT 5;

-- Step 5: Verify key columns are present in the view
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'v_transactions_enriched_cost_analysis' 
  AND table_schema = 'public'
  AND column_name IN (
    'transaction_id', 'entry_number', 'entry_date', 'transaction_description',
    'line_no', 'account_code', 'account_name', 'debit_amount', 'credit_amount',
    'against_account_code', 'against_account_name',
    'item_code', 'item_name', 'quantity', 'unit_price', 'total_amount', 'net_amount',
    'cost_analysis_items_count', 'has_cost_analysis_items', 'dimensions_match'
  )
ORDER BY ordinal_position;

-- Step 6: Check if transaction_line_items table has data
SELECT 
    'transaction_line_items table' as table_name,
    COUNT(*) as record_count
FROM transaction_line_items;

-- Step 7: Check if transaction_lines table has data  
SELECT 
    'transaction_lines table' as table_name,
    COUNT(*) as record_count
FROM transaction_lines;

-- Step 8: Verify relationships exist
SELECT 
    'Transaction lines with items' as relationship_test,
    COUNT(DISTINCT tl.id) as lines_with_items
FROM transaction_lines tl
JOIN transaction_line_items tli ON tli.transaction_line_id = tl.id;

-- Expected results summary:
-- 1. Both views should exist with status 'EXISTS'
-- 2. Function should exist with status 'EXISTS' 
-- 3. Views should return data (record_count > 0 if transactions exist)
-- 4. All key columns should be present in the view
-- 5. Tables should have data for meaningful testing
-- 6. Some transaction lines should have associated line items
