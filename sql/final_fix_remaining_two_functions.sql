-- ============================================================================
-- FINAL FIX - Remove References to Non-Existent Views
-- ============================================================================
-- Only 2 functions still reference expenses_categories:
-- 1. refresh_reporting_matviews_concurrent - tries to refresh non-existent view
-- 2. sub_tree_biu_set_path_level - already correct (references sub_tree)
--
-- We just need to fix refresh_reporting_matviews_concurrent

-- ============================================================================
-- SECTION 1: Drop the problematic refresh function
-- ============================================================================

DROP FUNCTION IF EXISTS public.refresh_reporting_matviews_concurrent CASCADE;

-- ============================================================================
-- SECTION 2: Create corrected version that doesn't reference non-existent views
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews_concurrent()
RETURNS VOID AS $function$
BEGIN
  -- This function is a placeholder for future materialized view refreshes
  -- Currently, no materialized views need to be refreshed
  RAISE NOTICE 'Refresh reporting matviews called (no views to refresh)';
END;
$function$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 3: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.refresh_reporting_matviews_concurrent TO authenticated;

-- ============================================================================
-- SECTION 4: Final verification
-- ============================================================================

SELECT 
  'FINAL VERIFICATION' as check_type,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND pg_get_functiondef(oid) LIKE '%expenses_categories%'
    )
    THEN '✅ NO functions reference expenses_categories'
    ELSE '❌ Some functions still reference expenses_categories'
  END as result
UNION ALL
SELECT 'FINAL VERIFICATION',
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public'
      AND view_definition LIKE '%expenses_categories%'
    )
    THEN '✅ NO views reference expenses_categories'
    ELSE '❌ Some views still reference expenses_categories'
  END
UNION ALL
SELECT 'FINAL VERIFICATION',
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_matviews
      WHERE schemaname = 'public'
      AND definition LIKE '%expenses_categories%'
    )
    THEN '✅ NO materialized views reference expenses_categories'
    ELSE '❌ Some materialized views still reference expenses_categories'
  END
UNION ALL
SELECT 'FINAL VERIFICATION',
  CASE 
    WHEN pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'sub_tree_biu_set_path_level' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))) LIKE '%FROM public.sub_tree%'
    THEN '✅ Trigger function correctly references sub_tree table'
    ELSE '❌ Trigger function still has issues'
  END;

