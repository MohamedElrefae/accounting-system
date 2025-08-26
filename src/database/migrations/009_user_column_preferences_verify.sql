-- Verification SQL for user_column_preferences migration
-- Run these queries to ensure the migration was successful

-- 1. Check if table exists and has correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_column_preferences'
ORDER BY ordinal_position;

-- Expected result should show columns:
-- id (UUID), user_id (UUID), table_key (VARCHAR), column_config (JSONB), 
-- version (INTEGER), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ)

-- 2. Check if indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'user_column_preferences';

-- Expected results:
-- - Primary key index on 'id'
-- - Unique index on (user_id, table_key)
-- - Performance index: idx_user_column_preferences_user_table

-- 3. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'user_column_preferences';

-- Expected: rowsecurity = true

-- 4. Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_column_preferences';

-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- 5. Check if functions exist
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN (
    'upsert_user_column_preferences',
    'get_user_column_preferences',
    'update_user_column_preferences_updated_at'
);

-- Expected: 3 functions

-- 6. Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_column_preferences';

-- Expected: trigger_user_column_preferences_updated_at (BEFORE UPDATE)

-- 7. Test basic functionality (if you want to test with sample data)
-- Note: This will only work if you're authenticated as a user
/*
-- Insert test preference
SELECT upsert_user_column_preferences(
    'test_table',
    '{"columns": [{"key": "test", "visible": true, "width": 100}]}'::jsonb,
    1
);

-- Retrieve test preference
SELECT * FROM get_user_column_preferences('test_table');

-- Clean up test data
DELETE FROM user_column_preferences WHERE table_key = 'test_table';
*/

-- 8. Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_column_preferences'
ORDER BY grantee, privilege_type;

-- 9. Verify foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'user_column_preferences'
    AND tc.constraint_type = 'FOREIGN KEY';

-- Expected: user_id references auth.users(id)
