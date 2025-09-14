-- Test query to verify expenses categories data for scrolling functionality
-- This query will help ensure we have enough data to test the scrolling issue

-- Check total count of expenses categories
SELECT 
    'Total Categories' as description,
    COUNT(*) as count
FROM expenses_categories ec
UNION ALL

-- Check count by level
SELECT 
    CONCAT('Level ', level, ' Categories') as description,
    COUNT(*) as count
FROM expenses_categories ec
GROUP BY level
ORDER BY level

UNION ALL

-- Check categories with children
SELECT 
    'Categories with Children' as description,
    COUNT(*) as count
FROM expenses_categories ec
WHERE ec.id IN (
    SELECT DISTINCT parent_id 
    FROM expenses_categories 
    WHERE parent_id IS NOT NULL
)

UNION ALL

-- Check active vs inactive categories
SELECT 
    CASE WHEN is_active THEN 'Active Categories' ELSE 'Inactive Categories' END as description,
    COUNT(*) as count
FROM expenses_categories ec
GROUP BY is_active

UNION ALL

-- Check linked account categories
SELECT 
    'Categories with Linked Accounts' as description,
    COUNT(*) as count
FROM expenses_categories ec
WHERE linked_account_id IS NOT NULL;

-- Get sample data to verify structure
SELECT 
    ec.code,
    ec.description,
    ec.level,
    ec.is_active,
    ec.add_to_cost,
    ec.parent_id,
    CASE WHEN ec.linked_account_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_linked_account,
    (SELECT COUNT(*) FROM expenses_categories WHERE parent_id = ec.id) as children_count
FROM expenses_categories ec
ORDER BY ec.path
LIMIT 50;