-- Check what GL Summary functions/procedures exist in the database
-- Copy and paste this SQL block to identify the correct function name

-- Option 1: Check all functions/procedures containing 'gl' or 'summary'
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (
    LOWER(routine_name) LIKE '%gl%' 
    OR LOWER(routine_name) LIKE '%summary%'
    OR LOWER(routine_name) LIKE '%trial%'
    OR LOWER(routine_name) LIKE '%balance%'
)
ORDER BY routine_name;

-- Option 2: Check all user-defined functions
SELECT 
    proname as function_name,
    prokind as function_type,
    proargnames as argument_names,
    oidvectortypes(proargtypes) as argument_types
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname NOT LIKE 'pg_%'
ORDER BY proname;

-- Option 3: Simple check for any stored procedures
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;
