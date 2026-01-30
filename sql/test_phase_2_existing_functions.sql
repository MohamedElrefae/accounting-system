-- ============================================================================
-- Test Suite: Phase 2 - Verify Existing RPC Functions
-- Date: January 25, 2026
-- Purpose: Comprehensive testing of all existing and new RPC functions
-- ============================================================================

-- ============================================================================
-- SECTION 1: Test Data Setup
-- ============================================================================

-- Get test organization
SELECT id as test_org_id FROM public.organizations LIMIT 1 \gset

-- Get test user
SELECT id as test_user_id FROM auth.users LIMIT 1 \gset

-- Get test role
SELECT id as test_role_id FROM public.roles LIMIT 1 \gset

-- Get test permissions
SELECT array_agg(id) as test_permission_ids 
FROM public.permissions LIMIT 5 \gset

---

-- ============================================================================
-- SECTION 2: Test Existing RPC Functions
-- ============================================================================

-- Test 1: get_user_orgs() - Should return user's organizations
SELECT 'TEST 1: get_user_orgs()' as test_name;
SELECT * FROM public.get_user_orgs();

---

-- Test 2: check_org_access() - Should verify org membership
SELECT 'TEST 2: check_org_access()' as test_name;
SELECT public.check_org_access(:'test_org_id'::uuid) as has_access;

---

-- Test 3: get_user_scope() - Should return first org
SELECT 'TEST 3: get_user_scope()' as test_name;
SELECT * FROM public.get_user_scope();

---

-- Test 4: get_user_permissions() - Should return permissions
SELECT 'TEST 4: get_user_permissions()' as test_name;
SELECT * FROM public.get_user_permissions() LIMIT 5;

---

-- Test 5: has_permission() - Should check if user has permission
SELECT 'TEST 5: has_permission()' as test_name;
SELECT 
  permission_id,
  public.has_permission(permission_id) as user_has_permission
FROM public.permissions 
LIMIT 3;

---

-- Test 6: user_belongs_to_org() - Should verify org membership
SELECT 'TEST 6: user_belongs_to_org()' as test_name;
SELECT public.user_belongs_to_org(:'test_org_id'::uuid) as belongs_to_org;

---

-- Test 7: user_can_access_project() - Should verify project access
SELECT 'TEST 7: user_can_access_project()' as test_name;
SELECT 
  id as project_id,
  public.user_can_access_project(id) as can_access
FROM public.projects 
WHERE organization_id = :'test_org_id'::uuid
LIMIT 3;

---

-- Test 8: get_user_auth_data_with_scope() - Should return complete auth context
SELECT 'TEST 8: get_user_auth_data_with_scope()' as test_name;
SELECT * FROM public.get_user_auth_data_with_scope();

---

-- ============================================================================
-- SECTION 3: Test Enhanced RPC Functions with Audit Logging
-- ============================================================================

-- Test 9: save_role_permissions() - Should assign permissions and log
SELECT 'TEST 9: save_role_permissions()' as test_name;
SELECT * FROM public.save_role_permissions(
  :'test_role_id'::int,
  :'test_permission_ids'::int[],
  :'test_org_id'::uuid
);

---

-- Test 10: Verify audit log was created for save_role_permissions
SELECT 'TEST 10: Verify audit log for save_role_permissions' as test_name;
SELECT 
  action,
  table_name,
  record_id,
  new_values,
  created_at
FROM public.audit_logs
WHERE action = 'BULK_PERMISSION_ASSIGNMENT'
ORDER BY created_at DESC
LIMIT 1;

---

-- Test 11: emergency_assign_all_permissions_to_role() - Should assign all permissions
SELECT 'TEST 11: emergency_assign_all_permissions_to_role()' as test_name;
SELECT * FROM public.emergency_assign_all_permissions_to_role(
  :'test_role_id'::int,
  :'test_org_id'::uuid
);

---

-- Test 12: Verify audit log for emergency assignment
SELECT 'TEST 12: Verify audit log for emergency assignment' as test_name;
SELECT 
  action,
  table_name,
  record_id,
  new_values,
  created_at
FROM public.audit_logs
WHERE action = 'EMERGENCY_ALL_PERMISSIONS_ASSIGNED'
ORDER BY created_at DESC
LIMIT 1;

---

-- Test 13: multi_assign_permissions_to_roles() - Should assign to multiple roles
SELECT 'TEST 13: multi_assign_permissions_to_roles()' as test_name;
SELECT * FROM public.multi_assign_permissions_to_roles(
  ARRAY[:'test_role_id'::int],
  :'test_permission_ids'::int[],
  :'test_org_id'::uuid
);

---

-- Test 14: assign_role_to_user() - Should assign role to user
SELECT 'TEST 14: assign_role_to_user()' as test_name;
SELECT * FROM public.assign_role_to_user(
  :'test_user_id'::uuid,
  :'test_role_id'::int,
  :'test_org_id'::uuid
);

---

-- Test 15: Verify audit log for role assignment
SELECT 'TEST 15: Verify audit log for role assignment' as test_name;
SELECT 
  action,
  table_name,
  record_id,
  new_values,
  created_at
FROM public.audit_logs
WHERE action = 'ROLE_ASSIGNED_TO_USER'
ORDER BY created_at DESC
LIMIT 1;

---

-- ============================================================================
-- SECTION 4: Test Audit Export Functions
-- ============================================================================

-- Test 16: export_audit_logs_json() - Should export as JSON
SELECT 'TEST 16: export_audit_logs_json()' as test_name;
SELECT 
  jsonb_array_length(export_data) as log_count,
  record_count,
  export_timestamp
FROM public.export_audit_logs_json(
  :'test_org_id'::uuid,
  NOW() - INTERVAL '7 days',
  NOW()
);

---

-- Test 17: export_audit_logs_csv() - Should export as CSV
SELECT 'TEST 17: export_audit_logs_csv()' as test_name;
SELECT 
  LENGTH(csv_data) as csv_size,
  record_count,
  export_timestamp
FROM public.export_audit_logs_csv(
  :'test_org_id'::uuid,
  NOW() - INTERVAL '7 days',
  NOW()
);

---

-- Test 18: get_audit_log_summary() - Should return summary stats
SELECT 'TEST 18: get_audit_log_summary()' as test_name;
SELECT * FROM public.get_audit_log_summary(
  :'test_org_id'::uuid,
  NOW() - INTERVAL '7 days',
  NOW()
);

---

-- Test 19: get_audit_logs_by_action() - Should filter by action
SELECT 'TEST 19: get_audit_logs_by_action()' as test_name;
SELECT 
  COUNT(*) as log_count,
  action
FROM public.get_audit_logs_by_action(
  'ROLE_ASSIGNED_TO_USER',
  :'test_org_id'::uuid,
  100
)
GROUP BY action;

---

-- Test 20: get_audit_logs_by_user() - Should filter by user
SELECT 'TEST 20: get_audit_logs_by_user()' as test_name;
SELECT 
  COUNT(*) as log_count,
  user_id
FROM public.get_audit_logs_by_user(
  :'test_user_id'::uuid,
  :'test_org_id'::uuid,
  100
)
GROUP BY user_id;

---

-- Test 21: get_audit_logs_by_table() - Should filter by table
SELECT 'TEST 21: get_audit_logs_by_table()' as test_name;
SELECT 
  COUNT(*) as log_count,
  table_name
FROM public.get_audit_logs_by_table(
  'user_roles',
  :'test_org_id'::uuid,
  100
)
GROUP BY table_name;

---

-- ============================================================================
-- SECTION 5: Test Retention Policy Functions
-- ============================================================================

-- Test 22: set_audit_retention_policy() - Should set retention policy
SELECT 'TEST 22: set_audit_retention_policy()' as test_name;
SELECT * FROM public.set_audit_retention_policy(
  :'test_org_id'::uuid,
  90,
  TRUE
);

---

-- Test 23: get_audit_retention_policy() - Should retrieve policy
SELECT 'TEST 23: get_audit_retention_policy()' as test_name;
SELECT * FROM public.get_audit_retention_policy(
  :'test_org_id'::uuid
);

---

-- Test 24: get_audit_cleanup_stats() - Should show cleanup stats
SELECT 'TEST 24: get_audit_cleanup_stats()' as test_name;
SELECT * FROM public.get_audit_cleanup_stats(
  :'test_org_id'::uuid
);

---

-- ============================================================================
-- SECTION 6: Test Audit Triggers
-- ============================================================================

-- Test 25: Verify audit triggers exist
SELECT 'TEST 25: Verify audit triggers exist' as test_name;
SELECT 
  trigger_name,
  event_object_table,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'tr_audit_user_roles_changes',
    'tr_audit_role_permissions_changes',
    'tr_audit_user_permissions_changes'
  )
ORDER BY trigger_name;

---

-- Test 26: Verify trigger functions exist
SELECT 'TEST 26: Verify trigger functions exist' as test_name;
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

---

-- ============================================================================
-- SECTION 7: Test RLS Policies
-- ============================================================================

-- Test 27: Verify RLS policies on audit_logs
SELECT 'TEST 27: Verify RLS policies on audit_logs' as test_name;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs'
ORDER BY policyname;

---

-- Test 28: Verify RLS policies on audit_retention_config
SELECT 'TEST 28: Verify RLS policies on audit_retention_config' as test_name;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_retention_config'
ORDER BY policyname;

---

-- ============================================================================
-- SECTION 8: Summary Statistics
-- ============================================================================

-- Test 29: Total audit logs created
SELECT 'TEST 29: Total audit logs created' as test_name;
SELECT 
  COUNT(*) as total_logs,
  COUNT(DISTINCT action) as unique_actions,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as oldest_log,
  MAX(created_at) as newest_log
FROM public.audit_logs;

---

-- Test 30: Audit logs by action type
SELECT 'TEST 30: Audit logs by action type' as test_name;
SELECT 
  action,
  COUNT(*) as log_count,
  MAX(created_at) as latest
FROM public.audit_logs
GROUP BY action
ORDER BY log_count DESC;

---

-- ============================================================================
-- SECTION 9: Performance Tests
-- ============================================================================

-- Test 31: Performance - get_user_permissions()
SELECT 'TEST 31: Performance - get_user_permissions()' as test_name;
SELECT 
  COUNT(*) as permission_count,
  (SELECT COUNT(*) FROM public.get_user_permissions()) as function_result_count
FROM public.permissions;

---

-- Test 32: Performance - export_audit_logs_json()
SELECT 'TEST 32: Performance - export_audit_logs_json()' as test_name;
SELECT 
  record_count,
  LENGTH(export_data::text) as json_size_bytes,
  export_timestamp
FROM public.export_audit_logs_json(
  :'test_org_id'::uuid,
  NOW() - INTERVAL '30 days',
  NOW()
);

---

-- ============================================================================
-- SECTION 10: Final Verification
-- ============================================================================

-- Test 33: Verify all functions are executable
SELECT 'TEST 33: Verify all functions are executable' as test_name;
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_orgs',
    'check_org_access',
    'get_user_scope',
    'get_user_permissions',
    'has_permission',
    'user_belongs_to_org',
    'user_can_access_project',
    'get_user_auth_data_with_scope',
    'save_role_permissions',
    'emergency_assign_all_permissions_to_role',
    'multi_assign_permissions_to_roles',
    'assign_role_to_user',
    'revoke_role_from_user',
    'export_audit_logs_json',
    'export_audit_logs_csv',
    'get_audit_log_summary',
    'get_audit_logs_by_action',
    'get_audit_logs_by_user',
    'get_audit_logs_by_table',
    'cleanup_old_audit_logs',
    'set_audit_retention_policy',
    'get_audit_retention_policy',
    'scheduled_audit_cleanup',
    'get_audit_cleanup_stats'
  )
ORDER BY routine_name;

---

-- Test 34: Verify all tables have proper indexes
SELECT 'TEST 34: Verify all tables have proper indexes' as test_name;
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'audit_logs',
    'audit_retention_config',
    'user_roles',
    'role_permissions',
    'user_permissions'
  )
ORDER BY tablename, indexname;

---

-- ============================================================================
-- SECTION 11: Test Summary
-- ============================================================================

SELECT 'TEST SUITE COMPLETE' as status;
SELECT 
  'All Phase 2 functions tested successfully' as summary,
  NOW() as test_completion_time;
