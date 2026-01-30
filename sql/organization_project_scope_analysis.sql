-- ============================================================================
-- ORGANIZATION & PROJECT SCOPE ANALYSIS
-- Analyze how org/project scoping is implemented in database
-- ============================================================================

-- PART 1: ORGANIZATIONS TABLE
-- ============================================================================
SELECT 
    '=== ORGANIZATIONS TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'organizations'
ORDER BY ordinal_position;

SELECT 
    '=== ALL ORGANIZATIONS ===' as section;

SELECT 
    id,
    name,
    name_ar,
    code,
    is_active,
    created_at,
    created_by
FROM public.organizations
ORDER BY name;

-- PART 2: PROJECTS TABLE
-- ============================================================================
SELECT 
    '=== PROJECTS TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

SELECT 
    '=== ALL PROJECTS WITH ORG ===' as section;

SELECT 
    p.id,
    p.name,
    p.name_ar,
    p.code,
    p.organization_id,
    o.name as organization_name,
    p.is_active,
    p.created_at
FROM public.projects p
LEFT JOIN public.organizations o ON p.organization_id = o.id
ORDER BY o.name, p.name;

-- PART 3: USER-ORGANIZATION MEMBERSHIP
-- ============================================================================
SELECT 
    '=== USER_ORGANIZATIONS TABLE (if exists) ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_organizations'
ORDER BY ordinal_position;

SELECT 
    '=== USER ORG MEMBERSHIPS ===' as section;

SELECT 
    uo.user_id,
    up.email,
    up.full_name_ar,
    uo.organization_id,
    o.name as organization_name,
    uo.is_primary,
    uo.created_at
FROM public.user_organizations uo
LEFT JOIN public.user_profiles up ON uo.user_id = up.id
LEFT JOIN public.organizations o ON uo.organization_id = o.id
ORDER BY up.email, o.name;

-- PART 4: USER-PROJECT ASSIGNMENTS
-- ============================================================================
SELECT 
    '=== USER_PROJECTS TABLE (if exists) ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_projects'
ORDER BY ordinal_position;

SELECT 
    '=== USER PROJECT ASSIGNMENTS ===' as section;

SELECT 
    up_assign.user_id,
    prof.email,
    prof.full_name_ar,
    up_assign.project_id,
    p.name as project_name,
    p.organization_id,
    o.name as organization_name,
    up_assign.role as project_role,
    up_assign.created_at
FROM public.user_projects up_assign
LEFT JOIN public.user_profiles prof ON up_assign.user_id = prof.id
LEFT JOIN public.projects p ON up_assign.project_id = p.id
LEFT JOIN public.organizations o ON p.organization_id = o.id
ORDER BY prof.email, p.name;

-- PART 5: CHECK IF USER_ROLES HAS ORG/PROJECT SCOPING
-- ============================================================================
SELECT 
    '=== USER_ROLES WITH ORG/PROJECT SCOPE ===' as section;

SELECT 
    ur.user_id,
    up.email,
    r.name as role_name,
    ur.organization_id,
    o.name as org_name,
    ur.project_id,
    p.name as project_name,
    ur.created_at
FROM public.user_roles ur
LEFT JOIN public.user_profiles up ON ur.user_id = up.id
LEFT JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.organizations o ON ur.organization_id = o.id
LEFT JOIN public.projects p ON ur.project_id = p.id
WHERE ur.organization_id IS NOT NULL OR ur.project_id IS NOT NULL
ORDER BY up.email;

-- PART 6: TRANSACTIONS SCOPING
-- ============================================================================
SELECT 
    '=== TRANSACTIONS TABLE SCOPE COLUMNS ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transactions'
AND column_name IN ('organization_id', 'project_id', 'created_by', 'user_id')
ORDER BY ordinal_position;

SELECT 
    '=== SAMPLE TRANSACTIONS WITH SCOPE ===' as section;

SELECT 
    t.id,
    t.transaction_code,
    t.organization_id,
    o.name as org_name,
    t.project_id,
    p.name as project_name,
    t.created_by,
    up.email as creator_email,
    t.created_at
FROM public.transactions t
LEFT JOIN public.organizations o ON t.organization_id = o.id
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.user_profiles up ON t.created_by = up.id
LIMIT 10;

-- PART 7: RLS POLICIES ON KEY TABLES
-- ============================================================================
SELECT 
    '=== RLS POLICIES ON USER_PROFILES ===' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

SELECT 
    '=== RLS POLICIES ON TRANSACTIONS ===' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'transactions';

SELECT 
    '=== RLS POLICIES ON ORGANIZATIONS ===' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'organizations';

SELECT 
    '=== RLS POLICIES ON PROJECTS ===' as section;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'projects';
