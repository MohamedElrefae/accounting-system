-- =====================================================================
-- COMPREHENSIVE PERMISSIONS FIX - Enterprise User Management
-- This will create all 61+ permissions with proper resource/action fields
-- CORRECTED VERSION with name_ar column included
-- =====================================================================

-- 1. First, fix existing permissions that are missing resource/action fields
UPDATE permissions SET 
    resource = CASE 
        WHEN name ILIKE '%transaction%' THEN 'transactions'
        WHEN name ILIKE '%user%' THEN 'users'
        WHEN name ILIKE '%role%' THEN 'roles'
        WHEN name ILIKE '%permission%' THEN 'permissions'
        WHEN name ILIKE '%organization%' OR name ILIKE '%org%' THEN 'organizations'
        WHEN name ILIKE '%project%' THEN 'projects'
        WHEN name ILIKE '%account%' THEN 'accounts'
        WHEN name ILIKE '%report%' THEN 'reports'
        WHEN name ILIKE '%analysis%' THEN 'analysis_work_items'
        WHEN name ILIKE '%expense%' OR name ILIKE '%category%' THEN 'expenses_categories'
        WHEN name ILIKE '%cost%center%' THEN 'cost_centers'
        WHEN name ILIKE '%dashboard%' THEN 'dashboard'
        ELSE 'system'
    END,
    action = CASE 
        WHEN name ILIKE '%create%' OR name ILIKE '%add%' THEN 'create'
        WHEN name ILIKE '%read%' OR name ILIKE '%view%' OR name ILIKE '%list%' THEN 'read'
        WHEN name ILIKE '%update%' OR name ILIKE '%edit%' OR name ILIKE '%modify%' THEN 'update'
        WHEN name ILIKE '%delete%' OR name ILIKE '%remove%' THEN 'delete'
        WHEN name ILIKE '%approve%' THEN 'approve'
        WHEN name ILIKE '%reject%' THEN 'reject'
        WHEN name ILIKE '%submit%' THEN 'submit'
        WHEN name ILIKE '%post%' THEN 'post'
        WHEN name ILIKE '%export%' THEN 'export'
        WHEN name ILIKE '%import%' THEN 'import'
        WHEN name ILIKE '%assign%' THEN 'assign'
        ELSE 'manage'
    END
WHERE resource IS NULL OR resource = '' OR action IS NULL OR action = '';

-- 2. Insert comprehensive permissions for all modules (if they don't exist)
INSERT INTO permissions (name, name_ar, description, resource, action, created_at) VALUES

-- Core System Permissions
('system.admin', 'إدارة النظام الكاملة', 'Full system administration access', 'system', 'admin', NOW()),
('system.settings', 'إدارة إعدادات النظام', 'Manage system settings', 'system', 'manage', NOW()),

-- User Management Permissions  
('users.create', 'إنشاء المستخدمين', 'Create new users', 'users', 'create', NOW()),
('users.read', 'عرض المستخدمين', 'View user information', 'users', 'read', NOW()),
('users.update', 'تعديل المستخدمين', 'Update user information', 'users', 'update', NOW()),
('users.delete', 'حذف المستخدمين', 'Delete users', 'users', 'delete', NOW()),
('users.assign_roles', 'تعيين الأدوار للمستخدمين', 'Assign roles to users', 'users', 'assign', NOW()),
('users.manage_permissions', 'إدارة صلاحيات المستخدمين', 'Manage user permissions', 'users', 'manage', NOW()),

-- Role Management Permissions
('roles.create', 'إنشاء الأدوار', 'Create new roles', 'roles', 'create', NOW()),
('roles.read', 'عرض الأدوار', 'View role information', 'roles', 'read', NOW()),
('roles.update', 'تعديل الأدوار', 'Update role information', 'roles', 'update', NOW()),
('roles.delete', 'حذف الأدوار', 'Delete roles', 'roles', 'delete', NOW()),
('roles.assign_permissions', 'تعيين الصلاحيات للأدوار', 'Assign permissions to roles', 'roles', 'assign', NOW()),

-- Permission Management Permissions
('permissions.create', 'إنشاء الصلاحيات', 'Create new permissions', 'permissions', 'create', NOW()),
('permissions.read', 'عرض الصلاحيات', 'View permission information', 'permissions', 'read', NOW()),
('permissions.update', 'تعديل الصلاحيات', 'Update permission information', 'permissions', 'update', NOW()),
('permissions.delete', 'حذف الصلاحيات', 'Delete permissions', 'permissions', 'delete', NOW()),

-- Organization Management Permissions
('organizations.create', 'إنشاء المنظمات', 'Create new organizations', 'organizations', 'create', NOW()),
('organizations.read', 'عرض المنظمات', 'View organization information', 'organizations', 'read', NOW()),
('organizations.update', 'تعديل المنظمات', 'Update organization information', 'organizations', 'update', NOW()),
('organizations.delete', 'حذف المنظمات', 'Delete organizations', 'organizations', 'delete', NOW()),
('organizations.manage_members', 'إدارة أعضاء المنظمة', 'Manage organization members', 'organizations', 'manage', NOW()),

-- Project Management Permissions
('projects.create', 'إنشاء المشاريع', 'Create new projects', 'projects', 'create', NOW()),
('projects.read', 'عرض المشاريع', 'View project information', 'projects', 'read', NOW()),
('projects.update', 'تعديل المشاريع', 'Update project information', 'projects', 'update', NOW()),
('projects.delete', 'حذف المشاريع', 'Delete projects', 'projects', 'delete', NOW()),
('projects.manage_members', 'إدارة أعضاء المشروع', 'Manage project members', 'projects', 'manage', NOW()),

-- Transaction Management Permissions
('transactions.create', 'إنشاء المعاملات', 'Create new transactions', 'transactions', 'create', NOW()),
('transactions.read', 'عرض المعاملات', 'View transaction information', 'transactions', 'read', NOW()),
('transactions.update', 'تعديل المعاملات', 'Update transaction information', 'transactions', 'update', NOW()),
('transactions.delete', 'حذف المعاملات', 'Delete transactions', 'transactions', 'delete', NOW()),
('transactions.submit', 'إرسال المعاملات للموافقة', 'Submit transactions for approval', 'transactions', 'submit', NOW()),
('transactions.approve', 'الموافقة على المعاملات', 'Approve transactions', 'transactions', 'approve', NOW()),
('transactions.reject', 'رفض المعاملات', 'Reject transactions', 'transactions', 'reject', NOW()),
('transactions.post', 'ترحيل المعاملات', 'Post transactions to ledger', 'transactions', 'post', NOW()),
('transactions.export', 'تصدير بيانات المعاملات', 'Export transaction data', 'transactions', 'export', NOW()),

-- Transaction Line Items Permissions
('transaction_line_items.create', 'إنشاء بنود المعاملات', 'Create transaction line items', 'transaction_line_items', 'create', NOW()),
('transaction_line_items.read', 'عرض بنود المعاملات', 'View transaction line items', 'transaction_line_items', 'read', NOW()),
('transaction_line_items.update', 'تعديل بنود المعاملات', 'Update transaction line items', 'transaction_line_items', 'update', NOW()),
('transaction_line_items.delete', 'حذف بنود المعاملات', 'Delete transaction line items', 'transaction_line_items', 'delete', NOW()),

-- Account Management Permissions
('accounts.create', 'إنشاء الحسابات', 'Create new accounts', 'accounts', 'create', NOW()),
('accounts.read', 'عرض الحسابات', 'View account information', 'accounts', 'read', NOW()),
('accounts.update', 'تعديل الحسابات', 'Update account information', 'accounts', 'update', NOW()),
('accounts.delete', 'حذف الحسابات', 'Delete accounts', 'accounts', 'delete', NOW()),
('accounts.manage_hierarchy', 'إدارة هيكل الحسابات', 'Manage account hierarchy', 'accounts', 'manage', NOW()),

-- Analysis Work Items Permissions
('analysis_work_items.create', 'إنشاء عناصر التحليل', 'Create analysis work items', 'analysis_work_items', 'create', NOW()),
('analysis_work_items.read', 'عرض عناصر التحليل', 'View analysis work items', 'analysis_work_items', 'read', NOW()),
('analysis_work_items.update', 'تعديل عناصر التحليل', 'Update analysis work items', 'analysis_work_items', 'update', NOW()),
('analysis_work_items.delete', 'حذف عناصر التحليل', 'Delete analysis work items', 'analysis_work_items', 'delete', NOW()),

-- Expenses Categories Permissions
('expenses_categories.create', 'إنشاء فئات المصروفات', 'Create expense categories', 'expenses_categories', 'create', NOW()),
('expenses_categories.read', 'عرض فئات المصروفات', 'View expense categories', 'expenses_categories', 'read', NOW()),
('expenses_categories.update', 'تعديل فئات المصروفات', 'Update expense categories', 'expenses_categories', 'update', NOW()),
('expenses_categories.delete', 'حذف فئات المصروفات', 'Delete expense categories', 'expenses_categories', 'delete', NOW()),
('expenses_categories.manage_hierarchy', 'إدارة هيكل فئات المصروفات', 'Manage expense category hierarchy', 'expenses_categories', 'manage', NOW()),

-- Cost Centers Permissions
('cost_centers.create', 'إنشاء مراكز التكلفة', 'Create cost centers', 'cost_centers', 'create', NOW()),
('cost_centers.read', 'عرض مراكز التكلفة', 'View cost centers', 'cost_centers', 'read', NOW()),
('cost_centers.update', 'تعديل مراكز التكلفة', 'Update cost centers', 'cost_centers', 'update', NOW()),
('cost_centers.delete', 'حذف مراكز التكلفة', 'Delete cost centers', 'cost_centers', 'delete', NOW()),

-- Reports Permissions
('reports.financial', 'عرض التقارير المالية', 'View financial reports', 'reports', 'read', NOW()),
('reports.transactions', 'عرض تقارير المعاملات', 'View transaction reports', 'reports', 'read', NOW()),
('reports.cost_analysis', 'عرض تقارير تحليل التكلفة', 'View cost analysis reports', 'reports', 'read', NOW()),
('reports.project_reports', 'عرض تقارير المشاريع', 'View project reports', 'reports', 'read', NOW()),
('reports.export', 'تصدير التقارير', 'Export reports', 'reports', 'export', NOW()),
('reports.create_custom', 'إنشاء تقارير مخصصة', 'Create custom reports', 'reports', 'create', NOW()),

-- Dashboard Permissions
('dashboard.view', 'عرض لوحة التحكم', 'View dashboard', 'dashboard', 'read', NOW()),
('dashboard.customize', 'تخصيص لوحة التحكم', 'Customize dashboard', 'dashboard', 'update', NOW()),

-- Audit & Logging Permissions
('audit_logs.read', 'عرض سجلات المراجعة', 'View audit logs', 'audit_logs', 'read', NOW()),
('audit_logs.export', 'تصدير سجلات المراجعة', 'Export audit logs', 'audit_logs', 'export', NOW())

ON CONFLICT (name) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    description = EXCLUDED.description;