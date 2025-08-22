-- Fix User Profile Database Issues
-- Run this in Supabase SQL Editor to fix the reported issues

-- 1. Check if user_profiles table exists and current user
SELECT auth.uid() as current_user_id;

-- 2. Check if user_profiles row exists for current user
SELECT 
    id,
    email,
    first_name,
    last_name,
    full_name_ar,
    avatar_url,
    created_at,
    updated_at
FROM user_profiles 
WHERE id = auth.uid();

-- 3. Create user_profiles row if it doesn't exist
INSERT INTO user_profiles (
    id,
    email,
    created_at,
    updated_at
)
SELECT 
    auth.uid(),
    auth.email(),
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid()
);

-- 4. Fix RLS policies for user_profiles
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

-- 5. Ensure RLS is enabled and permissions are granted
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 6. Check if user-avatars storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'user-avatars';

-- 7. Create user-avatars bucket if it doesn't exist (uncomment if needed)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('user-avatars', 'user-avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- 8. Set up storage policies for user-avatars bucket
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;

-- Allow users to upload avatars in their own folder
CREATE POLICY "Users can upload own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow public viewing of all avatars
CREATE POLICY "Users can view all avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 9. Check if roles and user_roles tables exist (for relationship issues)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('roles', 'user_roles');

-- 10. Verify the final setup
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as row_count,
    bool_and(id IS NOT NULL) as has_id,
    bool_and(email IS NOT NULL) as has_email
FROM user_profiles 
WHERE id = auth.uid()

UNION ALL

SELECT 
    'Current user ID' as table_name,
    1 as row_count,
    auth.uid() IS NOT NULL as has_id,
    auth.email() IS NOT NULL as has_email;

-- Test query to verify everything works
SELECT 
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    up.full_name_ar,
    up.avatar_url,
    up.phone,
    up.department,
    up.created_at,
    up.updated_at
FROM user_profiles up
WHERE up.id = auth.uid();
