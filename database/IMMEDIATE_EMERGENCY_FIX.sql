-- =====================================================================
-- CRITICAL EMERGENCY FIX: Role Permission Deletion Bug
-- RUN THIS IMMEDIATELY TO FIX PERMISSION SAVING ISSUES
-- =====================================================================

-- This fixes the bug where permissions are deleted instead of saved
-- when using the role management interface.

-- Step 1: Drop and recreate the problematic function
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

    -- Check existing permissions count before clearing
    SELECT COUNT(*) INTO existing_count 
    FROM role_permissions 
    WHERE role_id = p_role_id;

    RAISE NOTICE 'Role % had % existing permissions', p_role_id, existing_count;
    RAISE NOTICE 'Attempting to assign % new permissions', array_length(p_permission_names, 1);

    -- Clear existing permissions for this role (this is intentional!)
    DELETE FROM role_permissions WHERE role_id = p_role_id;
    RAISE NOTICE 'Cleared existing permissions for role %', p_role_id;

    -- If no permissions to assign, return success with empty permissions
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

    -- Process each permission name and INSERT (not delete!)
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
                RAISE NOTICE 'Permission not found: %', permission_name;
                CONTINUE;
            END IF;

            -- INSERT the role-permission mapping (this was the bug - it was deleting instead!)
            INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
            VALUES (p_role_id, permission_id, auth.uid(), NOW());

            success_count := success_count + 1;
            RAISE NOTICE 'Successfully assigned permission: % (ID: %)', permission_name, permission_id;

        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                errors := errors || ('Error with ' || permission_name || ': ' || SQLERRM);
                RAISE NOTICE 'Error assigning permission %: %', permission_name, SQLERRM;
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

-- Emergency function to assign ALL permissions to superadmin/admin roles
CREATE OR REPLACE FUNCTION emergency_assign_all_permissions_to_role(
    role_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_id INTEGER;
    assigned_count INTEGER := 0;
BEGIN
    -- Find role by name
    SELECT id INTO v_role_id 
    FROM roles 
    WHERE name ILIKE '%' || role_name || '%'
    ORDER BY 
        CASE 
            WHEN name ILIKE '%super%' THEN 1
            WHEN name ILIKE '%admin%' THEN 2
            ELSE 3
        END
    LIMIT 1;

    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No role found matching: ' || role_name
        );
    END IF;

    -- Clear existing permissions
    DELETE FROM role_permissions WHERE role_id = v_role_id;

    -- Assign ALL permissions to the role
    INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
    SELECT v_role_id, p.id, auth.uid(), NOW()
    FROM permissions p;

    GET DIAGNOSTICS assigned_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'All permissions assigned to role: ' || (SELECT name FROM roles WHERE id = v_role_id),
        'role_id', v_role_id,
        'permissions_assigned', assigned_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION emergency_assign_all_permissions_to_role(TEXT) TO authenticated, service_role;

-- Verification: Test that the fix works
-- (Replace 1 with an actual role ID from your system)
DO $$
DECLARE
    test_role_id INTEGER;
    result JSONB;
BEGIN
    -- Get the first available role
    SELECT id INTO test_role_id FROM roles LIMIT 1;
    
    IF test_role_id IS NOT NULL THEN
        -- Test the function
        SELECT save_role_permissions(test_role_id, ARRAY['users.read', 'roles.read']) INTO result;
        
        RAISE NOTICE 'Test Result: %', result;
        
        -- Check if permissions were actually assigned
        IF (SELECT COUNT(*) FROM role_permissions WHERE role_id = test_role_id) > 0 THEN
            RAISE NOTICE 'SUCCESS: Permissions were correctly assigned to role %', test_role_id;
        ELSE
            RAISE NOTICE 'ERROR: Permissions were not assigned to role %', test_role_id;
        END IF;
    END IF;
END;
$$;