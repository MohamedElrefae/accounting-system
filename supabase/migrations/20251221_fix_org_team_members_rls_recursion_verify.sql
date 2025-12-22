-- 2025-12-21_fix_org_team_members_rls_recursion_verify.sql
SET search_path = public;

-- 1) Ensure helper exists
select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('fn_is_team_leader_for_member')
order by routine_name;

-- 2) Ensure policy exists (and the old one was removed)
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename = 'org_team_members'
order by policyname;

-- 3) Smoke: attempt presence heartbeat under authenticated context
--    Replace <YOUR_AUTH_USER_ID_UUID> with your auth.users.id.
select set_config('request.jwt.claim.sub', '<YOUR_AUTH_USER_ID_UUID>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '<YOUR_AUTH_USER_ID_UUID>', 'role', 'authenticated')::text,
  true
);

select public.rpc_presence_heartbeat(null, jsonb_build_object('client', 'sql_verify'));

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
