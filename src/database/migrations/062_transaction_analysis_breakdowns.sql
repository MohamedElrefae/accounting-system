-- 062_transaction_analysis_breakdowns.sql
-- Provide simple per-transaction breakdowns using existing single-row dimensions
-- If you later add true line items, you can replace logic to aggregate real rows.

BEGIN;

-- By Analysis Work Item
CREATE OR REPLACE FUNCTION public.get_transaction_analysis_by_item(
  p_transaction_id uuid
)
RETURNS TABLE (
  analysis_work_item_id uuid,
  analysis_work_item_code text,
  analysis_work_item_name text,
  amount numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT t.id, t.analysis_work_item_id, v.transaction_amount, v.line_items_total
    FROM public.transactions t
    LEFT JOIN public.v_cost_analysis_summary v ON v.transaction_id = t.id
    WHERE t.id = p_transaction_id
  )
  SELECT 
    a.id,
    a.code,
    a.name,
    COALESCE(NULLIF(b.line_items_total, 0), b.transaction_amount) AS amount
  FROM base b
  JOIN public.analysis_work_items a ON a.id = b.analysis_work_item_id
  WHERE b.analysis_work_item_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_transaction_analysis_by_item(uuid) TO anon, authenticated, service_role;

-- By Cost Center
CREATE OR REPLACE FUNCTION public.get_transaction_analysis_by_cost_center(
  p_transaction_id uuid
)
RETURNS TABLE (
  cost_center_id uuid,
  cost_center_code text,
  cost_center_name text,
  amount numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT t.id, t.cost_center_id, v.transaction_amount, v.line_items_total
    FROM public.transactions t
    LEFT JOIN public.v_cost_analysis_summary v ON v.transaction_id = t.id
    WHERE t.id = p_transaction_id
  )
  SELECT 
    c.id,
    c.code,
    c.name,
    COALESCE(NULLIF(b.line_items_total, 0), b.transaction_amount) AS amount
  FROM base b
  JOIN public.cost_centers c ON c.id = b.cost_center_id
  WHERE b.cost_center_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_transaction_analysis_by_cost_center(uuid) TO anon, authenticated, service_role;

-- By Expenses Category
CREATE OR REPLACE FUNCTION public.get_transaction_analysis_by_expenses_category(
  p_transaction_id uuid
)
RETURNS TABLE (
  expenses_category_id uuid,
  expenses_category_code text,
  expenses_category_name text,
  amount numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT t.id, t.expenses_category_id, v.transaction_amount, v.line_items_total
    FROM public.transactions t
    LEFT JOIN public.v_cost_analysis_summary v ON v.transaction_id = t.id
    WHERE t.id = p_transaction_id
  )
  SELECT 
    e.id,
    e.code,
    e.description,
    COALESCE(NULLIF(b.line_items_total, 0), b.transaction_amount) AS amount
  FROM base b
  JOIN public.expenses_categories e ON e.id = b.expenses_category_id
  WHERE b.expenses_category_id IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_transaction_analysis_by_expenses_category(uuid) TO anon, authenticated, service_role;

COMMIT;
