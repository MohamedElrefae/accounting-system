-- =====================================================================
-- SIMPLE TEST: Does the function work at all?
-- =====================================================================

-- Step 1: Get a role ID to test with
SELECT 
    'Available Roles' as info,
    id,
    name,
    name_ar
FROM roles
ORDER BY id
LIMIT 5;

-- Step 2: Get some permission names to test with
SELECT 
    'Available Permissions' as info,
    name
FROM permissions
ORDER BY name
LIMIT 10;

-- Step 3: Test the function (REPLACE 1 with actual role ID from step 1)
SELECT save_role_permissions(
    1,  -- <-- CHANGE THIS to a role ID from step 1
    ARRAY['users.read', 'users.create']  -- <-- Use permission names from step 2
) as result;

-- Step 4: Check if it worked
SELECT 
    'Result Check' as info,
    r.id as role_id,
    r.name as role_name,
    p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = 1  -- <-- CHANGE THIS to match step 3
ORDER BY p.name;
