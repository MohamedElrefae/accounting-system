-- ================================================================
-- TRANSACTION CLEANUP SCRIPT
-- ================================================================
-- This script safely removes existing transaction data as recommended
-- Run AFTER backup script and BEFORE chart of accounts migration
-- This ensures clean state for the new construction-focused COA

BEGIN;

-- Log the cleanup operation for audit purposes
DO $$
DECLARE
    transactions_count INTEGER;
    ledger_entries_count INTEGER;
    transaction_audit_count INTEGER;
    cleanup_timestamp TIMESTAMPTZ := now();
    current_user_id UUID := auth.uid();
BEGIN
    -- Get counts before deletion
    SELECT count(*) INTO transactions_count FROM transactions;
    SELECT count(*) INTO ledger_entries_count FROM ledger_entries;
    SELECT count(*) INTO transaction_audit_count FROM transaction_audit;
    
    RAISE NOTICE 'Starting transaction cleanup...';
    RAISE NOTICE 'Transactions to delete: %', transactions_count;
    RAISE NOTICE 'Ledger entries to delete: %', ledger_entries_count;
    RAISE NOTICE 'Transaction audit records to delete: %', transaction_audit_count;
    
    -- Create audit log entry for the cleanup
    INSERT INTO audit_logs (
        action,
        details,
        user_id,
        entity_type,
        created_at
    ) VALUES (
        'transactions.cleanup_migration',
        jsonb_build_object(
            'reason', 'Chart of accounts migration cleanup',
            'transactions_deleted', transactions_count,
            'ledger_entries_deleted', ledger_entries_count,
            'audit_records_deleted', transaction_audit_count,
            'cleanup_timestamp', cleanup_timestamp
        ),
        current_user_id,
        'system',
        cleanup_timestamp
    );
    
    -- ================================================================
    -- STEP 1: Clear ledger entries (dependent on transactions)
    -- ================================================================
    RAISE NOTICE 'Clearing ledger entries...';
    DELETE FROM ledger_entries;
    
    -- ================================================================
    -- STEP 2: Clear transaction audit records
    -- ================================================================
    RAISE NOTICE 'Clearing transaction audit records...';
    DELETE FROM transaction_audit;
    
    -- ================================================================  
    -- STEP 3: Clear transactions
    -- ================================================================
    RAISE NOTICE 'Clearing transactions...';
    DELETE FROM transactions;
    
    -- ================================================================
    -- STEP 4: Reset sequences/auto-increment counters if any
    -- ================================================================
    -- Note: PostgreSQL uses serial/sequence for auto-increment
    -- Since we're using UUIDs, no sequence reset needed for IDs
    -- But we may need to reset entry number sequences if they exist
    
    -- Reset any custom sequences related to entry numbers
    -- (Adjust based on your actual sequence names)
    DECLARE
        seq_record RECORD;
    BEGIN
        FOR seq_record IN 
            SELECT seq.relname
            FROM pg_class seq
            JOIN pg_namespace nsp ON seq.relnamespace = nsp.oid
            WHERE seq.relkind = 'S' 
            AND nsp.nspname = 'public'
            AND (seq.relname LIKE '%transaction%' OR seq.relname LIKE '%entry%')
        LOOP
            EXECUTE format('SELECT setval(%L, 1, false)', seq_record.relname);
            RAISE NOTICE 'Reset sequence: %', seq_record.relname;
        END LOOP;
    END;
    
    -- ================================================================
    -- STEP 5: Clear any cached/computed values
    -- ================================================================
    -- Clear account balance snapshots if they exist
    DELETE FROM account_balance_snapshots;
    
    -- Update company configuration to reset counters if needed
    UPDATE company_config 
    SET transaction_number_length = 4
    WHERE transaction_number_length IS NOT NULL;
    
    -- ================================================================
    -- STEP 6: Verification
    -- ================================================================
    SELECT count(*) INTO transactions_count FROM transactions;
    SELECT count(*) INTO ledger_entries_count FROM ledger_entries;
    SELECT count(*) INTO transaction_audit_count FROM transaction_audit;
    
    IF transactions_count = 0 AND ledger_entries_count = 0 AND transaction_audit_count = 0 THEN
        RAISE NOTICE 'Transaction cleanup completed successfully!';
        RAISE NOTICE 'All transaction data has been cleared.';
    ELSE
        RAISE WARNING 'Cleanup may be incomplete. Remaining records:';
        RAISE WARNING 'Transactions: %, Ledger entries: %, Audit records: %', 
            transactions_count, ledger_entries_count, transaction_audit_count;
    END IF;
    
    -- Log completion
    INSERT INTO audit_logs (
        action,
        details,
        user_id,
        entity_type,
        created_at
    ) VALUES (
        'transactions.cleanup_completed',
        jsonb_build_object(
            'status', 'success',
            'remaining_transactions', transactions_count,
            'remaining_ledger_entries', ledger_entries_count,
            'remaining_audit_records', transaction_audit_count,
            'completion_timestamp', now()
        ),
        current_user_id,
        'system',
        now()
    );
    
END $$;

-- ================================================================
-- CLEAN UP RELATED DATA THAT REFERENCES TRANSACTIONS
-- ================================================================

-- Clear any reports or cached data that depends on transactions
DELETE FROM report_execution_logs WHERE 1=1;

-- Clear any client error logs related to transactions (optional)
DELETE FROM client_error_logs 
WHERE context LIKE '%transaction%' OR context LIKE '%account%';

-- ================================================================
-- RESET USER PREFERENCES THAT MIGHT REFERENCE OLD ACCOUNTS
-- ================================================================

-- Clear user preferences (only if tables exist)
DO $$
BEGIN
    -- Clear user column preferences if the table exists and has the right structure
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_column_preferences') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_column_preferences' AND column_name = 'table_name') THEN
            DELETE FROM user_column_preferences WHERE table_name IN ('transactions', 'accounts', 'ledger_entries');
            RAISE NOTICE 'Cleared user column preferences';
        ELSE
            -- If different column structure, clear all
            DELETE FROM user_column_preferences;
            RAISE NOTICE 'Cleared all user column preferences (different structure)';
        END IF;
    ELSE
        RAISE NOTICE 'user_column_preferences table does not exist - skipping';
    END IF;

    -- Clear user report presets if the table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_report_presets') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_report_presets' AND column_name = 'preset_data') THEN
            DELETE FROM user_report_presets WHERE preset_data::text LIKE '%account%' OR preset_data::text LIKE '%transaction%';
            RAISE NOTICE 'Cleared relevant user report presets';
        ELSE
            -- If different structure, clear all to be safe
            DELETE FROM user_report_presets;
            RAISE NOTICE 'Cleared all user report presets (different structure)';
        END IF;
    ELSE
        RAISE NOTICE 'user_report_presets table does not exist - skipping';
    END IF;
END $$;

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Show cleanup summary
SELECT 
    'Transaction Cleanup Summary' as summary_type,
    'Transactions' as table_name,
    count(*) as remaining_records
FROM transactions
UNION ALL
SELECT 
    'Transaction Cleanup Summary',
    'Ledger Entries',
    count(*)
FROM ledger_entries
UNION ALL
SELECT 
    'Transaction Cleanup Summary',
    'Transaction Audit',
    count(*)
FROM transaction_audit
UNION ALL
SELECT 
    'Transaction Cleanup Summary',
    'Account Balance Snapshots',
    count(*)
FROM account_balance_snapshots;

-- Show what will be ready for fresh start
SELECT 
    'Ready for Migration' as status,
    'All transaction data cleared successfully' as message
WHERE (SELECT count(*) FROM transactions) = 0
  AND (SELECT count(*) FROM ledger_entries) = 0;

-- Instructions for next steps
SELECT 
    'Next Steps' as step_type,
    'Run construction_chart_of_accounts_migration.sql' as next_action,
    '1' as step_order
UNION ALL
SELECT 
    'Next Steps',
    'Run construction_coa_level_4_accounts.sql',
    '2'
UNION ALL
SELECT 
    'Next Steps', 
    'Run verification_and_testing_scripts.sql',
    '3'
ORDER BY step_order;
