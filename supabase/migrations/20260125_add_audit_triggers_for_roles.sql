-- ============================================================================
-- Migration: Add Audit Triggers for Role and Permission Changes
-- Date: January 25, 2026
-- Purpose: Automatically log all role/permission assignments and revocations
-- ============================================================================

-- ============================================================================
-- SECTION 1: Trigger for user_roles changes (role assignments)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_org_id UUID;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'ROLE_ASSIGNED';
    v_org_id := NEW.organization_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'ROLE_UPDATED';
    v_org_id := NEW.organization_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'ROLE_REVOKED';
    v_org_id := OLD.organization_id;
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    v_org_id,
    v_action,
    'user_roles',
    COALESCE(NEW.user_id, OLD.user_id)::text,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN 
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role_id', OLD.role_id,
        'organization_id', OLD.organization_id,
        'is_active', OLD.is_active,
        'granted_by', OLD.granted_by,
        'granted_at', OLD.granted_at
      )
    ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN 
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role_id', NEW.role_id,
        'organization_id', NEW.organization_id,
        'is_active', NEW.is_active,
        'granted_by', NEW.granted_by,
        'granted_at', NEW.granted_at
      )
    ELSE NULL END,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_audit_user_roles_changes ON public.user_roles;

-- Create trigger
CREATE TRIGGER tr_audit_user_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_roles_changes();

---

-- ============================================================================
-- SECTION 2: Trigger for role_permissions changes (permission assignments)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_role_permissions_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_org_id UUID;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'PERMISSION_ASSIGNED';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'PERMISSION_UPDATED';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'PERMISSION_REVOKED';
  END IF;

  -- Get org_id from roles table (if available)
  -- Note: roles table may not have org_id, so we use NULL if not available
  v_org_id := NULL;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    v_org_id,
    v_action,
    'role_permissions',
    COALESCE(NEW.role_id, OLD.role_id)::text,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN 
      jsonb_build_object(
        'role_id', OLD.role_id,
        'permission_id', OLD.permission_id,
        'granted_by', OLD.granted_by,
        'granted_at', OLD.granted_at
      )
    ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN 
      jsonb_build_object(
        'role_id', NEW.role_id,
        'permission_id', NEW.permission_id,
        'granted_by', NEW.granted_by,
        'granted_at', NEW.granted_at
      )
    ELSE NULL END,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_audit_role_permissions_changes ON public.role_permissions;

-- Create trigger
CREATE TRIGGER tr_audit_role_permissions_changes
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_permissions_changes();

---

-- ============================================================================
-- SECTION 3: Trigger for user_permissions changes (direct permissions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_user_permissions_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'DIRECT_PERMISSION_ASSIGNED';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'DIRECT_PERMISSION_UPDATED';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DIRECT_PERMISSION_REVOKED';
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    org_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    NULL,
    v_action,
    'user_permissions',
    COALESCE(NEW.user_id, OLD.user_id)::text,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN 
      jsonb_build_object(
        'user_id', OLD.user_id,
        'permission_id', OLD.permission_id
      )
    ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN 
      jsonb_build_object(
        'user_id', NEW.user_id,
        'permission_id', NEW.permission_id
      )
    ELSE NULL END,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_audit_user_permissions_changes ON public.user_permissions;

-- Create trigger
CREATE TRIGGER tr_audit_user_permissions_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_permissions_changes();

---

-- ============================================================================
-- SECTION 4: Verification Queries
-- ============================================================================

-- Verify triggers are created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'tr_audit_user_roles_changes',
    'tr_audit_role_permissions_changes',
    'tr_audit_user_permissions_changes'
  )
ORDER BY event_object_table, trigger_name;

-- Verify trigger functions are created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'audit_user_roles_changes',
    'audit_role_permissions_changes',
    'audit_user_permissions_changes'
  )
ORDER BY routine_name;
