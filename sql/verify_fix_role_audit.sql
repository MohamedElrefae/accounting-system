-- Verification script for Role Audit Fix
-- This script applies the fix and then attempts to perform role operations that previously failed

\i supabase/migrations/20260128_fix_permission_audit_triggers.sql
\i supabase/migrations/20260128_fix_permission_audit_types.sql

DO $$
DECLARE
  v_role_id INT;
  v_perm_id INT;
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get a test user (current user)
  v_user_id := auth.uid();
  
  -- Attempt to get an org for this user
  SELECT org_id INTO v_org_id FROM org_memberships WHERE user_id = v_user_id LIMIT 1;
  
  RAISE NOTICE 'Testing with User ID: %, Org ID: %', v_user_id, v_org_id;

  -- 1. Create a dummy role (Triggers log_roles_changes)
  INSERT INTO roles (name, name_ar, description, is_system)
  VALUES ('VERIFY_FIX_ROLE', 'دور التحقق', 'Role created to verify audit fix', FALSE)
  RETURNING id INTO v_role_id;
  
  RAISE NOTICE 'Created Role ID: %', v_role_id;

  -- 2. Modify the role (Triggers log_roles_changes UPDATE)
  UPDATE roles 
  SET description = 'Updated description for verification'
  WHERE id = v_role_id;
  
  RAISE NOTICE 'Updated Role ID: %', v_role_id;

  -- 3. Get a permission ID
  SELECT id INTO v_perm_id FROM permissions LIMIT 1;

  -- 4. Assign permission (Triggers log_role_permissions_changes)
  INSERT INTO role_permissions (role_id, permission_id)
  VALUES (v_role_id, v_perm_id);
  
  RAISE NOTICE 'Assigned Permission ID: % to Role ID: %', v_perm_id, v_role_id;
  
  -- 5. Delete the dummy role (Triggers log_roles_changes DELETE)
  DELETE FROM roles WHERE id = v_role_id;
  
  RAISE NOTICE 'Deleted Role ID: %', v_role_id;
  
  RAISE NOTICE '✅ Verification Successful: All operations completed without error.';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Verification Failed: %', SQLERRM;
  -- Clean up if possible
  IF v_role_id IS NOT NULL THEN
    DELETE FROM role_permissions WHERE role_id = v_role_id;
    DELETE FROM roles WHERE id = v_role_id;
  END IF;
  RAISE; -- Re-raise error
END;
$$;
