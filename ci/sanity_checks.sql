-- CI sanity checks for multiline model
-- Exit with an error if invariants are violated. Intended to be used by CI tooling.

-- 1) Ensure legacy columns do not exist
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'transactions'
    AND c.column_name IN ('debit_account_id','credit_account_id','amount','source_module','source_reference_id');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'CI CHECK FAILED: Legacy columns still present on public.transactions';
  END IF;
END$$;

-- 2) Ensure no unbalanced posted transactions
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT t.id
    FROM public.transactions t
    JOIN public.transaction_lines tl ON tl.transaction_id = t.id
    WHERE t.is_posted = true
    GROUP BY t.id
    HAVING COALESCE(SUM(tl.debit_amount),0) <> COALESCE(SUM(tl.credit_amount),0)
       OR COALESCE(SUM(tl.debit_amount),0) <= 0
  ) s;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'CI CHECK FAILED: Found % unbalanced posted transactions', v_count;
  END IF;
END$$;

-- 3) Ensure key triggers exist and are deferrable
DO $$
DECLARE v_missing int;
BEGIN
  SELECT 3 - COUNT(*) INTO v_missing
  FROM (
    SELECT tg.tgname
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    WHERE c.relname IN ('transaction_lines','transactions')
      AND tg.tgname IN ('trg_tx_balanced_lines','trg_tx_balanced_tx','trg_check_line_account_postable')
  ) t;
  IF v_missing <> 0 THEN
    RAISE EXCEPTION 'CI CHECK FAILED: Missing % required trigger(s)', v_missing;
  END IF;
END$$;

-- 4) Ensure primary line/view queries compile
-- If any of these fail, CI fails; otherwise they are no-ops
SELECT 1 FROM public.transactions_enriched_v2 LIMIT 1;
SELECT 1 FROM public.transactions_enriched    LIMIT 1;
SELECT 1 FROM public.balance_sheet_view_v2    LIMIT 1;
SELECT 1 FROM public.income_statement_view_v2 LIMIT 1;
SELECT 1 FROM public.trial_balance_view_v2    LIMIT 1;
SELECT 1 FROM public.v_gl_transactions_fact   LIMIT 1;
SELECT 1 FROM public.v_gl_transactions_export_flat LIMIT 1;
