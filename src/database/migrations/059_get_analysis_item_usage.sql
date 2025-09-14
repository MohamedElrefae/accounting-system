-- 059_get_analysis_item_usage.sql
-- RPC to return Analysis Work Item usage aggregated by transactions
-- Matches frontend service: fetchAnalysisItemUsage

BEGIN;

DROP FUNCTION IF EXISTS public.get_analysis_item_usage(uuid, uuid, text, boolean, date, date);

CREATE OR REPLACE FUNCTION public.get_analysis_item_usage(
  p_org_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_only_with_tx boolean DEFAULT false,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS TABLE (
  org_id uuid,
  analysis_work_item_id uuid,
  code text,
  name text,
  name_ar text,
  tx_count bigint,
  total_debit_amount numeric,
  total_credit_amount numeric,
  net_amount numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sec AS (
    SELECT
      COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'role'), '') AS role,
      auth.uid() AS uid,
      (to_regclass('public.org_memberships') IS NOT NULL) AS has_org_memberships
  ),
  allowed_orgs AS (
    SELECT o.id AS org_id
    FROM organizations o, sec s
    WHERE (p_org_id IS NULL OR o.id = p_org_id)
      AND (
        s.role = 'service_role'
        OR s.uid IS NOT NULL AND (
          NOT s.has_org_memberships OR EXISTS (
            SELECT 1 FROM public.org_memberships m
            WHERE m.user_id = s.uid AND m.org_id = o.id
          )
        )
      )
  ),
  base AS (
    SELECT
      t.org_id,
      t.analysis_work_item_id,
      t.entry_date,
      t.project_id,
      t.debit_account_id,
      t.credit_account_id,
      t.amount::numeric AS amount
    FROM public.transactions t
    WHERE t.analysis_work_item_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM allowed_orgs ao WHERE ao.org_id = t.org_id)
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
      AND (p_date_to   IS NULL OR t.entry_date <= p_date_to)
  ),
  agg AS (
    SELECT
      b.org_id,
      b.analysis_work_item_id,
      COUNT(*)::bigint AS tx_count,
      SUM(CASE WHEN b.debit_account_id IS NOT NULL THEN b.amount ELSE 0 END)::numeric AS total_debit_amount,
      SUM(CASE WHEN b.credit_account_id IS NOT NULL THEN b.amount ELSE 0 END)::numeric AS total_credit_amount,
      SUM(CASE WHEN b.debit_account_id IS NOT NULL THEN b.amount WHEN b.credit_account_id IS NOT NULL THEN -b.amount ELSE 0 END)::numeric AS net_amount
    FROM base b
    GROUP BY b.org_id, b.analysis_work_item_id
  ),
  joined AS (
    SELECT
      a.org_id,
      a.analysis_work_item_id,
      awi.code,
      awi.name,
      awi.name_ar,
      a.tx_count,
      COALESCE(a.total_debit_amount, 0) AS total_debit_amount,
      COALESCE(a.total_credit_amount, 0) AS total_credit_amount,
      COALESCE(a.net_amount, 0) AS net_amount
    FROM agg a
    JOIN public.analysis_work_items awi ON awi.id = a.analysis_work_item_id
    WHERE (p_search IS NULL OR p_search = ''
      OR awi.code ILIKE ('%'||p_search||'%')
      OR awi.name ILIKE ('%'||p_search||'%')
      OR awi.name_ar ILIKE ('%'||p_search||'%'))
  )
  SELECT *
  FROM joined
  WHERE (NOT p_only_with_tx) OR (tx_count > 0)
  ORDER BY code;
$$;

GRANT EXECUTE ON FUNCTION public.get_analysis_item_usage(
  uuid, uuid, text, boolean, date, date
) TO anon, authenticated, service_role;

COMMIT;
