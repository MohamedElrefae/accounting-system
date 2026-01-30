-- Create function to log user_roles changes
CREATE OR REPLACE FUNCTION log_user_roles_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization ID from org_memberships
  SELECT org_id INTO v_org_id FROM org_memberships WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) LIMIT 1;
  
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
      'user_role',
      NEW.id,
      NULL,
      jsonb_build_object('user_id', NEW.user_id, 'role_id', NEW.role_id),
      'User role assigned',
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
      'user_role',
      OLD.id,
      jsonb_build_object('user_id', OLD.user_id, 'role_id', OLD.role_id),
      NULL,
      'User role revoked',
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
      'user_role',
      NEW.id,
      jsonb_build_object('user_id', OLD.user_id, 'role_id', OLD.role_id),
      jsonb_build_object('user_id', NEW.user_id, 'role_id', NEW.role_id),
      'User role modified',
      NOW()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user_roles
DROP TRIGGER IF EXISTS user_roles_audit_trigger ON user_roles;
CREATE TRIGGER user_roles_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION log_user_roles_changes();

-- Create function to log role_permissions changes
CREATE OR REPLACE FUNCTION log_role_permissions_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization ID from roles
  SELECT org_id INTO v_org_id FROM roles WHERE id = COALESCE(NEW.role_id, OLD.role_id) LIMIT 1;
  
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
      NEW.id,
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
      OLD.id,
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
      NEW.id,
      jsonb_build_object('role_id', OLD.role_id, 'permission_id', OLD.permission_id),
      jsonb_build_object('role_id', NEW.role_id, 'permission_id', NEW.permission_id),
      'Role permission modified',
      NOW()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role_permissions
DROP TRIGGER IF EXISTS role_permissions_audit_trigger ON role_permissions;
CREATE TRIGGER role_permissions_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON role_permissions
FOR EACH ROW
EXECUTE FUNCTION log_role_permissions_changes();

-- Create function to log roles changes
CREATE OR REPLACE FUNCTION log_roles_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO permission_audit_logs (
      org_id, user_id, action, resource_type, resource_id,
      old_value, new_value, reason, created_at
    ) VALUES (
      NEW.org_id,
      auth.uid(),
      'CREATE',
      'role',
      NEW.id,
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
      OLD.org_id,
      auth.uid(),
      'DELETE',
      'role',
      OLD.id,
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
      NEW.org_id,
      auth.uid(),
      'MODIFY',
      'role',
      NEW.id,
      jsonb_build_object('name', OLD.name, 'description', OLD.description),
      jsonb_build_object('name', NEW.name, 'description', NEW.description),
      'Role modified',
      NOW()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for roles
DROP TRIGGER IF EXISTS roles_audit_trigger ON roles;
CREATE TRIGGER roles_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON roles
FOR EACH ROW
EXECUTE FUNCTION log_roles_changes();
