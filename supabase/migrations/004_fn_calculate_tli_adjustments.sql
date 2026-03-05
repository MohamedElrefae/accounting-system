-- 004_fn_calculate_tli_adjustments.sql
-- Step 4: Create trigger function and trigger for adjustment calculations

-- Critical: PostgreSQL fires BEFORE triggers alphabetically by name.
-- The existing trigger 'trigger_calculate_transaction_line_item_total' fires first.
-- This trigger is named 'zz_trigger_calculate_adjustments' to guarantee it fires last.
-- Because total_amount is a GENERATED ALWAYS STORED column and is NOT available
-- in NEW during a BEFORE trigger, we recompute v_total from raw columns using the same formula.

CREATE OR REPLACE FUNCTION fn_calculate_tli_adjustments()
RETURNS TRIGGER AS $$
DECLARE
  v_total     NUMERIC(15,4);
  v_deduction NUMERIC(15,4) := 0;
  v_addition  NUMERIC(15,4) := 0;
BEGIN
  -- Recompute total (cannot read NEW.total_amount in BEFORE trigger)
  v_total := (NEW.quantity * (NEW.percentage / 100.0)) * NEW.unit_price;

  IF NEW.deduction_percentage IS NOT NULL THEN
    v_deduction := ROUND(v_total * NEW.deduction_percentage, 4);
  END IF;

  IF NEW.addition_percentage IS NOT NULL THEN
    v_addition := ROUND(v_total * NEW.addition_percentage, 4);
  END IF;

  NEW.deduction_amount := v_deduction;
  NEW.addition_amount  := v_addition;
  NEW.net_amount       := v_total - v_deduction + v_addition;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger with 'zz_' prefix to ensure it fires after existing triggers
CREATE TRIGGER zz_trigger_calculate_adjustments
BEFORE INSERT OR UPDATE
ON public.transaction_line_items
FOR EACH ROW
EXECUTE FUNCTION fn_calculate_tli_adjustments();
