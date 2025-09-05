-- ================================================================
-- BACKUP SCRIPT FOR CHART OF ACCOUNTS MIGRATION
-- ================================================================
-- This script creates backup tables for existing data before migration
-- Run this BEFORE executing the migration to the new construction COA

BEGIN;

-- Create backup tables with timestamp
DO $$
DECLARE 
    backup_suffix TEXT := '_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS');
    accounts_backup_table TEXT := 'accounts' || backup_suffix;
    transactions_backup_table TEXT := 'transactions' || backup_suffix;
    account_prefix_map_backup_table TEXT := 'account_prefix_map' || backup_suffix;
BEGIN
    -- Backup accounts table
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM accounts', accounts_backup_table);
    RAISE NOTICE 'Created backup table: %', accounts_backup_table;
    
    -- Backup transactions table
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM transactions', transactions_backup_table);
    RAISE NOTICE 'Created backup table: %', transactions_backup_table;
    
    -- Backup account_prefix_map table
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM account_prefix_map', account_prefix_map_backup_table);
    RAISE NOTICE 'Created backup table: %', account_prefix_map_backup_table;
    
    -- Log the backup operation
    INSERT INTO audit_logs (
        action, 
        details, 
        user_id, 
        entity_type,
        created_at
    ) VALUES (
        'backup.migration_preparation',
        jsonb_build_object(
            'accounts_backup', accounts_backup_table,
            'transactions_backup', transactions_backup_table,
            'account_prefix_map_backup', account_prefix_map_backup_table,
            'reason', 'Pre-migration backup for new construction chart of accounts'
        ),
        (SELECT auth.uid()),
        'system',
        now()
    );
    
    RAISE NOTICE 'Backup completed successfully';
    RAISE NOTICE 'Accounts backup: %', accounts_backup_table;
    RAISE NOTICE 'Transactions backup: %', transactions_backup_table;
    RAISE NOTICE 'Account prefix map backup: %', account_prefix_map_backup_table;
END $$;

-- Export current account statistics for verification
CREATE TEMPORARY TABLE current_stats AS
SELECT 
    'Current Accounts Count' as stat_type,
    count(*) as stat_value
FROM accounts
UNION ALL
SELECT 
    'Current Transactions Count',
    count(*)
FROM transactions
UNION ALL
SELECT 
    'Active Accounts Count',
    count(*)
FROM accounts 
WHERE status = 'active'
UNION ALL
SELECT 
    'Posted Transactions Count',
    count(*)
FROM transactions 
WHERE is_posted = true;

-- Display statistics
SELECT * FROM current_stats;

-- Create a verification query for later use
CREATE OR REPLACE FUNCTION verify_backup_integrity() 
RETURNS TABLE(
    backup_table TEXT,
    original_count BIGINT,
    backup_count BIGINT,
    integrity_ok BOOLEAN
) 
LANGUAGE plpgsql AS $$
DECLARE
    backup_suffix TEXT := '_backup_' || to_char(now()::date, 'YYYYMMDD') || '%';
    rec RECORD;
BEGIN
    -- Check all backup tables created today
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE backup_suffix
        AND table_name ~ '^(accounts|transactions|account_prefix_map)_backup_'
    LOOP
        IF rec.table_name ~ '^accounts_backup_' THEN
            SELECT 'accounts', count(*), 0, false INTO backup_table, original_count, backup_count, integrity_ok
            FROM accounts;
            EXECUTE format('SELECT count(*) FROM %I', rec.table_name) INTO backup_count;
            integrity_ok := (original_count = backup_count);
            RETURN NEXT;
        ELSIF rec.table_name ~ '^transactions_backup_' THEN
            SELECT 'transactions', count(*), 0, false INTO backup_table, original_count, backup_count, integrity_ok
            FROM transactions;
            EXECUTE format('SELECT count(*) FROM %I', rec.table_name) INTO backup_count;
            integrity_ok := (original_count = backup_count);
            RETURN NEXT;
        ELSIF rec.table_name ~ '^account_prefix_map_backup_' THEN
            SELECT 'account_prefix_map', count(*), 0, false INTO backup_table, original_count, backup_count, integrity_ok
            FROM account_prefix_map;
            EXECUTE format('SELECT count(*) FROM %I', rec.table_name) INTO backup_count;
            integrity_ok := (original_count = backup_count);
            RETURN NEXT;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- Instructions for verification
SELECT 'Backup completed. Run the following to verify:' as instruction
UNION ALL
SELECT 'SELECT * FROM verify_backup_integrity();' as instruction;
