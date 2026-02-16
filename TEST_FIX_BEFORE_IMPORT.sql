-- Test Query to Verify the Fix Works
-- Run this BEFORE importing to confirm the column mapping is correct

-- This simulates what will happen when you run the import
WITH temp_test AS (
    SELECT * FROM (
        VALUES
        (1, '1', '7accdb8c-bbd4-4b2c-abdd-706b8070b41a', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 7054506.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114'),
        (2, '1', 'b9d58bc5-9721-45a4-9477-244be212e724', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 0.00, 7054506.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114'),
        (3, '2', 'b7b03032-4229-41bb-92e6-4712f7597010', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 30234.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114')
    ) AS temp_lines(
        row_num,
        transaction_ref,
        account_id_text,
        classification_id_text,
        project_id_text,
        analysis_work_item_id_text,
        sub_tree_id_text,
        debit_amount,
        credit_amount,
        description,
        notes,
        org_id_text
    )
)
SELECT 
    '✅ Column Mapping Test' as test_name,
    temp_test.row_num,
    temp_test.transaction_ref,
    temp_test.account_id_text,
    temp_test.debit_amount,
    temp_test.credit_amount,
    temp_test.description
FROM temp_test;

-- Expected results:
-- row_num | transaction_ref | account_id_text                      | debit_amount | credit_amount | description
-- --------|-----------------|--------------------------------------|--------------|---------------|-------------
-- 1       | 1               | 7accdb8c-bbd4-4b2c-abdd-706b8070b41a | 7054506.00   | 0.00          | مستخلص رقم 3
-- 2       | 1               | b9d58bc5-9721-45a4-9477-244be212e724 | 0.00         | 7054506.00    | مستخلص رقم 3
-- 3       | 2               | b7b03032-4229-41bb-92e6-4712f7597010 | 30234.00     | 0.00          | مستخلص رقم 3

-- Now test the JOIN
WITH temp_test AS (
    SELECT * FROM (
        VALUES
        (1, '1', '7accdb8c-bbd4-4b2c-abdd-706b8070b41a', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 7054506.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114'),
        (2, '1', 'b9d58bc5-9721-45a4-9477-244be212e724', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 0.00, 7054506.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114')
    ) AS temp_lines(
        row_num,
        transaction_ref,
        account_id_text,
        classification_id_text,
        project_id_text,
        analysis_work_item_id_text,
        sub_tree_id_text,
        debit_amount,
        credit_amount,
        description,
        notes,
        org_id_text
    )
)
SELECT 
    '✅ JOIN Test' as test_name,
    t.reference_number as txn_ref_in_db,
    t.id as transaction_id,
    t.description as txn_description,
    temp_test.transaction_ref as txn_ref_from_import,
    temp_test.debit_amount,
    temp_test.credit_amount,
    NULLIF(temp_test.account_id_text, '')::uuid as account_id
FROM temp_test
JOIN transactions t ON t.reference_number = temp_test.transaction_ref::text 
    AND t.org_id = NULLIF(temp_test.org_id_text, '')::uuid;

-- Expected results: Should return 2 rows showing successful JOIN
-- If you see rows here, the import will work! ✅

-- Check how many transactions exist with reference_number '1'
SELECT 
    '📊 Transaction Check' as test_name,
    reference_number,
    id,
    description,
    entry_date,
    total_debit,
    total_credit
FROM transactions
WHERE reference_number IN ('1', '2', '3', '4', '5')
AND org_id = 'd5789445-11e3-4ad6-9297-b56521675114'::uuid
ORDER BY reference_number::integer;

-- This should show your transactions that will receive the imported lines
