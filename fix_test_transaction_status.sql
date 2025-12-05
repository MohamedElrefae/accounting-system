-- Fix test transaction status to 'pending' so it shows in pending mode
UPDATE transactions
SET 
  status = 'pending',
  approval_method = 'line_based',
  lines_total_count = 2,
  lines_approved_count = 0,
  all_lines_approved = FALSE
WHERE entry_number LIKE 'TEST-%'
  AND status = 'draft';

-- Verify
SELECT 
  entry_number,
  status,
  approval_method,
  lines_total_count,
  lines_approved_count
FROM transactions
WHERE entry_number LIKE 'TEST-%';
