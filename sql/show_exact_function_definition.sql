-- ============================================================================
-- SHOW EXACT FUNCTION DEFINITION STILL REFERENCING expenses_categories
-- ============================================================================

SELECT 
  proname,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND pg_get_functiondef(oid) LIKE '%expenses_categories%';

