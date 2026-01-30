-- Fix permission audit triggers to correct org_id resolution
-- The previous triggers incorrectly referenced NEW.org_id on the roles table (which doesn't exist)
-- This migration updates the functions to look up the org_id from the current user's memberships

-- 1. Fix log_roles_changes function
CREATE OR REPLACE FUNCTION log_roles_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization ID from the current user's membership
  -- effectively logging this under the user's active org context
  SELECT org_id INTO v_org_id FROM org_memberships WHERE user_id = auth.uid() LIMIT 1;

  -- If no org context found, we can't log to permission_audit_logs because org_id is NOT NULL
  -- In this case we skip logging but allow the operation to proceed
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO permission_audit_logs (
      org_id, user_id, action, resource_type, resource_id,
      old_value, new_value, reason, created_at
    ) VALUES (
      v_org_id,
      auth.uid(),
      'CREATE',
      'role',
      NEW.id::text,
      NULL,
      jsonb_build_object('name', NEW.name, 'description', NEW.description),
      'Role created',
      NOW()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO permission_audit_logs (
      org_id, user_id, action, resource_type, resource_id,
      old_value, new_value, reason, created_at
    ) VALUES (
      v_org_id,
      auth.uid(),
      'DELETE',
      'role',
      OLD.id::text,
      jsonb_build_object('name', OLD.name, 'description', OLD.description),
      NULL,
      'Role deleted',
      NOW()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO permission_audit_logs (
      org_id, user_id, action, resource_type, resource_id,
      old_value, new_value, reason, created_at
    ) VALUES (
      v_org_id,
      auth.uid(),
      'MODIFY',
      'role',
      NEW.id::text,
      jsonb_build_object('name', OLD.name, 'description', OLD.description),
      jsonb_build_object('name', NEW.name, 'description', NEW.description),
      'Role modified',
      NOW()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix log_role_permissions_changes function
CREATE OR REPLACE FUNCTION log_role_permissions_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Roles are global and don't have an org_id, so we can't look it up from the role itself
  -- Instead, we attribute the change to the user's current organization context
  SELECT org_id INTO v_org_id FROM org_memberships WHERE user_id = auth.uid() LIMIT 1;
  
  -- If no org context found, skip logging to avoid error
  IF v_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO permission_audit_logs (
      org_id, user_id, action, resource_type, resource_id,
      old_value, new_value, reason, created_at
    ) VALUES (
      v_org_id,
      auth.uid(),
      'ASSIGN',
      'role_permission',
      NEW.id::text,
      NULL,
      jsonb_build_object('role_id', NEW.role_id, 'permission_id', NEW.permission_id),
      'Permission assigned to role',
      NOW()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO permission_audit_logs (
      org_id, user_id, action, resource_type, resource_id,
      old_value, new_value, reason, created_at
    ) VALUES (
      v_org_id,
      auth.uid(),
      'REVOKE',
      'role_permission',
      OLD.id::text,
      jsonb_build_object('role_id', OLD.role_id, 'permission_id', OLD.permission_id),
      NULL,
      'Permission revoked from role',
      NOW()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO permission_audit_logs (
      org_id, user_id, action, resource_type, resource_id,
      old_value, new_value, reason, created_at
    ) VALUES (
      v_org_id,
      auth.uid(),
      'MODIFY',
      'role_permission',
      NEW.id::text,
      jsonb_build_object('role_id', OLD.role_id, 'permission_id', OLD.permission_id),
      jsonb_build_object('role_id', NEW.role_id, 'permission_id', NEW.permission_id),
      'Role permission modified',
      NOW()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
