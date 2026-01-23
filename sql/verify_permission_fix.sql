-- =====================================================================
-- VERIFICATION: Check if permission sync fix is working
-- Run this AFTER applying the fix
-- =====================================================================

-- 1. Verify function was updated
SELECT 
    '1. Function Status' as check_step,
    proname as function_name,
    pg_get_functiondef(oid) LIKE '%Successfully assigned%' as has_new_logic
FROM pg_proc 
WHERE proname = 'save_role_permissions';

-- 2. Test with actual role
DO $$
DECLARE
    test_role_id INTEGER;
    test_permissions TEXT[] := ARRAY['users.read', 'users.create', 'roles.read'];
    result JSONB;
    actual_perms TEXT[];
    verification_passed BOOLEAN := false;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔍 VERIFICATION TEST';
    RAISE NOTICE '========================================';
    
    -- Get first role
    SELECT id INTO test_role_id FROM roles LIMIT 1;
    
    IF test_role_id IS NULL THEN
        RAISE NOTICE '❌ No roles found';
        RETURN;
    END IF;
    
    RAISE NOTICE '📋 Testing with role ID: %', test_role_id;
    RAISE NOTICE '📋 Assigning permissions: %', test_permissions;
    
    -- Call function
    SELECT save_role_permissions(test_role_id, test_permissions) INTO result;
    
    RAISE NOTICE '📊 RPC Result: %', result;
    
    -- Verify permissions were actually saved
    SELECT array_agg(p.name ORDER BY p.name) INTO actual_perms
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = test_role_id;
    
    RAISE NOTICE '📊 Actual permissions in DB: %', actual_perms;
    
    -- Check if all expected permissions are present
    IF array_length(actual_perms, 1) >= array_length(test_permissions, 1) THEN
        verification_passed := true;
    END IF;
    
    RAISE NOTICE '========================================';
    IF verification_passed THEN
        RAISE NOTICE '✅ VERIFICATION PASSED';
        RAISE NOTICE '✅ Permissions are being saved correctly';
    ELSE
        RAISE NOTICE '❌ VERIFICATION FAILED';
        RAISE NOTICE '❌ Expected: %, Got: %', test_permissions, actual_perms;
    END IF;
    RAISE NOTICE '========================================';
END;
$$;

-- 3. Show current role-permission counts
SELECT 
    '3. Current State' as check_step,
    r.name_ar as role_name,
    COUNT(rp.permission_id) as permission_count,
    CASE 
        WHEN COUNT(rp.permission_id) > 0 THEN '✅ Has permissions'
        ELSE '⚠️ No permissions'
    END as status
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name_ar
ORDER BY permission_count DESC;
