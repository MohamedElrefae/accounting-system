-- ============================================
-- MIGRATION FUNCTIONS
-- Validation and migration logic
-- ============================================

-- Function 1: Validation
CREATE OR REPLACE FUNCTION validate_migration_readiness()
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
  -- Check 1: Legacy fields exist
  RETURN QUERY
  SELECT 
    'Legacy fields exist'::TEXT,
    CASE WHEN EXISTS(
      SELECT 1 FROM transactions 
      WHERE debit_account_id IS NOT NULL 
        AND credit_account_id IS NOT NULL
        AND amount IS NOT NULL
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    (SELECT COUNT(*)::TEXT || ' transactions with legacy fields' 
     FROM transactions 
     WHERE debit_account_id IS NOT NULL)::TEXT;

  -- Check 2: Accounts referential integrity
  RETURN QUERY
  SELECT 
    'Accounts referential integrity'::TEXT,
    CASE WHEN NOT EXISTS(
      SELECT 1 FROM transactions t
      WHERE (t.debit_account_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM accounts WHERE id = t.debit_account_id
      ))
      OR (t.credit_account_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM accounts WHERE id = t.credit_account_id
      ))
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'All account references valid'::TEXT;

  -- Check 3: No existing lines for legacy transactions
  RETURN QUERY
  SELECT 
    'No pre-existing lines conflict'::TEXT,
    CASE WHEN NOT EXISTS(
      SELECT 1 FROM transactions t
      WHERE debit_account_id IS NOT NULL 
        AND EXISTS(SELECT 1 FROM transaction_lines WHERE transaction_id = t.id)
    ) THEN 'PASS' ELSE 'WARN' END::TEXT,
    (SELECT COUNT(*)::TEXT || ' legacy transactions already have lines'
     FROM transactions t
     WHERE debit_account_id IS NOT NULL 
       AND EXISTS(SELECT 1 FROM transaction_lines WHERE transaction_id = t.id))::TEXT;

  -- Check 4: Backup table exists
  RETURN QUERY
  SELECT 
    'Backup table exists'::TEXT,
    CASE WHEN EXISTS(
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'transactions_legacy_backup'
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Backup table created'::TEXT;

  -- Check 5: Migration log ready
  RETURN QUERY
  SELECT 
    'Migration log ready'::TEXT,
    CASE WHEN EXISTS(
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'migration_log'
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    (SELECT COUNT(*)::TEXT || ' transactions logged as pending'
     FROM migration_log WHERE migration_status = 'pending')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Migrate Single Transaction
CREATE OR REPLACE FUNCTION migrate_legacy_transaction(
  p_transaction_id UUID
)
RETURNS TABLE(
  status TEXT,
  lines_created INTEGER,
  error_msg TEXT
) AS $$
DECLARE
  v_debit_account_id UUID;
  v_credit_account_id UUID;
  v_amount NUMERIC;
  v_description TEXT;
  v_org_id UUID;
  v_project_id UUID;
  v_cost_center_id UUID;
  v_work_item_id UUID;
  v_analysis_work_item_id UUID;
  v_classification_id UUID;
  v_sub_tree_id UUID;
  v_line_count INTEGER := 0;
  v_error TEXT;
BEGIN
  -- Fetch legacy transaction data
  SELECT 
    debit_account_id, credit_account_id, amount, description,
    org_id, project_id, cost_center_id, work_item_id, 
    analysis_work_item_id, classification_id, sub_tree_id
  INTO 
    v_debit_account_id, v_credit_account_id, v_amount, v_description,
    v_org_id, v_project_id, v_cost_center_id, v_work_item_id,
    v_analysis_work_item_id, v_classification_id, v_sub_tree_id
  FROM transactions
  WHERE id = p_transaction_id;

  -- Validation
  IF v_debit_account_id IS NULL OR v_credit_account_id IS NULL OR v_amount IS NULL THEN
    RETURN QUERY SELECT 'SKIP'::TEXT, 0::INTEGER, 'Not a legacy transaction'::TEXT;
    RETURN;
  END IF;

  IF v_debit_account_id = v_credit_account_id THEN
    UPDATE migration_log SET
      migration_status = 'failed',
      error_message = 'Same debit and credit accounts'
    WHERE transaction_id = p_transaction_id;
    RETURN QUERY SELECT 'FAILED'::TEXT, 0::INTEGER, 'Same debit and credit accounts'::TEXT;
    RETURN;
  END IF;

  IF v_amount <= 0 THEN
    UPDATE migration_log SET
      migration_status = 'failed',
      error_message = 'Invalid amount'
    WHERE transaction_id = p_transaction_id;
    RETURN QUERY SELECT 'FAILED'::TEXT, 0::INTEGER, 'Invalid amount'::TEXT;
    RETURN;
  END IF;

  -- Check if lines already exist
  IF EXISTS(SELECT 1 FROM transaction_lines WHERE transaction_id = p_transaction_id) THEN
    RETURN QUERY SELECT 'SKIP'::TEXT, 0::INTEGER, 'Lines already exist'::TEXT;
    RETURN;
  END IF;

  BEGIN
    -- Insert debit line
    INSERT INTO transaction_lines (
      transaction_id, line_no, account_id,
      debit_amount, credit_amount, description,
      org_id, project_id, cost_center_id, work_item_id,
      analysis_work_item_id, classification_id, sub_tree_id,
      line_status
    ) VALUES (
      p_transaction_id, 1, v_debit_account_id,
      v_amount, 0, COALESCE(v_description, 'Migrated - Debit line'),
      v_org_id, v_project_id, v_cost_center_id, v_work_item_id,
      v_analysis_work_item_id, v_classification_id, v_sub_tree_id,
      'draft'
    );
    v_line_count := v_line_count + 1;

    -- Insert credit line
    INSERT INTO transaction_lines (
      transaction_id, line_no, account_id,
      debit_amount, credit_amount, description,
      org_id, project_id, cost_center_id, work_item_id,
      analysis_work_item_id, classification_id, sub_tree_id,
      line_status
    ) VALUES (
      p_transaction_id, 2, v_credit_account_id,
      0, v_amount, COALESCE(v_description, 'Migrated - Credit line'),
      v_org_id, v_project_id, v_cost_center_id, v_work_item_id,
      v_analysis_work_item_id, v_classification_id, v_sub_tree_id,
      'draft'
    );
    v_line_count := v_line_count + 1;

    -- Update transaction header
    UPDATE transactions SET
      has_line_items = true,
      line_items_count = 2,
      total_debits = v_amount,
      total_credits = v_amount,
      debit_account_id = NULL,
      credit_account_id = NULL,
      amount = NULL,
      updated_at = NOW()
    WHERE id = p_transaction_id;

    -- Log success
    UPDATE migration_log SET
      migration_status = 'success',
      created_lines_count = v_line_count
    WHERE transaction_id = p_transaction_id;

    RETURN QUERY SELECT 'SUCCESS'::TEXT, v_line_count::INTEGER, NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    v_error := SQLERRM;
    UPDATE migration_log SET
      migration_status = 'failed',
      error_message = v_error
    WHERE transaction_id = p_transaction_id;
    RETURN QUERY SELECT 'FAILED'::TEXT, 0::INTEGER, v_error::TEXT;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Batch Migration with Progress
CREATE OR REPLACE FUNCTION migrate_all_legacy_transactions(
  p_batch_size INTEGER DEFAULT 100
)
RETURNS TABLE(
  total_processed INTEGER,
  successful INTEGER,
  failed INTEGER,
  skipped INTEGER
) AS $$
DECLARE
  v_tx_id UUID;
  v_result RECORD;
  v_total INTEGER := 0;
  v_success INTEGER := 0;
  v_fail INTEGER := 0;
  v_skip INTEGER := 0;
  v_batch_count INTEGER := 0;
BEGIN
  FOR v_tx_id IN (
    SELECT id FROM transactions
    WHERE debit_account_id IS NOT NULL 
      AND credit_account_id IS NOT NULL 
      AND amount IS NOT NULL
    ORDER BY created_at ASC
  ) LOOP
    SELECT * INTO v_result FROM migrate_legacy_transaction(v_tx_id);
    
    v_total := v_total + 1;
    
    IF v_result.status = 'SUCCESS' THEN
      v_success := v_success + 1;
    ELSIF v_result.status = 'FAILED' THEN
      v_fail := v_fail + 1;
    ELSE
      v_skip := v_skip + 1;
    END IF;
    
    v_batch_count := v_batch_count + 1;
    
    IF v_batch_count >= p_batch_size THEN
      RAISE NOTICE 'Progress: % processed (% success, % failed, % skipped)', 
        v_total, v_success, v_fail, v_skip;
      v_batch_count := 0;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration complete: % total, % success, % failed, % skipped', 
    v_total, v_success, v_fail, v_skip;
  
  RETURN QUERY SELECT v_total, v_success, v_fail, v_skip;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_migration_readiness() IS 'Validates system is ready for migration';
COMMENT ON FUNCTION migrate_legacy_transaction(UUID) IS 'Migrates a single legacy transaction to multi-line format';
COMMENT ON FUNCTION migrate_all_legacy_transactions(INTEGER) IS 'Batch migrates all legacy transactions with progress tracking';
