-- 010_fix_ledger_for_single_row_entry.sql
-- Remove incorrect unique index so we can insert two ledger rows per transaction (debit and credit).
-- Idempotency is enforced in post_transaction by checking existence before insert.

begin;

-- Drop the unique index if it exists
DO $$
BEGIN
  IF exists (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'ux_ledger_tx_once'
      AND n.nspname = 'public'
  ) THEN
    drop index public.ux_ledger_tx_once;
  END IF;
END$$;

commit;

