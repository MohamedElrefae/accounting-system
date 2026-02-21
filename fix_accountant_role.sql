-- Fix: Add current user to organization with accountant role
-- First, let's get the current user ID (you can see this in your browser's auth state)
-- Replace 'YOUR_USER_ID' with the actual user ID from your auth session

-- Check current user (run this first to get your user ID)
SELECT 
  auth.uid() as current_user_id;

-- If you know your user ID, run this to add accountant role:
INSERT INTO public.org_memberships (
  org_id, 
  user_id, 
  role, 
  created_at, 
  updated_at
) VALUES (
  'd5789445-11e3-4ad6-9297-b56521675114',  -- Your org ID
  'YOUR_USER_ID',                           -- Replace with actual user ID from above query
  'accountant',                             -- Role needed
  NOW(),                                    -- created_at
  NOW()                                     -- updated_at
) ON CONFLICT (org_id, user_id) 
DO UPDATE SET 
  role = 'accountant',
  updated_at = NOW();

-- Verify the membership was added
SELECT 
  om.org_id,
  om.user_id,
  om.role,
  up.email,
  up.raw_user_meta_data
FROM public.org_memberships om
JOIN public.user_profiles up ON om.user_id = up.id
WHERE om.org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
