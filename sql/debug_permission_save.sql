-- =====================================================================
-- DEBUG: What happens when we try to save permissions
-- =====================================================================

-- 1. Check current function definition
SELECT 
    '1. Current Function' as step,
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'save_role_permissions';

-- 2. Test with a real role and see detailed output
DO $$
DECLARE
    test_role_id INTEGER;
    test_permissions TEXT[] := ARRAY['users.read', 'users.create'];
    result JSONB;
    perm_before INTEGER;
    perm_after INTEGER;
BEGIN
    -- Get first role
    SELECT id INTO test_role_id FROM roles ORDER BY id LIMIT 1;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DETAILED DEBUG TEST';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Role ID: %', test_role_id;
    
    -- Count before
    SELECT COUNT(*) INTO perm_before
    FROM role_permissions WHERE role_id = test_role_id;
    RAISE NOTICE 'Permissions BEFORE: %', perm_before;
    
    -- Call function
    RAISE NOTICE 'Calling save_role_permissions...';
    SELECT save_role_permissions(test_role_id, test_permissions) INTO result;
    
    RAISE NOTICE 'Function returned: %', result;
    
    -- Count after
    SELECT COUNT(*) INTO perm_after
    FROM role_permissions WHERE role_id = test_role_id;
    RAISE NOTICE 'Permissions AFTER: %', perm_after;
    
    -- Show actual permissions
    RAISE NOTICE 'Actual permissions in DB:';
    FOR r IN (
        SELECT p.name 
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = test_role_id
        ORDER BY p.name
    ) LOOP
        RAISE NOTICE '  - %', r.name;
    END LOOP;
    
    RAISE NOTICE '========================================';
    
    IF perm_after > perm_before THEN
        RAISE NOTICE '✅ SUCCESS: Permissions were saved';
    ELSE
        RAISE NOTICE '❌ FAILED: Permissions were NOT saved';
        RAISE NOTICE 'Expected: %, Got: %', array_length(test_permissions, 1), perm_after;
    END IF;
    
    RAISE NOTICE '========================================';
END;
$$;

-- 3. Check if permissions table has any constraints that might block inserts
SELECT 
    '3. Table Constraints' as step,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'role_permissions'::regclass;

-- 4. Check if there's a unique constraint on role_id + permission_id
SELECT 
    '4. Unique Constraints' as step,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'role_permissions';
