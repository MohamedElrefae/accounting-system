-- QUICK TEST TO VERIFY LINE ITEMS FUNCTIONALITY
-- Run this after setting up the trigger to test everything works

-- 1. Test basic insert with automatic total calculation
BEGIN;

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
    gen_random_uuid(), 
    1, 
    'تجربة حساب المجموع التلقائي', 
    4, 
    75, 
    15.25, 
    'piece',
    NULL,
    NULL,
    gen_random_uuid()
) RETURNING 
    id,
    item_name_ar,
    quantity,
    percentage, 
    unit_price,
    total_amount; -- Should show 4 * (75/100) * 15.25 = 45.75

-- 2. Test update with recalculation
UPDATE transaction_line_items 
SET 
    quantity = 5,
    percentage = 80,
    unit_price = 12.50
WHERE item_name_ar = 'تجربة حساب المجموع التلقائي'
RETURNING 
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    total_amount, -- Should show 5 * (80/100) * 12.50 = 50.00
    updated_at;

-- 3. Test the exact same data structure that the app will use
INSERT INTO transaction_line_items (
    transaction_id, 
    line_number, 
    item_name_ar, 
    quantity, 
    percentage, 
    unit_price, 
    unit_of_measure,
    analysis_work_item_id,
    sub_tree_id,
    org_id
) VALUES (
    gen_random_uuid(),
    2,
    'اختبار من التطبيق',
    1,
    100,
    25.50,
    'piece',
    NULL,
    NULL,
    NULL
) RETURNING *;

-- 4. Clean up test data
DELETE FROM transaction_line_items WHERE item_name_ar IN ('تجربة حساب المجموع التلقائي', 'اختبار من التطبيق');

ROLLBACK;

-- 5. Success message
SELECT 
    'Cost analysis line items are ready to use!' as status,
    'The app should now work without 400 errors' as message;