-- 048_accounts_activity_rollups_enhanced.sql
-- Enhanced analytics rollups for Accounts with support for posted vs all transactions
-- Provides child_count, has_transactions, and total debit/credit/net per account over its subtree.

begin;

create extension if not exists ltree;

-- Create an RPC function that can handle both posted and all transactions
create or replace function public.get_accounts_activity_rollups(
  p_org_id uuid,
  p_include_unposted boolean default false
)
returns table (
  id uuid,
  org_id uuid,
  child_count int,
  has_transactions boolean,
  total_debit_amount numeric,
  total_credit_amount numeric,
  net_amount numeric
)
language plpgsql
security definer
as $$
begin
  return query
  with
  acc_desc as (
    select p.id as account_id, p.org_id, c.id as leaf_id
    from public.accounts p
    join public.accounts c
      on c.org_id = p.org_id
     and c.path <@ p.path
    where p.org_id = p_org_id
  ),
  tx_agg as (
    select ad.account_id,
           sum(case when tx.debit_account_id  = ad.leaf_id then tx.amount else 0 end)::numeric as total_debit_amount,
           sum(case when tx.credit_account_id = ad.leaf_id then tx.amount else 0 end)::numeric as total_credit_amount,
           count(*) filter (
             where tx.debit_account_id = ad.leaf_id or tx.credit_account_id = ad.leaf_id
           ) as tx_count
    from acc_desc ad
    join public.transactions tx
      on tx.org_id = ad.org_id
     and (tx.debit_account_id = ad.leaf_id or tx.credit_account_id = ad.leaf_id)
     and (p_include_unposted = true or coalesce(tx.is_posted, false) = true)
    group by ad.account_id
  ),
  child_counts as (
    select a.id as account_id, count(*)::int as child_count
    from public.accounts a
    join public.accounts c on c.parent_id = a.id
    where a.org_id = p_org_id
    group by a.id
  )
  select a.id,
         a.org_id,
         coalesce(cc.child_count, 0) as child_count,
         (coalesce(ta.tx_count, 0) > 0) as has_transactions,
         coalesce(ta.total_debit_amount, 0)::numeric as total_debit_amount,
         coalesce(ta.total_credit_amount, 0)::numeric as total_credit_amount,
         (coalesce(ta.total_debit_amount, 0) - coalesce(ta.total_credit_amount, 0))::numeric as net_amount
  from public.accounts a
  left join tx_agg ta on ta.account_id = a.id
  left join child_counts cc on cc.account_id = a.id
  where a.org_id = p_org_id;
end;
$$;

-- Grant permissions
grant execute on function public.get_accounts_activity_rollups to anon, authenticated, service_role;

-- Also update the original view to be more explicit about only posted transactions
drop view if exists public.v_accounts_activity_rollups;
create or replace view public.v_accounts_activity_rollups as
with
acc_desc as (
  select p.id as account_id, p.org_id, c.id as leaf_id
  from public.accounts p
  join public.accounts c
    on c.org_id = p.org_id
   and c.path <@ p.path
),
tx_agg as (
  select ad.account_id,
         sum(case when tx.debit_account_id  = ad.leaf_id then tx.amount else 0 end)::numeric as total_debit_amount,
         sum(case when tx.credit_account_id = ad.leaf_id then tx.amount else 0 end)::numeric as total_credit_amount,
         count(*) filter (
           where tx.debit_account_id = ad.leaf_id or tx.credit_account_id = ad.leaf_id
         ) as tx_count
  from acc_desc ad
  join public.transactions tx
    on tx.org_id = ad.org_id
   and (tx.debit_account_id = ad.leaf_id or tx.credit_account_id = ad.leaf_id)
   and coalesce(tx.is_posted, false) = true  -- Only posted transactions
  group by ad.account_id
),
child_counts as (
  select a.id as account_id, count(*)::int as child_count
  from public.accounts a
  join public.accounts c on c.parent_id = a.id
  group by a.id
)
select a.id,
       a.org_id,
       coalesce(cc.child_count, 0) as child_count,
       (coalesce(ta.tx_count, 0) > 0) as has_transactions,
       coalesce(ta.total_debit_amount, 0)::numeric as total_debit_amount,
       coalesce(ta.total_credit_amount, 0)::numeric as total_credit_amount,
       (coalesce(ta.total_debit_amount, 0) - coalesce(ta.total_credit_amount, 0))::numeric as net_amount
from public.accounts a
left join tx_agg ta on ta.account_id = a.id
left join child_counts cc on cc.account_id = a.id;

grant select on public.v_accounts_activity_rollups to anon, authenticated, service_role;

commit;
