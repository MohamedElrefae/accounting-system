-- Check transaction_line_items table RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'transaction_line_items';

-- Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE tablename = 'transaction_line_items';

-- Check current user and role
SELECT 
    current_user,
    current_role,
    session_user;

-- Check org_id context (if you're using org-based RLS)
SELECT current_setting('app.current_org_id', true) as current_org_id;

-- Sample query to see what data the current user can access
SELECT 
    id,
    transaction_id,
    line_number,
    item_code,
    item_name_ar,
    org_id
FROM transaction_line_items 
LIMIT 5;