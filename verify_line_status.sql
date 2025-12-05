-- Check if test lines have line_status set
SELECT 
  id,
  line_no,
  line_status,
  transaction_id
FROM transaction_lines
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE entry_number LIKE 'TEST-%'
);

-- If line_status is NULL, update it
UPDATE transaction_lines
SET line_status = 'pending'
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE entry_number LIKE 'TEST-%'
)
AND line_status IS NULL;

-- Verify again
SELECT 
  id,
  line_no,
  line_status,
  transaction_id
FROM transaction_lines
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE entry_number LIKE 'TEST-%'
);
