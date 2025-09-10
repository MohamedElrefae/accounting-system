-- Check your current superadmin status
SELECT 
  id,
  email, 
  is_super_admin,
  department,
  is_active,
  created_at
FROM user_profiles 
WHERE id = auth.uid();

-- If you're not marked as superadmin, run this to make yourself superadmin:
UPDATE user_profiles 
SET 
  is_super_admin = true,
  is_active = true,
  department = 'Admin'
WHERE id = auth.uid();

-- Verify the update worked:
SELECT 
  id,
  email, 
  is_super_admin,
  department,
  is_active
FROM user_profiles 
WHERE id = auth.uid();

-- Test the permission function:
SELECT 
  id,
  email,
  is_super_admin,
  CASE 
    WHEN is_super_admin = true THEN 'Can manage access requests'
    WHEN department = 'Admin' THEN 'Can manage access requests (Admin dept)'
    ELSE 'Cannot manage access requests'
  END as access_status
FROM user_profiles 
WHERE id = auth.uid();
