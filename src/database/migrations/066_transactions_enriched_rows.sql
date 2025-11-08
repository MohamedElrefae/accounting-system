-- 066: List enriched rows (from transactions_enriched_v2) with full filters and exact pagination via transaction_ids
-- Returns only transaction ids and total_count; client fetches view rows by ids.

CREATE OR REPLACE FUNCTION public.list_transactions_enriched_rows(
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
  total_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from int := GREATEST((COALESCE(p_page,1)-1)*COALESCE(p_page_size,20),0);
  v_size int := COALESCE(p_page_size,20);
BEGIN
  IF v_size <= 0 THEN v_size := 20; END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT t.id, t.entry_date, t.created_at
    FROM public.transactions t
    WHERE (p_scope <> 'my' OR (p_created_by IS NOT NULL AND t.created_by = p_created_by))
      AND (NOT p_pending_only OR (t.is_posted = false AND t.approval_status = 'submitted'))
      AND (p_search IS NULL OR t.entry_number ILIKE '%'||p_search||'%' OR t.description ILIKE '%'||p_search||'%' OR t.reference_number ILIKE '%'||p_search||'%' OR t.notes ILIKE '%'||p_search||'%')
      AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
      AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
      AND (p_org_id IS NULL OR t.org_id = p_org_id)
      AND (p_classification_id IS NULL OR EXISTS (
            SELECT 1 FROM public.transaction_lines tlcls
            WHERE tlcls.transaction_id = t.id AND tlcls.classification_id = p_classification_id
          ))
      AND (
           p_approval_status IS NULL
           OR (p_approval_status = 'posted' AND t.is_posted = true)
           OR (p_approval_status <> 'posted' AND t.approval_status = p_approval_status)
          )
      AND (
           p_project_id IS NULL
           OR t.project_id = p_project_id
           OR EXISTS (SELECT 1 FROM public.transaction_lines tlp WHERE tlp.transaction_id = t.id AND tlp.project_id = p_project_id)
          )
      AND (p_sub_tree_id IS NULL OR EXISTS (SELECT 1 FROM public.transaction_lines tls WHERE tls.transaction_id = t.id AND tls.sub_tree_id = p_sub_tree_id))
      AND (p_work_item_id IS NULL OR EXISTS (SELECT 1 FROM public.transaction_lines tlw WHERE tlw.transaction_id = t.id AND tlw.work_item_id = p_work_item_id))
      AND (p_analysis_work_item_id IS NULL OR EXISTS (SELECT 1 FROM public.transaction_lines tla WHERE tla.transaction_id = t.id AND tla.analysis_work_item_id = p_analysis_work_item_id))
      AND (p_cost_center_id IS NULL OR EXISTS (SELECT 1 FROM public.transaction_lines tlc WHERE tlc.transaction_id = t.id AND tlc.cost_center_id = p_cost_center_id))
      AND (p_debit_account_id IS NULL OR EXISTS (SELECT 1 FROM public.transaction_lines tld WHERE tld.transaction_id = t.id AND tld.account_id = p_debit_account_id AND tld.debit_amount > 0))
      AND (p_credit_account_id IS NULL OR EXISTS (SELECT 1 FROM public.transaction_lines tlcr WHERE tlcr.transaction_id = t.id AND tlcr.account_id = p_credit_account_id AND tlcr.credit_amount > 0))
  ),
  agg AS (
    SELECT e.id AS tx_id, e.entry_date, e.created_at,
           GREATEST(COALESCE(SUM(tl.debit_amount),0), COALESCE(SUM(tl.credit_amount),0)) AS amt
    FROM eligible e
    JOIN public.transaction_lines tl ON tl.transaction_id = e.id
    GROUP BY e.id, e.entry_date, e.created_at
    HAVING (p_amount_from IS NULL OR GREATEST(COALESCE(SUM(tl.debit_amount),0), COALESCE(SUM(tl.credit_amount),0)) >= p_amount_from)
       AND (p_amount_to IS NULL OR GREATEST(COALESCE(SUM(tl.debit_amount),0), COALESCE(SUM(tl.credit_amount),0)) <= p_amount_to)
  ),
  ordered AS (
    SELECT a.tx_id,
           ROW_NUMBER() OVER (ORDER BY a.entry_date DESC, a.created_at DESC) AS rn,
           COUNT(*) OVER () AS total_count_i
    FROM agg a
  ),
  paged AS (
    SELECT tx_id, total_count_i FROM ordered WHERE rn > v_from AND rn <= v_from + v_size
  )
  SELECT tx_id AS id, total_count_i AS total_count FROM paged;
END$$;

COMMENT ON FUNCTION public.list_transactions_enriched_rows IS 'Returns paginated transaction ids filtered across headers and lines, with exact total_count.';
