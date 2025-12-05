-- Debug query to check why no data is returned
-- Run each query separately to diagnose

-- 1. Check if transactions exist
SELECT COUNT(*) as total_transactions FROM public.transactions;

-- 2. Check if transaction_lines exist
SELECT COUNT(*) as total_lines FROM public.transaction_lines;

-- 3. Check transactions_enriched_v2 view exists and has data
SELECT COUNT(*) as enriched_v2_count FROM public.transactions_enriched_v2;

-- 4. Sample from transactions_enriched_v2
SELECT transaction_id, entry_number, entry_date, amount 
FROM public.transactions_enriched_v2 
LIMIT 5;

-- 5. Check transactions with their line counts
SELECT 
  t.id,
  t.entry_number,
  t.entry_date,
  t.is_posted,
  t.approval_status,
  (SELECT COUNT(*) FROM public.transaction_lines tl WHERE tl.transaction_id = t.id) as line_count
FROM public.transactions t
ORDER BY t.entry_date DESC
LIMIT 10;

-- 6. Test the RPC directly with minimal filters
SELECT * FROM list_transactions_enriched_rows(
  'all',    -- p_scope
  false,    -- p_pending_only
  null,     -- p_search
  null,     -- p_date_from
  null,     -- p_date_to
  null,     -- p_amount_from
  null,     -- p_amount_to
  null,     -- p_debit_account_id
  null,     -- p_credit_account_id
  null,     -- p_project_id
  null,     -- p_org_id
  null,     -- p_classification_id
  null,     -- p_sub_tree_id
  null,     -- p_work_item_id
  null,     -- p_analysis_work_item_id
  null,     -- p_cost_center_id
  null,     -- p_approval_status
  null,     -- p_created_by
  1,        -- p_page
  20        -- p_page_size
);

-- 7. Simple test - just get transaction IDs that have lines
SELECT DISTINCT t.id 
FROM public.transactions t
JOIN public.transaction_lines tl ON tl.transaction_id = t.id
LIMIT 10;
