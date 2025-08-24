-- Harden RLS policies for common tables. Adjust to your schema.
-- Enable RLS and add owner-only read/write for user_profiles.

alter table if exists public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles_select'
  ) then
    create policy user_profiles_select on public.user_profiles
    for select to authenticated
    using (id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles_update'
  ) then
    create policy user_profiles_update on public.user_profiles
    for update to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
  end if;
end$$;

-- audit_logs: allow authenticated users to insert; only super admins can read
alter table if exists public.audit_logs enable row level security;

do $$
begin
  -- Insert by any authenticated user (write-only)
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_insert_any_auth'
  ) then
    create policy audit_logs_insert_any_auth on public.audit_logs
    for insert to authenticated
    with check (true);
  end if;

  -- Read only for super admins
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_select_super_admin'
  ) then
    create policy audit_logs_select_super_admin on public.audit_logs
    for select to authenticated
    using (exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and coalesce(up.is_super_admin, false) = true
    ));
  end if;

  -- Block updates/deletes by not defining policies for them (default deny under RLS)
end$$;

-- Harden RLS policies for common tables. Adjust to your schema.
-- Enable RLS and add owner-only read/write for user_profiles.

alter table if exists public.user_profiles enable row level security;

-- Owner can select/update own profile
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles_select'
  ) then
    create policy user_profiles_select on public.user_profiles
    for select to authenticated
    using (id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles_update'
  ) then
    create policy user_profiles_update on public.user_profiles
    for update to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
  end if;
end$$;

-- user_roles: only the owner can read and modify their role links
alter table if exists public.user_roles enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='user_roles_select_owner'
  ) then
    create policy user_roles_select_owner on public.user_roles
    for select to authenticated
    using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='user_roles_modify_owner'
  ) then
    create policy user_roles_modify_owner on public.user_roles
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end$$;

-- user_permissions: only the owner can read and modify their permissions
alter table if exists public.user_permissions enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_permissions' and policyname='user_permissions_select_owner'
  ) then
    create policy user_permissions_select_owner on public.user_permissions
    for select to authenticated
    using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_permissions' and policyname='user_permissions_modify_owner'
  ) then
    create policy user_permissions_modify_owner on public.user_permissions
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end$$;

