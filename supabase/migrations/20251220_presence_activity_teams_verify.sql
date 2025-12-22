-- 2025-12-20_presence_activity_teams_verify.sql
SET search_path = public;

-- 1) Verify new tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('org_teams', 'org_team_members', 'user_presence_heartbeats')
order by table_name;

-- 2) Verify new permissions exist
select id, name, resource, action
from public.permissions
where name in ('presence.view.org', 'presence.view.team', 'presence.view.all')
order by id;

-- 3) Verify HR + team_leader roles exist
select id, name, name_ar
from public.roles
where name in ('hr', 'team_leader')
order by id;

-- 4) Verify role->permission mappings
select r.name as role_name, p.name as permission_name
from public.role_permissions rp
join public.roles r on r.id = rp.role_id
join public.permissions p on p.id = rp.permission_id
where p.name in ('presence.view.org', 'presence.view.team', 'presence.view.all')
order by r.name, p.name;

-- 5) Verify RLS enabled
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('org_teams', 'org_team_members', 'user_presence_heartbeats')
order by c.relname;

-- 6) Verify policies exist
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('org_teams', 'org_team_members', 'user_presence_heartbeats')
order by tablename, policyname;

-- 7) Verify RPCs exist
select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('rpc_presence_heartbeat', 'rpc_list_user_presence', 'rpc_set_team_leader')
order by routine_name;

-- 7.1) Verify one-leader-per-team unique index exists
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'org_team_members'
  and indexname = 'uq_org_team_members_one_leader_per_team';

-- 8) Behavioral smoke test (run while authenticated):
--    NOTE: The Supabase SQL editor does NOT have an auth context by default.
--    To make auth.uid() work for this session, set request.jwt.claims.
--
--    Replace <YOUR_AUTH_USER_ID_UUID> with your auth.users.id.
--    You can get it from your app (Supabase session user.id) or from auth.users as an admin.
select set_config('request.jwt.claim.sub', '<YOUR_AUTH_USER_ID_UUID>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
-- Keep claims JSON as well (some helpers rely on it)
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '<YOUR_AUTH_USER_ID_UUID>', 'role', 'authenticated')::text,
  true
);

--    A) Update your presence for your default org
select public.rpc_presence_heartbeat(null, jsonb_build_object('client', 'sql_verify'));

--    B) List presence (default org)
select * from public.rpc_list_user_presence(null, null, 120, 900) limit 25;

--    C) Reset claims for safety
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);

-- Notes:
-- - If you are not HR/Admin/SuperAdmin/TeamLeader, you may see only yourself.
-- - To test TeamLeader scope, first create a team + add members, mark leader.
