-- 054_gl_summary_extra_filters.sql
-- Extend GL summary and totals functions with additional filters for Account Explorer

begin;

-- Drop and recreate get_gl_account_summary with extra filters
DROP FUNCTION IF EXISTS public.get_gl_account_summary(date, date, uuid, uuid, boolean, integer, integer, uuid);

CREATE OR REPLACE FUNCTION public.get_gl_account_summary(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_posted_only boolean DEFAULT true,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL,
  p_classification_id uuid DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_work_item_id uuid DEFAULT NULL,
  p_expenses_category_id uuid DEFAULT NULL,
  p_debit_account_id uuid DEFAULT NULL,
  p_credit_account_id uuid DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name_ar text,
  account_name_en text,
  opening_balance numeric,
  opening_debit numeric,
  opening_credit numeric,
  period_debits numeric,
  period_credits numeric,
  period_net numeric,
  closing_balance numeric,
  closing_debit numeric,
  closing_credit numeric,
  transaction_count bigint,
  total_rows bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tx_expanded AS (
    -- Expand single-line transactions into debit/credit rows with sign and apply filters
    SELECT
      tx.id AS transaction_id,
      tx.entry_date,
      tx.org_id,
      tx.project_id,
      tx.debit_account_id AS account_id,
      tx.amount::numeric AS debit,
      0::numeric AS credit,
      tx.amount::numeric AS signed_amount
    FROM public.transactions tx
    WHERE TRUE
      AND (p_org_id IS NULL OR tx.org_id = p_org_id)
      AND (p_project_id IS NULL OR tx.project_id = p_project_id)
      AND (NOT p_posted_only OR tx.is_posted = TRUE)
      AND (p_classification_id IS NULL OR tx.classification_id = p_classification_id)
      AND (p_cost_center_id IS NULL OR tx.cost_center_id = p_cost_center_id)
      AND (p_work_item_id IS NULL OR (tx.work_item_id = p_work_item_id))
      AND (p_expenses_category_id IS NULL OR (tx.expenses_category_id = p_expenses_category_id))
      AND (p_debit_account_id IS NULL OR tx.debit_account_id = p_debit_account_id)
      AND (p_amount_min IS NULL OR tx.amount >= p_amount_min)
      AND (p_amount_max IS NULL OR tx.amount <= p_amount_max)
    UNION ALL
    SELECT
      tx.id AS transaction_id,
      tx.entry_date,
      tx.org_id,
      tx.project_id,
      tx.credit_account_id AS account_id,
      0::numeric AS debit,
      tx.amount::numeric AS credit,
      -tx.amount::numeric AS signed_amount
    FROM public.transactions tx
    WHERE TRUE
      AND (p_org_id IS NULL OR tx.org_id = p_org_id)
      AND (p_project_id IS NULL OR tx.project_id = p_project_id)
      AND (NOT p_posted_only OR tx.is_posted = TRUE)
      AND (p_classification_id IS NULL OR tx.classification_id = p_classification_id)
      AND (p_cost_center_id IS NULL OR tx.cost_center_id = p_cost_center_id)
      AND (p_work_item_id IS NULL OR (tx.work_item_id = p_work_item_id))
      AND (p_expenses_category_id IS NULL OR (tx.expenses_category_id = p_expenses_category_id))
      AND (p_credit_account_id IS NULL OR tx.credit_account_id = p_credit_account_id)
      AND (p_amount_min IS NULL OR tx.amount >= p_amount_min)
      AND (p_amount_max IS NULL OR tx.amount <= p_amount_max)
  ),
  opening AS (
    SELECT
      t.account_id,
      SUM(t.signed_amount)::numeric AS opening_balance
    FROM tx_expanded t
    WHERE p_date_from IS NOT NULL
      AND t.entry_date < p_date_from
    GROUP BY t.account_id
  ),
  period AS (
    SELECT
      t.account_id,
      SUM(t.debit)::numeric AS period_debits,
      SUM(t.credit)::numeric AS period_credits,
      SUM(t.signed_amount)::numeric AS period_net,
      COUNT(*)::bigint AS transaction_count
    FROM tx_expanded t
    WHERE (p_date_from IS NULL OR t.entry_date >= p_date_from)
      AND (p_date_to   IS NULL OR t.entry_date <= p_date_to)
    GROUP BY t.account_id
  ),
  combined AS (
    SELECT
      a.id AS account_id,
      a.code AS account_code,
      COALESCE(a.name_ar, a.name) AS account_name_ar,
      a.name AS account_name_en,
      COALESCE(o.opening_balance, 0)::numeric AS opening_balance,
      COALESCE(p.period_debits, 0)::numeric AS period_debits,
      COALESCE(p.period_credits, 0)::numeric AS period_credits,
      COALESCE(p.period_net, 0)::numeric AS period_net,
      COALESCE(p.transaction_count, 0)::bigint AS transaction_count
    FROM public.accounts a
    LEFT JOIN opening o ON o.account_id = a.id
    LEFT JOIN period  p ON p.account_id = a.id
    WHERE TRUE
  ),
  with_totals AS (
    SELECT
      c.*,
      (c.opening_balance + c.period_net)::numeric AS closing_balance
    FROM combined c
  ),
  shaped AS (
    SELECT
      wt.*,
      CASE WHEN wt.opening_balance > 0 THEN wt.opening_balance ELSE 0 END AS opening_debit,
      CASE WHEN wt.opening_balance < 0 THEN abs(wt.opening_balance) ELSE 0 END AS opening_credit,
      CASE WHEN wt.closing_balance > 0 THEN wt.closing_balance ELSE 0 END AS closing_debit,
      CASE WHEN wt.closing_balance < 0 THEN abs(wt.closing_balance) ELSE 0 END AS closing_credit
    FROM with_totals wt
  ),
  numbered AS (
    SELECT
      s.*,
      COUNT(*) OVER () AS total_rows,
      ROW_NUMBER() OVER (ORDER BY s.account_code) AS rn
    FROM shaped s
  )
  SELECT
    account_id,
    account_code,
    account_name_ar,
    account_name_en,
    opening_balance,
    opening_debit,
    opening_credit,
    period_debits,
    period_credits,
    period_net,
    closing_balance,
    closing_debit,
    closing_credit,
    transaction_count,
    total_rows
  FROM numbered n
  WHERE (p_limit IS NULL OR n.rn > COALESCE(p_offset, 0))
    AND (p_limit IS NULL OR n.rn <= COALESCE(p_offset, 0) + p_limit)
  ORDER BY n.rn;
$$;

GRANT EXECUTE ON FUNCTION public.get_gl_account_summary(date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid, uuid, uuid, uuid, numeric, numeric)
  TO anon, authenticated, service_role;

-- Update totals to forward extra filters
DROP FUNCTION IF EXISTS public.get_gl_totals(date, date, uuid, uuid, boolean, uuid);

CREATE OR REPLACE FUNCTION public.get_gl_totals(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_posted_only boolean DEFAULT true,
  p_classification_id uuid DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_work_item_id uuid DEFAULT NULL,
  p_expenses_category_id uuid DEFAULT NULL,
  p_debit_account_id uuid DEFAULT NULL,
  p_credit_account_id uuid DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL
)
RETURNS TABLE (
  opening_debit numeric,
  opening_credit numeric,
  period_debits numeric,
  period_credits numeric,
  closing_debit numeric,
  closing_credit numeric,
  transaction_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT * FROM public.get_gl_account_summary(
      p_date_from,
      p_date_to,
      p_org_id,
      p_project_id,
      p_posted_only,
      NULL,
      NULL,
      p_classification_id,
      p_cost_center_id,
      p_work_item_id,
      p_expenses_category_id,
      p_debit_account_id,
      p_credit_account_id,
      p_amount_min,
      p_amount_max
    )
  )
  SELECT
    COALESCE(SUM(opening_debit), 0)::numeric   AS opening_debit,
    COALESCE(SUM(opening_credit), 0)::numeric  AS opening_credit,
    COALESCE(SUM(period_debits), 0)::numeric   AS period_debits,
    COALESCE(SUM(period_credits), 0)::numeric  AS period_credits,
    COALESCE(SUM(closing_debit), 0)::numeric   AS closing_debit,
    COALESCE(SUM(closing_credit), 0)::numeric  AS closing_credit,
    COALESCE(SUM(transaction_count), 0)::bigint AS transaction_count
  FROM s;
$$;

GRANT EXECUTE ON FUNCTION public.get_gl_totals(date, date, uuid, uuid, boolean, uuid, uuid, uuid, uuid, uuid, uuid, numeric, numeric)
  TO anon, authenticated, service_role;

commit;

