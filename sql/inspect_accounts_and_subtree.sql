-- Query 1: Get all accounts with their IDs and codes
SELECT id, code, name, org_id
FROM public.accounts
ORDER BY org_id, code
LIMIT 50;

-- Query 2: Get sample sub_tree data
SELECT id, code, description, linked_account_id, org_id
FROM public.sub_tree
WHERE linked_account_id IS NULL
LIMIT 20;

-- Query 3: Check if accounts table has a 'code' column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'accounts'
ORDER BY ordinal_position;

-- Query 4: Check sub_tree structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sub_tree'
ORDER BY ordinal_position;
