-- =====================================================================
-- TESTING ENVIRONMENT SEED DATA
-- Run this AFTER creating the schema in your testing database
-- =====================================================================

-- This provides sample data for comprehensive testing without real data
-- Safe to use - contains no production information

-- =====================================================================
-- 1. ROLES - Testing Roles for Different Access Levels
-- =====================================================================

INSERT INTO roles (name, name_ar, description, description_ar, is_system) VALUES
('superadmin', 'المدير العام', 'System superadmin with all permissions', 'مدير النظام مع جميع الصلاحيات', true),
('admin', 'مدير', 'Administrator with management permissions', 'مدير مع صلاحيات الإدارة', true),
('manager', 'مدير إدارة', 'Department manager with limited admin rights', 'مدير إدارة مع صلاحيات محدودة', false),
('accountant', 'محاسب', 'Accountant with financial transaction access', 'محاسب مع صلاحية المعاملات المالية', false),
('clerk', 'موظف', 'Data entry clerk with basic permissions', 'موظف إدخال بيانات مع صلاحيات أساسية', false),
('viewer', 'مشاهد', 'Read-only user for reports and viewing', 'مستخدم للمشاهدة والتقارير فقط', false),
('auditor', 'مراجع', 'External auditor with review permissions', 'مراجع خارجي مع صلاحيات المراجعة', false)
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- 2. PERMISSIONS - Complete Set Based on Your System
-- =====================================================================

INSERT INTO permissions (name, name_ar, resource, action, description) VALUES
-- Users Management
('users.read', 'عرض المستخدمين', 'users', 'read', 'View users list and details'),
('users.create', 'إنشاء مستخدمين', 'users', 'create', 'Create new users'),
('users.update', 'تعديل المستخدمين', 'users', 'update', 'Update user information'),
('users.delete', 'حذف المستخدمين', 'users', 'delete', 'Delete users'),
('users.assign_roles', 'تعيين الأدوار', 'users', 'assign_roles', 'Assign roles to users'),

-- Roles Management
('roles.read', 'عرض الأدوار', 'roles', 'read', 'View roles list and details'),
('roles.create', 'إنشاء الأدوار', 'roles', 'create', 'Create new roles'),
('roles.update', 'تعديل الأدوار', 'roles', 'update', 'Update role information'),
('roles.delete', 'حذف الأدوار', 'roles', 'delete', 'Delete roles'),
('roles.assign_permissions', 'تعيين الصلاحيات', 'roles', 'assign_permissions', 'Assign permissions to roles'),

-- Permissions Management
('permissions.read', 'عرض الصلاحيات', 'permissions', 'read', 'View permissions list'),
('permissions.create', 'إنشاء الصلاحيات', 'permissions', 'create', 'Create new permissions'),
('permissions.update', 'تعديل الصلاحيات', 'permissions', 'update', 'Update permission information'),
('permissions.delete', 'حذف الصلاحيات', 'permissions', 'delete', 'Delete permissions'),

-- Accounts Management
('accounts.read', 'عرض الحسابات', 'accounts', 'read', 'View chart of accounts'),
('accounts.create', 'إنشاء الحسابات', 'accounts', 'create', 'Create new accounts'),
('accounts.update', 'تعديل الحسابات', 'accounts', 'update', 'Update account information'),
('accounts.delete', 'حذف الحسابات', 'accounts', 'delete', 'Delete accounts'),

-- Transactions Management
('transactions.read', 'عرض المعاملات', 'transactions', 'read', 'View transactions'),
('transactions.create', 'إنشاء المعاملات', 'transactions', 'create', 'Create new transactions'),
('transactions.update', 'تعديل المعاملات', 'transactions', 'update', 'Update transactions'),
('transactions.delete', 'حذف المعاملات', 'transactions', 'delete', 'Delete transactions'),
('transactions.approve', 'اعتماد المعاملات', 'transactions', 'approve', 'Approve transactions'),
('transactions.reject', 'رفض المعاملات', 'transactions', 'reject', 'Reject transactions'),

-- Reports Access
('reports.read', 'عرض التقارير', 'reports', 'read', 'View financial reports'),
('reports.export', 'تصدير التقارير', 'reports', 'export', 'Export reports to files'),
('reports.print', 'طباعة التقارير', 'reports', 'print', 'Print reports'),

-- Settings Management
('settings.read', 'عرض الإعدادات', 'settings', 'read', 'View system settings'),
('settings.update', 'تعديل الإعدادات', 'settings', 'update', 'Update system settings'),

-- Cost Centers
('cost_centers.read', 'عرض مراكز التكلفة', 'cost_centers', 'read', 'View cost centers'),
('cost_centers.create', 'إنشاء مراكز التكلفة', 'cost_centers', 'create', 'Create cost centers'),
('cost_centers.update', 'تعديل مراكز التكلفة', 'cost_centers', 'update', 'Update cost centers'),
('cost_centers.delete', 'حذف مراكز التكلفة', 'cost_centers', 'delete', 'Delete cost centers'),

-- Projects
('projects.read', 'عرض المشاريع', 'projects', 'read', 'View projects'),
('projects.create', 'إنشاء المشاريع', 'projects', 'create', 'Create projects'),
('projects.update', 'تعديل المشاريع', 'projects', 'update', 'Update projects'),
('projects.delete', 'حذف المشاريع', 'projects', 'delete', 'Delete projects'),

-- Analysis Items
('analysis_items.read', 'عرض بنود التحليل', 'analysis_items', 'read', 'View analysis items'),
('analysis_items.create', 'إنشاء بنود التحليل', 'analysis_items', 'create', 'Create analysis items'),
('analysis_items.update', 'تعديل بنود التحليل', 'analysis_items', 'update', 'Update analysis items'),
('analysis_items.delete', 'حذف بنود التحليل', 'analysis_items', 'delete', 'Delete analysis items')
ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- 3. ASSIGN PERMISSIONS TO ROLES
-- =====================================================================

-- Superadmin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'superadmin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets most permissions (exclude some system-critical ones)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin' 
  AND p.name NOT IN ('users.delete', 'roles.delete', 'permissions.delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'manager' 
  AND p.name IN (
    'users.read', 'users.update',
    'roles.read', 
    'accounts.read', 'accounts.create', 'accounts.update',
    'transactions.read', 'transactions.create', 'transactions.update', 'transactions.approve',
    'reports.read', 'reports.export', 'reports.print',
    'cost_centers.read', 'cost_centers.create', 'cost_centers.update',
    'projects.read', 'projects.create', 'projects.update',
    'analysis_items.read', 'analysis_items.create', 'analysis_items.update'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Accountant gets financial permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'accountant' 
  AND p.name IN (
    'accounts.read', 'accounts.create', 'accounts.update',
    'transactions.read', 'transactions.create', 'transactions.update',
    'reports.read', 'reports.export', 'reports.print',
    'cost_centers.read', 'cost_centers.create', 'cost_centers.update',
    'projects.read', 'analysis_items.read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Clerk gets basic data entry permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'clerk' 
  AND p.name IN (
    'accounts.read',
    'transactions.read', 'transactions.create', 'transactions.update',
    'reports.read',
    'cost_centers.read', 'projects.read', 'analysis_items.read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer gets read-only permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'viewer' 
  AND p.resource IN ('accounts', 'transactions', 'reports', 'cost_centers', 'projects', 'analysis_items')
  AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Auditor gets review permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'auditor' 
  AND p.name IN (
    'accounts.read', 'transactions.read', 'reports.read', 'reports.export',
    'cost_centers.read', 'projects.read', 'analysis_items.read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================================
-- 4. SAMPLE CHART OF ACCOUNTS (if accounts table exists)
-- =====================================================================

-- Basic chart of accounts for testing
INSERT INTO accounts (code, name_ar, name_en, type, level, is_active) VALUES
('1000', 'الأصول', 'Assets', 'asset', 1, true),
('1100', 'الأصول المتداولة', 'Current Assets', 'asset', 2, true),
('1110', 'النقدية والبنوك', 'Cash and Banks', 'asset', 3, true),
('1120', 'الذمم المدينة', 'Accounts Receivable', 'asset', 3, true),
('1130', 'المخزون', 'Inventory', 'asset', 3, true),

('2000', 'الخصوم', 'Liabilities', 'liability', 1, true),
('2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', 2, true),
('2110', 'الذمم الدائنة', 'Accounts Payable', 'liability', 3, true),
('2120', 'المصاريف المستحقة', 'Accrued Expenses', 'liability', 3, true),

('3000', 'حقوق الملكية', 'Equity', 'equity', 1, true),
('3100', 'رأس المال', 'Capital', 'equity', 2, true),
('3200', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', 2, true),

('4000', 'الإيرادات', 'Revenues', 'revenue', 1, true),
('4100', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', 2, true),
('4200', 'إيرادات أخرى', 'Other Revenue', 'revenue', 2, true),

('5000', 'المصاريف', 'Expenses', 'expense', 1, true),
('5100', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', 2, true),
('5200', 'المصاريف العمومية', 'General Expenses', 'expense', 2, true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 5. SAMPLE COST CENTERS (if cost_centers table exists)
-- =====================================================================

INSERT INTO cost_centers (code, name_ar, name_en, is_active) VALUES
('CC001', 'الإدارة العامة', 'General Management', true),
('CC002', 'المبيعات', 'Sales Department', true),
('CC003', 'الإنتاج', 'Production Department', true),
('CC004', 'المحاسبة', 'Accounting Department', true),
('CC005', 'الموارد البشرية', 'Human Resources', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 6. SAMPLE PROJECTS (if projects table exists)
-- =====================================================================

INSERT INTO projects (code, name_ar, name_en, is_active) VALUES
('PRJ001', 'مشروع التطوير الأول', 'Development Project One', true),
('PRJ002', 'مشروع التوسع', 'Expansion Project', true),
('PRJ003', 'مشروع البحث والتطوير', 'Research and Development', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 7. CREATE TEST USER ACCOUNTS (Optional - for Supabase Auth)
-- =====================================================================

-- Note: These would be created through Supabase Auth, not direct SQL
-- But here's the user profile data structure for testing

/*
TEST USERS TO CREATE IN SUPABASE AUTH:
1. admin@test.com (password: TestAdmin123!) - Assign to 'admin' role
2. manager@test.com (password: TestManager123!) - Assign to 'manager' role  
3. accountant@test.com (password: TestAccount123!) - Assign to 'accountant' role
4. clerk@test.com (password: TestClerk123!) - Assign to 'clerk' role
5. viewer@test.com (password: TestViewer123!) - Assign to 'viewer' role
*/

-- =====================================================================
-- 8. VERIFICATION QUERIES
-- =====================================================================

-- Check roles and their permission counts
SELECT 
    r.name_ar as "اسم الدور",
    r.name as "Role Name",
    COUNT(rp.permission_id) as "عدد الصلاحيات"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name_ar, r.name
ORDER BY COUNT(rp.permission_id) DESC;

-- Check permissions by resource
SELECT 
    p.resource as "المورد",
    COUNT(*) as "عدد الصلاحيات"
FROM permissions p
GROUP BY p.resource
ORDER BY COUNT(*) DESC;

-- Summary of seed data
SELECT 
    'SEED DATA SUMMARY' as "Report Type",
    'Testing environment ready' as "Status";

SELECT 'Roles' as "Type", COUNT(*) as "Count" FROM roles
UNION ALL
SELECT 'Permissions' as "Type", COUNT(*) as "Count" FROM permissions  
UNION ALL
SELECT 'Role Permissions' as "Type", COUNT(*) as "Count" FROM role_permissions;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================

SELECT 
    '🎉 TESTING DATABASE READY!' as "Status",
    'All seed data has been inserted successfully' as "Message",
    'You can now test the complete application functionality' as "Instructions";