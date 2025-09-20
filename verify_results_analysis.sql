-- COPY-READY SQL BLOCK FOR DATABASE VERIFICATION
-- Copy and paste this entire block into your Supabase SQL Editor

-- 1. TABLE STRUCTURE VERIFICATION
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_identity,
    identity_generation
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. CONSTRAINTS VERIFICATION  
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'transaction_line_items' 
    AND n.nspname = 'public';

-- 3. TRIGGERS VERIFICATION
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'transaction_line_items'
    AND event_object_schema = 'public';

-- 4. INSERT TEST (WILL BE ROLLED BACK)
BEGIN;

INSERT INTO transaction_line_items (
    transaction_id, 
    line_number, 
    item_name_ar, 
    quantity, 
    percentage, 
    unit_price, 
    unit_of_measure,
    org_id
) VALUES (
    'test-transaction-id', 
    1, 
    'Test Item', 
    1, 
    100, 
    10.50, 
    'piece',
    'test-org-id'
);

SELECT 
    id,
    transaction_id,
    line_number,
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    total_amount,
    created_at
FROM transaction_line_items 
WHERE transaction_id = 'test-transaction-id';

ROLLBACK;

-- 5. FINAL VERIFICATION
SELECT 
    'transaction_line_items table verification complete' as status,
    COUNT(*) as existing_records
FROM transaction_line_items;