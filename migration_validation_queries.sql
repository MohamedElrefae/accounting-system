-- ============================================
-- POST-MIGRATION VALIDATION QUERIES
-- Run these after migration to verify data integrity
-- ============================================

-- Check 1: All legacy transactions now have lines
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS: All legacy transactions migrated'
    ELSE '✗ FAIL: ' || COUNT(*)::TEXT || ' legacy transactions without lines'
  END as check_1_result
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM transaction_lines WHERE transaction_id = transactions.id);

-- Check 2: All lines have balanced transactions
SELECT 
  t.id, 
  t.entry_number,
  SUM(CASE WHEN tl.debit_amount > 0 THEN tl.debit_amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN tl.credit_amount > 0 THEN tl.credit_amount ELSE 0 END) as total_credits,
  ABS(SUM(CASE WHEN tl.debit_amount > 0 THEN tl.debit_amount ELSE 0 END) - 
      SUM(CASE WHEN tl.credit_amount > 0 THEN tl.credit_amount ELSE 0 END)) as difference
FROM transactions t
INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
GROUP BY t.id, t.entry_number
HAVING ABS(SUM(CASE WHEN tl.debit_amount > 0 THEN tl.debit_amount ELSE 0 END) - 
           SUM(CASE WHEN tl.credit_amount > 0 THEN tl.credit_amount ELSE 0 END)) > 0.01
LIMIT 10;

-- Check 3: XOR validation (no lines with both debit and credit)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS: No XOR violations'
    ELSE '✗ FAIL: ' || COUNT(*)::TEXT || ' lines with both debit and credit'
  END as check_3_result,
  COUNT(*) as violation_count
FROM transaction_lines
WHERE debit_amount > 0 AND credit_amount > 0;

-- Check 4: Aggregates updated correctly
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS: All aggregates correct'
    ELSE '✗ FAIL: ' || COUNT(*)::TEXT || ' transactions with incorrect aggregates'
  END as check_4_result,
  COUNT(*) as mismatch_count
FROM transactions t
WHERE line_items_count != (SELECT COUNT(*) FROM transaction_lines WHERE transaction_id = t.id)
  OR ABS(total_debits - (SELECT COALESCE(SUM(debit_amount), 0) FROM transaction_lines WHERE transaction_id = t.id)) > 0.01
  OR ABS(total_credits - (SELECT COALESCE(SUM(credit_amount), 0) FROM transaction_lines WHERE transaction_id = t.id)) > 0.01;

-- Check 5: Dimension preservation (sample check)
SELECT 
  t.id,
  t.entry_number,
  COUNT(DISTINCT tl.cost_center_id) as cost_centers,
  COUNT(DISTINCT tl.work_item_id) as work_items,
  COUNT(DISTINCT tl.classification_id) as classifications,
  COUNT(*) as line_count
FROM transactions t
INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
GROUP BY t.id, t.entry_number
LIMIT 10;

-- Check 6: Migration log summary
SELECT 
  migration_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
  SUM(legacy_amount) as total_amount
FROM migration_log
GROUP BY migration_status
ORDER BY count DESC;

-- Check 7: Failed migrations details
SELECT 
  ml.transaction_id,
  t.entry_number,
  ml.error_message,
  ml.legacy_debit_account_id,
  ml.legacy_credit_account_id,
  ml.legacy_amount,
  ml.created_at
FROM migration_log ml
INNER JOIN transactions t ON ml.transaction_id = t.id
WHERE ml.migration_status = 'failed'
ORDER BY ml.created_at DESC
LIMIT 20;

-- FINAL SUMMARY
SELECT 
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM transactions WHERE has_line_items = true) as transactions_with_lines,
  (SELECT COUNT(*) FROM transaction_lines) as total_lines,
  (SELECT COUNT(*) FROM migration_log WHERE migration_status = 'success') as successfully_migrated,
  (SELECT COUNT(*) FROM migration_log WHERE migration_status = 'failed') as failed_migrations,
  (SELECT COUNT(*) FROM migration_log WHERE migration_status = 'pending') as pending_migrations,
  (SELECT COUNT(*) FROM transactions WHERE debit_account_id IS NULL AND credit_account_id IS NULL AND amount IS NULL) as fully_migrated_count;

-- Check 8: Verify backup integrity
SELECT 
  'Backup Verification' as check_name,
  (SELECT COUNT(*) FROM transactions_legacy_backup) as backup_row_count,
  (SELECT MIN(backup_timestamp) FROM transactions_legacy_backup) as backup_created_at,
  (SELECT SUM(amount) FROM transactions_legacy_backup) as backup_total_amount;

-- Check 9: Compare before/after totals
SELECT 
  'Total Amount Comparison' as check_name,
  (SELECT SUM(amount) FROM transactions_legacy_backup) as backup_total,
  (SELECT SUM(total_debits) FROM transactions WHERE has_line_items = true) as migrated_debits_total,
  (SELECT SUM(total_credits) FROM transactions WHERE has_line_items = true) as migrated_credits_total;
