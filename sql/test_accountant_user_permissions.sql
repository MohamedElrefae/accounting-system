-- ============================================================================
-- TEST SPECIFIC ACCOUNTANT USER PERMISSIONS
-- Replace 'tecofficepc@gmail.com' with actual accountant email from screenshots
-- ============================================================================

-- PART 1: GET USER DETAILS
-- ============================================================================
SELECT 
    '=== USER PROFILE DETAILS ===' as section;

SELECT 
    id,
    email,
    full_name_ar,
    role,
    is_super_admin,
    organization_id,
    department,
    job_title,
    created_at
FROM public.user_profiles
WHERE email = 'tecofficepc@gmail.com';

-- PART 2: GET USER'S ROLES
-- ============================================================================
SELECT 
    '=== USER ROLE ASSIGNMENTS ===' as section;

SELECT 
    ur.id,
    r.name as role_name,
    r.slug as role_slug,
    ur.organization_id,
    o.name as organization_name,
    ur.project_id,
    p.name as project_name,
    ur.created_at
FROM public.user_roles ur
JOIN public.user_profiles up ON ur.user_id = up.id
LEFT JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.organizations o ON ur.organization_id = o.id
LEFT JOIN public.projects p ON ur.project_id = p.id
WHERE up.email = 'tecofficepc@gmail.com';

-- PART 3: GET USER'S PERMISSIONS (via roles)
-- ============================================================================
SELECT 
    '=== USER PERMISSIONS VIA ROLES ===' as section;

SELECT DISTINCT
    p.name as permission_name,
    p.code as permission_code,
    p.description,
    r.name as granted_by_role
FROM public.user_roles ur
JOIN public.user_profiles up ON ur.user_id = up.id
JOIN public.roles r ON ur.role_id = r.id
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE up.email = 'tecofficepc@gmail.com'
ORDER BY p.name;

-- PART 4: GET USER'S ORGANIZATION MEMBERSHIPS
-- ============================================================================
SELECT 
    '=== USER ORGANIZATION MEMBERSHIPS ===' as section;

SELECT 
    uo.organization_id,
    o.name as organization_name,
    o.code as organization_code,
    uo.is_primary,
    uo.created_at
FROM public.user_organizations uo
JOIN public.user_profiles up ON uo.user_id = up.id
JOIN public.organizations o ON uo.organization_id = o.id
WHERE up.email = 'tecofficepc@gmail.com';

-- PART 5: GET USER'S PROJECT ASSIGNMENTS
-- ============================================================================
SELECT 
    '=== USER PROJECT ASSIGNMENTS ===' as section;

SELECT 
    up_assign.project_id,
    p.name as project_name,
    p.code as project_code,
    p.organization_id,
    o.name as organization_name,
    up_assign.role as project_role,
    up_assign.created_at
FROM public.user_projects up_assign
JOIN public.user_profiles prof ON up_assign.user_id = prof.id
JOIN public.projects p ON up_assign.project_id = p.id
LEFT JOIN public.organizations o ON p.organization_id = o.id
WHERE prof.email = 'tecofficepc@gmail.com';

-- PART 6: TEST SPECIFIC PERMISSION CHECKS
-- ============================================================================
SELECT 
    '=== CHECK SPECIFIC PERMISSIONS ===' as section;

WITH user_permissions AS (
    SELECT DISTINCT p.code
    FROM public.user_roles ur
    JOIN public.user_profiles up ON ur.user_id = up.id
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE up.email = 'tecofficepc@gmail.com'
)
SELECT 
    'organizations.manage' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'organizations.manage') as has_permission
UNION ALL
SELECT 
    'organizations.view' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'organizations.view') as has_permission
UNION ALL
SELECT 
    'projects.manage' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'projects.manage') as has_permission
UNION ALL
SELECT 
    'projects.view' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'projects.view') as has_permission
UNION ALL
SELECT 
    'transactions.create' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'transactions.create') as has_permission
UNION ALL
SELECT 
    'transactions.view.all' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'transactions.view.all') as has_permission
UNION ALL
SELECT 
    'fiscal.manage' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'fiscal.manage') as has_permission
UNION ALL
SELECT 
    'accounts.manage' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'accounts.manage') as has_permission
UNION ALL
SELECT 
    'accounts.view' as permission,
    EXISTS(SELECT 1 FROM user_permissions WHERE code = 'accounts.view') as has_permission;

-- PART 7: SIMULATE get_user_auth_data RPC
-- ============================================================================
SELECT 
    '=== SIMULATED get_user_auth_data OUTPUT ===' as section;

WITH user_info AS (
    SELECT id FROM public.user_profiles WHERE email = 'tecofficepc@gmail.com'
)
SELECT json_build_object(
    'profile', (
        SELECT row_to_json(up.*)
        FROM public.user_profiles up
        WHERE up.email = 'tecofficepc@gmail.com'
    ),
    'roles', (
        SELECT json_agg(DISTINCT r.slug)
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = (SELECT id FROM user_info)
    ),
    'permissions', (
        SELECT json_agg(DISTINCT p.code)
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = (SELECT id FROM user_info)
    ),
    'organizations', (
        SELECT json_agg(DISTINCT json_build_object(
            'id', o.id,
            'name', o.name,
            'code', o.code
        ))
        FROM public.user_organizations uo
        JOIN public.organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = (SELECT id FROM user_info)
    ),
    'projects', (
        SELECT json_agg(DISTINCT json_build_object(
            'id', p.id,
            'name', p.name,
            'code', p.code,
            'organization_id', p.organization_id
        ))
        FROM public.user_projects up_assign
        JOIN public.projects p ON up_assign.project_id = p.id
        WHERE up_assign.user_id = (SELECT id FROM user_info)
    )
) as auth_data;
