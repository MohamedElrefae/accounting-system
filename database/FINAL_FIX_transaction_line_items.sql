-- ================================================================
-- FINAL FIX: transaction_line_items Schema & Triggers
-- CLEAN VERSION - No deprecated tables referenced
-- ================================================================
-- Changes:
-- 1. Uses transaction_line_id (NOT transaction_id)
-- 2. Uses sub_tree_id (NOT expenses_category_id)
-- 3. Removes array_agg error (uses SUM/COUNT)
-- ================================================================

BEGIN;

-- STEP 1: Ensure required columns exist and are nullable
-- Drop existing foreign key constraint if it references wrong table
ALTER TABLE public.transaction_line_items
DROP CONSTRAINT IF EXISTS fk_tli_transaction_line;

-- Add corrected foreign key
ALTER TABLE public.transaction_line_items
ADD COLUMN IF NOT EXISTS transaction_line_id UUID;

-- Add foreign key constraint (corrected to reference transactions)
ALTER TABLE public.transaction_line_items
ADD CONSTRAINT fk_tli_transaction_line FOREIGN KEY (transaction_line_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_line_id 
  ON public.transaction_line_items(transaction_line_id)
  WHERE transaction_line_id IS NOT NULL;

-- Make line_item_id nullable (for transaction line items, not catalog)
ALTER TABLE public.transaction_line_items
ALTER COLUMN line_item_id DROP NOT NULL;

-- sub_tree_id should already exist (hierarchical categorization)
-- No reference to deprecated expenses_categories table

-- STEP 2: Drop problematic triggers and functions
DROP TRIGGER IF EXISTS trg_tli_guard_selectable ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_guard_selectable_leaf_tli();

DROP TRIGGER IF EXISTS trg_tli_unselect_parent ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_unselect_parent_tli();

DROP TRIGGER IF EXISTS trg_tli_update_path ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_tli_update_path();

DROP TRIGGER IF EXISTS trigger_update_transaction_summary ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.update_transaction_line_items_summary();

-- STEP 3: Recreate corrected trigger functions

-- 3a. Guard selectable - only leaf items can be selectable
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

-- 3b. Unselect parent - when child added, unselect parent
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

-- 3c. Update path - maintain hierarchical path
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

-- 3d. Update transaction summary - FIXED: No array_agg!
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

-- STEP 4: Verify success
SELECT 'All triggers recreated successfully!' as status;
SELECT 
  COUNT(*) as trigger_count,
  COUNT(DISTINCT t.tgname) as unique_triggers
FROM pg_trigger t
WHERE t.tgrelid = 'public.transaction_line_items'::regclass
  AND (t.tgname LIKE 'trg_%' OR t.tgname LIKE 'trigger_%');

COMMIT;