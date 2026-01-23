-- ============================================================================
-- IDENTIFY EXACT FUNCTION STILL REFERENCING expenses_categories
-- ============================================================================

SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as full_definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND pg_get_functiondef(oid) LIKE '%expenses_categories%'
ORDER BY proname;

