-- 038_add_classification_to_transactions.sql
-- Adds classification_id foreign key to transactions table and updates related functions

begin;

-- 1) Add classification_id column to transactions table
alter table public.transactions
add column if not exists classification_id uuid references public.transaction_classification(id);

-- 2) Create index for performance
create index if not exists idx_transactions_classification_id
  on public.transactions (classification_id);

-- 3) Create a view that includes classification information for easier querying
create or replace view public.v_transactions_with_classification as
select 
  t.id,
  t.entry_number,
  t.entry_date,
  t.description,
  t.description_ar,
  t.amount,
  t.notes,
  t.notes_ar,
  t.is_posted,
  t.posted_at,
  t.posted_by,
  t.source_document,
  t.reference_number,
  t.debit_account_id,
  t.credit_account_id,
  t.debit_account_code,
  t.debit_account_name,
  t.credit_account_code,
  t.credit_account_name,
  t.project_id,
  t.org_id,
  t.created_at,
  t.updated_at,
  t.created_by,
  -- Classification information
  t.classification_id,
  tc.code as classification_code,
  tc.name as classification_name,
  tc.post_to_costs as classification_post_to_costs
from public.transactions t
left join public.transaction_classification tc on tc.id = t.classification_id;

-- 4) Grant permissions on the view
grant select on public.v_transactions_with_classification to authenticated, service_role;

-- 5) Create function to get transactions with classification for an organization
create or replace function public.get_transactions_with_classification(
  p_org_id uuid,
  p_classification_id uuid default null,
  p_project_id uuid default null,
  p_start_date date default null,
  p_end_date date default null,
  p_is_posted boolean default null
)
returns table (
  id uuid,
  entry_number text,
  entry_date date,
  description text,
  description_ar text,
  amount numeric,
  notes text,
  notes_ar text,
  is_posted boolean,
  posted_at timestamptz,
  source_document text,
  reference_number text,
  debit_account_code text,
  debit_account_name text,
  credit_account_code text,
  credit_account_name text,
  project_id uuid,
  classification_id uuid,
  classification_code integer,
  classification_name text,
  classification_post_to_costs boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_has_access boolean := false;
begin
  -- Check if user is member of organization
  select exists(
    select 1 from public.org_memberships membership
    where membership.user_id = auth.uid() 
      and membership.org_id = p_org_id
  ) into v_user_has_access;

  if not v_user_has_access then
    raise exception 'ليس لديك صلاحية في هذه المؤسسة';
  end if;

  return query
  select 
    vt.id,
    vt.entry_number,
    vt.entry_date,
    vt.description,
    vt.description_ar,
    vt.amount,
    vt.notes,
    vt.notes_ar,
    vt.is_posted,
    vt.posted_at,
    vt.source_document,
    vt.reference_number,
    vt.debit_account_code,
    vt.debit_account_name,
    vt.credit_account_code,
    vt.credit_account_name,
    vt.project_id,
    vt.classification_id,
    vt.classification_code,
    vt.classification_name,
    vt.classification_post_to_costs,
    vt.created_at
  from public.v_transactions_with_classification vt
  where vt.org_id = p_org_id
    and (p_classification_id is null or vt.classification_id = p_classification_id)
    and (p_project_id is null or vt.project_id = p_project_id)
    and (p_start_date is null or vt.entry_date >= p_start_date)
    and (p_end_date is null or vt.entry_date <= p_end_date)
    and (p_is_posted is null or vt.is_posted = p_is_posted)
  order by vt.entry_date desc, vt.entry_number desc;
end;
$$;

-- 6) Grant execute permission
grant execute on function public.get_transactions_with_classification(uuid, uuid, uuid, date, date, boolean) to authenticated, service_role;

commit;
