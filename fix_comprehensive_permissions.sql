-- =====================================================================
-- COMPREHENSIVE PERMISSIONS FIX - Enterprise User Management
-- This will create all 61+ permissions with proper resource/action fields
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
('organizations.create', 'Create new organizations', 'organizations', 'create', NOW()),
('organizations.read', 'View organization information', 'organizations', 'read', NOW()),
('organizations.update', 'Update organization information', 'organizations', 'update', NOW()),
('organizations.delete', 'Delete organizations', 'organizations', 'delete', NOW()),
('organizations.manage_members', 'Manage organization members', 'organizations', 'manage', NOW()),

-- Project Management Permissions
('projects.create', 'Create new projects', 'projects', 'create', NOW()),
('projects.read', 'View project information', 'projects', 'read', NOW()),
('projects.update', 'Update project information', 'projects', 'update', NOW()),
('projects.delete', 'Delete projects', 'projects', 'delete', NOW()),
('projects.manage_members', 'Manage project members', 'projects', 'manage', NOW()),

-- Transaction Management Permissions
('transactions.create', 'Create new transactions', 'transactions', 'create', NOW()),
('transactions.read', 'View transaction information', 'transactions', 'read', NOW()),
('transactions.update', 'Update transaction information', 'transactions', 'update', NOW()),
('transactions.delete', 'Delete transactions', 'transactions', 'delete', NOW()),
('transactions.submit', 'Submit transactions for approval', 'transactions', 'submit', NOW()),
('transactions.approve', 'Approve transactions', 'transactions', 'approve', NOW()),
('transactions.reject', 'Reject transactions', 'transactions', 'reject', NOW()),
('transactions.post', 'Post transactions to ledger', 'transactions', 'post', NOW()),
('transactions.export', 'Export transaction data', 'transactions', 'export', NOW()),

-- Transaction Line Items Permissions
('transaction_line_items.create', 'Create transaction line items', 'transaction_line_items', 'create', NOW()),
('transaction_line_items.read', 'View transaction line items', 'transaction_line_items', 'read', NOW()),
('transaction_line_items.update', 'Update transaction line items', 'transaction_line_items', 'update', NOW()),
('transaction_line_items.delete', 'Delete transaction line items', 'transaction_line_items', 'delete', NOW()),

-- Account Management Permissions
('accounts.create', 'Create new accounts', 'accounts', 'create', NOW()),
('accounts.read', 'View account information', 'accounts', 'read', NOW()),
('accounts.update', 'Update account information', 'accounts', 'update', NOW()),
('accounts.delete', 'Delete accounts', 'accounts', 'delete', NOW()),
('accounts.manage_hierarchy', 'Manage account hierarchy', 'accounts', 'manage', NOW()),

-- Analysis Work Items Permissions
('analysis_work_items.create', 'Create analysis work items', 'analysis_work_items', 'create', NOW()),
('analysis_work_items.read', 'View analysis work items', 'analysis_work_items', 'read', NOW()),
('analysis_work_items.update', 'Update analysis work items', 'analysis_work_items', 'update', NOW()),
('analysis_work_items.delete', 'Delete analysis work items', 'analysis_work_items', 'delete', NOW()),

-- Expenses Categories Permissions
('expenses_categories.create', 'Create expense categories', 'expenses_categories', 'create', NOW()),
('expenses_categories.read', 'View expense categories', 'expenses_categories', 'read', NOW()),
('expenses_categories.update', 'Update expense categories', 'expenses_categories', 'update', NOW()),
('expenses_categories.delete', 'Delete expense categories', 'expenses_categories', 'delete', NOW()),
('expenses_categories.manage_hierarchy', 'Manage expense category hierarchy', 'expenses_categories', 'manage', NOW()),

-- Cost Centers Permissions
('cost_centers.create', 'Create cost centers', 'cost_centers', 'create', NOW()),
('cost_centers.read', 'View cost centers', 'cost_centers', 'read', NOW()),
('cost_centers.update', 'Update cost centers', 'cost_centers', 'update', NOW()),
('cost_centers.delete', 'Delete cost centers', 'cost_centers', 'delete', NOW()),

-- Reports Permissions
('reports.financial', 'View financial reports', 'reports', 'read', NOW()),
('reports.transactions', 'View transaction reports', 'reports', 'read', NOW()),
('reports.cost_analysis', 'View cost analysis reports', 'reports', 'read', NOW()),
('reports.project_reports', 'View project reports', 'reports', 'read', NOW()),
('reports.export', 'Export reports', 'reports', 'export', NOW()),
('reports.create_custom', 'Create custom reports', 'reports', 'create', NOW()),

-- Dashboard Permissions
('dashboard.view', 'View dashboard', 'dashboard', 'read', NOW()),
('dashboard.customize', 'Customize dashboard', 'dashboard', 'update', NOW()),

-- Audit & Logging Permissions
('audit_logs.read', 'View audit logs', 'audit_logs', 'read', NOW()),
('audit_logs.export', 'Export audit logs', 'audit_logs', 'export', NOW())

ON CONFLICT (name) DO UPDATE SET
    resource = EXCLUDED.resource,
    action = EXCLUDED.action,
    description = EXCLUDED.description;
