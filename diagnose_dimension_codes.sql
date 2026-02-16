-- DIAGNOSTIC: Check dimension code formats and values
-- Run this in Supabase SQL Editor to understand your dimension data

-- ========================================
-- PART 1: CHECK CODE DATA TYPES
-- ========================================

SELECT 
    'transaction_classifications' as table_name,
    pg_typeof(code) as code_data_type,
    COUNT(*) as total_records
FROM transaction_classifications
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY pg_typeof(code);

SELECT 
    'projects' as table_name,
    pg_typeof(code) as code_data_type,
    COUNT(*) as total_records
FROM projects
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY pg_typeof(code);

SELECT 
    'analysis_work_items' as table_name,
    pg_typeof(code) as code_data_type,
    COUNT(*) as total_records
FROM analysis_work_items
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY pg_typeof(code);

SELECT 
    'sub_tree' as table_name,
    pg_typeof(code) as code_data_type,
    COUNT(*) as total_records
FROM sub_tree
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
GROUP BY pg_typeof(code);

-- ========================================
-- PART 2: SHOW ACTUAL CODE VALUES
-- ========================================

-- Transaction Classifications
SELECT 
    'CLASSIFICATION' as type,
    id,
    code,
    code::text as code_as_text,
    name
FROM transaction_classifications
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- Projects
SELECT 
    'PROJECT' as type,
    id,
    code,
    code::text as code_as_text,
    name
FROM projects
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- Analysis Work Items
SELECT 
    'ANALYSIS' as type,
    id,
    code,
    code::text as code_as_text,
    name
FROM analysis_work_items
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- Sub Tree
SELECT 
    'SUB_TREE' as type,
    id,
    code,
    code::text as code_as_text,
    description
FROM sub_tree
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
ORDER BY code;

-- ========================================
-- PART 3: TEST SPECIFIC CODE LOOKUPS
-- ========================================

-- Test if code "7" exists (from CSV: 7.0)
SELECT 'Test code 7' as test, id, code, name
FROM transaction_classifications
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND code::text = '7';

-- Test if code "1" exists (from CSV: 1.0)
SELECT 'Test code 1' as test, id, code, name
FROM projects
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND code::text = '1';

-- Test if code "93" exists (from CSV: 93.0)
SELECT 'Test code 93' as test, id, code, description
FROM sub_tree
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND code::text = '93';

-- Test if code "30000" exists (from CSV: 30000.0)
SELECT 'Test code 30000' as test, id, code, description
FROM sub_tree
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114'
  AND code::text = '30000';
