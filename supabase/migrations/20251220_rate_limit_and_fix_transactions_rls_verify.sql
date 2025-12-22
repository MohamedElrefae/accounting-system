-- 2025-12-20_rate_limit_and_fix_transactions_rls_verify.sql
SET search_path = public;

-- 1) Verify debug policy removal + new tx policies
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('transactions', 'transaction_lines')
order by tablename, policyname;

-- 2) Verify rate limit tables/functions exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'rate_limit_counters';

select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('consume_rate_limit', 'tg_rate_limit_transactions', 'tg_rate_limit_transaction_lines');

-- 3) Verify triggers exist
select
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('transactions', 'transaction_lines')
  and t.tgname in ('zzz_rate_limit_transactions', 'zzz_rate_limit_transaction_lines')
  and not t.tgisinternal
order by c.relname, t.tgname;

-- 4) Manual behavioral test (run while authenticated in SQL editor)
-- NOTE: These should succeed until you exceed the limits.
-- The error code is custom (42900) and the message will be 'rate limit exceeded'.

-- Try consuming the limiter in a loop to confirm it blocks at the configured limits.
-- transactions_write: 60 per 60 seconds
DO $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..65 LOOP
    PERFORM public.consume_rate_limit('transactions_write', 60, 60);
  END LOOP;
END;
$$;

-- transaction_lines_write: 1000 per 60 seconds
DO $$
DECLARE
  i int;
BEGIN
  FOR i IN 1..1010 LOOP
    PERFORM public.consume_rate_limit('transaction_lines_write', 1000, 60);
  END LOOP;
END;
$$;

-- 5) Verify counters were written (should be visible only to service_role normally)
-- If you run this as authenticated, it may fail due to revoked privileges (expected).
-- Service role can verify:
-- select * from public.rate_limit_counters order by updated_at desc limit 20;
