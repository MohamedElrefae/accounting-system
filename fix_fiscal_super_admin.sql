-- ============================================
-- FIX FISCAL ACCESS FOR SUPER ADMINS
-- Updates the security function to allow super admins
-- ============================================

CREATE OR REPLACE FUNCTION public.check_fiscal_org_access(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
STABLE
AS $$
BEGIN
    -- 1. Check if Super Admin
    IF EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() 
        AND is_super_admin = true
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Check Org Membership
    RETURN EXISTS (
        SELECT 1 
        FROM org_memberships 
        WHERE org_id = target_org_id 
        AND user_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_fiscal_org_access TO authenticated;

-- Force refresh of the policy cache
NOTIFY pgrst, 'reload schema';
