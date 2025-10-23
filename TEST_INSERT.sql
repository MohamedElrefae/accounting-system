-- Test insert into transaction_line_items with correct FK to transaction_lines
INSERT INTO public.transaction_line_items (
  transaction_line_id,
  item_code,
  item_name,
  quantity,
  unit_price,
  org_id
) VALUES (
  'e8f83450-225f-4258-a4ef-01af8aa49e37'::uuid,  -- transaction_line_id from results
  'TEST-001',
  'Test Item',
  5.0,
  100.0,
  (SELECT org_id FROM public.transaction_lines LIMIT 1)
);

-- Verify insert succeeded
SELECT 
  id,
  item_code,
  item_name,
  quantity,
  unit_price,
  total_amount,
  transaction_line_id
FROM public.transaction_line_items
WHERE item_code = 'TEST-001'
LIMIT 1;

-- Check if trigger updated transaction totals
SELECT 
  id,
  entry_number,
  line_items_total,
  line_items_count,
  has_line_items
FROM public.transactions
WHERE id = 'b828fe39-0b5c-4045-96aa-2b77032fc62d'::uuid;
