-- Force drop all conflicting GL functions to resolve the "not unique" error
-- Run this first, then run the creation script

-- Step 1: See exactly what functions exist
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    p.oid,
    'DROP FUNCTION public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ');' as exact_drop_command
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname = 'get_general_ledger_report_filtered' OR p.proname = 'get_gl_account_summary_filtered')
ORDER BY p.proname;

-- Step 2: Nuclear option - Drop ALL functions with these names
-- This removes all versions regardless of signature
DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered CASCADE;

-- Step 3: Verify they're gone
SELECT 
    COUNT(*) as remaining_functions,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All conflicting functions removed successfully'
        ELSE '⚠️ Some functions still exist - check manually'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname = 'get_general_ledger_report_filtered' OR p.proname = 'get_gl_account_summary_filtered');

-- Step 4: Show what other GL-related functions exist (for safety check)
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname ILIKE '%general%' OR p.proname ILIKE '%ledger%' OR p.proname ILIKE '%gl_%')
ORDER BY p.proname;