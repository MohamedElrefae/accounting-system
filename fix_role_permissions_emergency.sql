-- =====================================================================
-- EMERGENCY FIX: Role Permission Saving Issues
-- This fixes the save_role_permissions RPC and adds emergency fallback
-- =====================================================================

-- 1. Drop and recreate the save_role_permissions function with proper error handling
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
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Permission names array is required',
            'errors', ARRAY['Permission names cannot be null']
        );
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

    -- Clear existing permissions for this role
    DELETE FROM role_permissions WHERE role_id = p_role_id;

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
            RAISE NOTICE 'Successfully assigned permission: %', permission_name;

        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                errors := errors || ('Error with ' || permission_name || ': ' || SQLERRM);
                RAISE NOTICE 'Error assigning permission %: %', permission_name, SQLERRM;
        END;
    END LOOP;

    -- Return detailed result
    RETURN jsonb_build_object(
        'success', success_count > 0,
        'role_id', p_role_id,
        'permissions_assigned', success_count,
        'errors_count', error_count,
        'total_permissions', array_length(p_permission_names, 1),
        'error_messages', errors,
        'message', 'Assigned ' || success_count || ' permissions with ' || error_count || ' errors'
    );
END;
$$;

-- 2. Create emergency direct role permission assignment function
CREATE OR REPLACE FUNCTION assign_permission_to_role(
    role_name TEXT,
    permission_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_id INTEGER;
    v_permission_id INTEGER;
BEGIN
    -- Find role by name
    SELECT id INTO v_role_id FROM roles WHERE name = role_name;
    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Role not found: ' || role_name
        );
    END IF;

    -- Find permission by name
    SELECT id INTO v_permission_id FROM permissions WHERE name = permission_name;
    IF v_permission_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Permission not found: ' || permission_name
        );
    END IF;

    -- Insert role-permission mapping
    INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
    VALUES (v_role_id, v_permission_id, auth.uid(), NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Permission assigned successfully',
        'role_name', role_name,
        'permission_name', permission_name
    );
END;
$$;

-- 3. Create bulk permission assignment for emergency use
CREATE OR REPLACE FUNCTION assign_all_permissions_to_superadmin()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_super_role_id INTEGER;
    assigned_count INTEGER := 0;
BEGIN
    -- Find superadmin role
    SELECT id INTO v_super_role_id 
    FROM roles 
    WHERE name ILIKE '%super%' OR name ILIKE '%admin%' 
    ORDER BY 
        CASE 
            WHEN name ILIKE '%super%' THEN 1
            WHEN name ILIKE '%admin%' THEN 2
            ELSE 3
        END
    LIMIT 1;

    IF v_super_role_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No superadmin role found'
        );
    END IF;

    -- Clear existing permissions
    DELETE FROM role_permissions WHERE role_id = v_super_role_id;

    -- Assign all permissions to superadmin
    INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
    SELECT v_super_role_id, p.id, auth.uid(), NOW()
    FROM permissions p;

    GET DIAGNOSTICS assigned_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'All permissions assigned to superadmin',
        'role_id', v_super_role_id,
        'permissions_assigned', assigned_count
    );
END;
$$;

-- 4. Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION save_role_permissions(INTEGER, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION assign_permission_to_role(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION assign_all_permissions_to_superadmin() TO authenticated, service_role;

-- 5. Test the fixed function (run this to verify it works)
SELECT save_role_permissions(1, ARRAY['users.read', 'roles.read']);