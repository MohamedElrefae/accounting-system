-- 048_rollups_refresh_and_cron.sql
-- Add a global refresh function and (optionally) schedule via pg_cron if available

begin;

-- Global refresh wrapper
create or replace function public.refresh_all_rollups()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regprocedure('public.refresh_expenses_categories_rollups()') is not null then
    perform public.refresh_expenses_categories_rollups();
  end if;
  -- Add additional refresh calls here if you later add materialized rollups for accounts, etc.
end
$$;

-- Optionally schedule a periodic refresh via pg_cron, only if extension exists
-- This schedules every 15 minutes. Adjust as needed.
do $$
begin
  if exists (select 1 from pg_available_extensions where name='pg_cron') then
    create extension if not exists pg_cron;
    -- Attempt to schedule; ignore errors if job already exists
    begin
      perform cron.schedule('rollups_refresh_every_15m', '*/15 * * * *', $cron$SELECT public.refresh_all_rollups();$cron$);
    exception when others then
      -- noop: job may already exist or cron not permitted
      null;
    end;
  end if;
end $$;

commit;

