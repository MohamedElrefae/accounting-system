-- 065: List DISTINCT transaction headers from enriched v2 with filters and exact counts
-- Creates RPC list_transactions_enriched_headers used by UI

CREATE OR REPLACE FUNCTION public.list_transactions_enriched_headers(
  p_scope text DEFAULT 'all',
  p_pending_only boolean DEFAULT false,
  p_search text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_amount_from numeric DEFAULT NULL,
  p_amount_to numeric DEFAULT NULL,
  p_debit_account_id uuid DEFAULT NULL,
  p_credit_account_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_classification_id uuid DEFAULT NULL,
  p_sub_tree_id uuid DEFAULT NULL,
  p_work_item_id uuid DEFAULT NULL,
  p_analysis_work_item_id uuid DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_approval_status text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  entry_number text,
  entry_date date,
  description text,
  reference_number text,
  debit_account_id uuid,
  credit_account_id uuid,
  amount numeric,
  notes text,
  classification_id uuid,
  sub_tree_id uuid,
  work_item_id uuid,
  analysis_work_item_id uuid,
  cost_center_id uuid,
  project_id uuid,
  org_id uuid,
  is_posted boolean,
  approval_status text,
  created_by uuid,
  posted_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from int := GREATEST((COALESCE(p_page,1)-1)*COALESCE(p_page_size,20),0);
  v_size int := COALESCE(p_page_size,20);
  v_total bigint;
BEGIN
  -- Ensure positive page size
  IF v_size <= 0 THEN v_size := 20; END IF;

  RETURN QUERY
  WITH base AS (
    SELECT t.id AS tx_id, t.entry_date, t.created_at
    FROM public.transactions t
    WHERE (p_scope <> 'my' OR (p_created_by IS NOT NULL AND t.created_by = p_created_by))
      AND (NOT p_pending_only OR (t.is_posted = false AND t.approval_status = 'submitted'))
      AND (p_search IS NULL OR t.entry_number ILIKE '%'||p_search||'%' OR t.description ILIKE '%'||p_search||'%' OR t.reference_number ILIKE '%'||p_search||'%' OR t.notes ILIKE '%'||p_search||'%')
      AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
      AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (p_org_id IS NULL OR t.org_id = p_org_id)
      AND (
           p_approval_status IS NULL
           OR (p_approval_status = 'posted' AND t.is_posted = true)
           OR (p_approval_status <> 'posted' AND t.approval_status = p_approval_status)
          )
  ),
  ordered AS (
    SELECT b.tx_id,
           ROW_NUMBER() OVER (ORDER BY b.entry_date DESC, b.created_at DESC) AS rn,
           COUNT(*) OVER () AS total_count_i
    FROM base b
  ),
  paged AS (
    SELECT tx_id, total_count_i
    FROM ordered
    WHERE rn > v_from AND rn <= v_from + v_size
  )
  SELECT 
    t.id,
    t.entry_number,
    t.entry_date,
    t.description,
    t.reference_number,
    NULL::uuid AS debit_account_id,
    NULL::uuid AS credit_account_id,
    (
      SELECT GREATEST(COALESCE(SUM(tl.debit_amount),0), COALESCE(SUM(tl.credit_amount),0))
      FROM public.transaction_lines tl
      WHERE tl.transaction_id = t.id
    ) AS amount,
    t.notes,
    NULL::uuid AS classification_id,
    NULL::uuid AS sub_tree_id,
    NULL::uuid AS work_item_id,
    NULL::uuid AS analysis_work_item_id,
    NULL::uuid AS cost_center_id,
    t.project_id,
    t.org_id,
    t.is_posted,
    t.approval_status,
    t.created_by,
    t.posted_by,
    t.created_at,
    t.updated_at,
    paged.total_count_i AS total_count
  FROM public.transactions t
  JOIN paged ON paged.tx_id = t.id
  ORDER BY t.entry_date DESC, t.created_at DESC;
END$$;

COMMENT ON FUNCTION public.list_transactions_enriched_headers IS 'Returns paginated DISTINCT transaction headers filtered on transactions_enriched_v2, with total_count duplicated per row.';
