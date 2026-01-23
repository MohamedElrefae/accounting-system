-- ============================================================================
-- COMPREHENSIVE CLEANUP - DROP ALL REFERENCES TO expenses_categories
-- ============================================================================
-- This script drops ALL functions, views, and triggers that reference
-- the old expenses_categories table name

-- ============================================================================
-- SECTION 1: Drop all materialized views
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_expenses_categories_rollups CASCADE;

-- ============================================================================
-- SECTION 2: Drop all views
-- ============================================================================

DROP VIEW IF EXISTS public.v_expenses_categories_rollups_v2 CASCADE;
DROP VIEW IF EXISTS public.v_expenses_categories_rollups CASCADE;

-- ============================================================================
-- SECTION 3: Drop all functions and triggers
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS sub_tree_biu_set_path_level ON public.sub_tree CASCADE;

-- Drop functions (in order of dependencies)
DROP FUNCTION IF EXISTS public.sub_tree_biu_set_path_level CASCADE;
DROP FUNCTION IF EXISTS public.refresh_expenses_categories_rollups CASCADE;
DROP FUNCTION IF EXISTS public.refresh_all_rollups CASCADE;
DROP FUNCTION IF EXISTS public.refresh_reporting_matviews_concurrent CASCADE;
DROP FUNCTION IF EXISTS public._ec_label_from_code CASCADE;

-- ============================================================================
-- SECTION 4: Create corrected trigger function for sub_tree
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sub_tree_biu_set_path_level()
RETURNS TRIGGER AS $function$
DECLARE
  v_parent_level INT;
  v_parent_path LTREE;
BEGIN
  -- Set timestamps
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
    NEW.updated_by := AUTH.UID();
  ELSE
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.updated_at := COALESCE(NEW.updated_at, NOW());
    NEW.created_by := COALESCE(NEW.created_by, AUTH.UID());
    NEW.updated_by := COALESCE(NEW.updated_by, AUTH.UID());
  END IF;

  -- Calculate level and path
  IF NEW.parent_id IS NULL THEN
    NEW.level := 1;
    NEW.path := NEW.code::LTREE;
  ELSE
    -- Query sub_tree table (not expenses_categories)
    SELECT level, path INTO v_parent_level, v_parent_path
    FROM public.sub_tree p
    WHERE p.id = NEW.parent_id 
    AND p.org_id = NEW.org_id
    LIMIT 1;

    IF v_parent_level IS NULL THEN
      RAISE EXCEPTION 'Parent category not found in same org';
    END IF;

    -- Prevent cycles on update
    IF TG_OP = 'UPDATE' AND OLD.id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.sub_tree p 
        WHERE p.id = NEW.parent_id 
        AND p.path <@ OLD.path
      ) THEN
        RAISE EXCEPTION 'Cannot set parent to a descendant (cycle prevention)';
      END IF;
    END IF;

    NEW.level := v_parent_level + 1;
    NEW.path := v_parent_path || NEW.code::LTREE;

    IF NEW.level > 4 THEN
      RAISE EXCEPTION 'Max depth (4) exceeded';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 5: Create trigger
-- ============================================================================

CREATE TRIGGER sub_tree_biu_set_path_level
BEFORE INSERT OR UPDATE ON public.sub_tree
FOR EACH ROW
EXECUTE FUNCTION public.sub_tree_biu_set_path_level();

-- ============================================================================
-- SECTION 6: Create corrected refresh functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews_concurrent()
RETURNS VOID AS $function$
BEGIN
  -- Only refresh if materialized views exist
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_expenses_categories_rollups_v2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Refresh failed: v_expenses_categories_rollups_v2: %', SQLERRM;
  END;
END;
$function$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 7: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.sub_tree_biu_set_path_level TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_reporting_matviews_concurrent TO authenticated;

-- ============================================================================
-- SECTION 8: Verify cleanup
-- ============================================================================

SELECT 
  'VERIFICATION' as check_type,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND pg_get_functiondef(oid) LIKE '%expenses_categories%'
    )
    THEN '✅ No functions reference expenses_categories'
    ELSE '❌ Some functions still reference expenses_categories'
  END as result
UNION ALL
SELECT 'VERIFICATION',
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public'
      AND view_definition LIKE '%expenses_categories%'
    )
    THEN '✅ No views reference expenses_categories'
    ELSE '❌ Some views still reference expenses_categories'
  END
UNION ALL
SELECT 'VERIFICATION',
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_matviews
      WHERE schemaname = 'public'
      AND definition LIKE '%expenses_categories%'
    )
    THEN '✅ No materialized views reference expenses_categories'
    ELSE '❌ Some materialized views still reference expenses_categories'
  END
UNION ALL
SELECT 'VERIFICATION',
  CASE 
    WHEN pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'sub_tree_biu_set_path_level' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))) LIKE '%FROM public.sub_tree%'
    THEN '✅ Trigger function correctly references sub_tree table'
    ELSE '❌ Trigger function still has issues'
  END;

