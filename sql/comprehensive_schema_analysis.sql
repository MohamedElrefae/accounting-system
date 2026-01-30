-- ============================================================================
-- COMPREHENSIVE SCHEMA ANALYSIS FOR AUTH & PERMISSIONS
-- Run this in Supabase SQL Editor to get complete picture
-- ============================================================================

-- PART 1: DISCOVER ALL TABLES AND THEIR STRUCTURE
-- ============================================================================
SELECT 
    '=== ALL TABLES IN PUBLIC SCHEMA ===' as section;

SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- PART 2: USER PROFILES & ROLES STRUCTURE
-- ============================================================================
SELECT 
    '=== USER PROFILES TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check actual data
SELECT 
    '=== SAMPLE USER PROFILES DATA ===' as section;

SELECT 
    id,
    email,
    full_name_ar,
    role,
    is_super_admin,
    organization_id,
    department,
    created_at
FROM public.user_profiles
LIMIT 5;

-- PART 3: ROLES & PERMISSIONS TABLES
-- ============================================================================
SELECT 
    '=== ROLES TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'roles'
ORDER BY ordinal_position;

SELECT 
    '=== ALL ROLES IN SYSTEM ===' as section;

SELECT * FROM public.roles ORDER BY name;

-- ============================================================================
SELECT 
    '=== PERMISSIONS TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'permissions'
ORDER BY ordinal_position;

SELECT 
    '=== ALL PERMISSIONS IN SYSTEM ===' as section;

SELECT * FROM public.permissions ORDER BY name LIMIT 50;

-- PART 4: USER-ROLE ASSIGNMENTS
-- ============================================================================
SELECT 
    '=== USER_ROLES TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_roles'
ORDER BY ordinal_position;

SELECT 
    '=== USER ROLE ASSIGNMENTS ===' as section;

SELECT 
    ur.id,
    ur.user_id,
    up.email,
    up.full_name_ar,
    r.name as role_name,
    ur.organization_id,
    o.name as organization_name,
    ur.created_at
FROM public.user_roles ur
LEFT JOIN public.user_profiles up ON ur.user_id = up.id
LEFT JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.organizations o ON ur.organization_id = o.id
ORDER BY up.email, r.name;

-- PART 5: ROLE-PERMISSION MAPPINGS
-- ============================================================================
SELECT 
    '=== ROLE_PERMISSIONS TABLE STRUCTURE ===' as section;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'role_permissions'
ORDER BY ordinal_position;

SELECT 
    '=== ROLE TO PERMISSION MAPPINGS ===' as section;

SELECT 
    r.name as role_name,
    COUNT(DISTINCT rp.permission_id) as permission_count,
    string_agg(DISTINCT p.name, ', ' ORDER BY p.name) as permissions
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
LEFT JOIN public.permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name
ORDER BY r.name;

-- Detailed view
SELECT 
    '=== DETAILED ROLE PERMISSIONS ===' as section;

SELECT 
    r.name as role_name,
    p.name as permission_name,
    p.description
FROM public.role_permissions rp
JOIN public.roles r ON rp.role_id = r.id
JOIN public.permissions p ON rp.permission_id = p.id
ORDER BY r.name, p.name;
