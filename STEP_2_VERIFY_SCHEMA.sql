-- ==========================================
-- STEP 2: Verify Database Schema
-- ==========================================
-- Copy each query below and run in Supabase SQL Editor
-- ==========================================

-- Query 1: Verify transactions table schema
-- This should return columns like: id, entry_date, description, org_id, etc.
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'transactions'
ORDER BY ordinal_position;

-- ==========================================
-- Query 2: Verify transaction_lines table schema  
-- This should return columns like: id, transaction_id, line_no, account_id, debit_amount, credit_amount, etc.
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'transaction_lines'
ORDER BY ordinal_position;

-- ==========================================
-- Query 3: Verify the RPC function exists
-- This should return 1 row showing the function name and parameter count
SELECT 
    proname AS function_name, 
    pronargs AS num_parameters,
    prorettype::regtype AS return_type
FROM pg_proc 
WHERE proname = 'create_transaction_with_lines';

-- ==========================================
-- Query 4: Check foreign key relationships
-- This verifies the transactions <-> transaction_lines relationship
SELECT
    tc.constraint_name,
    tc.table_name,
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
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('transactions', 'transaction_lines')
ORDER BY tc.table_name, tc.constraint_name;

-- ==========================================
-- EXPECTED RESULTS:
-- ==========================================
-- Query 1: Should show at least these columns in transactions:
--   - id (uuid)
--   - entry_date (date)
--   - description (text or varchar)
--   - org_id (uuid)
--   - project_id (uuid, nullable)
--   - created_by (uuid)
--   - created_at (timestamp)
--
-- Query 2: Should show at least these columns in transaction_lines:
--   - id (uuid)
--   - transaction_id (uuid)
--   - line_no (integer)
--   - account_id (uuid)
--   - debit_amount (numeric)
--   - credit_amount (numeric)
--   - description (text, nullable)
--
-- Query 3: Should show:
--   - function_name: create_transaction_with_lines
--   - num_parameters: 2
--   - return_type: uuid
--
-- Query 4: Should show foreign key from transaction_lines.transaction_id -> transactions.id
-- ==========================================

-- ==========================================
-- If Query 3 returns NO ROWS:
-- You need to run the SQL from supabase-create-transaction-function.sql FIRST!
-- ==========================================
