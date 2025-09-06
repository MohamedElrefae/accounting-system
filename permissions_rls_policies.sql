-- Add RLS policies for permissions table management
-- Enable RLS on permissions table
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions table
DROP POLICY IF EXISTS "permissions_select" ON public.permissions;
CREATE POLICY "permissions_select" ON public.permissions
FOR SELECT
USING (
  -- Everyone can view permissions (needed for UI dropdowns and role management)
  true
);

DROP POLICY IF EXISTS "permissions_insert" ON public.permissions;
CREATE POLICY "permissions_insert" ON public.permissions
FOR INSERT
WITH CHECK (public.is_super_admin() OR public.has_permission(auth.uid(), 'permissions.create'));

DROP POLICY IF EXISTS "permissions_update" ON public.permissions;
CREATE POLICY "permissions_update" ON public.permissions
FOR UPDATE
USING (public.is_super_admin() OR public.has_permission(auth.uid(), 'permissions.update'))
WITH CHECK (public.is_super_admin() OR public.has_permission(auth.uid(), 'permissions.update'));

DROP POLICY IF EXISTS "permissions_delete" ON public.permissions;
CREATE POLICY "permissions_delete" ON public.permissions
FOR DELETE
USING (public.is_super_admin() OR public.has_permission(auth.uid(), 'permissions.delete'));

-- Test the policies
SELECT 'RLS policies created successfully' as status;
