-- =====================================================================
-- FINAL FIX: Ambiguous Column Reference
-- The issue: "column reference permission_id is ambiguous"
-- Solution: Explicitly qualify column names with table aliases
-- =====================================================================

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
    v_permission_id INTEGER;  -- Changed variable name to avoid conflict
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
            'message', 'Role ID is required'
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
            'role_id', p_role_id
        );
    END IF;

    -- Count existing permissions
    SELECT COUNT(*) INTO existing_count 
    FROM role_permissions 
    WHERE role_id = p_role_id;

    RAISE NOTICE '🔄 Role % had % existing permissions', p_role_id, existing_count;

    -- Clear existing permissions
    DELETE FROM role_permissions WHERE role_id = p_role_id;

    -- If no permissions to assign, return success
    IF array_length(p_permission_names, 1) IS NULL OR array_length(p_permission_names, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'role_id', p_role_id,
            'permissions_assigned', 0,
            'message', 'All permissions cleared for role'
        );
    END IF;

    -- Process each permission
    FOREACH permission_name IN ARRAY p_permission_names
    LOOP
        BEGIN
            -- Find permission by name (explicitly use p.id to avoid ambiguity)
            SELECT p.id INTO v_permission_id
            FROM permissions p
            WHERE p.name = permission_name;

            IF v_permission_id IS NULL THEN
                error_count := error_count + 1;
                errors := errors || ('Permission not found: ' || permission_name);
                RAISE NOTICE '❌ Permission not found: %', permission_name;
                CONTINUE;
            END IF;

            -- Insert the role-permission mapping
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (p_role_id, v_permission_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;

            success_count := success_count + 1;
            RAISE NOTICE '✅ Assigned: % (ID: %)', permission_name, v_permission_id;

        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                errors := errors || ('Error: ' || permission_name || ' - ' || SQLERRM);
                RAISE NOTICE '❌ Error: % - %', permission_name, SQLERRM;
        END;
    END LOOP;

    -- Return result
    RETURN jsonb_build_object(
        'success', success_count > 0,
        'role_id', p_role_id,
        'permissions_assigned', success_count,
        'errors_count', error_count,
        'total_permissions', array_length(p_permission_names, 1),
        'error_messages', errors,
        'message', 'Successfully assigned ' || success_count || ' permissions with ' || error_count || ' errors'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_role_permissions(INTEGER, TEXT[]) TO authenticated, service_role;

-- =====================================================================
-- TEST THE FIX
-- =====================================================================

-- Test with actual data
SELECT save_role_permissions(
    (SELECT id FROM roles ORDER BY id LIMIT 1),
    ARRAY['users.read', 'users.create', 'roles.read']
) as test_result;

-- Verify permissions were saved
SELECT 
    'Verification' as check_type,
    r.name as role_name,
    COUNT(rp.permission_id) as permissions_saved,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as permission_list
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = (SELECT id FROM roles ORDER BY id LIMIT 1)
GROUP BY r.name;
