-- 073: Update enriched transactions to include line-level approval status
-- This syncs the enriched view with the line-level approval system
-- Approval status filter now uses computed line-level status

-- First ensure line_status column exists on transaction_lines
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'transaction_lines' 
      AND column_name = 'line_status'
  ) THEN
    ALTER TABLE public.transaction_lines ADD COLUMN line_status VARCHAR(20) DEFAULT 'draft';
  END IF;
END $$;

-- Drop the existing function (return type is changing)
DROP FUNCTION IF EXISTS public.list_transactions_enriched_rows(text,boolean,text,date,date,numeric,numeric,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,uuid,integer,integer);

-- Recreate the function with line approval counts
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
  total_count bigint,
  lines_total_count integer,
  lines_approved_count integer,
  computed_approval_status text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_from int := GREATEST((COALESCE(p_page,1)-1)*COALESCE(p_page_size,20),0);
  v_size int := COALESCE(p_page_size,20);
BEGIN
  IF v_size <= 0 THEN v_size := 20; END IF;

  RETURN QUERY
  WITH base_eligible AS (
    SELECT t.id, t.entry_date, t.created_at, t.is_posted, t.approval_status
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
  -- Calculate line-level approval status from transaction_lines.line_status
  line_approval AS (
    SELECT 
      e.id AS tx_id,
      COUNT(tl.id)::integer AS lines_total,
      COUNT(CASE WHEN COALESCE(tl.line_status, 'draft') = 'approved' THEN 1 END)::integer AS lines_approved,
      COUNT(CASE WHEN COALESCE(tl.line_status, 'draft') = 'rejected' THEN 1 END)::integer AS lines_rejected,
      COUNT(CASE WHEN COALESCE(tl.line_status, 'draft') = 'pending' THEN 1 END)::integer AS lines_pending
    FROM base_eligible e
    LEFT JOIN public.transaction_lines tl ON tl.transaction_id = e.id
    GROUP BY e.id
  ),
  agg AS (
    SELECT e.id AS tx_id, e.entry_date, e.created_at, e.is_posted, e.approval_status,
           GREATEST(COALESCE(SUM(tl.debit_amount),0), COALESCE(SUM(tl.credit_amount),0)) AS amt,
           COALESCE(la.lines_total, 0) AS lines_total,
           COALESCE(la.lines_approved, 0) AS lines_approved,
           COALESCE(la.lines_rejected, 0) AS lines_rejected,
           COALESCE(la.lines_pending, 0) AS lines_pending,
           -- Compute effective approval status based on line-level approvals
           CASE
             WHEN e.is_posted THEN 'posted'
             WHEN COALESCE(la.lines_total, 0) > 0 AND COALESCE(la.lines_approved, 0) = COALESCE(la.lines_total, 0) THEN 'approved'
             WHEN COALESCE(la.lines_rejected, 0) > 0 THEN 'requires_revision'
             WHEN COALESCE(la.lines_pending, 0) > 0 THEN 'pending'
             WHEN e.approval_status = 'submitted' THEN 'submitted'
             ELSE COALESCE(e.approval_status, 'draft')
           END AS computed_status
    FROM base_eligible e
    LEFT JOIN public.transaction_lines tl ON tl.transaction_id = e.id
    LEFT JOIN line_approval la ON la.tx_id = e.id
    GROUP BY e.id, e.entry_date, e.created_at, e.is_posted, e.approval_status, la.lines_total, la.lines_approved, la.lines_rejected, la.lines_pending
    HAVING (p_amount_from IS NULL OR GREATEST(COALESCE(SUM(tl.debit_amount),0), COALESCE(SUM(tl.credit_amount),0)) >= p_amount_from)
       AND (p_amount_to IS NULL OR GREATEST(COALESCE(SUM(tl.debit_amount),0), COALESCE(SUM(tl.credit_amount),0)) <= p_amount_to)
  ),
  -- Apply approval status filter on computed status
  filtered AS (
    SELECT a.*
    FROM agg a
    WHERE p_approval_status IS NULL
       OR a.computed_status = p_approval_status
       OR (p_approval_status = 'revision_requested' AND a.computed_status = 'requires_revision')
  ),
  ordered AS (
    SELECT f.tx_id,
           f.entry_date,
           f.created_at,
           f.lines_total,
           f.lines_approved,
           f.computed_status,
           ROW_NUMBER() OVER (ORDER BY f.entry_date DESC, f.created_at DESC) AS rn,
           COUNT(*) OVER () AS total_count_i
    FROM filtered f
  ),
  paged AS (
    SELECT tx_id, total_count_i, lines_total, lines_approved, computed_status 
    FROM ordered 
    WHERE rn > v_from AND rn <= v_from + v_size
  )
  SELECT 
    tx_id AS id, 
    total_count_i AS total_count,
    lines_total AS lines_total_count,
    lines_approved AS lines_approved_count,
    computed_status AS computed_approval_status
  FROM paged;
END$$;

COMMENT ON FUNCTION public.list_transactions_enriched_rows IS 'Returns paginated transaction ids with line-level approval counts and computed approval status.';

-- Verification query
-- SELECT * FROM list_transactions_enriched_rows('all', false, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 1, 20);
