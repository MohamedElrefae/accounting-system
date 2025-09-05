-- ================================================================
-- CONSTRUCTION CHART OF ACCOUNTS MIGRATION - EXECUTION SCRIPT
-- ================================================================
-- Execute this script step by step in your SQL editor
-- Make sure to run each section separately and verify results

-- STEP 1: Backup existing data
\echo 'Starting backup of existing accounts and transactions...'
\i backup_migration_data.sql

-- STEP 2: Clean up existing transactions
\echo 'Cleaning up existing transaction data...'
\i transaction_cleanup_script.sql

-- STEP 3: Run main chart of accounts migration
\echo 'Creating new construction chart of accounts...'
\i construction_chart_of_accounts_migration.sql

-- STEP 4: Add Level 4 detailed accounts
\echo 'Adding Level 4 postable accounts...'
\i construction_level_4_accounts.sql

-- STEP 5: Verify migration
\echo 'Verifying migration success...'
\i verification_and_testing_scripts.sql

\echo 'Migration completed! Check output above for any errors.'
