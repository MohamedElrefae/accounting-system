-- ============================================================================
-- FIX OLD TRIGGER FUNCTIONS REFERENCING expenses_categories
-- ============================================================================
-- This migration fixes the root cause of the 404 error:
-- Old trigger functions still reference the old expenses_categories table name
-- When sub_tree is inserted/updated, the trigger tries to query expenses_categories
-- which doesn't exist, causing the error

-- ============================================================================
-- SECTION 1: Drop Old Trigger and Function
-- ============================================================================

DROP TRIGGER IF EXISTS sub_tree_biu_set_path_level ON public.sub_tree CASCADE;
DROP FUNCTION IF EXISTS public.sub_tree_biu_set_path_level CASCADE;

-- ============================================================================
-- SECTION 2: Create Corrected Trigger Function
-- ============================================================================
-- This function now references sub_tree table instead of expenses_categories

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
    -- FIXED: Query sub_tree table (not expenses_categories)
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
-- SECTION 3: Create Trigger
-- ============================================================================

CREATE TRIGGER sub_tree_biu_set_path_level
BEFORE INSERT OR UPDATE ON public.sub_tree
FOR EACH ROW
EXECUTE FUNCTION public.sub_tree_biu_set_path_level();

-- ============================================================================
-- SECTION 4: Fix Refresh Functions
-- ============================================================================

-- Drop old refresh functions that reference non-existent functions
DROP FUNCTION IF EXISTS public.refresh_expenses_categories_rollups CASCADE;
DROP FUNCTION IF EXISTS public.refresh_all_rollups CASCADE;
DROP FUNCTION IF EXISTS public.refresh_reporting_matviews_concurrent CASCADE;

-- Create corrected refresh function
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
-- SECTION 5: Rename Indexes for Clarity
-- ============================================================================
-- These indexes are for sub_tree table but have old names

ALTER INDEX IF EXISTS expenses_categories_pkey RENAME TO sub_tree_pkey;
ALTER INDEX IF EXISTS expenses_categories_code_unique_per_org RENAME TO sub_tree_code_unique_per_org;

-- ============================================================================
-- SECTION 6: Verify Fix
-- ============================================================================

-- Check that trigger function now references sub_tree
SELECT 
  'VERIFICATION' as check_type,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%FROM public.sub_tree%'
    THEN '✅ Trigger function correctly references sub_tree table'
    ELSE '❌ Trigger function still has issues'
  END as result
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname = 'sub_tree_biu_set_path_level';

-- Check that no functions reference expenses_categories anymore
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
  END as result;

-- ============================================================================
-- SECTION 7: Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.sub_tree_biu_set_path_level TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_reporting_matviews_concurrent TO authenticated;

