-- 043_expenses_categories_rollups.sql
-- Analytics rollups for Expenses Categories (v1, view-based)
-- Provides child_count, has_transactions, and total debit/credit amounts per category,
-- aggregating over the category's entire subtree (via ltree path) and linked accounts.

begin;

-- Safety: require extensions if needed (ltree is used by expenses_categories.path)
create extension if not exists ltree;

-- View builds a per-category rollup using subtree account mappings
create or replace view public.v_expenses_categories_rollups as
with
-- Map each category to all linked accounts within its subtree (including itself)
cat_acc as (
  select p.id as category_id, p.org_id, c.linked_account_id as account_id
  from public.expenses_categories p
  join public.expenses_categories c
    on c.org_id = p.org_id
   and c.path <@ p.path
  where c.linked_account_id is not null
),
-- Aggregate posted transactions by category over the subtree accounts
-- Assumes transactions table has (org_id, amount, is_posted, debit_account_id, credit_account_id)
tx_agg as (
  select ca.category_id,
         sum(case when tx.debit_account_id  = ca.account_id then tx.amount else 0 end)::numeric as total_debit_amount,
         sum(case when tx.credit_account_id = ca.account_id then tx.amount else 0 end)::numeric as total_credit_amount,
         count(*) filter (
           where tx.debit_account_id = ca.account_id or tx.credit_account_id = ca.account_id
         ) as tx_count
  from cat_acc ca
  join public.transactions tx
    on tx.org_id = ca.org_id
   and (tx.debit_account_id = ca.account_id or tx.credit_account_id = ca.account_id)
   and coalesce(tx.is_posted, false) = true
  group by ca.category_id
),
-- Direct child count (not full subtree), for quick UI indicators
child_counts as (
  select ec.id as category_id, count(*)::int as child_count
  from public.expenses_categories ec
  join public.expenses_categories child on child.parent_id = ec.id
  group by ec.id
)
select 
  ec.id,
  ec.org_id,
  coalesce(cc.child_count, 0) as child_count,
  (coalesce(ta.tx_count, 0) > 0) as has_transactions,
  coalesce(ta.total_debit_amount, 0)::numeric as total_debit_amount,
  coalesce(ta.total_credit_amount, 0)::numeric as total_credit_amount,
  (coalesce(ta.total_debit_amount, 0) - coalesce(ta.total_credit_amount, 0))::numeric as net_amount
from public.expenses_categories ec
left join tx_agg ta on ta.category_id = ec.id
left join child_counts cc on cc.category_id = ec.id;

-- Grants (optional; align with your policy)
grant select on public.v_expenses_categories_rollups to anon, authenticated, service_role;

commit;

