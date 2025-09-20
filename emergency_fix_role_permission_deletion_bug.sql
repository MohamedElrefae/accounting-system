-- =====================================================================
-- EMERGENCY FIX: Role Permission Deletion Bug
-- This fixes the critical bug where saving permissions deletes them instead
-- =====================================================================

-- 1. First, let's check what's happening with the current function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'save_role_permissions';

-- 2. Drop and completely recreate the save_role_permissions function with better logic
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

    -- Clear existing permissions for this role
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

    -- Process each permission name
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

            -- Insert the role-permission mapping
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
        'message', 'Assigned ' || success_count || ' permissions with ' || error_count || ' errors'
    );
END;
$$;

-- 3. Create an emergency function to assign all permissions to a specific role
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

    -- Assign all permissions to the role
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

-- 4. Create function to assign specific permissions with multi-select
CREATE OR REPLACE FUNCTION multi_assign_permissions_to_roles(
    role_ids INTEGER[],
    permission_names TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    role_id INTEGER;
    permission_name TEXT;
    permission_id INTEGER;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    total_operations INTEGER := 0;
BEGIN
    -- Calculate total operations expected
    total_operations := array_length(role_ids, 1) * array_length(permission_names, 1);

    -- Loop through each role
    FOREACH role_id IN ARRAY role_ids
    LOOP
        -- Loop through each permission
        FOREACH permission_name IN ARRAY permission_names
        LOOP
            BEGIN
                -- Find permission by name
                SELECT id INTO permission_id
                FROM permissions
                WHERE name = permission_name;

                IF permission_id IS NOT NULL THEN
                    -- Insert role-permission mapping (ignore duplicates)
                    INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
                    VALUES (role_id, permission_id, auth.uid(), NOW())
                    ON CONFLICT (role_id, permission_id) DO NOTHING;

                    success_count := success_count + 1;
                ELSE
                    error_count := error_count + 1;
                END IF;

            EXCEPTION
                WHEN OTHERS THEN
                    error_count := error_count + 1;
            END;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', success_count > 0,
        'permissions_assigned', success_count,
        'errors_count', error_count,
        'total_operations', total_operations,
        'message', 'Multi-assign completed: ' || success_count || ' assignments, ' || error_count || ' errors'
    );
END;
$$;

-- 5. Grant permissions on the functions
GRANT EXECUTE ON FUNCTION save_role_permissions(INTEGER, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION emergency_assign_all_permissions_to_role(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION multi_assign_permissions_to_roles(INTEGER[], TEXT[]) TO authenticated, service_role;

-- 6. Test the fixed function (this should work now)
-- Replace 1 with an actual role ID from your system
SELECT save_role_permissions(1, ARRAY['users.read', 'roles.read']);

-- Check if permissions were actually assigned
SELECT 
    r.name as role_name,
    p.name as permission_name,
    p.name_ar as permission_name_ar
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = 1
ORDER BY p.name;

-- Emergency command to give all permissions to admin role
-- SELECT emergency_assign_all_permissions_to_role('admin');