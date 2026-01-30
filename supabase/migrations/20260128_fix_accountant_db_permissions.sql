-- Revoke 'accounts.manage' and 'reports.view' from 'accountant' role

DO $$
DECLARE
  v_role_id int;
  v_perm_manage_id uuid;
  v_perm_reports_id uuid;
BEGIN
  -- 1. Get Accountant Role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'accountant';

  -- 2. Get Permission IDs
  SELECT id INTO v_perm_manage_id FROM permissions WHERE name = 'accounts.manage';
  SELECT id INTO v_perm_reports_id FROM permissions WHERE name = 'reports.view';

  -- 3. Delete from role_permissions if they exist
  IF v_role_id IS NOT NULL THEN
    IF v_perm_manage_id IS NOT NULL THEN
      DELETE FROM role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_manage_id;
      RAISE NOTICE 'Revoked accounts.manage from accountant';
    END IF;

    IF v_perm_reports_id IS NOT NULL THEN
      DELETE FROM role_permissions WHERE role_id = v_role_id AND permission_id = v_perm_reports_id;
       RAISE NOTICE 'Revoked reports.view from accountant';
    END IF;
  END IF;
END $$;
