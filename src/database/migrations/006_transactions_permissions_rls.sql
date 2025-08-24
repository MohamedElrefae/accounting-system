-- 006_transactions_permissions_rls.sql
-- This migration wires permissions and RLS for public.transactions
-- Safe to run multiple times (IF NOT EXISTS guards where possible)

begin;

-- 1) Permissions catalog (idempotent upserts)
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists public.user_roles (
  user_id uuid not null,
  role_id uuid not null,
  primary key (user_id, role_id)
);

create table if not exists public.role_permissions (
  role_id uuid not null,
  permission_id uuid not null,
  primary key (role_id, permission_id)
);

create table if not exists public.user_permissions (
  user_id uuid not null,
  permission_id uuid not null,
  primary key (user_id, permission_id)
);

-- Ensure transaction permissions (handle schemas with name_ar)
DO $$
BEGIN
  -- Determine columns present on public.permissions
  PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='name_ar';
  IF FOUND THEN
    -- name_ar exists; check resource and action
    PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='resource';
    IF FOUND THEN
      PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='action';
      IF FOUND THEN
        -- name, name_ar, resource, action, description
        insert into public.permissions(name, name_ar, resource, action, description)
          values
            ('transactions.create', 'إنشاء المعاملات', 'transactions', 'create', 'Create new transactions'),
            ('transactions.update', 'تعديل المعاملات', 'transactions', 'update', 'Update transactions'),
            ('transactions.delete', 'حذف المعاملات', 'transactions', 'delete', 'Delete unposted transactions'),
            ('transactions.post',   'ترحيل المعاملات', 'transactions', 'post',   'Post/approve transactions'),
            ('transactions.manage', 'إدارة المعاملات', 'transactions', 'manage', 'Manage all transactions')
        on conflict (name) do nothing;
      ELSE
        -- name, name_ar, resource, description
        insert into public.permissions(name, name_ar, resource, description)
          values
            ('transactions.create', 'إنشاء المعاملات', 'transactions', 'Create new transactions'),
            ('transactions.update', 'تعديل المعاملات', 'transactions', 'Update transactions'),
            ('transactions.delete', 'حذف المعاملات', 'transactions', 'Delete unposted transactions'),
            ('transactions.post',   'ترحيل المعاملات', 'transactions', 'Post/approve transactions'),
            ('transactions.manage', 'إدارة المعاملات', 'transactions', 'Manage all transactions')
        on conflict (name) do nothing;
      END IF;
    ELSE
      -- name, name_ar, description only
      insert into public.permissions(name, name_ar, description)
        values
          ('transactions.create', 'إنشاء المعاملات', 'Create new transactions'),
          ('transactions.update', 'تعديل المعاملات', 'Update transactions'),
          ('transactions.delete', 'حذف المعاملات', 'Delete unposted transactions'),
          ('transactions.post',   'ترحيل المعاملات', 'Post/approve transactions'),
          ('transactions.manage', 'إدارة المعاملات', 'Manage all transactions')
      on conflict (name) do nothing;
    END IF;
  ELSE
    -- name_ar not present; check resource and action
    PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='resource';
    IF FOUND THEN
      PERFORM 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='permissions' AND column_name='action';
      IF FOUND THEN
        insert into public.permissions(name, resource, action, description)
          values
            ('transactions.create', 'transactions', 'create', 'Create new transactions'),
            ('transactions.update', 'transactions', 'update', 'Update transactions'),
            ('transactions.delete', 'transactions', 'delete', 'Delete unposted transactions'),
            ('transactions.post',   'transactions', 'post',   'Post/approve transactions'),
            ('transactions.manage', 'transactions', 'manage', 'Manage all transactions')
        on conflict (name) do nothing;
      ELSE
        insert into public.permissions(name, resource, description)
          values
            ('transactions.create', 'transactions', 'Create new transactions'),
            ('transactions.update', 'transactions', 'Update transactions'),
            ('transactions.delete', 'transactions', 'Delete unposted transactions'),
            ('transactions.post',   'transactions', 'Post/approve transactions'),
            ('transactions.manage', 'transactions', 'Manage all transactions')
        on conflict (name) do nothing;
      END IF;
    ELSE
      -- fallback: name + description only
      insert into public.permissions(name, description)
        values
          ('transactions.create', 'Create new transactions'),
          ('transactions.update', 'Update transactions'),
          ('transactions.delete', 'Delete unposted transactions'),
          ('transactions.post', 'Post/approve transactions'),
          ('transactions.manage', 'Manage all transactions')
      on conflict (name) do nothing;
    END IF;
  END IF;
END$$;

-- Helper: get permission id by name (return as text to be compatible with integer/uuid ids)
create or replace function public.permission_id(p_name text)
returns text language sql stable as $$
  select id::text from public.permissions where name = p_name;
$$;

-- 2) has_permission helper (checks direct user and via roles)
create or replace function public.has_permission(p_user uuid, p_permission text)
returns boolean
language sql
stable
as $$
  with perm as (
    select id from public.permissions where name = p_permission
  ),
  direct as (
    select 1 from public.user_permissions up
    join perm on perm.id = up.permission_id
    where up.user_id = p_user
    limit 1
  ),
  via_roles as (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join perm on perm.id = rp.permission_id
    where ur.user_id = p_user
    limit 1
  )
  select exists(select 1 from direct) or exists(select 1 from via_roles);
$$;

-- 3) Ensure transaction_audit exists
create table if not exists public.transaction_audit (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  action text not null check (action in ('create','update','delete','post')),
  actor_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- 4) Enable RLS on transactions and define policies
alter table public.transactions enable row level security;

-- Policy: everyone logged-in can select (scope enforced in app filters),
-- adjust if you want stricter rules.
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
for select
using (true);

-- Policy: insert requires transactions.create
drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
for insert
to authenticated
with check (public.has_permission(auth.uid(), 'transactions.create'));

-- Policy: update requires either
--  - creator updating own unposted with transactions.update, or
--  - transactions.manage
drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions
for update
using (
  (
    not is_posted
    and created_by = auth.uid()
    and public.has_permission(auth.uid(), 'transactions.update')
  )
  or public.has_permission(auth.uid(), 'transactions.manage')
)
with check (
  (
    not is_posted
    and created_by = auth.uid()
    and public.has_permission(auth.uid(), 'transactions.update')
  )
  or public.has_permission(auth.uid(), 'transactions.manage')
);

-- Policy: delete only unposted; creator with transactions.delete or manage
drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions
for delete
using (
  (
    not is_posted
    and created_by = auth.uid()
    and public.has_permission(auth.uid(), 'transactions.delete')
  )
  or public.has_permission(auth.uid(), 'transactions.manage')
);

-- 5) post_transaction RPC and guard with transactions.post
create or replace function public.post_transaction(p_transaction_id uuid, p_posted_by uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not public.has_permission(auth.uid(), 'transactions.post') then
    raise exception 'Insufficient permissions to post transaction';
  end if;

  update public.transactions
     set is_posted = true,
         posted_at = now(),
         posted_by = p_posted_by,
         updated_at = now()
   where id = p_transaction_id
     and is_posted = false;

  -- Audit
  insert into public.transaction_audit(transaction_id, action, actor_id, details)
  values (p_transaction_id, 'post', auth.uid(), jsonb_build_object('posted_by', p_posted_by));
end;
$$;

-- 6) Triggers to audit create/update/delete
create or replace function public.tg_tx_audit()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.transaction_audit(transaction_id, action, actor_id, details)
    values (new.id, 'create', auth.uid(), to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.transaction_audit(transaction_id, action, actor_id, details)
    values (new.id, 'update', auth.uid(), jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.transaction_audit(transaction_id, action, actor_id, details)
    values (old.id, 'delete', auth.uid(), to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_tx_audit on public.transactions;
create trigger tr_tx_audit
after insert or update or delete on public.transactions
for each row execute function public.tg_tx_audit();

commit;

