-- Step 1: Add missing columns to user_profiles if they don't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create user profiles for all existing auth users
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
            updated_at = NOW(),
            -- Only set super admin if not already set
            is_super_admin = CASE 
                WHEN user_profiles.is_super_admin = true THEN true
                WHEN user_profiles.id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) THEN true
                ELSE false
            END;
    END LOOP;
END $$;

-- Step 3: Ensure the first user is a super admin
UPDATE public.user_profiles 
SET is_super_admin = true 
WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);

-- Step 4: Make sure default roles exist
INSERT INTO public.roles (id, name, name_ar, description, description_ar, is_system) VALUES
    (1, 'Super Admin', 'مدير عام', 'Full system access', 'صلاحيات كاملة للنظام', true),
    (2, 'Admin', 'مدير', 'Administrative access', 'صلاحيات إدارية', true),
    (3, 'Manager', 'مدير قسم', 'Department manager access', 'صلاحيات مدير القسم', true),
    (4, 'User', 'مستخدم', 'Regular user access', 'صلاحيات المستخدم العادي', true),
    (5, 'Accountant', 'محاسب', 'Accounting access', 'صلاحيات المحاسب', true)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Assign Super Admin role to the first user if not already assigned
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

-- Step 6: Create some default permissions if they don't exist
INSERT INTO public.permissions (name, name_ar, description, description_ar, category) VALUES
    -- Users permissions
    ('users.view', 'عرض المستخدمين', 'View user list and details', 'عرض قائمة المستخدمين وتفاصيلهم', 'users'),
    ('users.create', 'إنشاء مستخدم', 'Create new users', 'إنشاء مستخدمين جدد', 'users'),
    ('users.update', 'تعديل المستخدمين', 'Update user information', 'تعديل معلومات المستخدمين', 'users'),
    ('users.delete', 'حذف المستخدمين', 'Delete users from the system', 'حذف المستخدمين من النظام', 'users'),
    ('users.activate', 'تفعيل المستخدمين', 'Activate or deactivate users', 'تفعيل أو إلغاء تفعيل المستخدمين', 'users'),
    
    -- Roles permissions
    ('roles.view', 'عرض الأدوار', 'View roles and their permissions', 'عرض الأدوار وصلاحياتها', 'roles'),
    ('roles.create', 'إنشاء أدوار', 'Create new roles', 'إنشاء أدوار جديدة', 'roles'),
    ('roles.update', 'تعديل الأدوار', 'Update role information and permissions', 'تعديل معلومات الأدوار وصلاحياتها', 'roles'),
    ('roles.delete', 'حذف الأدوار', 'Delete roles from the system', 'حذف الأدوار من النظام', 'roles'),
    ('roles.manage', 'إدارة الأدوار', 'Assign and remove roles from users', 'تعيين وإزالة الأدوار من المستخدمين', 'roles')
ON CONFLICT (name) DO NOTHING;

-- Step 7: Give Super Admin role all permissions
INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
SELECT 
    1, -- Super Admin role
    p.id,
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
FROM public.permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = 1 AND rp.permission_id = p.id
);

-- Step 8: Create some sample users for testing (optional - these are display only)
-- Note: These are just profile records, not actual auth users, for UI testing
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

-- Step 9: Assign roles to sample users
INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 5, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true), -- Accountant
    ('22222222-2222-2222-2222-222222222222', 3, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true), -- Manager
    ('33333333-3333-3333-3333-333333333333', 4, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true)  -- User
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 10: Show current users with their roles
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
