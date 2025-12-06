-- Find user-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%user%' OR table_name LIKE '%profile%' OR table_name LIKE '%member%' OR table_name LIKE '%auth%')
ORDER BY table_name;

-- List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
