-- Find and drop existing GL functions with exact signatures
-- Run this first to clean up any existing functions before creating new ones

-- 1. First, let's see what functions exist and their exact signatures
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname ILIKE '%general_ledger%' OR p.proname ILIKE '%gl_account%')
ORDER BY p.proname;

-- 2. Drop functions with specific signatures (try these common variations)

-- Drop get_general_ledger_report_filtered with different possible signatures
DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered(text, date, date, text, text, boolean, boolean, integer, integer, text, text);

DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered(p_account_id text, p_date_from date, p_date_to date, p_org_id text, p_project_id text, p_include_opening boolean, p_posted_only boolean, p_limit integer, p_offset integer, p_classification_id text, p_analysis_work_item_id text);

DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered(p_account_id text, p_date_from date, p_date_to date, p_org_id text, p_project_id text, p_include_opening boolean, p_posted_only boolean, p_limit integer, p_offset integer);

-- Drop get_gl_account_summary_filtered with different possible signatures
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, text, text, boolean, integer, integer, text, text);

DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(p_date_from date, p_date_to date, p_org_id text, p_project_id text, p_posted_only boolean, p_limit integer, p_offset integer, p_classification_id text, p_analysis_work_item_id text);

DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(p_date_from date, p_date_to date, p_org_id text, p_project_id text, p_posted_only boolean, p_limit integer, p_offset integer);

-- 3. Alternative approach: Drop by OID (Object ID) if you can identify the specific function
-- First run the SELECT query above to get the OID, then use:
-- DROP FUNCTION pg_catalog.pg_get_function_identity_arguments(OID_HERE);

-- 4. Nuclear option: Drop ALL functions with these names (be careful!)
-- Uncomment ONLY if you're sure there are no other important functions with these names
-- DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered CASCADE;
-- DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered CASCADE;