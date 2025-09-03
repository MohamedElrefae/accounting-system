-- 020_expenses_categories_code_check.sql
-- Enforce numeric-only codes for expenses categories going forward
-- Adds a CHECK constraint to ensure code ~ '^[0-9]+$'
-- Uses NOT VALID so existing legacy rows with non-numeric codes won't block the migration

begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = t.relnamespace
    where nsp.nspname = 'public'
      and t.relname = 'expenses_categories'
      and c.conname = 'expenses_categories_code_numeric_chk'
  ) then
    alter table public.expenses_categories
      add constraint expenses_categories_code_numeric_chk
      check (code ~ '^[0-9]+$') not valid;
  end if;
end $$;

commit;

-- Optional: once legacy data is cleaned up, run the following to validate existing rows
-- alter table public.expenses_categories validate constraint expenses_categories_code_numeric_chk;

