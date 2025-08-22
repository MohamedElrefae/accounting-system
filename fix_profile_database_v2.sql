-- Fix User Profile Database Issues (Version 2)
-- Run this in Supabase SQL Editor while logged in as a user

-- 1. First, check if you're authenticated
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_email,
    CASE 
        WHEN auth.uid() IS NULL THEN 'NOT AUTHENTICATED - Please log in to your app first'
        ELSE 'AUTHENTICATED'
    END as auth_status;

-- 2. If auth.uid() is null, you need to:
--    a) Make sure you're logged in to your application
--    b) Run this script from the Supabase SQL Editor while authenticated
--    c) Or manually insert with your actual user ID

-- 3. Check what users exist in auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check existing user_profiles
SELECT 
    id,
    email,
    first_name,
    last_name,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;

-- 5. If you know your user ID, replace 'YOUR_USER_ID_HERE' with your actual user ID
-- You can get it from the auth.users query above
/*
INSERT INTO user_profiles (
    id,
    email,
    created_at,
    updated_at
) VALUES (
    'YOUR_USER_ID_HERE',  -- Replace with your actual user ID from auth.users
    'your-email@example.com',  -- Replace with your actual email
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
*/

-- 6. Fix RLS policies (run this regardless of authentication status)
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert access for own profile" ON user_profiles;

-- Create proper RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. Ensure RLS is enabled and permissions are granted
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 8. Check storage bucket
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets 
WHERE id = 'user-avatars';

-- 9. Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 10. Set up storage policies
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Allow users to upload avatars in their own folder
CREATE POLICY "Users can upload own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-avatars' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text || '/' = ANY(string_to_array(name, '/')))
    );

-- Allow public viewing of all avatars
CREATE POLICY "Users can view all avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-avatars' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text || '/' = ANY(string_to_array(name, '/')))
    );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-avatars' 
        AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text || '/' = ANY(string_to_array(name, '/')))
    );

-- 11. Final verification queries
SELECT 'Storage Bucket Status' as check_type, 
       CASE WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'user-avatars') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'RLS Status' as check_type,
       CASE WHEN pg_tables.rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables WHERE tablename = 'user_profiles'
UNION ALL
SELECT 'Auth Status' as check_type,
       CASE WHEN auth.uid() IS NOT NULL THEN 'AUTHENTICATED' ELSE 'NOT AUTHENTICATED' END as status;
