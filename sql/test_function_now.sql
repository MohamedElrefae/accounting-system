-- =====================================================================
-- SIMPLE FUNCTION TEST
-- Run this as ONE query to test if the function works
-- =====================================================================

-- Test the function with a real role
SELECT save_role_permissions(
    (SELECT id FROM roles ORDER BY id LIMIT 1),
    ARRAY['users.read', 'users.create', 'roles.read']
) as function_result;

-- Check if permissions were saved
SELECT 
    'Verification' as check_type,
    r.id as role_id,
    r.name as role_name,
    COUNT(rp.permission_id) as permissions_saved,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as permission_names
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = (SELECT id FROM roles ORDER BY id LIMIT 1)
GROUP BY r.id, r.name;
