-- Real Database Schema Analysis for Enterprise Auth Performance
-- This query provides actual database schema and performance data

-- 1. Get table row counts for auth-related tables
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('user_profiles')) as table_size
FROM user_profiles
UNION ALL
SELECT 
  'organizations' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('organizations')) as table_size
FROM organizations
UNION ALL
SELECT 
  'projects' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('projects')) as table_size
FROM projects
UNION ALL
SELECT 
  'user_roles' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('user_roles')) as table_size
FROM user_roles
UNION ALL
SELECT 
  'org_memberships' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('org_memberships')) as table_size
FROM org_memberships
UNION ALL
SELECT 
  'project_memberships' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('project_memberships')) as table_size
FROM project_memberships
UNION ALL
SELECT 
  'org_roles' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('org_roles')) as table_size
FROM org_roles
UNION ALL
SELECT 
  'project_roles' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('project_roles')) as table_size
FROM project_roles
ORDER BY table_name;