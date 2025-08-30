-- 036_accounts_is_standard.sql
-- Adds a concrete is_standard flag and updates can_delete_account to use it
-- Run this migration in your local migration flow, and you can also copy sections into Supabase

begin;

-- 1) Add is_standard column
alter table public.accounts
  add column if not exists is_standard boolean not null default false;

-- 2) Initialize baseline: mark level=1 accounts as standard (adjust as needed)
update public.accounts
set is_standard = true
where level = 1;

-- 3) Index to speed up checks
create index if not exists idx_accounts_is_standard
  on public.accounts (is_standard);

-- 4) Update can_delete_account to use accounts.is_standard
create or replace function public.can_delete_account(
  p_org_id uuid,
  p_account_id uuid
)
returns table (
  can_delete boolean,
  has_children boolean,
  has_transactions boolean,
  is_standard boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_children boolean := false;
  v_txn_count bigint := 0;
  v_is_standard boolean := false;
begin
  -- Children
  select exists (
    select 1 from public.accounts c
    where c.parent_id = p_account_id and c.org_id = p_org_id
  ) into v_has_children;

  -- Transactions via GL summary
  select coalesce(s.transaction_count, 0)
  into v_txn_count
  from public.get_gl_account_summary(
    null,            -- as-of
    current_date,
    p_org_id,
    null,            -- project
    true,            -- posted_only
    null,
    null
  ) s
  where s.account_id = p_account_id
  limit 1;

  -- Standard flag from accounts
  select a.is_standard
  into v_is_standard
  from public.accounts a
  where a.id = p_account_id and a.org_id = p_org_id;

  return query
  select
    case
      when v_is_standard then false
      when v_has_children then false
      when v_txn_count > 0 then false
      else true
    end as can_delete,
    v_has_children as has_children,
    (v_txn_count > 0) as has_transactions,
    v_is_standard as is_standard,
    case
      when v_is_standard then 'حساب قياسي (افتراضي) لا يمكن حذفه'
      when v_has_children then 'لا يمكن حذف حساب له فروع'
      when v_txn_count > 0 then 'لا يمكن حذف حساب لديه حركات'
      else 'يمكن الحذف'
    end as reason;
end;
$$;

grant execute on function public.can_delete_account(uuid, uuid) to anon, authenticated, service_role;

commit;

