-- Fix for user_profiles 500 error (likely RLS recursion or trigger issue)
-- Run this in Supabase SQL Editor

-- Step 1: Check current RLS policies on user_profiles
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Step 2: Check for triggers on user_profiles that might cause recursion
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles';

-- Step 3: Temporarily disable RLS to test if that's the issue
-- UNCOMMENT AND RUN THIS TO TEST:
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 4: If disabling RLS fixes it, the issue is in the policies
-- Drop problematic policies and recreate simple ones:

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;

-- Step 5: Create simple, non-recursive policies
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Simple SELECT policy - users can see their own profile
-- Admins/super_admins can see all (checked via a simple column, not a subquery)
CREATE POLICY "user_profiles_select" ON user_profiles
    FOR SELECT USING (
        auth.uid() = id 
        OR is_super_admin = true
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('super_admin', 'admin', 'manager')
        )
    );

-- Simple INSERT policy - users can insert their own profile
CREATE POLICY "user_profiles_insert" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Simple UPDATE policy - users can update their own profile
CREATE POLICY "user_profiles_update" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

-- Step 7: Verify the fix by testing a simple query
SELECT id, email FROM user_profiles LIMIT 5;
