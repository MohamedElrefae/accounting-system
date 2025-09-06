-- ==========================================
-- Database Schema Setup for Enterprise Role Management
-- ==========================================

-- 1. Create roles table if not exists
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description TEXT,
    description_ar TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create permissions table if not exists
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create role_permissions junction table if not exists
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT now(),
    granted_by INTEGER,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Create user_roles junction table if not exists
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID,
    PRIMARY KEY (user_id, role_id)
);

-- ==========================================
-- Enhanced save_role_permissions Function
-- ==========================================

CREATE OR REPLACE FUNCTION save_role_permissions(
    p_role_id INTEGER,
    p_permission_names TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    permission_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Validate role exists
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Role not found',
            'role_id', p_role_id
        );
    END IF;

    -- Clear existing permissions for this role
    DELETE FROM role_permissions WHERE role_id = p_role_id;

    -- Insert new permissions
    FOR i IN 1..array_length(p_permission_names, 1) LOOP
        BEGIN
            -- Find permission by name
            SELECT id INTO permission_record
            FROM permissions
            WHERE name = p_permission_names[i];

            IF NOT FOUND THEN
                -- Log the missing permission but continue
                error_count := error_count + 1;
                RAISE NOTICE 'Permission not found: %', p_permission_names[i];
                CONTINUE;
            END IF;

            -- Insert the role-permission mapping
            INSERT INTO role_permissions (role_id, permission_id, granted_by)
            VALUES (p_role_id, permission_record.id, auth.uid());

            success_count := success_count + 1;

        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE 'Error assigning permission %: %', p_permission_names[i], SQLERRM;
        END;
    END LOOP;

    -- Return result summary
    result := jsonb_build_object(
        'success', true,
        'role_id', p_role_id,
        'permissions_assigned', success_count,
        'errors', error_count,
        'total_permissions', array_length(p_permission_names, 1)
    );

    RETURN result;
END;
$$;

-- ==========================================
-- Enhanced is_super_admin Function
-- ==========================================

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin BOOLEAN := false;
BEGIN
    -- Check if user has superadmin role or is marked as superadmin
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
        AND (
            r.name = 'superadmin' 
            OR r.name = 'admin' 
            OR r.name = 'super_admin'
            OR r.is_system = true
        )
    ) INTO is_admin;

    RETURN is_admin;
END;
$$;

-- ==========================================
-- RLS Policies for Enterprise Role Management
-- ==========================================

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Roles policies
DROP POLICY IF EXISTS "Superadmins can manage roles" ON roles;
CREATE POLICY "Superadmins can manage roles" ON roles
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view roles" ON roles;
CREATE POLICY "Users can view roles" ON roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Permissions policies
DROP POLICY IF EXISTS "Superadmins can manage permissions" ON permissions;
CREATE POLICY "Superadmins can manage permissions" ON permissions
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view permissions" ON permissions;
CREATE POLICY "Users can view permissions" ON permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Role permissions policies
DROP POLICY IF EXISTS "Superadmins can manage role permissions" ON role_permissions;
CREATE POLICY "Superadmins can manage role permissions" ON role_permissions
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view role permissions" ON role_permissions;
CREATE POLICY "Users can view role permissions" ON role_permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- User roles policies
DROP POLICY IF EXISTS "Superadmins can manage user roles" ON user_roles;
CREATE POLICY "Superadmins can manage user roles" ON user_roles
    FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid() OR is_super_admin());

-- ==========================================
-- Sample Data Insertion (Optional)
-- ==========================================

-- Insert default roles if they don't exist
INSERT INTO roles (name, name_ar, description, description_ar, is_system)
SELECT * FROM (
    VALUES 
    ('superadmin', 'المدير العام', 'System superadmin with all permissions', 'مدير النظام مع جميع الصلاحيات', true),
    ('admin', 'المدير', 'Administrator with management permissions', 'مدير مع صلاحيات الإدارة', false),
    ('user', 'مستخدم', 'Regular user with basic permissions', 'مستخدم عادي مع الصلاحيات الأساسية', false),
    ('viewer', 'مشاهد', 'View-only user', 'مستخدم للمشاهدة فقط', false)
) AS v(name, name_ar, description, description_ar, is_system)
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = v.name);

-- ==========================================
-- Verification Queries
-- ==========================================

-- Check roles
SELECT 
    r.id,
    r.name,
    r.name_ar,
    r.is_system,
    COUNT(rp.permission_id) as permission_count,
    COUNT(ur.user_id) as user_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN user_roles ur ON r.id = ur.role_id
GROUP BY r.id, r.name, r.name_ar, r.is_system
ORDER BY r.id;

-- Check permissions
SELECT 
    p.id,
    p.name,
    p.resource,
    p.action,
    COUNT(rp.role_id) as assigned_to_roles
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
GROUP BY p.id, p.name, p.resource, p.action
ORDER BY p.name;

-- Check function exists
SELECT proname, prosrc IS NOT NULL as has_source 
FROM pg_proc 
WHERE proname IN ('save_role_permissions', 'is_super_admin');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles')
AND schemaname = 'public';
