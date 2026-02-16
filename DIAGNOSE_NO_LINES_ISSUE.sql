-- Diagnose why transaction_lines import created no rows
-- Run this to understand the issue

-- Step 1: Check if transactions exist
SELECT 
    'Transactions Check' as check_type,
    COUNT(*) as count,
    COUNT(DISTINCT reference_number) as unique_references
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;

-- Step 2: Check what reference_numbers exist in transactions
SELECT 
    'Sample Transaction References' as info,
    reference_number,
    id,
    entry_date
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
ORDER BY reference_number::int
LIMIT 20;

-- Step 3: Test the JOIN with sample data from Part 01
-- This simulates what the SQL is trying to do
WITH temp_lines AS (
    VALUES
        (1, '1', '7accdb8c-bbd4-4b2c-abdd-706b8070b41a', '7.0', '0.0', NULL, '30000.0', 7054506.0, 0.0, 'مستخلص رقم 3', 'd5789445-11e3-4ad6-9297-b56521675114'),
        (2, '1', 'b9d58bc5-9721-45a4-9477-244be212e724', '7.0', '1.0', NULL, '30000.0', 0.0, 7054506.0, 'مستخلص رقم 3', 'd5789445-11e3-4ad6-9297-b56521675114'),
        (3, '2', 'b7b03032-4229-41bb-92e6-4712f7597010', '8.0', '1.0', '1.0', '93.0', 30234.0, 0.0, 'مستخلص رقم 3', 'd5789445-11e3-4ad6-9297-b56521675114')
) AS temp_lines(row_num, txn_ref, account_id, classification_id, project_id, analysis_work_item_id, sub_tree_id, debit_amount, credit_amount, description, org_id)
SELECT 
    'JOIN Test' as test_type,
    temp_lines.txn_ref,
    temp_lines.row_num,
    t.id as transaction_id,
    t.reference_number,
    CASE 
        WHEN t.id IS NULL THEN 'NO MATCH - Transaction not found'
        ELSE 'MATCH FOUND'
    END as join_result
FROM temp_lines
LEFT JOIN transactions t ON t.reference_number = temp_lines.txn_ref AND t.org_id = temp_lines.org_id::uuid
LIMIT 10;

-- Step 4: Check the data type of reference_number in transactions
SELECT 
    'Reference Number Data Type Check' as info,
    reference_number,
    pg_typeof(reference_number) as data_type,
    LENGTH(reference_number) as length,
    reference_number = '1' as equals_string_1,
    reference_number::text = '1' as text_equals_1
FROM transactions
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
LIMIT 5;

-- Step 5: Check if there are any transaction_lines at all
SELECT 
    'Transaction Lines Check' as check_type,
    COUNT(*) as total_lines
FROM transaction_lines tl
JOIN transactions t ON tl.transaction_id = t.id
WHERE t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;
