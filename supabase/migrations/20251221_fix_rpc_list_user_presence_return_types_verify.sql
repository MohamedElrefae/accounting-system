-- 2025-12-21_fix_rpc_list_user_presence_return_types_verify.sql
SET search_path = public;

-- Verify RPC exists
select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'rpc_list_user_presence';

-- OPTIONAL: Run as authenticated in SQL editor (requires setting request.jwt.claim.sub)
-- Replace <YOUR_AUTH_USER_ID_UUID>
select set_config('request.jwt.claim.sub', '<YOUR_AUTH_USER_ID_UUID>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Sanity: should be same as sub
select auth.uid();

-- Call
select * from public.rpc_list_user_presence(null, null, 120, 900) limit 5;

-- Reset
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
