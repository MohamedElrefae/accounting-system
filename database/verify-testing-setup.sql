-- =====================================================================
-- TESTING DATABASE VERIFICATION SCRIPT
-- Copy and paste this entire block into Supabase SQL Editor
-- =====================================================================

-- 1. Check all required tables exist
SELECT 
    '📋 TABLE VERIFICATION' as "Check Type",
    '' as "Details";

SELECT 
    schemaname as "Schema", 
    tablename as "Table Name",
    '✅' as "Status"
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'roles', 'permissions', 'role_permissions', 'user_roles',
    'accounts', 'cost_centers', 'projects', 'analysis_items'
  )
ORDER BY tablename;

-- 2. Verify seed data counts
SELECT 
    '📊 DATA VERIFICATION' as "Check Type",
    '' as "Count";

SELECT 'Roles' as "Table", COUNT(*) as "Records" FROM roles
UNION ALL
SELECT 'Permissions', COUNT(*) FROM permissions
UNION ALL  
SELECT 'Role Permissions', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'User Roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'Accounts', COUNT(*) FROM accounts
UNION ALL
SELECT 'Cost Centers', COUNT(*) FROM cost_centers
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects
ORDER BY "Records" DESC;

-- 3. Check role permission assignments
SELECT 
    '🔐 PERMISSION VERIFICATION' as "Check Type",
    '' as "Details";

SELECT 
    r.name as "Role",
    r.name_ar as "Arabic Name",
    COUNT(rp.permission_id) as "Permission Count",
    CASE 
        WHEN COUNT(rp.permission_id) > 0 THEN '✅'
        ELSE '❌'
    END as "Status"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.name_ar
ORDER BY COUNT(rp.permission_id) DESC;

-- 4. Check permissions by resource
SELECT 
    '📋 PERMISSIONS BY RESOURCE' as "Check Type",
    '' as "Details";

SELECT 
    p.resource as "Resource",
    COUNT(*) as "Permission Count",
    string_agg(p.action, ', ' ORDER BY p.action) as "Available Actions"
FROM permissions p
GROUP BY p.resource
ORDER BY COUNT(*) DESC;

-- 5. Verify auth users and their roles (run after creating test users)
SELECT 
    '👥 USER ROLE VERIFICATION' as "Check Type",
    '' as "Details";

SELECT 
    COALESCE(au.email, 'No Users Created Yet') as "Email",
    COALESCE(r.name, 'No Role Assigned') as "Role",
    CASE 
        WHEN r.name IS NOT NULL THEN '✅'
        WHEN au.email IS NOT NULL THEN '⚠️ No Role'
        ELSE 'ℹ️ Create Users First'
    END as "Status"
FROM auth.users au
FULL OUTER JOIN user_roles ur ON au.id = ur.user_id
FULL OUTER JOIN roles r ON ur.role_id = r.id
WHERE au.email LIKE '%@test.com' OR au.email IS NULL
ORDER BY au.email;

-- 6. Test RLS policies (basic check)
SELECT 
    '🛡️ RLS POLICY VERIFICATION' as "Check Type",
    '' as "Details";

SELECT 
    schemaname as "Schema",
    tablename as "Table", 
    policyname as "Policy Name",
    CASE 
        WHEN policyname IS NOT NULL THEN '✅'
        ELSE '❌'
    END as "Status"
FROM pg_policies 
WHERE schemaname = 'public'
   AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles')
ORDER BY tablename, policyname;

-- 7. Final verification summary
SELECT 
    '🎯 SETUP VERIFICATION SUMMARY' as "Check Type",
    '' as "Result";

WITH verification_summary AS (
    SELECT 
        (SELECT COUNT(*) FROM roles) as role_count,
        (SELECT COUNT(*) FROM permissions) as permission_count,
        (SELECT COUNT(*) FROM role_permissions) as role_permission_count,
        (SELECT COUNT(*) FROM accounts) as account_count,
        (SELECT COUNT(*) FROM cost_centers) as cost_center_count,
        (SELECT COUNT(*) FROM projects) as project_count
)
SELECT 
    CASE 
        WHEN role_count >= 7 
         AND permission_count >= 30 
         AND role_permission_count >= 50
         AND account_count >= 10
         AND cost_center_count >= 5
         AND project_count >= 3
        THEN '🎉 ALL CHECKS PASSED - TESTING DB READY!'
        ELSE '⚠️ Some checks failed - review above results'
    END as "Overall Status",
    
    CASE 
        WHEN role_count >= 7 THEN '✅ Roles OK'
        ELSE '❌ Roles Missing'
    END as "Roles Status",
    
    CASE 
        WHEN permission_count >= 30 THEN '✅ Permissions OK'
        ELSE '❌ Permissions Missing'  
    END as "Permissions Status",
    
    CASE 
        WHEN role_permission_count >= 50 THEN '✅ Role Assignments OK'
        ELSE '❌ Role Assignments Missing'
    END as "Assignments Status"
    
FROM verification_summary;

-- 8. Next steps reminder
SELECT 
    '📝 NEXT STEPS' as "Action Required",
    'Create test users in Supabase Auth Dashboard' as "Step 1",
    'Run user role assignment SQL from setup guide' as "Step 2",
    'Configure frontend environment variables' as "Step 3",
    'Deploy to testing environment' as "Step 4";

-- =====================================================================
-- END OF VERIFICATION SCRIPT
-- =====================================================================