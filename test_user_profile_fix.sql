-- Test SQL to verify user profile functionality
-- This script helps verify the profile updates are working correctly

-- Check current user profile data
SELECT 
    id,
    email,
    first_name,
    last_name,
    full_name_ar,
    avatar_url,
    phone,
    department,
    updated_at
FROM user_profiles 
ORDER BY updated_at DESC 
LIMIT 5;

-- Simulate a profile update (replace 'your-user-id' with actual user ID)
-- UPDATE user_profiles 
-- SET 
--     first_name = 'أحمد',
--     last_name = 'محمد',
--     full_name_ar = 'أحمد محمد السعودي',
--     avatar_url = 'https://example.com/avatar.jpg',
--     updated_at = NOW()
-- WHERE id = 'your-user-id';

-- Verification: Check if the update was applied
-- SELECT 
--     id,
--     email,
--     first_name,
--     last_name,
--     full_name_ar,
--     avatar_url,
--     updated_at
-- FROM user_profiles 
-- WHERE id = 'your-user-id';

-- Check if user_roles relationship works correctly
SELECT 
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    up.full_name_ar,
    r.name as role_name,
    r.name_ar as role_name_ar
FROM user_profiles up
LEFT JOIN user_roles ur ON up.id = ur.user_id AND ur.is_active = true
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY up.updated_at DESC 
LIMIT 10;
