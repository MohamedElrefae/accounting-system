-- CORRECTED VERIFICATION SQL - COPY AND PASTE THIS BLOCK
-- This version uses proper UUID formats for the test

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

-- 4. INSERT TEST WITH PROPER UUIDs (WILL BE ROLLED BACK)
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
    '123e4567-e89b-12d3-a456-426614174000'::uuid, 
    1, 
    'Test Item', 
    1, 
    100, 
    10.50, 
    'piece',
    '987fcdeb-51a2-43d1-9f12-345678901234'::uuid
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
WHERE transaction_id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

ROLLBACK;

-- 5. FINAL VERIFICATION
SELECT 
    'transaction_line_items table verification complete' as status,
    COUNT(*) as existing_records
FROM transaction_line_items;