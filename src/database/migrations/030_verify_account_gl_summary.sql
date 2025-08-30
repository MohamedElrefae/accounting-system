-- 030_verify_account_gl_summary.sql
-- Server-side verification for a single account against GL summary

begin;

create or replace function public.verify_account_gl_summary(
  p_account_id uuid,
  p_date_from date default null,
  p_date_to date default null,
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_posted_only boolean default true
)
returns table (
  account_id uuid,
  account_code text,
  account_name_ar text,
  opening_debit numeric,
  opening_credit numeric,
  period_debits numeric,
  period_credits numeric,
  closing_debit numeric,
  closing_credit numeric,
  transaction_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    s.account_id,
    s.account_code,
    s.account_name_ar,
    s.opening_debit,
    s.opening_credit,
    s.period_debits,
    s.period_credits,
    s.closing_debit,
    s.closing_credit,
    s.transaction_count
  from public.get_gl_account_summary(
    p_date_from,
    p_date_to,
    p_org_id,
    p_project_id,
    p_posted_only,
    null,
    null
  ) s
  where s.account_id = p_account_id;
$$;

grant execute on function public.verify_account_gl_summary(uuid, date, date, uuid, uuid, boolean)
  to anon, authenticated, service_role;

commit;

