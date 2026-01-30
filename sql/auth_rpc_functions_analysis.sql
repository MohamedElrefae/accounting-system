-- ============================================================================
-- AUTH RPC FUNCTIONS ANALYSIS
-- Analyze all RPC functions related to authentication and permissions
-- ============================================================================

-- PART 1: FIND ALL AUTH-RELATED RPC FUNCTIONS
-- ============================================================================
SELECT 
    '=== ALL AUTH/PERMISSION RPC FUNCTIONS ===' as section;

SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    p.proname LIKE '%auth%' 
    OR p.proname LIKE '%user%' 
    OR p.proname LIKE '%role%' 
    OR p.proname LIKE '%permission%'
    OR p.proname LIKE '%org%'
    OR p.proname LIKE '%project%'
)
ORDER BY p.proname;

-- PART 2: GET SPECIFIC FUNCTION DEFINITIONS
-- ============================================================================
SELECT 
    '=== get_user_auth_data FUNCTION ===' as section;

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_user_auth_data'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT 
    '=== get_user_permissions FUNCTION (if exists) ===' as section;

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_user_permissions'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT 
    '=== get_user_organizations FUNCTION (if exists) ===' as section;

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_user_organizations'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT 
    '=== get_user_projects FUNCTION (if exists) ===' as section;

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'get_user_projects'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT 
    '=== check_user_permission FUNCTION (if exists) ===' as section;

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'check_user_permission'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- PART 3: FIND HELPER FUNCTIONS
-- ============================================================================
SELECT 
    '=== ALL HELPER FUNCTIONS ===' as section;

SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN (
    'has_permission',
    'user_has_role',
    'get_user_role',
    'is_org_member',
    'is_project_member',
    'can_access_organization',
    'can_access_project'
)
ORDER BY proname;

-- PART 4: TRIGGERS ON AUTH TABLES
-- ============================================================================
SELECT 
    '=== TRIGGERS ON USER_PROFILES ===' as section;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'user_profiles'
ORDER BY trigger_name;

SELECT 
    '=== TRIGGERS ON USER_ROLES ===' as section;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'user_roles'
ORDER BY trigger_name;

-- PART 5: FOREIGN KEY CONSTRAINTS
-- ============================================================================
SELECT 
    '=== FOREIGN KEYS ON USER_ROLES ===' as section;

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'user_roles';

SELECT 
    '=== FOREIGN KEYS ON USER_PROFILES ===' as section;

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'user_profiles';
