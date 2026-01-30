-- 🚨 DEBUG RLS: FORCE ACCESS
-- This script drops restrictive policies and allows ALL authenticated users to read roles.
-- Use this to confirm if RLS was blocking the data.

-- 1. Setup Table RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential conflicting/broken policies
DROP POLICY IF EXISTS "Users can read own role assignments" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;
DROP POLICY IF EXISTS "Allow individual read access" ON public.user_roles;
DROP POLICY IF EXISTS "Allow public read access" ON public.roles;

-- 3. Create NUCLEAR PERMISSIVE Policies (Authenticated Only)
-- This allows any logged-in user to see ALL user_roles rows.
-- If this works, the previous `auth.uid() = user_id` logic was failing (maybe type mismatch).

CREATE POLICY "Debug: Allow All Auth UserRoles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Debug: Allow All Auth Roles"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- 4. Verify Grants (Just in case)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
