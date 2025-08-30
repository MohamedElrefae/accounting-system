-- 025_is_org_member_super_admin.sql
-- Enhance is_org_member() to grant all-org access for super_admin users.
-- Retains role threshold check for memberships.

begin;

-- Ensure table exists (no-op if already there)
create table if not exists public.org_memberships (
  org_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer','manager','admin')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Create or replace helper with super_admin bypass
create or replace function public.is_org_member(p_org_id uuid, p_min_role text default 'viewer')
returns boolean
language sql
stable
as $$
  select
    -- Super admins can access any org
    coalesce(
      (
        select true from public.user_profiles up
        where up.id = auth.uid() and coalesce(up.is_super_admin, false) = true
        limit 1
      ), false
    )
    or
    -- Otherwise require membership meeting the minimum role
    coalesce(
      (
        select true from public.org_memberships m
        where m.org_id = p_org_id and m.user_id = auth.uid()
          and array_position(array['viewer','manager','admin'], m.role) >= array_position(array['viewer','manager','admin'], coalesce(p_min_role,'viewer'))
        limit 1
      ), false
    );
$$;

comment on function public.is_org_member(uuid, text)
  is 'Returns true if current user is super_admin or a member of p_org_id with at least p_min_role (viewer/manager/admin).';

commit;

