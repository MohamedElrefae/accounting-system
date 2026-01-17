-- Fix registration access for approved users
-- This script ensures that approved access requests can register for accounts

-- Step 1: Enable RLS on access_requests if not already enabled
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can read approved email addresses" ON public.access_requests;
DROP POLICY IF EXISTS "Anyone can submit access requests" ON public.access_requests;
DROP POLICY IF EXISTS "Users can view own requests" ON public.access_requests;
DROP POLICY IF EXISTS "Admins can manage access requests" ON public.access_requests;

-- Step 3: Create policy to allow anyone to insert new requests (for public access)
CREATE POLICY "Anyone can submit access requests" ON public.access_requests
    FOR INSERT WITH CHECK (true);

-- Step 4: Create policy to allow anyone to read approved email addresses (for registration purposes)
CREATE POLICY "Public can read approved email addresses" ON public.access_requests
FOR SELECT 
USING (status = 'approved');

-- Step 5: Create policy to allow users to read their own requests
CREATE POLICY "Users can view own requests" ON public.access_requests
FOR SELECT 
USING (auth.jwt() ->> 'email' = email);

-- Step 6: Create policy for admins to manage all requests
CREATE POLICY "Admins can manage access requests" ON public.access_requests
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() 
        AND (is_super_admin = true OR department = 'Admin')
    )
);

-- Step 7: Verify the policies are correct
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'access_requests'
ORDER BY policyname;

-- Step 8: Test the query that RegisterForm uses
SELECT email, status FROM access_requests WHERE status = 'approved' LIMIT 5;

-- Step 9: Check if there are any approved requests
SELECT 
  COUNT(*) as total_approved,
  array_agg(email ORDER BY email) as approved_emails
FROM access_requests 
WHERE status = 'approved';

-- Step 10: Test specific email lookup (what signUp function does)
SELECT 
  email, 
  status, 
  full_name_ar, 
  phone, 
  department, 
  job_title, 
  assigned_role 
FROM access_requests 
WHERE email = 'Marwanmohamed50599@gmail.com' 
AND status = 'approved';
