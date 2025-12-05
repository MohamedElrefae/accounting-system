BEGIN;

-- Create a test transaction with draft lines
WITH org_data AS (
  SELECT id FROM organizations LIMIT 1
),
new_tx AS (
  INSERT INTO transactions (
    org_id,
    entry_number,
    entry_date,
    description,
    status,
    approval_method,
    created_by
  )
  SELECT 
    org_data.id,
    'TEST-' || to_char(NOW(), 'YYYYMMDDHH24MISS'),
    CURRENT_DATE,
    'Test transaction for line approvals',
    'draft',
    'line_based',
    auth.uid()
  FROM org_data
  RETURNING id
)
-- Create draft lines
INSERT INTO transaction_lines (
  transaction_id,
  line_no,
  account_id,
  debit_amount,
  credit_amount,
  description,
  line_status,
  org_id
)
SELECT 
  new_tx.id,
  1,
  (SELECT id FROM accounts LIMIT 1),
  1000,
  0,
  'Test debit line',
  'draft',
  (SELECT id FROM organizations LIMIT 1)
FROM new_tx
UNION ALL
SELECT 
  new_tx.id,
  2,
  (SELECT id FROM accounts OFFSET 1 LIMIT 1),
  0,
  1000,
  'Test credit line',
  'draft',
  (SELECT id FROM organizations LIMIT 1)
FROM new_tx;

-- Submit lines for approval
WITH tx AS (
  SELECT id FROM transactions 
  WHERE entry_number LIKE 'TEST-%'
  ORDER BY created_at DESC LIMIT 1
)
UPDATE transaction_lines
SET 
  line_status = 'pending',
  submitted_for_approval_at = NOW(),
  submitted_by = auth.uid(),
  assigned_approver_id = auth.uid(),
  approval_priority = 'normal'
WHERE transaction_id = (SELECT id FROM tx)
  AND line_status = 'draft';

-- Update transaction status
WITH tx AS (
  SELECT id FROM transactions 
  WHERE entry_number LIKE 'TEST-%'
  ORDER BY created_at DESC LIMIT 1
)
UPDATE transactions
SET 
  status = 'pending',
  approval_method = 'line_based',
  lines_total_count = 2,
  lines_approved_count = 0,
  all_lines_approved = FALSE
WHERE id = (SELECT id FROM tx);

COMMIT;

-- Verify
SELECT COUNT(*) as pending_lines FROM transaction_lines WHERE line_status = 'pending';
