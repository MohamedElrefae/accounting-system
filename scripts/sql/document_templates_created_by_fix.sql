-- document_templates_created_by_fix.sql
-- Purpose: Ensure created_by is always populated on insert, even from contexts without JWT (e.g., SQL editor)
-- Includes: robust BEFORE INSERT trigger, optional RLS insert policy, backfill, and verification snippets.

-- ===============================
-- 1) Robust trigger function
-- ===============================
create or replace function public.set_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jwt_sub text;
  v_any_user uuid;
begin
  -- Try to read the JWT subject claim if available
  v_jwt_sub := nullif(current_setting('request.jwt.claim.sub', true), '');

  -- Fallback to any existing user (for SQL editor convenience only)
  select id into v_any_user from auth.users order by created_at limit 1;

  if new.created_by is null then
    new.created_by := coalesce(
      new.created_by,                                -- explicit payload
      auth.uid(),                                    -- API context
      (case when v_jwt_sub is not null then v_jwt_sub::uuid else null end), -- manual claim
      v_any_user                                     -- last resort for SQL editor
    );
  end if;

  return new;
end;
$$;

-- ===============================
-- 2) Attach trigger to document_templates
-- ===============================
drop trigger if exists trg_set_created_by on public.document_templates;
create trigger trg_set_created_by
before insert on public.document_templates
for each row
execute function public.set_created_by();

-- ===============================
-- 3) Optional RLS policy (insert must match auth user)
--    Skip if you already enforce similar policy
-- ===============================
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='document_templates'
      and policyname='document_templates_ins_created_by_matches_user'
  ) then
    create policy document_templates_ins_created_by_matches_user
      on public.document_templates
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;
end
$$;

-- ===============================
-- 4) Backfill any existing NULLs
-- ===============================
with any_user as (
  select id as user_id from auth.users order by created_at limit 1
)
update public.document_templates t
set created_by = (select user_id from any_user)
where t.created_by is null;

-- ===============================
-- 5) Verification helpers (copy and run as needed)
-- ===============================
-- a) Inspect columns
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'document_templates'
-- order by ordinal_position;

-- b) Simulate session user (SQL editor). Replace {{TEST_USER_ID}}
-- select set_config('request.jwt.claim.sub', '{{TEST_USER_ID}}', true);

-- c) Test insert (replace {{ORG_ID}})
-- insert into public.document_templates (id, org_id, name, content, version)
-- values (gen_random_uuid(), '{{ORG_ID}}', 'Trigger Test', '{}'::jsonb, 1);

-- d) Verify no NULLs
-- select count(*) as null_created_by
-- from public.document_templates
-- where created_by is null;

-- e) Inspect last rows
-- select id, org_id, name, created_by, created_at
-- from public.document_templates
-- order by created_at desc
-- limit 5;
