-- Check existing General Ledger functions in the database
-- Run this to see what functions exist and their current parameter signatures

-- 1. Check for general ledger related functions
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    pg_get_function_result(p.oid) as return_type,
    p.prokind as function_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname ILIKE '%general_ledger%'
ORDER BY p.proname;

-- 2. Check for GL account summary functions
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    pg_get_function_result(p.oid) as return_type,
    p.prokind as function_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname ILIKE '%gl_account%'
ORDER BY p.proname;

-- 3. Check for any functions with 'ledger' in the name
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    pg_get_function_result(p.oid) as return_type,
    p.prokind as function_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname ILIKE '%ledger%'
ORDER BY p.proname;

-- 4. Check for any RPC functions that might be used by the frontend
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname ILIKE '%report%' OR p.proname ILIKE '%summary%')
ORDER BY p.proname;