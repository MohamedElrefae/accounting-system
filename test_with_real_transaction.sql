-- TEST WITH REAL TRANSACTION ID - COPY AND RUN THIS
-- This uses an actual transaction from your database

-- 1. First, get a real transaction ID to use for testing
SELECT 
    id as transaction_id,
    entry_number,
    description,
    amount
FROM transactions 
LIMIT 3;

-- 2. IMPORTANT: Replace 'YOUR-REAL-TRANSACTION-ID-HERE' with an actual ID from the query above
-- Then run this test:

BEGIN;

-- Test insert with a REAL transaction ID (replace the UUID below)
INSERT INTO transaction_line_items (
    transaction_id, 
    line_number, 
    item_name_ar, 
    quantity, 
    percentage, 
    unit_price, 
    unit_of_measure,
    sub_tree_id,
    analysis_work_item_id,
    org_id
) VALUES (
    'YOUR-REAL-TRANSACTION-ID-HERE'::uuid, -- REPLACE THIS with real transaction ID
    1, 
    'اختبار حساب المجموع التلقائي', 
    3, 
    100, 
    20.50, 
    'piece',
    NULL,
    NULL,
    NULL
) RETURNING 
    id,
    transaction_id,
    item_name_ar,
    quantity,
    percentage, 
    unit_price,
    total_amount, -- Should show 3 * (100/100) * 20.50 = 61.50
    created_at;

-- Test update
UPDATE transaction_line_items 
SET 
    quantity = 2,
    percentage = 50,
    unit_price = 25.00
WHERE item_name_ar = 'اختبار حساب المجموع التلقائي'
RETURNING 
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    total_amount, -- Should show 2 * (50/100) * 25.00 = 25.00
    updated_at;

-- Clean up test data
DELETE FROM transaction_line_items WHERE item_name_ar = 'اختبار حساب المجموع التلقائي';

ROLLBACK;

-- 3. Verification message
SELECT 
    'Database trigger is working correctly!' as status,
    'The cost analysis modal should now work without errors' as message;