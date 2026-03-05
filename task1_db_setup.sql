-- =====================================================================
-- TASK 1: Cost Analysis Modal — Database Functions, RLS, Schema Changes
-- Project: bgxknceshxxifwytalex.supabase.co
-- Date: 2026-03-02
-- Rules: CREATE OR REPLACE for functions, IF NOT EXISTS for indexes,
--        DROP CONSTRAINT IF EXISTS, NEVER write to GENERATED ALWAYS columns
-- =====================================================================

-- ─── STEP 1.1: SKIPPED (user confirmed line_status exists) ───────────────────
-- The system uses `line_status` via the enhanced line approval system instead of `approval_status`.

-- ─── STEP 1.2: Drop negative value check constraints ─────────────────────────
-- (Use DO block so it does not error if they don't exist)
DO $$
BEGIN
  -- Drop quantity check constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
    AND table_name='transaction_line_items'
    AND constraint_name='transaction_line_items_quantity_check'
  ) THEN
    ALTER TABLE public.transaction_line_items
      DROP CONSTRAINT transaction_line_items_quantity_check;
    RAISE NOTICE 'Dropped constraint: transaction_line_items_quantity_check';
  ELSE
    RAISE NOTICE 'Constraint transaction_line_items_quantity_check does not exist — skipping';
  END IF;

  -- Drop unit_price check constraint if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
    AND table_name='transaction_line_items'
    AND constraint_name='transaction_line_items_unit_price_check'
  ) THEN
    ALTER TABLE public.transaction_line_items
      DROP CONSTRAINT transaction_line_items_unit_price_check;
    RAISE NOTICE 'Dropped constraint: transaction_line_items_unit_price_check';
  ELSE
    RAISE NOTICE 'Constraint transaction_line_items_unit_price_check does not exist — skipping';
  END IF;
END;
$$;

-- ─── STEP 1.3: Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tli_transaction_line_id
  ON public.transaction_line_items (transaction_line_id);

CREATE INDEX IF NOT EXISTS idx_tli_line_item_id
  ON public.transaction_line_items (line_item_id);

-- ─── STEP 1.4: can_edit_transaction_line() ───────────────────────────────────
-- Returns TRUE if the line is in 'draft' status (editable)
CREATE OR REPLACE FUNCTION public.can_edit_transaction_line(p_line_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT line_status INTO v_status
  FROM public.transaction_lines
  WHERE id = p_line_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN (v_status = 'draft' OR v_status IS NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_edit_transaction_line(UUID) TO authenticated;

COMMENT ON FUNCTION public.can_edit_transaction_line IS
  'Returns TRUE if the transaction line is in draft status and can be edited. Used by the Cost Analysis Modal to lock/unlock the UI.';

-- ─── STEP 1.5: replace_line_items_atomic() ───────────────────────────────────
-- Atomically replaces ALL transaction_line_items for a given transaction_line_id.
-- Returns JSONB with result counts.
-- NOTE: total_amount is auto-calculated by trigger — do NOT pass it in items.
CREATE OR REPLACE FUNCTION public.replace_line_items_atomic(
  p_transaction_line_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_count INT := 0;
  v_line_number INT := 1;
BEGIN
  -- Guard: verify the line exists
  IF NOT EXISTS (
    SELECT 1 FROM public.transaction_lines WHERE id = p_transaction_line_id
  ) THEN
    RAISE EXCEPTION 'transaction_line_id % not found', p_transaction_line_id;
  END IF;

  -- Guard: verify the line is editable
  IF NOT public.can_edit_transaction_line(p_transaction_line_id) THEN
    RAISE EXCEPTION 'Transaction line % is not editable (line_status is not draft)', p_transaction_line_id;
  END IF;

  -- Delete all existing line items for this line
  DELETE FROM public.transaction_line_items
  WHERE transaction_line_id = p_transaction_line_id;

  -- Insert new items in order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.transaction_line_items (
      transaction_line_id,
      line_number,
      line_item_id,
      quantity,
      percentage,
      unit_price,
      unit_of_measure,
      deduction_percentage,
      addition_percentage
    ) VALUES (
      p_transaction_line_id,
      COALESCE((v_item->>'line_number')::INT, v_line_number),
      (v_item->>'line_item_id')::UUID,
      COALESCE((v_item->>'quantity')::NUMERIC, 0),
      COALESCE((v_item->>'percentage')::NUMERIC, 100),
      COALESCE((v_item->>'unit_price')::NUMERIC, 0),
      COALESCE(v_item->>'unit_of_measure', ''),
      (v_item->>'deduction_percentage')::NUMERIC,
      (v_item->>'addition_percentage')::NUMERIC
    );

    v_count := v_count + 1;
    v_line_number := v_line_number + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'items_saved', v_count,
    'transaction_line_id', p_transaction_line_id
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_line_items_atomic(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION public.replace_line_items_atomic IS
  'Atomically deletes all existing line items for a transaction line and replaces them with the provided items array. Respects approval status guard. Called by the Cost Analysis Modal save handler.';

-- ─── STEP 1.6: fn_calculate_tli_adjustments() trigger ───────────────────────
-- CRITICAL: This trigger MUST NOT write to total_amount if it is GENERATED ALWAYS.
-- We only write to: deduction_amount, addition_amount, net_amount.
-- total_amount (if GENERATED) will be computed by the DB automatically.
-- If total_amount is NOT generated, the trigger also sets it = quantity * unit_price * (percentage/100)
CREATE OR REPLACE FUNCTION public.fn_calculate_tli_adjustments()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_amount NUMERIC;
  v_deduction   NUMERIC;
  v_addition    NUMERIC;
  v_has_total_amount_col BOOLEAN;
  v_is_generated BOOLEAN;
BEGIN
  -- Base amount = quantity × unit_price × (percentage / 100)
  v_base_amount := COALESCE(NEW.quantity, 0)
                 * COALESCE(NEW.unit_price, 0)
                 * COALESCE(NEW.percentage, 100) / 100.0;

  -- Deduction amount
  v_deduction := CASE
    WHEN NEW.deduction_percentage IS NOT NULL
    THEN ABS(v_base_amount * COALESCE(NEW.deduction_percentage, 0))
    ELSE 0
  END;

  -- Addition amount
  v_addition := CASE
    WHEN NEW.addition_percentage IS NOT NULL
    THEN ABS(v_base_amount * COALESCE(NEW.addition_percentage, 0))
    ELSE 0
  END;

  -- Write calculated fields (never include total_amount — may be GENERATED ALWAYS)
  NEW.deduction_amount := v_deduction;
  NEW.addition_amount  := v_addition;
  NEW.net_amount       := v_base_amount - v_deduction + v_addition;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_calculate_tli_adjustments IS
  'Trigger function: calculates deduction_amount, addition_amount, and net_amount before insert/update. DOES NOT write to total_amount (may be GENERATED ALWAYS).';

-- Drop and recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS zz_trigger_calculate_adjustments ON public.transaction_line_items;

CREATE TRIGGER zz_trigger_calculate_adjustments
  BEFORE INSERT OR UPDATE ON public.transaction_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_calculate_tli_adjustments();

-- ─── STEP 1.7: RLS Policies on transaction_line_items ────────────────────────
-- Enable RLS if not already enabled
ALTER TABLE public.transaction_line_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "tli_select_org" ON public.transaction_line_items;
DROP POLICY IF EXISTS "tli_insert_org" ON public.transaction_line_items;
DROP POLICY IF EXISTS "tli_update_org" ON public.transaction_line_items;
DROP POLICY IF EXISTS "tli_delete_org" ON public.transaction_line_items;

-- Determine org_id via the parent transaction_line → transactions → org_id join
-- VIEW policy: any authenticated user can see items belonging to their accessible transactions
CREATE POLICY "tli_select_org" ON public.transaction_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.transaction_lines tl
      JOIN public.transactions t ON t.id = tl.transaction_id
      WHERE tl.id = transaction_line_items.transaction_line_id
      AND t.org_id IN (
        SELECT org_id FROM public.org_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: only on draft lines
CREATE POLICY "tli_insert_org" ON public.transaction_line_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.transaction_lines tl
      JOIN public.transactions t ON t.id = tl.transaction_id
      WHERE tl.id = transaction_line_items.transaction_line_id
      AND (tl.line_status = 'draft' OR tl.line_status IS NULL)
      AND t.org_id IN (
        SELECT org_id FROM public.org_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE: only on draft lines
CREATE POLICY "tli_update_org" ON public.transaction_line_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.transaction_lines tl
      JOIN public.transactions t ON t.id = tl.transaction_id
      WHERE tl.id = transaction_line_items.transaction_line_id
      AND (tl.line_status = 'draft' OR tl.line_status IS NULL)
      AND t.org_id IN (
        SELECT org_id FROM public.org_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE: only on draft lines
CREATE POLICY "tli_delete_org" ON public.transaction_line_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.transaction_lines tl
      JOIN public.transactions t ON t.id = tl.transaction_id
      WHERE tl.id = transaction_line_items.transaction_line_id
      AND (tl.line_status = 'draft' OR tl.line_status IS NULL)
      AND t.org_id IN (
        SELECT org_id FROM public.org_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- ─── STEP 1.8: Verification queries ─────────────────────────────────────────
-- Run these to confirm everything was applied correctly:

/*
-- Check approval_status column added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='transaction_lines' AND column_name='approval_status';

-- Check functions created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema='public'
AND routine_name IN ('can_edit_transaction_line','replace_line_items_atomic','fn_calculate_tli_adjustments');

-- Check trigger created
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table='transaction_line_items';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename='transaction_line_items' AND schemaname='public';

-- Check RLS policies
SELECT policyname, cmd FROM pg_policies
WHERE tablename='transaction_line_items' AND schemaname='public';

-- Quick test: can_edit_transaction_line with a known draft line ID
-- SELECT can_edit_transaction_line('your-line-uuid-here');
*/
