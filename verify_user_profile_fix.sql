-- ============================================
-- VERIFICATION SCRIPT FOR USER PROFILE FIX
-- Run this to verify the auto-creation trigger is working
-- ============================================

SET search_path = public;

-- Check if the specific user now has a profile
SELECT 
  'User Profile Status' as check_type,
  CASE 
    WHEN au.id IS NOT NULL AND up.id IS NOT NULL THEN '✅ EXISTS'
    WHEN au.id IS NOT NULL AND up.id IS NULL THEN '❌ MISSING PROFILE'
    ELSE '❌ USER NOT FOUND'
  END as status,
  au.email,
  au.created_at as auth_created,
  up.created_at as profile_created
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.id = '096dbbfc-ed82-4adf-8baa-b8b0720f11c2';

-- Show all users without profiles (should be empty after fix)
SELECT 
  'Users Without Profiles' as check_type,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- Show trigger status
SELECT 
  'Trigger Status' as check_type,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgfoid::regproc as function_name,
  tgtype::text as trigger_type
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Test the trigger function exists and is valid
SELECT 
  'Function Status' as check_type,
  proname as function_name,
  prosrc as source_exists
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Overall statistics
SELECT 
  'Overall Statistics' as check_type,
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.user_profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.user_profiles up ON au.id = up.id WHERE up.id IS NULL) as missing_profiles;
