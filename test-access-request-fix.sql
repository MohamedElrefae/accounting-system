-- Test script to verify the access request and registration fix
-- Run this in your Supabase SQL Editor to test the complete flow

-- Step 1: Check if access_requests table exists and has the right structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'access_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check existing RLS policies on access_requests
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

-- Step 3: Test if we can read approved requests (what RegisterForm does)
SELECT email, status, full_name_ar 
FROM access_requests 
WHERE status = 'approved' 
LIMIT 5;

-- Step 4: Check if there are any pending requests
SELECT 
  COUNT(*) as pending_count,
  array_agg(email ORDER BY requested_at) as pending_emails
FROM access_requests 
WHERE status = 'pending';

-- Step 5: Check if there are any approved requests
SELECT 
  COUNT(*) as approved_count,
  array_agg(email ORDER BY reviewed_at) as approved_emails
FROM access_requests 
WHERE status = 'approved';

-- Step 6: Test creating a sample approved request (if none exist)
-- Uncomment and run this if you need test data
/*
INSERT INTO access_requests (
  email, 
  full_name_ar, 
  phone, 
  department, 
  job_title, 
  status, 
  reviewed_at, 
  reviewed_by, 
  assigned_role
) VALUES (
  'test@example.com',
  'مستخدم اختبار',
  '+966500000000',
  'المحاسبة',
  'محاسب',
  'approved',
  NOW(),
  '00000000-0000-0000-0000-000000000000', -- Replace with actual admin user ID
  'accountant'
) ON CONFLICT (email) DO NOTHING;
*/

-- Step 7: Verify the test request was created
SELECT * FROM access_requests WHERE email = 'test@example.com';

-- Step 8: Clean up test data (optional)
-- DELETE FROM access_requests WHERE email = 'test@example.com';

-- Expected Results:
-- 1. access_requests table should exist with all required columns
-- 2. RLS policies should include "Public can read approved email addresses"
-- 3. Approved requests should be readable without authentication
-- 4. RegisterForm should be able to fetch approved emails successfully
