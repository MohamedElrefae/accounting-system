-- 074_fix_gl_function_ambiguity_verify.sql
-- Verification: Ensure only ONE version of get_general_ledger_report_filtered exists

-- 1. Check all overloads of the function (should be exactly ONE row)
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_general_ledger_report_filtered'
ORDER BY p.proname;

-- Expected: Only ONE row with these parameters:
-- p_account_id uuid, p_date_from date, p_date_to date, p_org_id uuid, p_project_id uuid, 
-- p_include_opening boolean, p_posted_only boolean, p_limit integer, p_offset integer, 
-- p_classification_id uuid, p_analysis_work_item_id uuid, p_expenses_category_id uuid

-- 2. Test the function works (should not throw ambiguity error)
SELECT COUNT(*) as test_count 
FROM public.get_general_ledger_report_filtered(p_limit => 1);

-- 3. Test with a specific account (if you have one)
-- SELECT * FROM public.get_general_ledger_report_filtered(
--   p_account_id => 'your-account-uuid-here'::uuid,
--   p_limit => 5
-- );
