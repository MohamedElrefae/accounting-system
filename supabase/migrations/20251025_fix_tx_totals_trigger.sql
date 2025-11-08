-- 2025-10-25: Prevent recursive updates on transactions totals trigger
SET search_path = public;

-- Recreate trg_tx_update_totals_on_tx as AFTER UPDATE only (remove AFTER INSERT to avoid self-recursion)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'transactions' AND t.tgname = 'trg_tx_update_totals_on_tx'
  ) THEN
    EXECUTE 'DROP TRIGGER trg_tx_update_totals_on_tx ON public.transactions';
  END IF;
  -- Only recreate if the function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='fn_tx_update_totals_and_counts'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_tx_update_totals_on_tx AFTER UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.fn_tx_update_totals_and_counts()';
  END IF;
END $$;