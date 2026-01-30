-- =====================================================
-- DIAGNOSTIC SCRIPT - UNDERSTAND YOUR SCHEMA
-- =====================================================
-- Run this to see what tables and columns you actually have
-- =====================================================

-- Check if user_roles table exists and its structure
SELECT 
  'user_roles' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- Check if roles table exists and its structure
SELECT 
  'roles' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'roles'
ORDER BY ordinal_position;

-- Check user_profiles structure
SELECT 
  'user_profiles' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check org_memberships structure
SELECT 
  'org_memberships' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'org_memberships'
ORDER BY ordinal_position;

-- Check project_memberships structure
SELECT 
  'project_memberships' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'project_memberships'
ORDER BY ordinal_position;

-- Show sample data from each table
RAISE NOTICE '=== SAMPLE DATA ===';

-- Sample from user_profiles
RAISE NOTICE 'user_profiles sample:';
SELECT id, email, role, is_super_admin FROM user_profiles LIMIT 3;

-- Sample from org_memberships
RAISE NOTICE 'org_memberships sample:';
SELECT user_id, org_id, can_access_all_projects FROM org_memberships LIMIT 3;

-- Sample from project_memberships
RAISE NOTICE 'project_memberships sample:';
SELECT user_id, project_id FROM project_memberships LIMIT 3;

-- Check if user_roles exists and show sample
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    RAISE NOTICE 'user_roles sample:';
    EXECUTE 'SELECT * FROM user_roles LIMIT 3';
  ELSE
    RAISE NOTICE 'user_roles table does NOT exist';
  END IF;
END $$;

-- Check if roles table exists and show sample
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    RAISE NOTICE 'roles sample:';
    EXECUTE 'SELECT id, name, name_ar, is_system_role FROM roles LIMIT 3';
  ELSE
    RAISE NOTICE 'roles table does NOT exist';
  END IF;
END $$;

-- Count records in each table
RAISE NOTICE '=== RECORD COUNTS ===';
SELECT 'user_profiles' as table_name, COUNT(*) as count FROM user_profiles
UNION ALL
SELECT 'org_memberships', COUNT(*) FROM org_memberships
UNION ALL
SELECT 'project_memberships', COUNT(*) FROM project_memberships;

-- Check for user_roles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    EXECUTE 'SELECT ''user_roles'' as table_name, COUNT(*) as count FROM user_roles';
  END IF;
END $$;

-- Check for roles if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    EXECUTE 'SELECT ''roles'' as table_name, COUNT(*) as count FROM roles';
  END IF;
END $$;
