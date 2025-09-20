-- Check current transaction_line_items table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transaction_line_items' 
ORDER BY ordinal_position;

-- Check existing indexes on transaction_line_items
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'transaction_line_items';

-- Check if any functions exist for transaction line items
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%transaction%line%item%' OR routine_name LIKE '%line_item%';

-- Check existing views related to transaction line items
SELECT table_name, view_definition 
FROM information_schema.views 
WHERE table_name LIKE '%transaction%line%item%' OR table_name LIKE '%line_item%';

-- Sample existing data structure
SELECT 
  id, transaction_id, org_id, line_number, item_code, item_name, item_name_ar,
  quantity, unit_price, total_amount, analysis_work_item_id, sub_tree_id, line_item_id
FROM transaction_line_items 
LIMIT 5;

-- Check if there are any existing hierarchical patterns in item_code
SELECT DISTINCT 
  item_code,
  CASE 
    WHEN item_code ~ '^[0-9]+$' THEN 'numeric'
    WHEN item_code ~ '^[0-9]+-[0-9]+' THEN 'dash'
    ELSE 'other'
  END as pattern_type
FROM transaction_line_items 
WHERE item_code IS NOT NULL
ORDER BY item_code
LIMIT 20;