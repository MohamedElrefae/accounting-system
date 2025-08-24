-- Manual Profile Creation Script
-- Use this if you can't authenticate properly in Supabase SQL Editor

-- STEP 1: Find your user ID
-- Run this query to find your user ID from the console error or auth.users table
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC;

-- STEP 2: Create your profile manually
-- Replace the user ID below with your actual user ID from the console error:
-- From your error, it looks like: e84e1ac0-2240-4e37-b747-a01daa44ae4b

INSERT INTO user_profiles (
    id,
    email,
    created_at,
    updated_at
) VALUES (
    'e84e1ac0-2240-4e37-b747-a01daa44ae4b',  -- Your actual user ID from the error
    (SELECT email FROM auth.users WHERE id = 'e84e1ac0-2240-4e37-b747-a01daa44ae4b'),  -- Get email from auth.users
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- STEP 3: Verify the profile was created
SELECT 
    id,
    email,
    first_name,
    last_name,
    full_name_ar,
    avatar_url,
    created_at
FROM user_profiles 
WHERE id = 'e84e1ac0-2240-4e37-b747-a01daa44ae4b';

-- STEP 4: Set up proper permissions (temporarily disable RLS for testing)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- STEP 5: Test update (this should work now)
UPDATE user_profiles 
SET 
    first_name = 'Test',
    last_name = 'User',
    updated_at = NOW()
WHERE id = 'e84e1ac0-2240-4e37-b747-a01daa44ae4b';

-- STEP 6: Verify the update worked
SELECT 
    id,
    email,
    first_name,
    last_name,
    updated_at
FROM user_profiles 
WHERE id = 'e84e1ac0-2240-4e37-b747-a01daa44ae4b';

-- STEP 7: Re-enable RLS and set up policies after testing
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Clean up old policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (true);  -- Temporarily allow all for testing

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (true)   -- Temporarily allow all for testing
    WITH CHECK (true);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (true);  -- Temporarily allow all for testing

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO anon;  -- Temporarily for testing

-- STEP 8: Set up storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up permissive storage policies for testing
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;

CREATE POLICY "Public can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated can upload avatars" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated can update avatars" ON storage.objects
    FOR UPDATE USING (bucket_id = 'user-avatars');

-- STEP 9: Final verification
SELECT 'Profile Status' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM user_profiles WHERE id = 'e84e1ac0-2240-4e37-b747-a01daa44ae4b') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'Storage Status' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'user-avatars') 
            THEN 'EXISTS' ELSE 'MISSING' END as status;
