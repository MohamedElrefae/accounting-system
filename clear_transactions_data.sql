-- Clear all transaction-related data
-- Uses TRUNCATE CASCADE to ensure all dependent data is removed efficiently

BEGIN;

-- 1. Main transaction tables (cascades should handle children, but listing for clarity)
-- Order matters for referential integrity if not using CASCADE, but TRUNCATE CASCADE handles it.
TRUNCATE TABLE 
    public.transaction_line_items,
    public.transaction_lines,
    public.transactions
    RESTART IDENTITY CASCADE;

-- 2. Audit and History tables
-- These might not always be linked via FK CASCADE, so we clear them explicitly or via CASCADE from parents
TRUNCATE TABLE 
    public.transaction_audit,
    public.approval_history_lines -- Verify if this table exists or is named differently
    RESTART IDENTITY CASCADE;

-- 3. Document links (if any specific table links docs to transactions beyond the documents table itself)
-- Assuming 'documents' table holds files, we might strictly want to clear documents linked to 'transactions' entity
-- But TRUNCATE documents might be too aggressive if it holds other modules' docs.
-- For now, we will perform a DELETE on documents linked to transactions if strictly needed, 
-- but often documents are kept or just orphaned.
-- UNCOMMENT below if you want to wipe ALL documents associated with transactions:
-- DELETE FROM public.documents WHERE related_entity_type = 'transaction';

COMMIT;

-- Verification
SELECT count(*) as transactions_count FROM public.transactions;
SELECT count(*) as lines_count FROM public.transaction_lines;
SELECT count(*) as items_count FROM public.transaction_line_items;
