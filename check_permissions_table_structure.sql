-- =====================================================================
-- CHECK PERMISSIONS TABLE STRUCTURE - Run this first to see your table
-- =====================================================================

-- 1. Show all columns in permissions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'permissions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Show sample permissions data
SELECT 
    id,
    name,
    resource,
    action,
    description,
    created_at
FROM permissions 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Count current permissions
SELECT 
    'Total permissions' as metric,
    COUNT(*) as count
FROM permissions
UNION ALL
SELECT 
    'Permissions with resource' as metric,
    COUNT(*) as count
FROM permissions 
WHERE resource IS NOT NULL
UNION ALL
SELECT 
    'Permissions with action' as metric,
    COUNT(*) as count
FROM permissions 
WHERE action IS NOT NULL;

-- 4. Check for duplicates before running fix
SELECT 
    name,
    COUNT(*) as duplicate_count
FROM permissions
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;