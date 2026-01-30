-- 🔒 SECURE RLS: FINAL FIX
-- Replaces the "Nuclear" debug policies with granular, secure access.

-- 1. Reset Policies
DROP POLICY IF EXISTS "Debug: Allow All Auth UserRoles" ON public.user_roles;
DROP POLICY IF EXISTS "Debug: Allow All Auth Roles" ON public.roles;

DROP POLICY IF EXISTS "Users can read own role assignments" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;

-- 2. Secure User Roles Policy
-- Only allow users to see their OWN role assignments.
-- Uses text casting to avoid UUID mismatch issues.
CREATE POLICY "Secure: Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

-- 3. Secure Roles Policy
-- Allow all authenticated users to read role DEFINITIONS (names, etc)
-- This is safe because role definitions are public metadata for the app.
CREATE POLICY "Secure: Auth users can read role defs"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- 4. Verify Grants
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
