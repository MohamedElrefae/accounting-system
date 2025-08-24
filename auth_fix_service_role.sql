-- Service Role Authentication Fix
-- This can be run without user authentication in Supabase SQL Editor

-- 1. First, let's find your user ID from auth.users
SELECT 
    id as user_id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Create user profile for the specific user ID we found from console error
-- Replace this with your actual user ID if different
DO $$ 
DECLARE 
    target_user_id UUID := 'e84e1ac0-2240-4e37-b747-a01daa44ae4b';
    target_email TEXT;
BEGIN
    -- Get the email for this user
    SELECT email INTO target_email 
    FROM auth.users 
    WHERE id = target_user_id;
    
    -- Create the profile if it doesn't exist
    INSERT INTO user_profiles (
        id,
        email,
        created_at,
        updated_at
    ) VALUES (
        target_user_id,
        target_email,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated for user: % with email: %', target_user_id, target_email;
END $$;

-- 3. Set up proper RLS policies that work with auth.uid()
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update access for own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert access for own profile" ON user_profiles;

-- Create policies that handle both authenticated and service role contexts
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        current_setting('role') = 'service_role'
    );

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        current_setting('role') = 'service_role'
    ) WITH CHECK (
        auth.uid() = id OR 
        current_setting('role') = 'service_role'
    );

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        current_setting('role') = 'service_role'
    );

-- 4. Ensure RLS is enabled and permissions are granted
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 5. Set up storage bucket and policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
    'user-avatars', 
    'user-avatars', 
    true, 
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 6. Set up storage policies
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Allow users to upload avatars to their own folder (folder name = user_id)
CREATE POLICY "Users can upload own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-avatars' AND
        (
            -- Check if the path starts with the user's ID
            auth.uid()::text = split_part(name, '/', 1) OR
            -- Or allow service role for admin operations
            current_setting('role') = 'service_role'
        )
    );

-- Allow everyone to view avatars (they're public)
CREATE POLICY "Users can view all avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-avatars' AND
        (
            auth.uid()::text = split_part(name, '/', 1) OR
            current_setting('role') = 'service_role'
        )
    );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-avatars' AND
        (
            auth.uid()::text = split_part(name, '/', 1) OR
            current_setting('role') = 'service_role'
        )
    );

-- 7. Verify everything is set up correctly
SELECT 
    'Profile exists' as check_name,
    CASE 
        WHEN EXISTS(SELECT 1 FROM user_profiles WHERE id = 'e84e1ac0-2240-4e37-b747-a01daa44ae4b') 
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END as status
UNION ALL
SELECT 
    'Storage bucket exists' as check_name,
    CASE 
        WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'user-avatars') 
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END as status
UNION ALL
SELECT 
    'RLS enabled' as check_name,
    CASE 
        WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'user_profiles') 
        THEN '✅ YES' 
        ELSE '❌ NO' 
    END as status;

-- 8. Show the created profile
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
WHERE id = 'e84e1ac0-2240-4e37-b747-a01daa44ae4b';
