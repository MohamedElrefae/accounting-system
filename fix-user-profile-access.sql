-- Fix user profile access after registration
-- This ensures users can read their own profiles after login

-- Step 1: Enable RLS on user_profiles if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;

-- Step 3: Create policy to allow users to read their own profiles
CREATE POLICY "Users can view own profiles" ON public.user_profiles
FOR SELECT 
USING (auth.uid() = id);

-- Step 4: Create policy to allow users to update their own profiles
CREATE POLICY "Users can update own profiles" ON public.user_profiles
FOR UPDATE 
USING (auth.uid() = id);

-- Step 5: Create policy for admins to manage all profiles
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND (is_super_admin = true OR department = 'Admin')
    )
);

-- Step 6: Verify the policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Step 7: Test the policy (should work for authenticated user)
-- This simulates what happens when the user tries to read their profile
SELECT 
  'Test query' as test_type,
  id,
  email,
  full_name_ar,
  department,
  role
FROM public.user_profiles 
WHERE id = '096dbbfc-ed82-4adf-8baa-b8b0720f11c2'  -- Replace with actual user ID
LIMIT 1;
