-- Simple test queries for access request system
-- Run these in your Supabase SQL Editor to test functionality

-- 1. Check if access_requests table exists and has data
SELECT COUNT(*) as total_requests FROM access_requests;

-- 2. Check pending requests
SELECT 
  id,
  email, 
  full_name_ar,
  status,
  requested_at
FROM access_requests 
WHERE status = 'pending'
ORDER BY requested_at DESC;

-- 3. Check your superadmin status
SELECT 
  email, 
  is_super_admin, 
  department,
  CASE 
    WHEN is_super_admin = true THEN 'Can manage access requests'
    WHEN department = 'Admin' THEN 'Can manage access requests (Admin dept)'
    ELSE 'Cannot manage access requests'
  END as access_status
FROM user_profiles 
WHERE id = auth.uid();

-- 4. Insert a test access request (if you want to test)
-- INSERT INTO access_requests (
--   email, 
--   full_name_ar, 
--   phone, 
--   department, 
--   job_title, 
--   message
-- ) VALUES (
--   'test@example.com',
--   'اختبار النظام',
--   '+966501234567',
--   'تقنية المعلومات',
--   'مطور',
--   'طلب اختبار النظام'
-- );

-- 5. Check all access requests
SELECT 
  id,
  email,
  full_name_ar,
  phone,
  department,
  job_title,
  status,
  requested_at,
  reviewed_at,
  assigned_role
FROM access_requests 
ORDER BY requested_at DESC;
