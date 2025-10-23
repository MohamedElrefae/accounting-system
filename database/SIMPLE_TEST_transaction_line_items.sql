-- ================================================================
-- SIMPLE TEST: Transaction Line Items (No Complex RAISE)
-- ================================================================

BEGIN;

-- Find or create a test transaction
DO $$
DECLARE
  v_transaction_line_id UUID;
  v_org_id UUID := 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::UUID;
  v_debit_account_id UUID;
  v_credit_account_id UUID;
BEGIN
  -- Find existing transaction
  SELECT id INTO v_transaction_line_id 
  FROM public.transactions 
  WHERE org_id = v_org_id 
  LIMIT 1;

  -- If no transaction exists, create one
  IF v_transaction_line_id IS NULL THEN
    SELECT id INTO v_debit_account_id 
    FROM public.accounts WHERE org_id = v_org_id LIMIT 1;
    
    SELECT id INTO v_credit_account_id 
    FROM public.accounts WHERE org_id = v_org_id LIMIT 1;
    
    INSERT INTO public.transactions (org_id, entry_number, entry_date, description, amount, debit_account_id, credit_account_id)
    VALUES (v_org_id, 'TEST-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS'), NOW(), 'Test transaction for line items', 0, v_debit_account_id, v_credit_account_id)
    RETURNING id INTO v_transaction_line_id;
  END IF;

  -- TEST 1: Insert first line item (100% quantity)
  -- Note: total_amount is GENERATED ALWAYS (calculated automatically)
  INSERT INTO public.transaction_line_items (
    transaction_line_id, line_number, item_name, item_name_ar, quantity, percentage, unit_price, unit_of_measure, org_id
  )
  VALUES (v_transaction_line_id, 1, 'Test Material', 'مادة تجريبية', 100, 100.00, 50.00, 'piece', v_org_id);

  -- TEST 2: Insert second line item (90% quantity = 10% discount)
  -- Note: total_amount is GENERATED ALWAYS (calculated automatically)
  INSERT INTO public.transaction_line_items (
    transaction_line_id, line_number, item_name, item_name_ar, quantity, percentage, unit_price, unit_of_measure, org_id
  )
  VALUES (v_transaction_line_id, 2, 'Discounted Item', 'منتج مخفف', 50, 90.00, 100.00, 'piece', v_org_id);

END $$;

-- Display results
SELECT '=== Transaction Summary ===' as heading;
SELECT 
  id,
  entry_number,
  amount as original_amount,
  line_items_total,
  line_items_count,
  has_line_items
FROM public.transactions
WHERE entry_number LIKE 'TEST-%'
ORDER BY created_at DESC
LIMIT 1;

SELECT '=== Line Items ===' as heading;
SELECT 
  line_number,
  item_name,
  item_name_ar,
  quantity,
  percentage,
  unit_price,
  total_amount
FROM public.transaction_line_items
WHERE transaction_line_id IN (
  SELECT id FROM public.transactions 
  WHERE entry_number LIKE 'TEST-%'
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY line_number;

SELECT '=== Expected Results ===' as heading;
SELECT 
  'Line 1: 100 × 100% × 50 = 5000.00' as calculation_1,
  'Line 2: 50 × 90% × 100 = 4500.00' as calculation_2,
  'Total: 9500.00' as total_expected;

ROLLBACK;
