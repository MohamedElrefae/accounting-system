-- ================================================================
-- TEST: Transaction Line Items Insert & Trigger Verification (CORRECTED)
-- Updated for hierarchical structure using sub_tree_id and transaction_line_id
-- ================================================================

BEGIN;

-- Get an existing transaction ID for testing (if any exist)
-- Modify this if you have a specific transaction to use
DO $$
DECLARE
  v_transaction_line_id UUID;
  v_org_id UUID := 'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::UUID;
  v_debit_account_id UUID;
  v_credit_account_id UUID;
  var_has_line_items BOOLEAN;
  var_line_items_count INTEGER;
  var_line_items_total NUMERIC;
BEGIN
  -- Find or create a test transaction
  SELECT id INTO v_transaction_line_id 
  FROM public.transactions 
  WHERE org_id = v_org_id 
  LIMIT 1;

  IF v_transaction_line_id IS NULL THEN
    -- Get account IDs for the org
    SELECT id INTO v_debit_account_id 
    FROM public.accounts 
    WHERE org_id = v_org_id 
    LIMIT 1;
    
    SELECT id INTO v_credit_account_id 
    FROM public.accounts 
    WHERE org_id = v_org_id 
    LIMIT 1;
    
    -- Create a test transaction if none exist
    INSERT INTO public.transactions (
      org_id,
      entry_number,
      entry_date,
      description,
      amount,
      debit_account_id,
      credit_account_id
    )
    VALUES (
      v_org_id,
      'TEST-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS'),
      NOW(),
      'Test transaction for line items',
      0,
      v_debit_account_id,
      v_credit_account_id
    )
    RETURNING id INTO v_transaction_line_id;
  END IF;

  -- Display the transaction being used
  RAISE NOTICE 'Using transaction_line_id: %', v_transaction_line_id;

  -- TEST 1: Insert a single line item
  RAISE NOTICE 'TEST 1: Inserting single line item...';
  INSERT INTO public.transaction_line_items (
    transaction_line_id,
    line_number,
    item_name,
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    unit_of_measure,
    org_id,
    total_amount
  )
  VALUES (
    v_transaction_line_id,
    1,
    'Test Material',
    'مادة تجريبية',
    100,
    100.00,
    50.00,
    'piece',
    v_org_id,
    5000.00  -- 100 × 100% × 50 = 5000
  );
  
  RAISE NOTICE 'TEST 1: Line item inserted successfully!';

  -- TEST 2: Verify trigger updated transaction summary
  RAISE NOTICE 'TEST 2: Verifying transaction summary was updated...';
  SELECT 
    has_line_items,
    line_items_count,
    line_items_total
  FROM public.transactions
  WHERE id = v_transaction_line_id
  INTO
    var_has_line_items,
    var_line_items_count,
    var_line_items_total;

  RAISE NOTICE 'has_line_items: %, line_items_count: %, line_items_total: %', 
    var_has_line_items, var_line_items_count, var_line_items_total;

  -- TEST 3: Insert another line item with percentage discount
  RAISE NOTICE 'TEST 3: Inserting line item with percentage adjustment (90%)...';
  INSERT INTO public.transaction_line_items (
    transaction_line_id,
    line_number,
    item_name,
    item_name_ar,
    quantity,
    percentage,
    unit_price,
    unit_of_measure,
    org_id,
    total_amount
  )
  VALUES (
    v_transaction_line_id,
    2,
    'Discounted Item',
    'منتج مخفف',
    50,
    90.00,  -- 10% discount
    100.00,
    'piece',
    v_org_id,
    4500.00  -- 50 × 90% × 100 = 4500
  );

  RAISE NOTICE 'TEST 3: Second line item inserted!';

  -- TEST 4: Verify updated totals
  RAISE NOTICE 'TEST 4: Verifying updated transaction summary...';
  SELECT 
    has_line_items,
    line_items_count,
    line_items_total
  FROM public.transactions
  WHERE id = v_transaction_line_id
  INTO
    var_has_line_items,
    var_line_items_count,
    var_line_items_total;

  RAISE NOTICE 'has_line_items: %, line_items_count: %, line_items_total: %', 
    var_has_line_items, var_line_items_count, var_line_items_total;

  -- TEST 5: Display final line items
  RAISE NOTICE 'TEST 5: Final line items for transaction %s', v_transaction_line_id::TEXT;
  FOR rec IN
    SELECT 
      line_number,
      item_name,
      quantity,
      percentage,
      unit_price,
      total_amount
    FROM public.transaction_line_items
    WHERE transaction_line_id = v_transaction_line_id
    ORDER BY line_number
  LOOP
    RAISE NOTICE 'Line %s: %s - Qty: %s, Pct: %s, Price: %s, Total: %s',
      rec.line_number::TEXT,
      rec.item_name,
      rec.quantity::TEXT,
      rec.percentage::TEXT,
      rec.unit_price::TEXT,
      rec.total_amount::TEXT;
  END LOOP;

END $$;

-- Display query results
SELECT 'Test transaction summary:' as result_header;
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

SELECT 'Test line items:' as result_header;
SELECT 
  line_number,
  item_name,
  item_name_ar,
  quantity,
  percentage,
  unit_price,
  total_amount,
  sub_tree_id,
  org_id
FROM public.transaction_line_items
WHERE transaction_line_id IN (
  SELECT id FROM public.transactions 
  WHERE entry_number LIKE 'TEST-%'
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY line_number;

ROLLBACK;  -- Use ROLLBACK to clean up test data
