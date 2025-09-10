-- Fix RLS policy to allow public read access to approved email addresses for registration
-- This is needed so the RegisterForm can check which emails are approved

-- Add a policy to allow anyone to read approved email addresses (for registration purposes)
CREATE POLICY "Public can read approved email addresses" ON public.access_requests
FOR SELECT 
USING (status = 'approved');

-- Verify the policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'access_requests'
ORDER BY policyname;

-- Test the query that RegisterForm uses
SELECT email, status FROM access_requests WHERE status = 'approved';
