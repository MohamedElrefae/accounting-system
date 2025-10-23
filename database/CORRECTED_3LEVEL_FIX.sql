-- ================================================================
-- CORRECTED FIX: 3-Level Hierarchy (PROPER STRUCTURE)
-- transactions → transaction_lines → transaction_line_items
-- ================================================================

BEGIN;

-- STEP 1: Verify transaction_lines table exists and has correct structure
-- (This should already exist from your design)
CREATE TABLE IF NOT EXISTS public.transaction_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT,
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(transaction_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_transaction_lines_transaction_id 
    ON public.transaction_lines(transaction_id);

-- STEP 2: Fix transaction_line_items to reference transaction_lines (NOT transactions)
-- Drop incorrect foreign key if it exists
ALTER TABLE public.transaction_line_items
DROP CONSTRAINT IF EXISTS fk_tli_transaction_line;

-- Ensure transaction_line_id column exists
ALTER TABLE public.transaction_line_items
ADD COLUMN IF NOT EXISTS transaction_line_id UUID;

-- Add CORRECT foreign key (to transaction_lines, not transactions)
ALTER TABLE public.transaction_line_items
ADD CONSTRAINT fk_tli_transaction_line 
FOREIGN KEY (transaction_line_id) REFERENCES public.transaction_lines(id) ON DELETE CASCADE;

-- Make line_item_id nullable (for transaction items)
ALTER TABLE public.transaction_line_items
ALTER COLUMN line_item_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction_line_id
    ON public.transaction_line_items(transaction_line_id);

-- STEP 3: Drop problematic triggers and functions
DROP TRIGGER IF EXISTS trg_tli_guard_selectable ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_guard_selectable_leaf_tli();

DROP TRIGGER IF EXISTS trg_tli_unselect_parent ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_unselect_parent_tli();

DROP TRIGGER IF EXISTS trg_tli_update_path ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.fn_tli_update_path();

DROP TRIGGER IF EXISTS trigger_update_transaction_summary ON public.transaction_line_items;
DROP FUNCTION IF EXISTS public.update_transaction_line_items_summary();

-- STEP 4: Recreate triggers with proper 3-level hierarchy

-- 4a. Guard selectable
CREATE OR REPLACE FUNCTION public.fn_guard_selectable_leaf_tli()
RETURNS TRIGGER AS $$
DECLARE
  v_children INT;
BEGIN
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

-- 4b. Unselect parent
CREATE OR REPLACE FUNCTION public.fn_unselect_parent_tli()
RETURNS TRIGGER AS $$
BEGIN
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

-- 4c. Update path
CREATE OR REPLACE FUNCTION public.fn_tli_update_path()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_path TEXT;
  v_parent_level INT;
BEGIN
  IF NEW.transaction_line_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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

-- 4d. Update transaction summary via transaction_lines
CREATE OR REPLACE FUNCTION public.update_transaction_line_items_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_line_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Get the transaction_line_id (NEW or OLD depending on operation)
  v_transaction_line_id := COALESCE(NEW.transaction_line_id, OLD.transaction_line_id);
  
  -- Only process if transaction_line_id exists
  IF v_transaction_line_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get the transaction_id from transaction_lines
  SELECT transaction_id INTO v_transaction_id
  FROM public.transaction_lines
  WHERE id = v_transaction_line_id;

  -- Update transaction totals
  UPDATE public.transactions 
  SET 
    line_items_total = COALESCE((
      SELECT SUM(tli.total_amount) 
      FROM public.transaction_line_items tli
      JOIN public.transaction_lines tl ON tli.transaction_line_id = tl.id
      WHERE tl.transaction_id = v_transaction_id
        AND tli.transaction_line_id IS NOT NULL
    ), 0),
    line_items_count = COALESCE((
      SELECT COUNT(*) 
      FROM public.transaction_line_items tli
      JOIN public.transaction_lines tl ON tli.transaction_line_id = tl.id
      WHERE tl.transaction_id = v_transaction_id
        AND tli.transaction_line_id IS NOT NULL
    ), 0),
    has_line_items = COALESCE((
      SELECT COUNT(*) > 0 
      FROM public.transaction_line_items tli
      JOIN public.transaction_lines tl ON tli.transaction_line_id = tl.id
      WHERE tl.transaction_id = v_transaction_id
        AND tli.transaction_line_id IS NOT NULL
    ), FALSE),
    updated_at = NOW()
  WHERE id = v_transaction_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_transaction_line_items_summary();

-- STEP 5: Create reporting view with transaction_id as calculated field
CREATE OR REPLACE VIEW public.v_transaction_line_items_with_transaction_id AS
SELECT 
  tli.*,
  tl.transaction_id,
  t.entry_number
FROM public.transaction_line_items tli
JOIN public.transaction_lines tl ON tli.transaction_line_id = tl.id
JOIN public.transactions t ON tl.transaction_id = t.id;

-- STEP 6: Verify success
SELECT 'All triggers recreated successfully!' as status;
SELECT 
  COUNT(*) as trigger_count,
  COUNT(DISTINCT t.tgname) as unique_triggers
FROM pg_trigger t
WHERE t.tgrelid = 'public.transaction_line_items'::regclass
  AND (t.tgname LIKE 'trg_%' OR t.tgname LIKE 'trigger_%');

COMMIT;
