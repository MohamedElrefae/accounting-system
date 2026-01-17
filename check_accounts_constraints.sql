-- Check current constraints on accounts table
-- This will help identify the problematic ux_accounts_code constraint

SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
    LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
WHERE tc.table_name = 'accounts' 
    AND tc.table_schema = 'public'
    AND (tc.constraint_type = 'UNIQUE' OR tc.constraint_type = 'PRIMARY KEY')
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- Also check indexes that might be causing the issue
SELECT 
    indexname as index_name,
    indexdef as index_definition
FROM pg_indexes 
WHERE tablename = 'accounts' 
    AND schemaname = 'public'
    AND indexname LIKE '%code%'
ORDER BY indexname;
