-- Import transactions directly via SQL instead of CSV
-- This approach handles dimension mapping automatically
-- Run this in Supabase SQL Editor after getting dimension IDs

-- Step 1: Create temporary table for Excel data
CREATE TEMP TABLE temp_excel_transactions (
    entry_no INTEGER,
    entry_date DATE,
    account_code INTEGER,
    debit_amount DECIMAL(15,2),
    credit_amount DECIMAL(15,2),
    description TEXT
);

-- Step 2: Insert sample Excel data (replace with your actual data)
-- You would need to convert your Excel data to INSERT statements
INSERT INTO temp_excel_transactions VALUES
(1, '2022-08-31', 134, 7054506.00, 0.00, 'مستخلص رقم 3'),
(1, '2022-08-31', 41, 0.00, 7054506.00, 'مستخلص رقم 3'),
(2, '2022-08-31', 31, 30234.00, 0.00, 'مستخلص رقم 3'),
(2, '2022-08-31', 31, 30234.00, 0.00, 'مستخلص رقم 3');
-- Add more rows as needed...

-- Step 3: Get dimension IDs (replace with actual IDs from your database)
WITH dimension_ids AS (
    SELECT 
        (SELECT id FROM transaction_classifications WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as classification_id,
        (SELECT id FROM projects WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as project_id,
        (SELECT id FROM analysis_work_items WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as analysis_work_item_id,
        (SELECT id FROM sub_tree WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as sub_tree_id
),

-- Step 4: Create account mapping
account_mapping AS (
    SELECT 
        1 as excel_code, '83d0dc81-52bf-4373-bdf5-a9109fc07d87'::uuid as account_id UNION ALL
    SELECT 2, '579a9b3c-08ed-4622-88c5-da8ab70cf67e'::uuid UNION ALL
    SELECT 3, '3e417728-9fa5-4fc9-8d71-c6fb2b27ee27'::uuid UNION ALL
    SELECT 4, 'e7a9d696-b9d7-4622-9096-7b733d48426a'::uuid UNION ALL
    SELECT 11, 'fbfa78de-5e99-4d7d-bc2d-1bb4de3148c9'::uuid UNION ALL
    SELECT 12, 'fbfa78de-5e99-4d7d-bc2d-1bb4de3148c9'::uuid UNION ALL
    SELECT 13, '32bf1faa-fb89-4af4-bcd7-1c8277ac16da'::uuid UNION ALL
    SELECT 21, '247df12c-9203-4454-b336-f67832933e71'::uuid UNION ALL
    SELECT 23, '542a664e-805e-40f1-aa5c-47aa28811750'::uuid UNION ALL
    SELECT 31, 'b7b03032-4229-41bb-92e6-4712f7597010'::uuid UNION ALL
    SELECT 41, 'b9d58bc5-9721-45a4-9477-244be212e724'::uuid UNION ALL
    SELECT 42, 'ce28bbca-0159-4f3b-a809-aaf62d3273ef'::uuid UNION ALL
    SELECT 56, 'c88dcfe8-fae9-4ad2-8f62-c4195afd42c5'::uuid UNION ALL
    SELECT 116, '3144218c-d290-422d-a461-0c7f4c2673f4'::uuid UNION ALL
    SELECT 117, '2c245f69-02b9-4e42-aee3-09c829368dc6'::uuid UNION ALL
    SELECT 131, '1d8d22e7-1004-4ebb-8211-98d0465362ca'::uuid UNION ALL
    SELECT 132, 'e6aa6eb7-2d3a-4b27-a1a7-bbb5e04a9842'::uuid UNION ALL
    SELECT 134, '7accdb8c-bbd4-4b2c-abdd-706b8070b41a'::uuid UNION ALL
    SELECT 211, '5be46bf3-28f2-4dde-a8c4-aa51c100e176'::uuid UNION ALL
    SELECT 232, '8073e778-4219-4372-8b4e-ae0c04ae0979'::uuid UNION ALL
    SELECT 234, 'b3e2d3ae-07be-4c1c-8e37-410542b874b2'::uuid
),

-- Step 5: Group Excel data into transactions
transaction_groups AS (
    SELECT 
        entry_no,
        entry_date,
        description,
        SUM(debit_amount) as total_debit,
        SUM(credit_amount) as total_credit,
        'd5789445-11e3-4ad6-9297-b56521675114'::uuid as org_id
    FROM temp_excel_transactions
    GROUP BY entry_no, entry_date, description
)

-- Step 6: Insert transactions
INSERT INTO transactions (reference_number, transaction_date, description, total_debit, total_credit, org_id)
SELECT 
    entry_no::text as reference_number,
    entry_date,
    description,
    total_debit,
    total_credit,
    org_id
FROM transaction_groups;

-- Step 7: Insert transaction lines
WITH dimension_ids AS (
    SELECT 
        (SELECT id FROM transaction_classifications WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as classification_id,
        (SELECT id FROM projects WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as project_id,
        (SELECT id FROM analysis_work_items WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as analysis_work_item_id,
        (SELECT id FROM sub_tree WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as sub_tree_id
),
account_mapping AS (
    -- Same account mapping as above
    SELECT 1 as excel_code, '83d0dc81-52bf-4373-bdf5-a9109fc07d87'::uuid as account_id
    -- ... (include all 21 mappings)
)

INSERT INTO transaction_lines (
    transaction_id, 
    account_id, 
    classification_id, 
    project_id, 
    analysis_work_item_id, 
    sub_tree_id, 
    debit_amount, 
    credit_amount, 
    description, 
    notes, 
    org_id
)
SELECT 
    t.id as transaction_id,
    am.account_id,
    d.classification_id,
    d.project_id,
    d.analysis_work_item_id,
    d.sub_tree_id,
    te.debit_amount,
    te.credit_amount,
    te.description,
    '' as notes,
    'd5789445-11e3-4ad6-9297-b56521675114'::uuid as org_id
FROM temp_excel_transactions te
JOIN account_mapping am ON te.account_code = am.excel_code
JOIN transactions t ON t.reference_number = te.entry_no::text 
    AND t.transaction_date = te.entry_date
    AND t.org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
CROSS JOIN dimension_ids d;

-- Step 8: Verify the import
SELECT 
    'Transactions imported' as status,
    COUNT(*) as count
FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

SELECT 
    'Transaction lines imported' as status,
    COUNT(*) as count
FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';