-- Debug script to test presence heartbeat function
-- Run this in Supabase SQL editor to identify the issue

-- 1. Check if function exists and its signature
SELECT 
  proname as function_name,
  pronargs as num_args,
  proargtypes as arg_types
FROM pg_proc 
WHERE proname = 'rpc_presence_heartbeat';

-- 2. Test function with null parameters (like frontend does)
SELECT 
  public.rpc_presence_heartbeat(NULL::uuid, '{}'::jsonb) as test_null_org;

-- 3. Check if helper functions exist
SELECT 
  proname as helper_name,
  pronargs as num_args
FROM pg_proc 
WHERE proname IN ('get_user_default_organization', 'fn_is_org_member', 'is_super_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Test individual helper functions
SELECT public.get_user_default_organization() as default_org;
SELECT public.is_super_admin() as is_super_admin;
SELECT public.fn_is_org_member(NULL::uuid) as test_fn_member_null;

-- 5. Check if user_presence_heartbeats table exists and structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_presence_heartbeats' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
