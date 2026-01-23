-- ============================================================================
-- NUCLEAR OPTION - DROP ALL FUNCTIONS AND RECREATE CLEAN
-- ============================================================================
-- This drops EVERY function that might reference expenses_categories
-- and recreates only the essential ones

-- ============================================================================
-- SECTION 1: Drop ALL functions that might reference expenses_categories
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS sub_tree_biu_set_path_level ON public.sub_tree CASCADE;

-- Drop all functions (use CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.sub_tree_biu_set_path_level CASCADE;
DROP FUNCTION IF EXISTS public.refresh_reporting_matviews_concurrent CASCADE;
DROP FUNCTION IF EXISTS public.refresh_expenses_categories_rollups CASCADE;
DROP FUNCTION IF EXISTS public.refresh_all_rollups CASCADE;
DROP FUNCTION IF EXISTS public._ec_label_from_code CASCADE;

-- ============================================================================
-- SECTION 2: Recreate ONLY the essential trigger function
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
-- SECTION 3: Create trigger
-- ============================================================================

CREATE TRIGGER sub_tree_biu_set_path_level
BEFORE INSERT OR UPDATE ON public.sub_tree
FOR EACH ROW
EXECUTE FUNCTION public.sub_tree_biu_set_path_level();

-- ============================================================================
-- SECTION 4: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.sub_tree_biu_set_path_level TO authenticated;

-- ============================================================================
-- SECTION 5: FINAL VERIFICATION
-- ============================================================================

SELECT 
  'FINAL CHECK' as check_type,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND pg_get_functiondef(oid) LIKE '%expenses_categories%'
    )
    THEN '✅ SUCCESS - NO functions reference expenses_categories'
    ELSE '❌ FAILED - Some functions still reference expenses_categories'
  END as result
UNION ALL
SELECT 'FINAL CHECK',
  CASE 
    WHEN pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'sub_tree_biu_set_path_level' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))) LIKE '%FROM public.sub_tree%'
    THEN '✅ SUCCESS - Trigger function correctly references sub_tree'
    ELSE '❌ FAILED - Trigger function has issues'
  END;

