-- =====================================================================
-- VERIFY COMPREHENSIVE PERMISSIONS FIX
-- Run this after the permissions fix to confirm everything worked
-- =====================================================================

-- 1. Check total permissions count (should be 61+)
SELECT 
    '📊 Total Permissions Count' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 61 THEN '✅ SUCCESS: 61+ permissions found'
        ELSE '⚠️ WARNING: Less than 61 permissions'
    END as status
FROM permissions;

-- 2. Check permissions with proper resource/action fields
SELECT 
    '✅ Complete Permissions' as check_type,
    COUNT(*) as count
FROM permissions 
WHERE resource IS NOT NULL AND resource != '' 
  AND action IS NOT NULL AND action != '';

-- 3. Check for any remaining incomplete permissions
SELECT 
    '❌ Incomplete Permissions' as check_type,
    COUNT(*) as count
FROM permissions 
WHERE resource IS NULL OR resource = '' 
   OR action IS NULL OR action = '';

-- 4. Show permissions by resource (organized by module)
SELECT 
    resource as module,
    COUNT(*) as permission_count,
    STRING_AGG(action, ', ' ORDER BY action) as available_actions
FROM permissions 
WHERE resource IS NOT NULL AND resource != ''
GROUP BY resource
ORDER BY 
    CASE resource
        WHEN 'system' THEN 1
        WHEN 'users' THEN 2
        WHEN 'roles' THEN 3
        WHEN 'permissions' THEN 4
        WHEN 'organizations' THEN 5
        WHEN 'projects' THEN 6
        WHEN 'transactions' THEN 7
        WHEN 'transaction_line_items' THEN 8
        WHEN 'accounts' THEN 9
        ELSE 10
    END,
    resource;

-- 5. Show all permissions for enterprise management validation
SELECT 
    '📋 All Permissions List' as info,
    resource,
    action,
    name,
    description
FROM permissions 
ORDER BY resource, action, name;

-- 6. Check role-permission assignments still work
SELECT 
    '🔗 Role Assignments Check' as check_type,
    r.name as role_name,
    COUNT(rp.permission_id) as assigned_permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name
ORDER BY assigned_permissions DESC;

-- 7. Final status summary
SELECT 
    '🎉 PERMISSIONS FIX SUMMARY' as final_status,
    CONCAT(
        (SELECT COUNT(*) FROM permissions), 
        ' total permissions created with ',
        (SELECT COUNT(*) FROM permissions WHERE resource IS NOT NULL AND action IS NOT NULL),
        ' having proper resource/action fields'
    ) as result;