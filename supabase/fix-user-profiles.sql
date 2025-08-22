-- First, ensure your user exists in user_profiles
-- Replace the ID below with your actual user ID from Supabase Auth
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get all auth users and ensure they have profiles
    FOR v_user_id IN 
        SELECT id FROM auth.users
    LOOP
        INSERT INTO public.user_profiles (
            id,
            email,
            first_name,
            last_name,
            full_name_ar,
            department,
            job_title,
            is_active,
            is_super_admin,
            created_at,
            updated_at
        )
        SELECT 
            v_user_id,
            (SELECT email FROM auth.users WHERE id = v_user_id),
            COALESCE((SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE id = v_user_id), 'Admin'),
            COALESCE((SELECT raw_user_meta_data->>'last_name' FROM auth.users WHERE id = v_user_id), 'User'),
            'مستخدم النظام',
            'الإدارة',
            'مدير النظام',
            true,
            CASE WHEN v_user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) THEN true ELSE false END,
            NOW(),
            NOW()
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
    END LOOP;
END $$;

-- Ensure the first user is a super admin
UPDATE public.user_profiles 
SET is_super_admin = true 
WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);

-- Assign Super Admin role to the first user if not already assigned
INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active)
SELECT 
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    1, -- Super Admin role ID
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
    AND role_id = 1
);

-- Create some sample users for testing (optional)
-- These are just profile records, not actual auth users
INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    full_name_ar,
    department,
    job_title,
    is_active,
    is_super_admin
) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'accountant@example.com', 'محمد', 'أحمد', 'محمد أحمد', 'المحاسبة', 'محاسب', true, false),
    ('22222222-2222-2222-2222-222222222222', 'manager@example.com', 'فاطمة', 'علي', 'فاطمة علي', 'الإدارة', 'مدير', true, false),
    ('33333333-3333-3333-3333-333333333333', 'employee@example.com', 'عبدالله', 'سالم', 'عبدالله سالم', 'المبيعات', 'موظف مبيعات', true, false)
ON CONFLICT (id) DO NOTHING;

-- Assign roles to sample users
INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 2, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true), -- Admin
    ('22222222-2222-2222-2222-222222222222', 3, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true), -- Manager
    ('33333333-3333-3333-3333-333333333333', 4, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true)  -- User
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Show current users
SELECT 
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    up.department,
    up.is_active,
    up.is_super_admin,
    r.name_ar as role_name
FROM user_profiles up
LEFT JOIN user_roles ur ON up.id = ur.user_id AND ur.is_active = true
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY up.created_at DESC;
