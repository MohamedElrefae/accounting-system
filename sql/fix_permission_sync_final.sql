-- =====================================================================
-- FINAL FIX: Permission Sync Issue
-- Based on diagnostic results - function exists but may have bugs
-- =====================================================================

-- Drop and recreate the function with correct logic
DROP FUNCTION IF EXISTS save_role_permissions(INTEGER, TEXT[]);

CREATE OR REPLACE FUNCTION save_role_permissions(
    p_role_id INTEGER,
    p_permission_names TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    permission_id INTEGER;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    errors TEXT[] := '{}';
    permission_name TEXT;
    existing_count INTEGER;
BEGIN
    -- Validate inputs
    IF p_role_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Role ID is required',
            'errors', ARRAY['Role ID cannot be null']
        );
    END IF;

    IF p_permission_names IS NULL THEN
        p_permission_names := ARRAY[]::TEXT[];
    END IF;

    -- Validate role exists
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Role not found',
            'role_id', p_role_id,
            'errors', ARRAY['Role with ID ' || p_role_id || ' does not exist']
        );
    END IF;

    -- Log existing permissions
    SELECT COUNT(*) INTO existing_count 
    FROM role_permissions 
    WHERE role_id = p_role_id;

    RAISE NOTICE '🔄 Role % had % existing permissions', p_role_id, existing_count;
    RAISE NOTICE '📋 Attempting to assign % new permissions', array_length(p_permission_names, 1);

    -- Clear existing permissions for this role
    DELETE FROM role_permissions WHERE role_id = p_role_id;
    RAISE NOTICE '🗑️ Cleared existing permissions for role %', p_role_id;

    -- If no permissions to assign, return success
    IF array_length(p_permission_names, 1) IS NULL OR array_length(p_permission_names, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'role_id', p_role_id,
            'permissions_assigned', 0,
            'errors_count', 0,
            'total_permissions', 0,
            'message', 'All permissions cleared for role'
        );
    END IF;

    -- Process each permission name and INSERT
    FOREACH permission_name IN ARRAY p_permission_names
    LOOP
        BEGIN
            -- Find permission by name
            SELECT id INTO permission_id
            FROM permissions
            WHERE name = permission_name;

            IF permission_id IS NULL THEN
                error_count := error_count + 1;
                errors := errors || ('Permission not found: ' || permission_name);
                RAISE NOTICE '❌ Permission not found: %', permission_name;
                CONTINUE;
            END IF;

            -- INSERT the role-permission mapping
            -- Using only the columns that exist in your table
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (p_role_id, permission_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;

            success_count := success_count + 1;
            RAISE NOTICE '✅ Successfully assigned permission: % (ID: %)', permission_name, permission_id;

        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                errors := errors || ('Error with ' || permission_name || ': ' || SQLERRM);
                RAISE NOTICE '❌ Error assigning permission %: %', permission_name, SQLERRM;
        END;
    END LOOP;

    -- Return detailed result
    RETURN jsonb_build_object(
        'success', success_count > 0 OR array_length(p_permission_names, 1) = 0,
        'role_id', p_role_id,
        'permissions_assigned', success_count,
        'errors_count', error_count,
        'total_permissions', array_length(p_permission_names, 1),
        'error_messages', errors,
        'message', 'Successfully assigned ' || success_count || ' permissions with ' || error_count || ' errors'
    );
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION save_role_permissions(INTEGER, TEXT[]) TO authenticated, service_role;

-- =====================================================================
-- VERIFICATION TEST
-- =====================================================================

DO $$
DECLARE
    test_role_id INTEGER;
    result JSONB;
    perm_count_before INTEGER;
    perm_count_after INTEGER;
    test_permissions TEXT[] := ARRAY['users.read', 'roles.read'];
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧪 TESTING FIXED FUNCTION';
    RAISE NOTICE '========================================';
    
    -- Get the first available role
    SELECT id INTO test_role_id FROM roles LIMIT 1;
    
    IF test_role_id IS NULL THEN
        RAISE NOTICE '❌ No roles found in system';
        RETURN;
    END IF;
    
    -- Count permissions before
    SELECT COUNT(*) INTO perm_count_before
    FROM role_permissions WHERE role_id = test_role_id;
    
    RAISE NOTICE '📊 Testing with role ID: %', test_role_id;
    RAISE NOTICE '📊 Permissions before: %', perm_count_before;
    RAISE NOTICE '📊 Test permissions: %', test_permissions;
    
    -- Call the function
    SELECT save_role_permissions(test_role_id, test_permissions) INTO result;
    
    RAISE NOTICE '📋 Function result: %', result;
    
    -- Count permissions after
    SELECT COUNT(*) INTO perm_count_after
    FROM role_permissions WHERE role_id = test_role_id;
    
    RAISE NOTICE '📊 Permissions after: %', perm_count_after;
    
    -- Verify success
    IF perm_count_after = array_length(test_permissions, 1) THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ SUCCESS! Function works correctly';
        RAISE NOTICE '✅ Assigned % permissions', perm_count_after;
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE '========================================';
        RAISE NOTICE '❌ FAILED! Expected % permissions but got %', array_length(test_permissions, 1), perm_count_after;
        RAISE NOTICE '========================================';
    END IF;
END;
$$;

-- =====================================================================
-- SHOW CURRENT STATE
-- =====================================================================

SELECT 
    '✅ Function Updated' as status,
    'save_role_permissions function has been recreated' as message;

-- Show sample of current role permissions
SELECT 
    r.name_ar as role_name,
    COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name_ar
ORDER BY permission_count DESC
LIMIT 10;
