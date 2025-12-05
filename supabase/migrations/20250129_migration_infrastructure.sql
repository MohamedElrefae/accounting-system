-- ============================================
-- MIGRATION INFRASTRUCTURE SETUP
-- Creates tracking tables and backup mechanisms
-- ============================================

-- Step 1: Create migration tracking table
CREATE TABLE IF NOT EXISTS migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  migration_status VARCHAR CHECK (migration_status IN ('pending', 'success', 'failed', 'rolled_back')),
  legacy_debit_account_id UUID,
  legacy_credit_account_id UUID,
  legacy_amount NUMERIC(15,2),
  created_lines_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  rolled_back_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_migration_log_tx_id ON migration_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_migration_log_status ON migration_log(migration_status);
CREATE INDEX IF NOT EXISTS idx_migration_log_created_at ON migration_log(created_at);

-- Step 2: Log initial state for all legacy transactions
INSERT INTO migration_log (transaction_id, migration_status, legacy_debit_account_id, legacy_credit_account_id, legacy_amount) 
SELECT 
  id, 
  'pending',
  debit_account_id,
  credit_account_id,
  amount
FROM transactions 
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM transaction_lines 
    WHERE transaction_id = transactions.id
  )
ON CONFLICT DO NOTHING;

-- Step 3: Create backup table (CRITICAL)
DROP TABLE IF EXISTS transactions_legacy_backup CASCADE;

CREATE TABLE transactions_legacy_backup AS
SELECT 
  *,
  NOW() as backup_timestamp
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL;

-- Add primary key to backup
ALTER TABLE transactions_legacy_backup 
ADD PRIMARY KEY (id);

-- Step 4: Create verification view
CREATE OR REPLACE VIEW v_migration_status AS
SELECT 
  ml.migration_status,
  COUNT(*) as transaction_count,
  SUM(ml.legacy_amount) as total_amount,
  MIN(ml.created_at) as first_migration,
  MAX(ml.created_at) as last_migration
FROM migration_log ml
GROUP BY ml.migration_status;

-- Step 5: Verify backup integrity
DO $$
DECLARE
  v_backup_count INTEGER;
  v_source_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_backup_count FROM transactions_legacy_backup;
  SELECT COUNT(*) INTO v_source_count FROM transactions 
  WHERE debit_account_id IS NOT NULL 
    AND credit_account_id IS NOT NULL 
    AND amount IS NOT NULL;
  
  RAISE NOTICE 'Backup created: % rows backed up from % source rows', v_backup_count, v_source_count;
  
  IF v_backup_count = 0 AND v_source_count > 0 THEN
    RAISE EXCEPTION 'BACKUP FAILED: No rows backed up but source has % rows', v_source_count;
  END IF;
END $$;

-- Step 6: Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE ON migration_log TO authenticated;
-- GRANT SELECT ON transactions_legacy_backup TO authenticated;
-- GRANT SELECT ON v_migration_status TO authenticated;

COMMENT ON TABLE migration_log IS 'Tracks migration progress for legacy transactions';
COMMENT ON TABLE transactions_legacy_backup IS 'CRITICAL: Full backup of legacy transactions before migration';
COMMENT ON VIEW v_migration_status IS 'Summary view of migration progress';
