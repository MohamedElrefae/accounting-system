-- 2026-01-18_fix_sync_transaction_account_names_legacy.sql
-- Fix: remaining legacy functions still reference debit_account_id
-- Context: transactions table has NO debit_account_id/credit_account_id; schema uses transaction_lines.
-- Goal: make the legacy sync functions no-op so any accidental invocation won't error.

BEGIN;

-- Replace legacy sync functions with NO-OP implementations
CREATE OR REPLACE FUNCTION public.sync_transaction_account_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  RETURN NEW;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.sync_transaction_account_names TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_transaction_account_names_ar TO authenticated;

COMMIT;
