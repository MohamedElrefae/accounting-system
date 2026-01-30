-- Fix Demo User Organizations - Phase 7 Testing
-- This script adds organizations and roles for the demo user so testing can proceed

-- First, let's check what demo user exists
SELECT id, email, name FROM user_profiles WHERE email LIKE '%demo%' LIMIT 5;

-- Get the demo user ID (usually demo@example.com)
-- We'll use this in the following queries

-- Check existing organizations
SELECT id, name FROM organizations LIMIT 10;

-- Check if demo user has any org memberships
SELECT * FROM org_memberships WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1);

-- If no organizations exist, create sample ones
INSERT INTO organizations (name, description, created_by)
SELECT 'Demo Organization 1', 'Sample organization for testing', (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Demo Organization 1');

INSERT INTO organizations (name, description, created_by)
SELECT 'Demo Organization 2', 'Another sample organization', (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Demo Organization 2');

-- Add demo user to organizations as org_admin
INSERT INTO org_memberships (user_id, org_id, role, created_by)
SELECT 
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1),
  id,
  'org_admin',
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
FROM organizations
WHERE name IN ('Demo Organization 1', 'Demo Organization 2')
AND NOT EXISTS (
  SELECT 1 FROM org_memberships 
  WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
  AND org_id = organizations.id
);

-- Create sample projects for the demo organizations
INSERT INTO projects (name, org_id, description, created_by)
SELECT 
  'Demo Project 1',
  id,
  'Sample project for testing',
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
FROM organizations
WHERE name = 'Demo Organization 1'
AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Demo Project 1' AND org_id = organizations.id);

INSERT INTO projects (name, org_id, description, created_by)
SELECT 
  'Demo Project 2',
  id,
  'Another sample project',
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
FROM organizations
WHERE name = 'Demo Organization 2'
AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Demo Project 2' AND org_id = organizations.id);

-- Verify the setup
SELECT 'Organizations' as type, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Org Memberships', COUNT(*) FROM org_memberships
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects;

-- Show demo user's organizations
SELECT 
  o.id,
  o.name,
  om.role,
  om.can_access_all_projects
FROM organizations o
JOIN org_memberships om ON o.id = om.org_id
WHERE om.user_id = (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1);
