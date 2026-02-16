-- Complete dimension discovery for transaction import
-- Run this in Supabase SQL Editor to get ALL dimensions for your organization

-- Organization ID we're working with
-- d5789445-11e3-4ad6-9297-b56521675114

-- ========================================
-- PART 1: GET ALL DIMENSIONS WITH COUNTS
-- ========================================

-- Transaction Classifications
SELECT 
    'TRANSACTION_CLASSIFICATIONS' as dimension_type,
    COUNT(*) as total_count
FROM transaction_classifications 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Projects
SELECT 
    'PROJECTS' as dimension_type,
    COUNT(*) as total_count
FROM projects 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Analysis Work Items
SELECT 
    'ANALYSIS_WORK_ITEMS' as dimension_type,
    COUNT(*) as total_count
FROM analysis_work_items 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Sub Tree
SELECT 
    'SUB_TREE' as dimension_type,
    COUNT(*) as total_count
FROM sub_tree 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- ========================================
-- PART 2: GET ALL TRANSACTION CLASSIFICATIONS
-- ========================================
SELECT 
    'CLASSIFICATION' as type,
    id,
    code,
    name,
    created_at
FROM transaction_classifications 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- ========================================
-- PART 3: GET ALL PROJECTS
-- ========================================
SELECT 
    'PROJECT' as type,
    id,
    code,
    name,
    created_at
FROM projects 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- ========================================
-- PART 4: GET ALL ANALYSIS WORK ITEMS
-- ========================================
SELECT 
    'ANALYSIS_WORK_ITEM' as type,
    id,
    code,
    name,
    created_at
FROM analysis_work_items 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- ========================================
-- PART 5: GET ALL SUB TREE ITEMS
-- ========================================
SELECT 
    'SUB_TREE' as type,
    id,
    code,
    name,
    created_at
FROM sub_tree 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- ========================================
-- PART 6: GET FIRST AVAILABLE ID FROM EACH TABLE (FALLBACK)
-- ========================================
SELECT 
    'FALLBACK_IDS' as info,
    (SELECT id FROM transaction_classifications WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as first_classification_id,
    (SELECT id FROM projects WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as first_project_id,
    (SELECT id FROM analysis_work_items WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as first_analysis_work_item_id,
    (SELECT id FROM sub_tree WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114' LIMIT 1) as first_sub_tree_id;

-- ========================================
-- PART 7: VERIFY ACCOUNT MAPPINGS STILL EXIST
-- ========================================
SELECT 
    'ACCOUNT_VERIFICATION' as info,
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN legacy_code IS NOT NULL THEN 1 END) as accounts_with_legacy_codes
FROM accounts 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Show first few accounts with legacy codes
SELECT 
    'SAMPLE_ACCOUNTS' as type,
    id,
    code,
    legacy_code,
    name
FROM accounts 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND legacy_code IS NOT NULL
ORDER BY legacy_code::integer
LIMIT 10;