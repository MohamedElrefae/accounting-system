-- Test script to verify line items work correctly
-- Run this after the main setup script to test functionality

-- 1. Check that the table exists with correct structure
SELECT 'TABLE STRUCTURE TEST' as test_section, '===================' as details;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transaction_line_items'
ORDER BY ordinal_position;

-- 2. Verify total_amount is a generated column
SELECT column_name, generation_expression
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transaction_line_items'
  AND column_name = 'total_amount';

-- 3. Get a test transaction ID (replace with actual transaction ID)
SELECT 'SAMPLE TRANSACTION FOR TESTING' as test_section, '===================' as details;
SELECT id, entry_number, description, amount 
FROM transactions 
LIMIT 1;

-- 4. Test insert without total_amount (this should work)
-- Replace 'your-transaction-id-here' with an actual transaction ID from step 3
/*
INSERT INTO transaction_line_items (
    transaction_id, 
    line_number, 
    item_name_ar, 
    quantity, 
    percentage, 
    unit_price, 
    unit_of_measure,
    org_id
) VALUES (
    'your-transaction-id-here',  -- Replace with actual transaction ID
    1,
    'اختبار بند التكلفة',
    10.0,
    75.5,
    100.0,
    'piece',
    'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'  -- Replace with your org_id
);
*/

-- 5. After inserting, verify the total_amount was calculated correctly
-- Expected result: 10 * (75.5/100) * 100 = 755.0
/*
SELECT 
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    total_amount,
    (quantity * (percentage/100.0) * unit_price) as expected_total
FROM transaction_line_items 
WHERE item_name_ar = 'اختبار بند التكلفة';
*/

-- 6. Clean up test data
/*
DELETE FROM transaction_line_items 
WHERE item_name_ar = 'اختبار بند التكلفة';
*/

SELECT 'TEST COMPLETE' as test_section, 'Uncomment the test queries above to run actual tests' as details;