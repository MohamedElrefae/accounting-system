-- Admin: Operational sanity (one-click)
-- Purpose: run quick checks and emit NOTICEs with guidance (no exceptions unless critical).

DO $$
DECLARE
  v_legacy_cols int := 0;
  v_unbalanced   int := 0;
  v_missing_trg  int := 0;
BEGIN
  -- Legacy columns check
  SELECT COUNT(*) INTO v_legacy_cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'transactions'
    AND c.column_name IN ('debit_account_id','credit_account_id','amount','source_module','source_reference_id');
  IF v_legacy_cols = 0 THEN
    RAISE NOTICE 'OK: No legacy columns on public.transactions.';
  ELSE
    RAISE NOTICE 'WARN: Found % legacy columns on public.transactions. Investigate.', v_legacy_cols;
  END IF;

  -- Unbalanced posted transactions
  SELECT COUNT(*) INTO v_unbalanced
  FROM (
    SELECT t.id
    FROM public.transactions t
    JOIN public.transaction_lines tl ON tl.transaction_id = t.id
    WHERE t.is_posted = true
    GROUP BY t.id
    HAVING COALESCE(SUM(tl.debit_amount),0) <> COALESCE(SUM(tl.credit_amount),0)
       OR COALESCE(SUM(tl.debit_amount),0) <= 0
  ) s;
  IF v_unbalanced = 0 THEN
    RAISE NOTICE 'OK: No unbalanced posted transactions.';
  ELSE
    RAISE NOTICE 'FAIL: % unbalanced posted transactions found.', v_unbalanced;
  END IF;

  -- Triggers present
  SELECT 3 - COUNT(*) INTO v_missing_trg
  FROM (
    SELECT tg.tgname
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    WHERE c.relname IN ('transaction_lines','transactions')
      AND tg.tgname IN ('trg_tx_balanced_lines','trg_tx_balanced_tx','trg_check_line_account_postable')
  ) t;
  IF v_missing_trg = 0 THEN
    RAISE NOTICE 'OK: All required triggers are present.';
  ELSE
    RAISE NOTICE 'FAIL: % required trigger(s) missing.', v_missing_trg;
  END IF;

  -- Compile checks
  PERFORM 1 FROM public.transactions_enriched_v2 LIMIT 1; RAISE NOTICE 'OK: transactions_enriched_v2 compiles.';
  PERFORM 1 FROM public.transactions_enriched    LIMIT 1; RAISE NOTICE 'OK: transactions_enriched compiles.';
  PERFORM 1 FROM public.balance_sheet_view_v2    LIMIT 1; RAISE NOTICE 'OK: balance_sheet_view_v2 compiles.';
  PERFORM 1 FROM public.income_statement_view_v2 LIMIT 1; RAISE NOTICE 'OK: income_statement_view_v2 compiles.';
  PERFORM 1 FROM public.trial_balance_view_v2    LIMIT 1; RAISE NOTICE 'OK: trial_balance_view_v2 compiles.';
  PERFORM 1 FROM public.v_gl_transactions_fact   LIMIT 1; RAISE NOTICE 'OK: v_gl_transactions_fact compiles.';
  PERFORM 1 FROM public.v_gl_transactions_export_flat LIMIT 1; RAISE NOTICE 'OK: v_gl_transactions_export_flat compiles.';

  RAISE NOTICE 'Admin sanity complete.';
END$$;