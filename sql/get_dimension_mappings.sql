-- Get ALL dimension mappings from Supabase for transaction import
-- Run this in Supabase SQL Editor to get ALL dimension IDs

-- 1. Get ALL available transaction classifications
SELECT 
    'transaction_classifications' as table_name,
    id,
    code,
    name
FROM transaction_classifications 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- 2. Get ALL available projects
SELECT 
    'projects' as table_name,
    id,
    code,
    name
FROM projects 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- 3. Get ALL available analysis work items
SELECT 
    'analysis_work_items' as table_name,
    id,
    code,
    name
FROM analysis_work_items 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- 4. Get ALL available sub_tree items
SELECT 
    'sub_tree' as table_name,
    id,
    code,
    name
FROM sub_tree 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- 5. Alternative: Get first available ID from each table (if no codes exist)
SELECT 
    'First Available IDs' as info,
    (SELECT id FROM transaction_classifications WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as classification_id,
    (SELECT id FROM projects WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as project_id,
    (SELECT id FROM analysis_work_items WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as analysis_work_item_id,
    (SELECT id FROM sub_tree WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as sub_tree_id;