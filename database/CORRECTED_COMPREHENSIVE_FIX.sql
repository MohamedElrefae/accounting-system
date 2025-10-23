-- ================================================================
-- CORRECTED COMPREHENSIVE FIX: transaction_line_items Schema & Triggers
-- Updated for hierarchical structure using sub_tree_id
-- Removed: transaction_id (moved to transaction_line_id)
-- Using: sub_tree_id for hierarchical categorization
-- ================================================================

BEGIN;

-- STEP 1: Verify required columns exist
-- transaction_line_id: links to actual transaction records
-- sub_tree_id: hierarchical categorization (replaces expenses_category_id)
ALTER TABLE public.transaction_line_items
ADD COLUMN IF NOT EXISTS transaction_line_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_line_id 
  ON public.transaction_line_items(transaction_line_id)
  WHERE transaction_line_id IS NOT NULL;

-- Verify sub_tree_id exists (should already be there)
-- ALTER TABLE public.transaction_line_items already has sub_tree_id

-- STEP 2: Drop problematic triggers and functions (in dependency order)
DROP TRIGGER IF EXISTS trg_tli_guard_selectable ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_guard_selectable_leaf_tli();

DROP TRIGGER IF EXISTS trg_tli_unselect_parent ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_unselect_parent_tli();

DROP TRIGGER IF EXISTS trg_tli_update_path ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_tli_update_path();

DROP TRIGGER IF EXISTS trigger_update_transaction_summary ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.update_transaction_line_items_summary();

-- STEP 3: Recreate corrected trigger functions

-- 3a. Guard selectable - only leaf items can be selectable (fixed)
CREATE OR REPLACE FUNCTION public.fn_guard_selectable_leaf_tli()
RETURNS TRIGGER AS $$
DECLARE
  v_children INT;
BEGIN
  -- Only check for catalog items (transaction_line_id IS NULL)
  IF (NEW.transaction_line_id IS NULL) AND (NEW.is_selectable IS TRUE) THEN
    SELECT COUNT(*) INTO v_children 
    FROM public.transaction_line_items 
    WHERE parent_id = NEW.id;
    
    IF v_children > 0 THEN
      RAISE EXCEPTION 'Only leaf items can be selectable';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tli_guard_selectable
  BEFORE INSERT OR UPDATE ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_selectable_leaf_tli();

-- 3b. Unselect parent - when child added, unselect parent (fixed)
CREATE OR REPLACE FUNCTION public.fn_unselect_parent_tli()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for catalog items (transaction_line_id IS NULL)
  IF NEW.transaction_line_id IS NULL AND NEW.parent_id IS NOT NULL THEN
    UPDATE public.transaction_line_items
    SET is_selectable = FALSE, updated_at = NOW()
    WHERE id = NEW.parent_id AND is_selectable = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tli_unselect_parent
  AFTER INSERT ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_unselect_parent_tli();

-- 3c. Update path - maintain hierarchical path (fixed)
CREATE OR REPLACE FUNCTION public.fn_tli_update_path()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_path TEXT;
  v_parent_level INT;
BEGIN
  -- Only apply to catalog rows (transaction_line_id IS NULL)
  IF NEW.transaction_line_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Build path from item_code
  IF NEW.parent_id IS NULL THEN
    NEW.path := LOWER(COALESCE(NEW.item_code, ''));
    NEW.level := 1;
  ELSE
    SELECT path, level INTO v_parent_path, v_parent_level
    FROM public.transaction_line_items
    WHERE id = NEW.parent_id;

    NEW.path := COALESCE(v_parent_path, '')
      || CASE WHEN v_parent_path IS NULL OR v_parent_path = '' THEN '' ELSE '.' END
      || LOWER(COALESCE(NEW.item_code, ''));
    NEW.level := COALESCE(v_parent_level, 0) + 1;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tli_update_path
  BEFORE INSERT OR UPDATE ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_tli_update_path();

-- 3d. Update transaction summary - recalculate totals (FIXED - no array_agg)
CREATE OR REPLACE FUNCTION public.update_transaction_line_items_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process actual transaction line items (transaction_line_id IS NOT NULL)
  IF COALESCE(NEW.transaction_line_id, OLD.transaction_line_id) IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update transaction totals when line items change
  UPDATE public.transactions 
  SET 
    line_items_total = COALESCE((
      SELECT SUM(total_amount) 
      FROM public.transaction_line_items 
      WHERE transaction_line_id = COALESCE(NEW.transaction_line_id, OLD.transaction_line_id)
        AND transaction_line_id IS NOT NULL
    ), 0),
    line_items_count = COALESCE((
      SELECT COUNT(*) 
      FROM public.transaction_line_items 
      WHERE transaction_line_id = COALESCE(NEW.transaction_line_id, OLD.transaction_line_id)
        AND transaction_line_id IS NOT NULL
    ), 0),
    has_line_items = COALESCE((
      SELECT COUNT(*) > 0 
      FROM public.transaction_line_items 
      WHERE transaction_line_id = COALESCE(NEW.transaction_line_id, OLD.transaction_line_id)
        AND transaction_line_id IS NOT NULL
    ), FALSE),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.transaction_line_id, OLD.transaction_line_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transaction_line_items_summary();

-- STEP 4: Verify trigger recreation
SELECT 'Triggers recreated successfully!' as status;
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  CASE 
    WHEN (t.tgtype & 2) != 0 THEN 'BEFORE'
    WHEN (t.tgtype & 64) != 0 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE
    WHEN (t.tgtype & 4) != 0 THEN 'INSERT'
    WHEN (t.tgtype & 8) != 0 THEN 'UPDATE'
    WHEN (t.tgtype & 16) != 0 THEN 'DELETE'
    ELSE 'UNKNOWN'
  END as event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.transaction_line_items'::regclass
  AND (t.tgname LIKE 'trg_%' OR t.tgname LIKE 'trigger_%')
ORDER BY t.tgname;

-- STEP 5: Verify table structure
SELECT 'Column check:' as check_type;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transaction_line_items'
  AND column_name IN ('transaction_line_id', 'total_amount', 'sub_tree_id')
ORDER BY ordinal_position;

COMMIT;