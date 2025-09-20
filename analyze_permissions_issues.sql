-- =====================================================================
-- ANALYZE PERMISSIONS STRUCTURE - Copy and run to identify issues
-- =====================================================================

-- 1. Check current permissions count and structure
SELECT 
    'Total Permissions Count' as check_type,
    COUNT(*) as count
FROM permissions;

-- 2. Check permissions missing resource/action fields
SELECT 
    'Missing Resource Field' as check_type,
    COUNT(*) as count
FROM permissions 
WHERE resource IS NULL OR resource = '';

SELECT 
    'Missing Action Field' as check_type,
    COUNT(*) as count
FROM permissions 
WHERE action IS NULL OR action = '';

-- 3. Show all current permissions with their resource/action status
SELECT 
    id,
    name,
    resource,
    action,
    description,
    CASE 
        WHEN resource IS NULL OR resource = '' THEN '❌ Missing Resource'
        WHEN action IS NULL OR action = '' THEN '❌ Missing Action'
        ELSE '✅ Complete'
    END as status
FROM permissions 
ORDER BY 
    CASE 
        WHEN resource IS NULL OR resource = '' THEN 0
        WHEN action IS NULL OR action = '' THEN 1
        ELSE 2
    END,
    name;

-- 4. Check permissions by module/resource
SELECT 
    COALESCE(resource, 'NO_RESOURCE') as resource_group,
    COUNT(*) as permission_count,
    STRING_AGG(DISTINCT action, ', ') as actions_available
FROM permissions 
GROUP BY resource
ORDER BY permission_count DESC;

-- 5. Check role_permissions table structure
SELECT 
    'Role Permissions Count' as check_type,
    COUNT(*) as count
FROM role_permissions;

-- 6. Check roles with permission counts
SELECT 
    r.name as role_name,
    COUNT(rp.permission_id) as assigned_permissions,
    r.id as role_id
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name
ORDER BY assigned_permissions DESC;

-- 7. Find any broken role_permissions relationships
SELECT 
    'Broken Role-Permission Links' as check_type,
    COUNT(*) as count
FROM role_permissions rp
LEFT JOIN roles r ON rp.role_id = r.id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.id IS NULL OR p.id IS NULL;

-- 8. Check what modules/features need permissions
SELECT 
    'Expected Permission Resources' as info,
    'Should have permissions for: transactions, users, roles, permissions, organizations, projects, accounts, reports, analysis_work_items, expenses_categories, cost_centers, etc.' as expected_resources;