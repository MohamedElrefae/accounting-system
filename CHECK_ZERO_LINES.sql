-- Check how many lines in the CSV have both debit and credit as zero
-- This will help us understand the scope of the issue

-- Simulate checking the data from the first SQL file
WITH temp_test AS (
    SELECT * FROM (
        VALUES
        (10, '2', 'b7b03032-4229-41bb-92e6-4712f7597010', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 0.00, 0.00, 'مستخلص رقم 3', '', 'd5789445-11e3-4ad6-9297-b56521675114'),
        (31, '5', 'b7b03032-4229-41bb-92e6-4712f7597010', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 0.00, 0.00, 'مستخلص رقم 4', '', 'd5789445-11e3-4ad6-9297-b56521675114'),
        (32, '5', 'b7b03032-4229-41bb-92e6-4712f7597010', '316fc553-5b45-4d28-a6f9-825dbb540655', 'af651532-9f5d-4ae3-b327-5f98e271684b', '7f050fd9-eb44-448c-bb8d-55fae06ba318', '03e674a1-33fa-4e03-8c37-0c34436fedb4', 0.00, 0.00, 'مستخلص رقم 4', '', 'd5789445-11e3-4ad6-9297-b56521675114')
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
    '❌ Lines with BOTH zero' as issue,
    COUNT(*) as count,
    'These will fail the constraint' as note
FROM temp_test
WHERE debit_amount = 0.00 AND credit_amount = 0.00;

-- Show the constraint definition
SELECT 
    '📋 Constraint Info' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'chk_tl_one_side_positive';
