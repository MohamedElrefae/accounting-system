-- 040_expenses_categories_rls.sql
-- RLS policies for expenses categories (viewer/select, manager/insert+update, admin/delete)

begin;

alter table public.expenses_categories enable row level security;

drop policy if exists ec_select on public.expenses_categories;
create policy ec_select on public.expenses_categories
for select
using (public.is_org_member(org_id, 'viewer'));

drop policy if exists ec_insert on public.expenses_categories;
create policy ec_insert on public.expenses_categories
for insert
with check (public.is_org_member(org_id, 'manager'));

drop policy if exists ec_update on public.expenses_categories;
create policy ec_update on public.expenses_categories
for update
using (public.is_org_member(org_id, 'manager'));

drop policy if exists ec_delete on public.expenses_categories;
create policy ec_delete on public.expenses_categories
for delete
using (public.is_org_member(org_id, 'admin'));

commit;

