-- Rollback: 2025-10-13 Multiline cleanup (best-effort)
-- Purpose: remove triggers/functions/indexes added by forward migration.
-- Note: cannot restore dropped legacy columns or their data.

BEGIN;

-- 1) Drop optional pg_cron refresh function
DROP FUNCTION IF EXISTS public.refresh_reporting_matviews_concurrent();

-- 2) Drop constraint triggers and functions (balance and postability)
DROP TRIGGER IF EXISTS trg_tx_balanced_tx ON public.transactions;
DROP TRIGGER IF EXISTS trg_tx_balanced_lines ON public.transaction_lines;
DROP FUNCTION IF EXISTS public.fn_tx_must_be_balanced();

DROP TRIGGER IF EXISTS trg_check_line_account_postable ON public.transaction_lines;
DROP FUNCTION IF EXISTS public.fn_check_line_account_postable();

-- 3) Drop indexes created by the forward migration (safe if they exist)
DROP INDEX IF EXISTS public.ix_tl_transaction_id;
DROP INDEX IF EXISTS public.ix_tl_account_id;
DROP INDEX IF EXISTS public.ix_accounts_parent_id;
-- DROP INDEX IF EXISTS public.ix_accounts_path_gist; -- only if created
-- DROP INDEX IF EXISTS public.ix_tl_org_id;          -- only if created

-- 4) Drop unique constraint on (transaction_id, line_no) if added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_transaction_line_no'
      AND conrelid = 'public.transaction_lines'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.transaction_lines DROP CONSTRAINT uq_transaction_line_no';
  END IF;
END$$;

-- 5) Legacy CHECK constraint cleanup
ALTER TABLE IF EXISTS public.transactions
  DROP CONSTRAINT IF EXISTS transactions_no_legacy_accounts;

COMMIT;
