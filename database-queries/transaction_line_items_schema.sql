-- =========================================================
-- Transaction Line Items Database Schema Queries
-- For use in database query editor to inspect the schema
-- =========================================================

-- 1. Get complete table structure and column details
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Get all indexes on the table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'transaction_line_items' 
    AND schemaname = 'public'
ORDER BY indexname;

-- 3. Get foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'transaction_line_items';

-- 4. Get check constraints
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
    AND constraint_name IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints
        WHERE table_name = 'transaction_line_items'
            AND constraint_type = 'CHECK'
    );

-- 5. Get functions related to transaction line items
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (routine_name ILIKE '%line_item%' 
         OR routine_name ILIKE '%transaction_line%'
         OR routine_definition ILIKE '%transaction_line_items%')
ORDER BY routine_name;

-- 6. Sample data from the table (first 10 records)
SELECT * 
FROM transaction_line_items 
ORDER BY created_at DESC 
LIMIT 10;

-- 7. Count records by organization
SELECT 
    organization_id,
    COUNT(*) as total_items,
    COUNT(CASE WHEN transaction_id IS NULL THEN 1 END) as template_items,
    COUNT(CASE WHEN transaction_id IS NOT NULL THEN 1 END) as actual_transaction_items
FROM transaction_line_items
GROUP BY organization_id
ORDER BY organization_id;

-- 8. Hierarchical structure analysis
WITH RECURSIVE item_hierarchy AS (
    -- Root items (no parent)
    SELECT 
        id,
        item_code,
        item_name,
        parent_id,
        organization_id,
        1 as level,
        item_code::text as path
    FROM transaction_line_items
    WHERE parent_id IS NULL 
        AND transaction_id IS NULL  -- Templates only
    
    UNION ALL
    
    -- Child items
    SELECT 
        t.id,
        t.item_code,
        t.item_name,
        t.parent_id,
        t.organization_id,
        h.level + 1,
        h.path || ' -> ' || t.item_code
    FROM transaction_line_items t
    JOIN item_hierarchy h ON t.parent_id = h.id
    WHERE t.transaction_id IS NULL  -- Templates only
)
SELECT 
    organization_id,
    level,
    COUNT(*) as items_count,
    MAX(length(path)) as max_path_length
FROM item_hierarchy
GROUP BY organization_id, level
ORDER BY organization_id, level;

-- 9. Code pattern analysis
SELECT 
    organization_id,
    CASE 
        WHEN item_code ~ '^[0-9]{4}$' AND item_code::integer % 1000 = 0 THEN 'Level 1 (x000)'
        WHEN item_code ~ '^[0-9]{4}$' AND item_code::integer % 100 = 0 THEN 'Level 2 (x100)'
        WHEN item_code ~ '^[0-9]{4}$' AND item_code::integer % 10 = 0 THEN 'Level 3 (x010)'
        WHEN item_code ~ '^[0-9]{4}$' THEN 'Level 4 (x001)'
        ELSE 'Non-standard pattern'
    END as code_pattern,
    COUNT(*) as count,
    MIN(item_code) as min_code,
    MAX(item_code) as max_code
FROM transaction_line_items
WHERE transaction_id IS NULL  -- Templates only
    AND item_code IS NOT NULL
GROUP BY organization_id, code_pattern
ORDER BY organization_id, code_pattern;

-- 10. Find the next available codes for each organization
SELECT 
    organization_id,
    'Level 1' as level_type,
    COALESCE(MAX(item_code::integer), 0) + 1000 as next_code
FROM transaction_line_items
WHERE transaction_id IS NULL
    AND item_code ~ '^[0-9]{4}$'
    AND item_code::integer % 1000 = 0
GROUP BY organization_id

UNION ALL

SELECT 
    organization_id,
    'Level 2' as level_type,
    COALESCE(MAX(item_code::integer), 0) + 100 as next_code
FROM transaction_line_items
WHERE transaction_id IS NULL
    AND item_code ~ '^[0-9]{4}$'
    AND item_code::integer % 100 = 0
    AND item_code::integer % 1000 != 0
GROUP BY organization_id

ORDER BY organization_id, level_type;

-- =========================================================
-- Verification Queries (run after operations)
-- =========================================================

-- Verify catalog items were created correctly
SELECT 
    'Catalog Items Created' as check_type,
    COUNT(*) as count
FROM transaction_line_items 
WHERE transaction_id IS NULL
    AND created_at > NOW() - INTERVAL '1 hour';

-- Verify hierarchical integrity
SELECT 
    'Orphaned Items' as check_type,
    COUNT(*) as count
FROM transaction_line_items t1
WHERE t1.parent_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM transaction_line_items t2 
        WHERE t2.id = t1.parent_id
    );

-- Verify code uniqueness within organization
SELECT 
    'Duplicate Codes' as check_type,
    COUNT(*) as count
FROM (
    SELECT organization_id, item_code, COUNT(*) as duplicates
    FROM transaction_line_items
    WHERE transaction_id IS NULL
        AND item_code IS NOT NULL
    GROUP BY organization_id, item_code
    HAVING COUNT(*) > 1
) duplicates;

-- Performance check: Index usage
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM transaction_line_items 
WHERE organization_id = 'sample-org-id' 
    AND transaction_id IS NULL 
    AND is_active = true
ORDER BY item_code;