-- FIX RLS For User Roles
-- One of the reasons the app defaults to 'viewer' is it cannot READ the 'accountant' role due to missing permissions.

-- 1. Enable RLS (if not already)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to read their OWN role assignments
DROP POLICY IF EXISTS "Users can read own role assignments" ON user_roles;
CREATE POLICY "Users can read own role assignments" 
ON user_roles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 3. Allow users to read role definitions (names, etc)
-- Needed to resolve "accountant" from role_id
DROP POLICY IF EXISTS "Authenticated users can read roles" ON roles;
CREATE POLICY "Authenticated users can read roles" 
ON roles FOR SELECT 
TO authenticated 
USING (true);

-- 4. Grant access to authenticated role
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON roles TO authenticated;
