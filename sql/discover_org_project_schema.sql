-- Discover Organizations and Projects Schema
-- Run this in Supabase SQL Editor to get current schema

-- 1. Organizations table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Projects table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'projects' OR ccu.table_name = 'organizations');

-- 4. Sample data check
SELECT 'organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'projects' as table_name, COUNT(*) as count FROM projects;

-- 5. Check org_id usage in projects
SELECT 
    p.id,
    p.code,
    p.name,
    p.org_id,
    o.code as org_code,
    o.name as org_name
FROM projects p
LEFT JOIN organizations o ON p.org_id = o.id
LIMIT 10;
