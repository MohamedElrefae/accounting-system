-- Test the new signup workflow
-- Run these in Supabase SQL Editor

-- 1. Check if pending_user_profiles table exists and has data
SELECT COUNT(*) as pending_profiles FROM pending_user_profiles;

-- 2. Check if there are approved access requests
SELECT 
  email,
  status,
  requested_at,
  reviewed_at
FROM access_requests 
WHERE status = 'approved'
ORDER BY reviewed_at DESC;

-- 3. Check pending profiles that haven't been used yet
SELECT 
  email,
  full_name_ar,
  department,
  assigned_role,
  approved_at,
  used
FROM pending_user_profiles 
WHERE used = false
ORDER BY approved_at DESC;

-- 4. Check if signup is working - look for users created after approval
SELECT 
  au.email,
  au.created_at as auth_created,
  up.full_name_ar,
  up.department,
  up.is_active,
  pup.used as pending_used
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
LEFT JOIN pending_user_profiles pup ON au.email = pup.email
WHERE au.created_at > (SELECT MIN(reviewed_at) FROM access_requests WHERE status = 'approved')
ORDER BY au.created_at DESC;

-- 5. Test query to see what RegisterForm should show
-- (This simulates what the RegisterForm component queries)
SELECT email FROM access_requests WHERE status = 'approved';
