-- Migration: Fix permission audit foreign key violations and cleanup
-- Date: 2026-02-16

-- 1. Clean up orphaned org_memberships (where org_id does not exist in organizations)
DELETE FROM org_memberships
WHERE org_id NOT IN (SELECT id FROM organizations);

-- 2. Clean up orphaned roles step removed (roles are global/no org_id)

-- 3. Update log_roles_changes to be more robust
CREATE OR REPLACE FUNCTION log_roles_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization ID from the current user's membership
  -- effectively logging this under the user's active org context
  -- ADDED: Ensure the org actually exists
  SELECT om.org_id INTO v_org_id 
  FROM org_memberships om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = auth.uid() 
  LIMIT 1;

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

-- 4. Update log_role_permissions_changes to be more robust
CREATE OR REPLACE FUNCTION log_role_permissions_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Roles are global and don't have an org_id, so we can't look it up from the role itself
  -- Instead, we attribute the change to the user's current organization context
  -- ADDED: Ensure the org actually exists
  SELECT om.org_id INTO v_org_id 
  FROM org_memberships om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = auth.uid() 
  LIMIT 1;
  
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
