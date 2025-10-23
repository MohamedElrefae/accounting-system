-- Migration: 2025-10-13 Multiline cleanup (idempotent)
-- Purpose: ensure legacy headers are dropped, required triggers/constraints/indexes exist,
--          and optional scheduling is defined. Safe to run multiple times.

BEGIN;

-- 1) Ensure legacy columns are removed from transactions (no-op if already dropped)
ALTER TABLE IF EXISTS public.transactions
  DROP COLUMN IF EXISTS debit_account_id,
  DROP COLUMN IF EXISTS credit_account_id,
  DROP COLUMN IF EXISTS amount,
  DROP COLUMN IF EXISTS source_module,
  DROP COLUMN IF EXISTS source_reference_id;

-- 2) Guard: disallow legacy single-line posting on transactions (for environments where columns still exist)
-- Note: If columns no longer exist, this CHECK is a no-op addition attempt handled in DO block
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions'
      AND column_name IN ('debit_account_id','credit_account_id')
  ) THEN
    EXECUTE $$ALTER TABLE public.transactions
      DROP CONSTRAINT IF EXISTS transactions_no_legacy_accounts,
      ADD CONSTRAINT transactions_no_legacy_accounts
      CHECK (debit_account_id IS NULL AND credit_account_id IS NULL)$$;
  END IF;
END$$;

-- 3) Ensure account-postability trigger exists on transaction_lines
CREATE OR REPLACE FUNCTION public.fn_check_line_account_postable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_postable boolean;
  v_allow boolean;
  v_active boolean;
BEGIN
  SELECT a.is_postable, a.allow_transactions, a.is_active
  INTO v_is_postable, v_allow, v_active
  FROM public.accounts a
  WHERE a.id = NEW.account_id;

  IF v_is_postable IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Account % is not postable', NEW.account_id USING ERRCODE = 'check_violation';
  END IF;
  IF v_allow IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Account % does not allow transactions', NEW.account_id USING ERRCODE = 'check_violation';
  END IF;
  IF v_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Account % is not active', NEW.account_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_check_line_account_postable ON public.transaction_lines;
CREATE TRIGGER trg_check_line_account_postable
BEFORE INSERT OR UPDATE ON public.transaction_lines
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_line_account_postable();

-- 4) Ensure balance/line-count constraint triggers exist and are deferrable
CREATE OR REPLACE FUNCTION public.fn_tx_must_be_balanced()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx_id uuid;
  v_lines int;
  v_debits numeric(30,4);
  v_credits numeric(30,4);
BEGIN
  IF TG_TABLE_NAME = 'transaction_lines' THEN
    IF TG_OP IN ('INSERT','UPDATE') THEN
      v_tx_id := NEW.transaction_id;
    ELSE
      v_tx_id := OLD.transaction_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    IF TG_OP IN ('INSERT','UPDATE') THEN
      v_tx_id := NEW.id;
    ELSE
      v_tx_id := OLD.id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unexpected table: %', TG_TABLE_NAME;
  END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(debit_amount),0), COALESCE(SUM(credit_amount),0)
  INTO v_lines, v_debits, v_credits
  FROM public.transaction_lines
  WHERE transaction_id = v_tx_id;

  IF v_lines < 2 THEN
    RAISE EXCEPTION 'Transaction % must have at least two lines (has %)', v_tx_id, v_lines
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_debits <> v_credits OR v_debits <= 0 THEN
    RAISE EXCEPTION 'Transaction % not balanced: debits=%, credits=%', v_tx_id, v_debits, v_credits
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_tx_balanced_lines ON public.transaction_lines;
CREATE CONSTRAINT TRIGGER trg_tx_balanced_lines
AFTER INSERT OR UPDATE OR DELETE ON public.transaction_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.fn_tx_must_be_balanced();

DROP TRIGGER IF EXISTS trg_tx_balanced_tx ON public.transactions;
CREATE CONSTRAINT TRIGGER trg_tx_balanced_tx
AFTER INSERT OR UPDATE ON public.transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.fn_tx_must_be_balanced();

-- 5) Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS ix_tl_transaction_id ON public.transaction_lines (transaction_id);
CREATE INDEX IF NOT EXISTS ix_tl_account_id      ON public.transaction_lines (account_id);
-- Optional: uncomment if you replicate org_id to lines
-- CREATE INDEX IF NOT EXISTS ix_tl_org_id ON public.transaction_lines (org_id);

-- Unique line_no per transaction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_transaction_line_no'
      AND conrelid = 'public.transaction_lines'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.transaction_lines ADD CONSTRAINT uq_transaction_line_no UNIQUE (transaction_id, line_no)';
  END IF;
END$$;

-- Accounts helpers
CREATE INDEX IF NOT EXISTS ix_accounts_parent_id ON public.accounts (parent_id);
-- Optional ltree path index (uncomment if using ltree)
-- CREATE INDEX IF NOT EXISTS ix_accounts_path_gist ON public.accounts USING GIST (path);

-- 6) Optional: pg_cron plumbing (only defines function; scheduling is managed separately)
CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews_concurrent()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_expenses_categories_rollups;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Refresh failed: mv_expenses_categories_rollups: %', SQLERRM;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gl_transactions_fact;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Refresh failed: mv_gl_transactions_fact: %', SQLERRM;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gl_transactions_export_flat;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Refresh failed: mv_gl_transactions_export_flat: %', SQLERRM;
  END;
END
$$;

COMMIT;
