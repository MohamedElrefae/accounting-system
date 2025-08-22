-- Debug script to check user_profiles table and RLS policies
-- Run this in Supabase SQL Editor to understand what's blocking updates

-- 1. Check if user_profiles table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 2. Check RLS status on user_profiles table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 3. Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 4. Test if current user can read from user_profiles
SELECT 
    id,
    email,
    first_name,
    last_name,
    full_name_ar,
    avatar_url
FROM user_profiles 
LIMIT 3;

-- 5. Check auth.users() function accessibility
SELECT auth.uid() as current_user_id;

-- If the above queries show RLS issues, run these fixes:

-- Fix 1: Ensure proper RLS policies for user_profiles
-- (Uncomment and run if needed)

-- DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- CREATE POLICY "Users can view own profile" ON user_profiles
--     FOR SELECT USING (auth.uid() = id);

-- CREATE POLICY "Users can update own profile" ON user_profiles
--     FOR UPDATE USING (auth.uid() = id)
--     WITH CHECK (auth.uid() = id);

-- CREATE POLICY "Users can insert own profile" ON user_profiles
--     FOR INSERT WITH CHECK (auth.uid() = id);

-- Fix 2: Enable RLS if it's not enabled
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Fix 3: Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
-- GRANT USAGE ON SCHEMA public TO authenticated;
