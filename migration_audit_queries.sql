-- ============================================
-- PRE-MIGRATION AUDIT QUERIES
-- Execute these to understand current data state
-- ============================================

-- Query 1: Count transactions by model type
SELECT 
  CASE 
    WHEN debit_account_id IS NOT NULL AND credit_account_id IS NOT NULL 
         AND amount IS NOT NULL THEN 'LEGACY_SINGLE_ROW'
    WHEN has_line_items = true THEN 'NEW_MULTI_LINE'
    ELSE 'OTHER'
  END as model_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM transactions
GROUP BY model_type
ORDER BY count DESC;

-- Query 2: Identify mixed-model transactions (legacy + lines already exist)
SELECT 
  t.id, 
  t.entry_number, 
  t.debit_account_id,
  t.credit_account_id,
  t.amount,
  COUNT(tl.id) as existing_line_count
FROM transactions t
LEFT JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.debit_account_id IS NOT NULL 
  AND t.credit_account_id IS NOT NULL 
  AND t.amount IS NOT NULL
GROUP BY t.id, t.entry_number, t.debit_account_id, t.credit_account_id, t.amount
HAVING COUNT(tl.id) > 0;

-- Query 3: Identify orphaned lines (lines with no header account refs)
SELECT 
  t.id, 
  t.entry_number,
  t.has_line_items,
  COUNT(tl.id) as line_count
FROM transactions t
INNER JOIN transaction_lines tl ON t.id = tl.transaction_id
WHERE t.debit_account_id IS NULL 
  AND t.credit_account_id IS NULL 
  AND t.amount IS NULL
GROUP BY t.id, t.entry_number, t.has_line_items
LIMIT 10;

-- Query 4: Detect data quality issues
SELECT 
  id, 
  entry_number,
  debit_account_id,
  credit_account_id,
  amount,
  CASE 
    WHEN debit_account_id = credit_account_id THEN 'SAME_ACCOUNTS'
    WHEN amount <= 0 THEN 'INVALID_AMOUNT'
    WHEN debit_account_id IS NULL OR credit_account_id IS NULL THEN 'NULL_ACCOUNT'
    ELSE 'UNKNOWN_ISSUE'
  END as issue
FROM transactions
WHERE debit_account_id IS NOT NULL
  AND (
    debit_account_id = credit_account_id 
    OR amount <= 0 
    OR debit_account_id IS NULL 
    OR credit_account_id IS NULL
  );

-- Query 5: Summary statistics
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN debit_account_id IS NOT NULL THEN 1 END) as legacy_count,
  COUNT(CASE WHEN has_line_items = true THEN 1 END) as multi_line_count,
  COUNT(CASE WHEN is_posted = true THEN 1 END) as posted_count,
  MIN(created_at) as oldest_transaction,
  MAX(created_at) as newest_transaction
FROM transactions;

-- Query 6: Check for transactions needing migration
SELECT 
  COUNT(*) as needs_migration_count,
  SUM(amount) as total_amount_to_migrate
FROM transactions
WHERE debit_account_id IS NOT NULL 
  AND credit_account_id IS NOT NULL 
  AND amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM transaction_lines 
    WHERE transaction_id = transactions.id
  );
