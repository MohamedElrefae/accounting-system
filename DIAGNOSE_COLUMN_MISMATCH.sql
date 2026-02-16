-- Diagnostic Query to Show Column Mismatch Issue

-- This shows what's CURRENTLY happening (WRONG):
WITH temp_test_wrong AS (
    SELECT * FROM (
        VALUES
        (1, '1', '7accdb8c-bbd4-4b2c-abdd-706b8070b41a', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 7054506.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114')
    ) AS temp_lines(
        transaction_ref,  -- WRONG: This is getting the row_num value (1)
        account_id_text,  -- WRONG: This is getting the transaction_ref value ('1')
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
    'WRONG MAPPING' as status,
    transaction_ref as what_we_think_is_txn_ref,
    account_id_text as what_we_think_is_account_id
FROM temp_test_wrong;

-- This shows what SHOULD happen (CORRECT):
WITH temp_test_correct AS (
    SELECT * FROM (
        VALUES
        (1, '1', '7accdb8c-bbd4-4b2c-abdd-706b8070b41a', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 7054506.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114')
    ) AS temp_lines(
        row_num,  -- CORRECT: First column is row_num
        transaction_ref,  -- CORRECT: Second column is transaction_ref
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
    'CORRECT MAPPING' as status,
    row_num,
    transaction_ref as actual_txn_ref,
    account_id_text as actual_account_id
FROM temp_test_correct;

-- Now test the JOIN with CORRECT mapping:
WITH temp_test_correct AS (
    SELECT * FROM (
        VALUES
        (1, '1', '7accdb8c-bbd4-4b2c-abdd-706b8070b41a', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 7054506.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114')
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
    'JOIN TEST' as status,
    t.reference_number,
    t.id as transaction_id,
    temp_test_correct.transaction_ref,
    temp_test_correct.account_id_text
FROM temp_test_correct
JOIN transactions t ON t.reference_number = temp_test_correct.transaction_ref::text 
    AND t.org_id = NULLIF(temp_test_correct.org_id_text, '')::uuid;
