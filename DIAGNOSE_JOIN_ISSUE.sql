-- Diagnostic Query to Find Why JOIN Fails

-- Step 1: Check if the temp table data is being created
WITH temp_test AS (
    SELECT * FROM (
        VALUES
        (1, '1', '7accdb8c-bbd4-4b2c-abdd-706b8070b41a', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 7054506.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114'),
        (2, '1', 'b9d58bc5-9721-45a4-9477-244be212e724', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 0.00, 7054506.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114')
    ) AS temp_lines (row_num, transaction_ref, account_id_text, classification_id_text, project_id_text, analysis_work_item_id_text, sub_tree_id_text, debit_amount, credit_amount, description, notes, org_id_text)
)
SELECT 
    'Temp table rows' as test,
    COUNT(*) as count
FROM temp_test;

-- Step 2: Check if transaction '1' exists
SELECT 
    'Transaction with ref 1' as test,
    reference_number,
    id,
    org_id
FROM transactions
WHERE reference_number = '1'
AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid;

-- Step 3: Try the actual JOIN
WITH temp_test AS (
    SELECT * FROM (
        VALUES
        (1, '1', '7accdb8c-bbd4-4b2c-abdd-706b8070b41a', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 7054506.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114')
    ) AS temp_lines (row_num, transaction_ref, account_id_text, classification_id_text, project_id_text, analysis_work_item_id_text, sub_tree_id_text, debit_amount, credit_amount, description, notes, org_id_text)
)
SELECT 
    'JOIN result' as test,
    t.reference_number,
    t.id as transaction_id,
    temp_test.transaction_ref,
    temp_test.transaction_ref::text as transaction_ref_as_text
FROM temp_test
JOIN transactions t ON t.reference_number = temp_test.transaction_ref::text AND t.org_id = NULLIF(temp_test.org_id_text, '')::uuid;
