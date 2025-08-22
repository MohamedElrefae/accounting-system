-- ========================================
-- PART 1: Add all missing columns
-- ========================================

-- Add missing columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Add missing columns to roles table
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to user_roles if needed
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to permissions if needed
ALTER TABLE public.permissions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to audit_logs if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        ALTER TABLE public.audit_logs 
        ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
        
        ALTER TABLE public.audit_logs 
        ADD COLUMN IF NOT EXISTS user_agent TEXT;
    END IF;
END $$;

-- ========================================
-- PART 2: Create user profiles for auth users
-- ========================================

DO $$
DECLARE
    v_user_id UUID;
    v_first_user UUID;
BEGIN
    -- Get the first user ID
    SELECT id INTO v_first_user FROM auth.users ORDER BY created_at LIMIT 1;
    
    -- Create profiles for all auth users
    FOR v_user_id IN SELECT id FROM auth.users
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
            created_at
        )
        SELECT 
            v_user_id,
            (SELECT email FROM auth.users WHERE id = v_user_id),
            COALESCE(
                (SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE id = v_user_id),
                CASE WHEN v_user_id = v_first_user THEN 'Admin' ELSE 'User' END
            ),
            COALESCE(
                (SELECT raw_user_meta_data->>'last_name' FROM auth.users WHERE id = v_user_id),
                CASE WHEN v_user_id = v_first_user THEN 'User' ELSE 'Name' END
            ),
            CASE WHEN v_user_id = v_first_user THEN 'مدير النظام' ELSE 'مستخدم' END,
            CASE WHEN v_user_id = v_first_user THEN 'الإدارة' ELSE 'عام' END,
            CASE WHEN v_user_id = v_first_user THEN 'مدير النظام' ELSE 'موظف' END,
            true,
            (v_user_id = v_first_user), -- Super admin for first user
            COALESCE((SELECT created_at FROM auth.users WHERE id = v_user_id), NOW())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            is_super_admin = CASE 
                WHEN user_profiles.id = v_first_user THEN true
                ELSE user_profiles.is_super_admin
            END,
            updated_at = NOW();
    END LOOP;
END $$;

-- ========================================
-- PART 3: Create default roles
-- ========================================

INSERT INTO public.roles (id, name, name_ar, description, description_ar, is_system) VALUES
    (1, 'Super Admin', 'مدير عام', 'Full system access', 'صلاحيات كاملة للنظام', true),
    (2, 'Admin', 'مدير', 'Administrative access', 'صلاحيات إدارية', true),
    (3, 'Manager', 'مدير قسم', 'Department manager access', 'صلاحيات مدير القسم', true),
    (4, 'User', 'مستخدم', 'Regular user access', 'صلاحيات المستخدم العادي', true),
    (5, 'Accountant', 'محاسب', 'Accounting access', 'صلاحيات المحاسب', true),
    (6, 'Viewer', 'مشاهد', 'Read-only access', 'صلاحيات القراءة فقط', false)
ON CONFLICT (id) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar;

-- ========================================
-- PART 4: Create default permissions
-- ========================================

INSERT INTO public.permissions (name, name_ar, description, description_ar, category) VALUES
    -- Users permissions
    ('users.view', 'عرض المستخدمين', 'View user list and details', 'عرض قائمة المستخدمين وتفاصيلهم', 'users'),
    ('users.create', 'إنشاء مستخدم', 'Create new users', 'إنشاء مستخدمين جدد', 'users'),
    ('users.update', 'تعديل المستخدمين', 'Update user information', 'تعديل معلومات المستخدمين', 'users'),
    ('users.delete', 'حذف المستخدمين', 'Delete users', 'حذف المستخدمين', 'users'),
    ('users.activate', 'تفعيل المستخدمين', 'Activate or deactivate users', 'تفعيل أو إلغاء تفعيل المستخدمين', 'users'),
    
    -- Roles permissions
    ('roles.view', 'عرض الأدوار', 'View roles', 'عرض الأدوار', 'roles'),
    ('roles.create', 'إنشاء أدوار', 'Create new roles', 'إنشاء أدوار جديدة', 'roles'),
    ('roles.update', 'تعديل الأدوار', 'Update roles', 'تعديل الأدوار', 'roles'),
    ('roles.delete', 'حذف الأدوار', 'Delete roles', 'حذف الأدوار', 'roles'),
    ('roles.manage', 'إدارة الأدوار', 'Assign roles to users', 'تعيين الأدوار للمستخدمين', 'roles'),
    
    -- Accounts permissions
    ('accounts.view', 'عرض الحسابات', 'View accounts', 'عرض الحسابات', 'accounts'),
    ('accounts.create', 'إنشاء حسابات', 'Create accounts', 'إنشاء حسابات', 'accounts'),
    ('accounts.update', 'تعديل الحسابات', 'Update accounts', 'تعديل الحسابات', 'accounts'),
    ('accounts.delete', 'حذف الحسابات', 'Delete accounts', 'حذف الحسابات', 'accounts'),
    
    -- Reports permissions
    ('reports.view', 'عرض التقارير', 'View reports', 'عرض التقارير', 'reports'),
    ('reports.export', 'تصدير التقارير', 'Export reports', 'تصدير التقارير', 'reports'),
    
    -- Settings permissions
    ('settings.view', 'عرض الإعدادات', 'View settings', 'عرض الإعدادات', 'settings'),
    ('settings.update', 'تعديل الإعدادات', 'Update settings', 'تعديل الإعدادات', 'settings')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- PART 5: Assign Super Admin role to first user
-- ========================================

-- Get first user and assign Super Admin role
DO $$
DECLARE
    v_first_user UUID;
BEGIN
    SELECT id INTO v_first_user FROM auth.users ORDER BY created_at LIMIT 1;
    
    IF v_first_user IS NOT NULL THEN
        -- Assign Super Admin role
        INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active)
        VALUES (v_first_user, 1, v_first_user, true)
        ON CONFLICT (user_id, role_id) DO UPDATE SET
            is_active = true,
            assigned_at = NOW();
            
        -- Make sure they're marked as super admin
        UPDATE public.user_profiles 
        SET is_super_admin = true 
        WHERE id = v_first_user;
    END IF;
END $$;

-- ========================================
-- PART 6: Grant all permissions to Super Admin role
-- ========================================

INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
SELECT 
    1, -- Super Admin role
    p.id,
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
FROM public.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========================================
-- PART 7: Create sample display users (optional)
-- ========================================

-- These are just for UI display, not real auth users
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
    created_at
) VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'ahmad@example.com', 'أحمد', 'محمد', 'أحمد محمد', 'المحاسبة', 'محاسب أول', true, false, NOW() - INTERVAL '30 days'),
    ('b2222222-2222-2222-2222-222222222222', 'fatima@example.com', 'فاطمة', 'علي', 'فاطمة علي', 'الإدارة المالية', 'مدير مالي', true, false, NOW() - INTERVAL '20 days'),
    ('c3333333-3333-3333-3333-333333333333', 'khalid@example.com', 'خالد', 'عبدالله', 'خالد عبدالله', 'المبيعات', 'مندوب مبيعات', true, false, NOW() - INTERVAL '10 days'),
    ('d4444444-4444-4444-4444-444444444444', 'sara@example.com', 'سارة', 'أحمد', 'سارة أحمد', 'الموارد البشرية', 'أخصائي موارد بشرية', false, false, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- Assign roles to sample users
INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active) VALUES
    ('a1111111-1111-1111-1111-111111111111', 5, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true), -- Accountant
    ('b2222222-2222-2222-2222-222222222222', 3, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true), -- Manager
    ('c3333333-3333-3333-3333-333333333333', 4, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true), -- User
    ('d4444444-4444-4444-4444-444444444444', 6, (SELECT id FROM auth.users ORDER BY created_at LIMIT 1), true)  -- Viewer
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ========================================
-- PART 8: Display results
-- ========================================

-- Show all users with their roles
SELECT 
    up.id,
    up.email,
    up.first_name || ' ' || up.last_name as full_name,
    up.full_name_ar,
    up.department,
    up.job_title,
    up.is_active,
    up.is_super_admin,
    r.name as role_name,
    r.name_ar as role_name_ar,
    CASE 
        WHEN up.id IN (SELECT id FROM auth.users) THEN 'Real User'
        ELSE 'Sample Data'
    END as user_type
FROM user_profiles up
LEFT JOIN user_roles ur ON up.id = ur.user_id AND ur.is_active = true
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY 
    CASE WHEN up.is_super_admin THEN 0 ELSE 1 END,
    up.created_at DESC;
