-- Debug script for registration issue
-- Run this to identify why approved email is being rejected

-- Step 1: Check if the specific email exists and is approved
SELECT 
  'Checking specific email' as step,
  email,
  status,
  full_name_ar,
  department,
  job_title,
  assigned_role,
  requested_at,
  reviewed_at
FROM access_requests 
WHERE email = 'Marwanmohamed50599@gmail.com';

-- Step 2: Check all approved requests
SELECT 
  'All approved requests' as step,
  COUNT(*) as approved_count,
  array_agg(email ORDER BY email) as approved_emails
FROM access_requests 
WHERE status = 'approved';

-- Step 3: Check RLS policies
SELECT 
  'Current RLS policies' as step,
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'access_requests'
ORDER BY policyname;

-- Step 4: Test public access (simulate unauthenticated user)
-- This should work if RLS policy is correct
SELECT 
  'Public access test' as step,
  email,
  status
FROM access_requests 
WHERE status = 'approved' 
AND email = 'Marwanmohamed50599@gmail.com';

-- Step 5: Check table structure
SELECT 
  'Table structure' as step,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'access_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected Results:
-- 1. Should show the email as approved with all details
-- 2. Should show at least 1 approved request
-- 3. Should show "Public can read approved email addresses" policy
-- 4. Should return the email when testing public access
-- 5. Should show all required columns exist
