-- 037_transaction_classification_fixed.sql
-- Creates transaction_classification table with CRUD operations (without users table dependency)
-- Run this migration in your local migration flow, and you can also copy sections into Supabase

begin;

-- 1) Create transaction_classification table
create table if not exists public.transaction_classification (
  id uuid default gen_random_uuid() primary key,
  code integer not null,
  name text not null,
  post_to_costs boolean not null default false,
  
  -- Organization management
  org_id uuid not null references public.organizations(id) on delete cascade,
  
  -- Audit fields (using auth.uid() instead of users table references)
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  created_by uuid, -- references auth.users(id) but no FK constraint
  updated_by uuid, -- references auth.users(id) but no FK constraint
  
  -- Unique constraints
  unique(org_id, code),
  unique(org_id, name)
);

-- 2) Add RLS (Row Level Security)
alter table public.transaction_classification enable row level security;

-- 3) Create policies
create policy "Users can view transaction classification in their organization"
  on public.transaction_classification for select
  using (org_id in (
    select org_id from public.org_memberships 
    where user_id = auth.uid() and status = 'active'
  ));

create policy "Users can insert transaction classification in their organization"
  on public.transaction_classification for insert
  with check (
    org_id in (
      select org_id from public.org_memberships 
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "Users can update transaction classification in their organization"
  on public.transaction_classification for update
  using (
    org_id in (
      select org_id from public.org_memberships 
      where user_id = auth.uid() and status = 'active'
    )
  )
  with check (
    org_id in (
      select org_id from public.org_memberships 
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy "Users can delete transaction classification in their organization"
  on public.transaction_classification for delete
  using (
    org_id in (
      select org_id from public.org_memberships 
      where user_id = auth.uid() and status = 'active'
    )
  );

-- 4) Create indexes for performance
create index if not exists idx_transaction_classification_org_id
  on public.transaction_classification (org_id);
  
create index if not exists idx_transaction_classification_code
  on public.transaction_classification (org_id, code);

-- 5) Create updated_at trigger
create or replace function public.update_transaction_classification_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger update_transaction_classification_updated_at
  before update on public.transaction_classification
  for each row execute function public.update_transaction_classification_updated_at();

-- 6) Create CRUD functions

-- Insert function
create or replace function public.transaction_classification_insert(
  p_org_id uuid,
  p_code integer,
  p_name text,
  p_post_to_costs boolean default false
)
returns table (
  id uuid,
  code integer,
  name text,
  post_to_costs boolean,
  org_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result record;
begin
  -- Check if user is member of organization
  if not exists (
    select 1 from public.org_memberships 
    where user_id = auth.uid() and org_id = p_org_id and status = 'active'
  ) then
    raise exception 'ليس لديك صلاحية في هذه المؤسسة';
  end if;

  -- Insert new transaction classification
  insert into public.transaction_classification (
    org_id, code, name, post_to_costs, created_by
  ) values (
    p_org_id, p_code, p_name, p_post_to_costs, auth.uid()
  ) returning * into v_result;

  return query
  select 
    v_result.id,
    v_result.code,
    v_result.name,
    v_result.post_to_costs,
    v_result.org_id,
    v_result.created_at,
    v_result.updated_at;
end;
$$;

-- Update function
create or replace function public.transaction_classification_update(
  p_org_id uuid,
  p_id uuid,
  p_code integer,
  p_name text,
  p_post_to_costs boolean
)
returns table (
  id uuid,
  code integer,
  name text,
  post_to_costs boolean,
  org_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result record;
begin
  -- Check if user is member of organization
  if not exists (
    select 1 from public.org_memberships 
    where user_id = auth.uid() and org_id = p_org_id and status = 'active'
  ) then
    raise exception 'ليس لديك صلاحية في هذه المؤسسة';
  end if;

  -- Update transaction classification
  update public.transaction_classification
  set 
    code = p_code,
    name = p_name,
    post_to_costs = p_post_to_costs,
    updated_by = auth.uid()
  where id = p_id and org_id = p_org_id
  returning * into v_result;

  if not found then
    raise exception 'تصنيف المعاملة غير موجود';
  end if;

  return query
  select 
    v_result.id,
    v_result.code,
    v_result.name,
    v_result.post_to_costs,
    v_result.org_id,
    v_result.created_at,
    v_result.updated_at;
end;
$$;

-- Delete function
create or replace function public.transaction_classification_delete(
  p_org_id uuid,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if user is member of organization
  if not exists (
    select 1 from public.org_memberships 
    where user_id = auth.uid() and org_id = p_org_id and status = 'active'
  ) then
    raise exception 'ليس لديك صلاحية في هذه المؤسسة';
  end if;

  -- Delete transaction classification
  delete from public.transaction_classification
  where id = p_id and org_id = p_org_id;

  if not found then
    raise exception 'تصنيف المعاملة غير موجود';
  end if;
end;
$$;

-- Get next available code function
create or replace function public.get_next_transaction_classification_code(
  p_org_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_code integer;
begin
  -- Check if user is member of organization
  if not exists (
    select 1 from public.org_memberships 
    where user_id = auth.uid() and org_id = p_org_id and status = 'active'
  ) then
    raise exception 'ليس لديك صلاحية في هذه المؤسسة';
  end if;

  -- Get max code for this organization
  select coalesce(max(code), 0) + 1
  into v_max_code
  from public.transaction_classification
  where org_id = p_org_id;

  return v_max_code;
end;
$$;

-- 7) Grant permissions
grant all on table public.transaction_classification to authenticated, service_role;
grant execute on function public.transaction_classification_insert(uuid, integer, text, boolean) to authenticated, service_role;
grant execute on function public.transaction_classification_update(uuid, uuid, integer, text, boolean) to authenticated, service_role;
grant execute on function public.transaction_classification_delete(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_next_transaction_classification_code(uuid) to authenticated, service_role;

-- 8) Insert initial data (the sample data you provided)
-- This will be inserted for each organization that exists
do $$
declare
  org record;
begin
  for org in select id from public.organizations loop
    insert into public.transaction_classification (org_id, code, name, post_to_costs, created_by) values
    (org.id, 1, 'وارد خزينة', true, null),
    (org.id, 2, 'صرف خزينة', false, null),
    (org.id, 3, 'استحقاق مقاول', true, null),
    (org.id, 4, 'استحقاق مورد', true, null),
    (org.id, 5, 'دفعة مقاول', true, null),
    (org.id, 6, 'دفعة مورد', false, null),
    (org.id, 7, 'قيد استحقاق الايراد', true, null),
    (org.id, 8, 'قيد سداد الايراد', true, null)
    on conflict (org_id, code) do nothing; -- Skip if already exists
  end loop;
end;
$$;

commit;
