-- ================================================================
-- COMPREHENSIVE FIX: transaction_line_items Schema & Triggers
-- Issue: transaction_id column missing, but triggers reference it
-- Solution: Add column + fix all trigger functions
-- ================================================================

BEGIN;

-- STEP 1: Add missing transaction_id column to transaction_line_items
ALTER TABLE public.transaction_line_items
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE;

-- Create index for transaction_id
CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_id 
  ON public.transaction_line_items(transaction_id);

-- STEP 2: Add missing constraint columns if needed
ALTER TABLE public.transaction_line_items
ADD COLUMN IF NOT EXISTS expenses_category_id UUID REFERENCES public.expenses_categories(id);

-- STEP 3: Drop problematic triggers and functions (in dependency order)
DROP TRIGGER IF EXISTS trg_tli_guard_selectable ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_guard_selectable_leaf_tli();

DROP TRIGGER IF EXISTS trg_tli_unselect_parent ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_unselect_parent_tli();

DROP TRIGGER IF EXISTS trg_tli_update_path ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_tli_update_path();

DROP TRIGGER IF EXISTS trigger_update_transaction_summary ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.update_transaction_line_items_summary();

-- STEP 4: Recreate corrected trigger functions

-- 4a. Guard selectable - only leaf items can be selectable (fixed)
CREATE OR REPLACE FUNCTION public.fn_guard_selectable_leaf_tli()
RETURNS TRIGGER AS $$
DECLARE
  v_children INT;
BEGIN
  -- Only check for catalog items (transaction_id IS NULL)
  IF (NEW.transaction_id IS NULL) AND (NEW.is_selectable IS TRUE) THEN
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

-- 4b. Unselect parent - when child added, unselect parent (fixed)
CREATE OR REPLACE FUNCTION public.fn_unselect_parent_tli()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for catalog items (transaction_id IS NULL)
  IF NEW.transaction_id IS NULL AND NEW.parent_id IS NOT NULL THEN
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

-- 4c. Update path - maintain hierarchical path (fixed)
CREATE OR REPLACE FUNCTION public.fn_tli_update_path()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_path TEXT;
BEGIN
  -- Only apply to catalog rows (transaction_id IS NULL)
  IF NEW.transaction_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Build path from item_code
  IF NEW.parent_id IS NULL THEN
    NEW.path := LOWER(COALESCE(NEW.item_code, ''));
    NEW.level := 1;
  ELSE
    SELECT path, level INTO v_parent_path, NEW.level
    FROM public.transaction_line_items
    WHERE id = NEW.parent_id;

    NEW.path := COALESCE(v_parent_path, '')
      || CASE WHEN v_parent_path IS NULL OR v_parent_path = '' THEN '' ELSE '.' END
      || LOWER(COALESCE(NEW.item_code, ''));
    NEW.level := COALESCE(NEW.level, 1) + 1;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tli_update_path
  BEFORE INSERT OR UPDATE ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_tli_update_path();

-- 4d. Update transaction summary - recalculate totals (FIXED - no array_agg)
CREATE OR REPLACE FUNCTION public.update_transaction_line_items_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process actual transaction line items (transaction_id IS NOT NULL)
  IF COALESCE(NEW.transaction_id, OLD.transaction_id) IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update transaction totals when line items change
  UPDATE public.transactions 
  SET 
    line_items_total = COALESCE((
      SELECT SUM(total_amount) 
      FROM public.transaction_line_items 
      WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id)
        AND transaction_id IS NOT NULL
    ), 0),
    line_items_count = COALESCE((
      SELECT COUNT(*) 
      FROM public.transaction_line_items 
      WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id)
        AND transaction_id IS NOT NULL
    ), 0),
    has_line_items = COALESCE((
      SELECT COUNT(*) > 0 
      FROM public.transaction_line_items 
      WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id)
        AND transaction_id IS NOT NULL
    ), FALSE),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transaction_line_items_summary();

-- STEP 5: Verify trigger recreation
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
  AND t.tgname LIKE 'trg_%' OR t.tgname LIKE 'trigger_%'
ORDER BY t.tgname;

-- STEP 6: Verify table structure
SELECT 'Column check:' as check_type;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transaction_line_items'
  AND column_name IN ('transaction_id', 'total_amount', 'expenses_category_id')
ORDER BY ordinal_position;

COMMIT;
