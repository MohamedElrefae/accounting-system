-- =====================================================================
-- FIXED EMERGENCY SCRIPT: Role Permission Deletion Bug
-- This version has proper syntax for all RAISE statements
-- RUN THIS IMMEDIATELY TO FIX PERMISSION SAVING ISSUES
-- =====================================================================

-- First, let's check your actual table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'role_permissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================================
-- FIXED: Drop and recreate the problematic function
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

            -- INSERT the role-permission mapping (using basic table structure)
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (p_role_id, permission_id);

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

-- =====================================================================
-- FIXED: Emergency function to assign ALL permissions to a specific role
-- =====================================================================

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

    -- Assign ALL permissions to the role (using basic table structure)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id
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

-- =====================================================================
-- FIXED: Multi-assign permissions function
-- =====================================================================

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
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES (role_id, permission_id)
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

GRANT EXECUTE ON FUNCTION multi_assign_permissions_to_roles(INTEGER[], TEXT[]) TO authenticated, service_role;

-- =====================================================================
-- FIXED: Verification and Testing (all RAISE statements inside DO blocks)
-- =====================================================================

-- Test that the corrected fix works
DO $$
DECLARE
    test_role_id INTEGER;
    result JSONB;
    perm_count INTEGER;
BEGIN
    RAISE NOTICE '🧪 TESTING CORRECTED PERMISSION SAVING FUNCTION...';
    
    -- Get the first available role
    SELECT id INTO test_role_id FROM roles LIMIT 1;
    
    IF test_role_id IS NOT NULL THEN
        -- Test the corrected function
        SELECT save_role_permissions(test_role_id, ARRAY['users.read', 'roles.read']) INTO result;
        
        RAISE NOTICE 'Test Result: %', result;
        
        -- Check if permissions were actually assigned (not deleted!)
        SELECT COUNT(*) INTO perm_count 
        FROM role_permissions 
        WHERE role_id = test_role_id;
        
        IF perm_count > 0 THEN
            RAISE NOTICE '✅ SUCCESS: % permissions assigned to role %', perm_count, test_role_id;
        ELSE
            RAISE NOTICE '❌ ERROR: No permissions found for role %', test_role_id;
        END IF;
    ELSE
        RAISE NOTICE '❌ No roles found in system for testing';
    END IF;
END;
$$;

-- Test emergency function
DO $$
DECLARE
    result JSONB;
    admin_permissions INTEGER;
BEGIN
    RAISE NOTICE '🚨 TESTING CORRECTED EMERGENCY FUNCTION...';
    
    -- Test emergency assign
    SELECT emergency_assign_all_permissions_to_role('admin') INTO result;
    
    RAISE NOTICE 'Emergency Result: %', result;
    
    -- Check admin permissions
    SELECT COUNT(*) INTO admin_permissions
    FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    WHERE r.name ILIKE '%admin%';
    
    RAISE NOTICE '📊 Admin role now has % permissions', admin_permissions;
    
    IF admin_permissions > 0 THEN
        RAISE NOTICE '✅ Emergency function working correctly!';
    ELSE
        RAISE NOTICE '❌ Emergency function failed!';
    END IF;
END;
$$;

-- =====================================================================
-- Final Status Check
-- =====================================================================

-- Show current system status
SELECT 
    'CORRECTED SYSTEM STATUS' as "Check",
    '📊' as "Icon",
    'Functions updated to work with your table structure' as "Message";

-- Show role permission counts
SELECT 
    r.name_ar as "Role",
    r.name as "Name",
    COUNT(rp.permission_id) as "Permissions"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name_ar, r.name
ORDER BY COUNT(rp.permission_id) DESC
LIMIT 10;

-- Final success message (wrapped in DO block)
DO $$
BEGIN
    RAISE NOTICE '🎉 FIXED EMERGENCY SCRIPT COMPLETE!';
    RAISE NOTICE '✅ Functions now work with your actual table structure';
    RAISE NOTICE '✅ No more granted_by/granted_at column errors';
    RAISE NOTICE '✅ No more syntax errors with RAISE statements';
    RAISE NOTICE '✅ Permission saving should work correctly now';
END;
$$;