-- Verification for 2026-01-18_fix_accounts_name_sync_triggers_no_debit_account_id.sql
-- Run AFTER applying the migration.

-- 1) Confirm transactions table really has no debit_account_id (sanity)
SELECT
  'has_transactions_debit_account_id' AS check_name,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='transactions'
      AND column_name='debit_account_id'
  ) AS exists;

-- 2) Confirm the problematic triggers are gone
SELECT
  'accounts_trigger_exists' AS check_name,
  tgname,
  tgenabled,
  pg_get_triggerdef(t.oid, true) AS trigger_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public'
  AND c.relname='accounts'
  AND tgname IN ('trg_sync_txn_names','trg_sync_txn_names_ar')
  AND NOT t.tgisinternal;

-- 3) Confirm the sync functions no longer reference debit_account_id
SELECT
  'function_has_debit_account_id' AS check_name,
  p.proname,
  (pg_get_functiondef(p.oid) ILIKE '%debit_account_id%') AS contains_debit_account_id
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN (
    'sync_transaction_account_names',
    'sync_transaction_account_names_ar',
    'safe_sync_transaction_account_names',
    'safe_sync_transaction_account_names_ar'
  )
ORDER BY p.proname;

-- 4) Optional: list any remaining functions in public schema that still reference debit_account_id
--    If any remain, they are unrelated to accounts update, but you can track them.
SELECT
  'remaining_functions_with_debit_account_id' AS check_name,
  p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND pg_get_functiondef(p.oid) ILIKE '%debit_account_id%'
ORDER BY p.proname;
