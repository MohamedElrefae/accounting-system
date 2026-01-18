-- 2026-01-18_fix_accounts_name_sync_triggers_no_debit_account_id.sql
-- Fix: account name update fails with: column "debit_account_id" does not exist
-- Root cause: accounts AFTER UPDATE trigger calls function(s) that reference transactions.debit_account_id
-- but the transactions table does not have debit_account_id/credit_account_id in current schema.

BEGIN;

-- 1) Drop the triggers on accounts that attempt to sync transaction names
DROP TRIGGER IF EXISTS trg_sync_txn_names ON public.accounts;
DROP TRIGGER IF EXISTS trg_sync_txn_names_ar ON public.accounts;

-- 2) Replace any existing sync functions with NO-OP implementations.
--    We intentionally keep the function names so other DB objects that reference them don't break,
--    but we stop them from touching non-existent columns.

CREATE OR REPLACE FUNCTION public.sync_transaction_account_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op: schema uses transaction_lines; transactions table has no debit_account_id/credit_account_id
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_transaction_account_names_ar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op: schema uses transaction_lines; transactions table has no debit_account_id/credit_account_id
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.safe_sync_transaction_account_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op for same reason as above
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.safe_sync_transaction_account_names_ar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op for same reason as above
  RETURN NEW;
END;
$$;

-- 3) (Optional) If you later add cached name columns and want sync back,
--    you can implement a correct sync based on transaction_lines.account_id.

-- 4) Ensure permissions remain sane
GRANT EXECUTE ON FUNCTION public.sync_transaction_account_names TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_transaction_account_names_ar TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_sync_transaction_account_names TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_sync_transaction_account_names_ar TO authenticated;

COMMIT;
