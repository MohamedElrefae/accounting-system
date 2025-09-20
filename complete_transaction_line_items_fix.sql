-- Complete fix for transaction line items RLS and permissions issues
-- This script addresses RLS policies, permissions, and UI integration

-- ============================================================
-- 1. FIRST - Fix the RLS policies for transaction_line_items
-- ============================================================

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can view line items from their organization" ON public.transaction_line_items;
DROP POLICY IF EXISTS "Users can insert line items in their organization" ON public.transaction_line_items;
DROP POLICY IF EXISTS "Users can update line items in their organization" ON public.transaction_line_items;
DROP POLICY IF EXISTS "Users can delete line items in their organization" ON public.transaction_line_items;

-- Create new, more permissive RLS policies for transaction_line_items
CREATE POLICY "transaction_line_items_select_policy" ON public.transaction_line_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_memberships om 
            WHERE om.org_id = transaction_line_items.org_id 
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "transaction_line_items_insert_policy" ON public.transaction_line_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_memberships om 
            WHERE om.org_id = transaction_line_items.org_id 
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "transaction_line_items_update_policy" ON public.transaction_line_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.org_memberships om 
            WHERE om.org_id = transaction_line_items.org_id 
            AND om.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_memberships om 
            WHERE om.org_id = transaction_line_items.org_id 
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "transaction_line_items_delete_policy" ON public.transaction_line_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.org_memberships om 
            WHERE om.org_id = transaction_line_items.org_id 
            AND om.user_id = auth.uid()
        )
    );

-- Ensure RLS is enabled
ALTER TABLE public.transaction_line_items ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_line_items TO authenticated;

-- ============================================================
-- 2. Fix the permissions table structure and data
-- ============================================================

-- Update existing permissions to ensure they have all required fields
UPDATE public.permissions 
SET 
    resource = 'transaction_line_items',
    action = 'view',
    description_ar = 'عرض بنود تفاصيل المعاملات'
WHERE name = 'transaction_line_items.view';

UPDATE public.permissions 
SET 
    resource = 'transaction_line_items',
    action = 'create',
    description_ar = 'إنشاء بنود تفاصيل المعاملات'
WHERE name = 'transaction_line_items.create';

UPDATE public.permissions 
SET 
    resource = 'transaction_line_items',
    action = 'update',
    description_ar = 'تعديل بنود تفاصيل المعاملات'
WHERE name = 'transaction_line_items.update';

UPDATE public.permissions 
SET 
    resource = 'transaction_line_items',
    action = 'delete',
    description_ar = 'حذف بنود تفاصيل المعاملات'
WHERE name = 'transaction_line_items.delete';

-- ============================================================
-- 3. Ensure permissions are assigned to appropriate roles
-- ============================================================

-- Get all roles that have transaction permissions and assign line items permissions
WITH transaction_roles AS (
    SELECT DISTINCT rp.role_id, r.name as role_name
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    JOIN public.roles r ON r.id = rp.role_id
    WHERE p.name LIKE 'transactions%'
),
line_item_perms AS (
    SELECT id, name FROM public.permissions 
    WHERE name IN ('transaction_line_items.view', 'transaction_line_items.create', 'transaction_line_items.update', 'transaction_line_items.delete')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT tr.role_id, lip.id
FROM transaction_roles tr
CROSS JOIN line_item_perms lip
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Specifically ensure Super Admin role has all permissions
WITH super_admin_role AS (
    SELECT id FROM public.roles 
    WHERE LOWER(name) LIKE '%super%' OR LOWER(name) LIKE '%admin%' OR id = 7
    LIMIT 1
),
line_item_perms AS (
    SELECT id FROM public.permissions 
    WHERE name IN ('transaction_line_items.view', 'transaction_line_items.create', 'transaction_line_items.update', 'transaction_line_items.delete')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT sar.id, lip.id
FROM super_admin_role sar
CROSS JOIN line_item_perms lip
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- 4. Create a view to help with permissions synchronization
-- ============================================================

CREATE OR REPLACE VIEW public.v_all_permissions AS
SELECT 
    p.id,
    p.name,
    p.name_ar,
    p.description,
    p.description_ar,
    p.resource,
    p.action,
    p.category,
    p.created_at,
    CASE 
        WHEN p.resource IS NULL THEN 'legacy'
        ELSE 'standard'
    END as permission_type
FROM public.permissions p
ORDER BY p.resource, p.action, p.name;

-- Grant access to the view
GRANT SELECT ON public.v_all_permissions TO authenticated, service_role;

-- ============================================================
-- 5. Verification queries
-- ============================================================

-- Check if permissions exist and are properly configured
SELECT 
    name, 
    name_ar, 
    description, 
    resource, 
    action,
    CASE 
        WHEN resource IS NULL OR action IS NULL THEN 'INCOMPLETE'
        ELSE 'OK'
    END as status
FROM public.permissions 
WHERE name LIKE 'transaction_line_items%'
ORDER BY name;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'transaction_line_items'
ORDER BY policyname;

-- Check role assignments for transaction line items permissions
SELECT 
    r.name AS role_name,
    COUNT(p.id) AS line_items_permissions_count,
    STRING_AGG(p.name, ', ' ORDER BY p.name) AS assigned_permissions
FROM public.roles r
JOIN public.role_permissions rp ON r.id = rp.role_id
JOIN public.permissions p ON rp.permission_id = p.id
WHERE p.name LIKE 'transaction_line_items%'
GROUP BY r.name, r.id
ORDER BY r.name;

-- Check total permissions count
SELECT 
    COUNT(*) as total_permissions,
    COUNT(CASE WHEN resource IS NOT NULL THEN 1 END) as permissions_with_resource,
    COUNT(CASE WHEN resource IS NULL THEN 1 END) as permissions_without_resource
FROM public.permissions;

-- Test query to see if RLS allows access (replace with actual org_id)
SELECT 'RLS Test - Should show transaction line items if policies work correctly' as test_note;

-- Show current user's org memberships for reference
SELECT 
    om.org_id,
    o.name as org_name,
    om.role,
    auth.uid() as current_user_id
FROM public.org_memberships om
JOIN public.organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();

-- Check if authenticated users have proper grants
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'transaction_line_items' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;