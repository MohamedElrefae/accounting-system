-- SQL Verification Script for Expenses Categories Dropdown Synchronization
-- This script verifies that the expenses category dropdown is properly synced with the database

-- 1. Get the database schema for expenses_categories table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'expenses_categories'
ORDER BY ordinal_position;

-- 2. Get the database schema for expenses_categories_full view
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'expenses_categories_full'
ORDER BY ordinal_position;

-- 3. Check active expenses categories with their linked accounts
-- Replace 'YOUR_ORG_ID' with your actual organization ID
SELECT 
    ec.id,
    ec.org_id,
    ec.code,
    ec.description,
    ec.is_active,
    ec.linked_account_id,
    ec.linked_account_code,
    ec.linked_account_name,
    ec.child_count,
    ec.level,
    ec.path
FROM expenses_categories_full ec 
WHERE ec.org_id = 'YOUR_ORG_ID' 
    AND ec.is_active = true 
ORDER BY ec.code;

-- 4. Check if there are any leaf-only active categories (what the form should show)
-- Replace 'YOUR_ORG_ID' with your actual organization ID
SELECT 
    ec.id,
    ec.code,
    ec.description,
    ec.is_active,
    ec.linked_account_id,
    ec.linked_account_code,
    ec.linked_account_name,
    COALESCE(ec.child_count, 0) as child_count
FROM expenses_categories_full ec 
WHERE ec.org_id = 'YOUR_ORG_ID' 
    AND ec.is_active = true 
    AND (ec.child_count IS NULL OR ec.child_count = 0)  -- Leaf categories only
ORDER BY ec.code;

-- 5. Test expenses categories linked to specific accounts
-- Replace 'YOUR_ORG_ID' and 'ACCOUNT_ID' with actual values
SELECT 
    ec.id,
    ec.code,
    ec.description,
    ec.linked_account_id,
    ec.linked_account_code,
    ec.linked_account_name
FROM expenses_categories_full ec 
WHERE ec.org_id = 'YOUR_ORG_ID' 
    AND ec.is_active = true 
    AND ec.linked_account_id = 'ACCOUNT_ID'
ORDER BY ec.code;

-- 6. Check transactions that have expenses_category_id to verify the relationship
-- Replace 'YOUR_ORG_ID' with your actual organization ID
SELECT 
    t.id,
    t.entry_number,
    t.description,
    t.expenses_category_id,
    ec.code as expenses_category_code,
    ec.description as expenses_category_description
FROM transactions t
LEFT JOIN expenses_categories_full ec ON ec.id = t.expenses_category_id
WHERE t.org_id = 'YOUR_ORG_ID' 
    AND t.expenses_category_id IS NOT NULL
ORDER BY t.entry_date DESC
LIMIT 10;

-- 7. Check for any inconsistencies - categories that are active but have no linked account
SELECT 
    ec.id,
    ec.code,
    ec.description,
    ec.is_active,
    ec.linked_account_id
FROM expenses_categories_full ec 
WHERE ec.org_id = 'YOUR_ORG_ID' 
    AND ec.is_active = true 
    AND ec.linked_account_id IS NULL
    AND (ec.child_count IS NULL OR ec.child_count = 0)  -- Leaf categories only
ORDER BY ec.code;

-- 8. Get list of organizations for reference
SELECT 
    id,
    code,
    name,
    is_active
FROM organizations 
WHERE is_active = true
ORDER BY code;

-- 9. Check if RPC functions exist for expenses categories
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%expenses_categor%'
ORDER BY routine_name;

-- 10. Test the RPC function that gets expenses categories tree
-- Replace 'YOUR_ORG_ID' with your actual organization ID
-- SELECT * FROM get_expenses_categories_tree('YOUR_ORG_ID');