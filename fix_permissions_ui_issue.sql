-- Fix permissions UI issue - ensure all permissions have required fields
-- This addresses the 39 vs 61 permissions issue

-- First, let's check current state
SELECT 
    COUNT(*) as total_permissions,
    COUNT(CASE WHEN resource IS NOT NULL THEN 1 END) as with_resource,
    COUNT(CASE WHEN action IS NOT NULL THEN 1 END) as with_action,
    COUNT(CASE WHEN resource IS NULL THEN 1 END) as missing_resource,
    COUNT(CASE WHEN action IS NULL THEN 1 END) as missing_action
FROM public.permissions;

-- Update all permissions that have NULL resource to have a resource value
-- based on their name pattern
UPDATE public.permissions 
SET 
    resource = CASE
        WHEN name LIKE 'users.%' THEN 'users'
        WHEN name LIKE 'roles.%' THEN 'roles'
        WHEN name LIKE 'permissions.%' THEN 'permissions'
        WHEN name LIKE 'accounts.%' THEN 'accounts'
        WHEN name LIKE 'transactions.%' THEN 'transactions'
        WHEN name LIKE 'transaction_line_items.%' THEN 'transaction_line_items'
        WHEN name LIKE 'invoices.%' THEN 'invoices'
        WHEN name LIKE 'reports.%' THEN 'reports'
        WHEN name LIKE 'inventory.%' THEN 'inventory'
        WHEN name LIKE 'settings.%' THEN 'settings'
        WHEN name LIKE 'sub_tree.%' THEN 'sub_tree'
        WHEN name LIKE 'invoicing.%' THEN 'invoicing'
        ELSE 'general'
    END
WHERE resource IS NULL;

-- Update all permissions that have NULL action to have an action value
-- based on their name pattern
UPDATE public.permissions 
SET 
    action = CASE
        WHEN name LIKE '%.create' THEN 'create'
        WHEN name LIKE '%.read' THEN 'read'
        WHEN name LIKE '%.view' THEN 'view'
        WHEN name LIKE '%.update' THEN 'update'
        WHEN name LIKE '%.delete' THEN 'delete'
        WHEN name LIKE '%.manage' THEN 'manage'
        WHEN name LIKE '%.post' THEN 'post'
        WHEN name LIKE '%.review' THEN 'review'
        WHEN name LIKE '%.approve' THEN 'approve'
        WHEN name LIKE '%.export' THEN 'export'
        WHEN name LIKE '%.custom' THEN 'custom'
        WHEN name LIKE '%.financial' THEN 'financial'
        WHEN name LIKE '%.adjust' THEN 'adjust'
        WHEN name LIKE '%.transfer' THEN 'transfer'
        WHEN name LIKE '%.backup' THEN 'backup'
        WHEN name LIKE '%.audit' THEN 'audit'
        WHEN name LIKE '%.activate' THEN 'activate'
        ELSE 'general'
    END
WHERE action IS NULL;

-- Ensure description_ar is populated for permissions that don't have it
UPDATE public.permissions 
SET description_ar = 
    CASE 
        WHEN name = 'users.view' THEN 'عرض المستخدمين'
        WHEN name = 'users.create' THEN 'إنشاء مستخدم'
        WHEN name = 'users.update' THEN 'تعديل المستخدمين'
        WHEN name = 'users.delete' THEN 'حذف المستخدمين'
        WHEN name = 'users.activate' THEN 'تفعيل المستخدمين'
        WHEN name = 'roles.view' THEN 'عرض الأدوار'
        WHEN name = 'roles.create' THEN 'إنشاء أدوار'
        WHEN name = 'roles.update' THEN 'تعديل الأدوار'
        WHEN name = 'roles.delete' THEN 'حذف الأدوار'
        WHEN name = 'roles.manage' THEN 'إدارة الأدوار'
        WHEN name = 'accounts.view' THEN 'عرض الحسابات'
        WHEN name = 'accounts.create' THEN 'إنشاء حسابات'
        WHEN name = 'accounts.update' THEN 'تعديل الحسابات'
        WHEN name = 'accounts.delete' THEN 'حذف الحسابات'
        WHEN name = 'transactions.create' THEN 'إنشاء المعاملات'
        WHEN name = 'transactions.update' THEN 'تعديل المعاملات'
        WHEN name = 'transactions.delete' THEN 'حذف المعاملات'
        WHEN name = 'transactions.post' THEN 'ترحيل المعاملات'
        WHEN name = 'transactions.read.own' THEN 'عرض معاملاتي'
        WHEN name = 'transactions.read.all' THEN 'عرض جميع المعاملات'
        WHEN name = 'transactions.review' THEN 'مراجعة واعتماد المعاملات'
        WHEN name = 'transactions.manage' THEN 'إدارة المعاملات'
        WHEN name = 'transaction_line_items.view' THEN 'عرض بنود المعاملات'
        WHEN name = 'transaction_line_items.create' THEN 'إنشاء بنود المعاملات'
        WHEN name = 'transaction_line_items.update' THEN 'تعديل بنود المعاملات'
        WHEN name = 'transaction_line_items.delete' THEN 'حذف بنود المعاملات'
        ELSE name_ar
    END
WHERE description_ar IS NULL;

-- Create an RPC function to get all permissions for UI
CREATE OR REPLACE FUNCTION get_all_permissions_for_ui()
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    resource TEXT,
    action TEXT,
    category TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        p.id,
        p.name,
        p.name_ar,
        p.description,
        p.description_ar,
        p.resource,
        p.action,
        p.category,
        p.created_at
    FROM permissions p
    ORDER BY p.resource, p.action, p.name;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_permissions_for_ui() TO authenticated, service_role;

-- Verification - show updated permissions count
SELECT 
    'AFTER UPDATE' as status,
    COUNT(*) as total_permissions,
    COUNT(CASE WHEN resource IS NOT NULL THEN 1 END) as with_resource,
    COUNT(CASE WHEN action IS NOT NULL THEN 1 END) as with_action,
    COUNT(CASE WHEN resource IS NULL THEN 1 END) as missing_resource,
    COUNT(CASE WHEN action IS NULL THEN 1 END) as missing_action
FROM public.permissions;

-- Show sample of fixed permissions
SELECT 
    name,
    name_ar,
    resource,
    action,
    description_ar
FROM public.permissions 
WHERE name LIKE 'transaction%' OR name LIKE 'users%' OR name LIKE 'roles%'
ORDER BY resource, action, name
LIMIT 20;

-- Test the RPC function
SELECT * FROM get_all_permissions_for_ui() LIMIT 10;