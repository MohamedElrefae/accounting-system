-- 060_gl_details_analysis_filter.sql
-- Update get_general_ledger_report_filtered to accept and apply p_analysis_work_item_id
-- Note: If your existing function differs in returned columns, adjust the SELECT list accordingly.

BEGIN;

DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered(uuid, date, date, uuid, uuid, boolean, boolean, integer, integer, uuid);
DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered(uuid, date, date, uuid, uuid, boolean, boolean, integer, integer, uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_general_ledger_report_filtered(
  p_account_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_include_opening boolean DEFAULT true,
  p_posted_only boolean DEFAULT true,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL,
  p_classification_id uuid DEFAULT NULL,
  p_analysis_work_item_id uuid DEFAULT NULL
)
RETURNS TABLE (
  transaction_id uuid,
  entry_date date,
  entry_number text,
  description text,
  reference_number text,
  account_id uuid,
  account_code text,
  account_name_ar text,
  account_name_en text,
  debit numeric,
  credit numeric,
  signed_amount numeric,
  opening_balance numeric,
  opening_debit numeric,
  opening_credit numeric,
  running_balance numeric,
  running_debit numeric,
  running_credit numeric,
  period_total numeric,
  closing_balance numeric,
  closing_debit numeric,
  closing_credit numeric,
  org_id uuid,
  project_id uuid,
  total_rows bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tx_rows AS (
    SELECT
      t.id AS transaction_id,
      t.entry_date,
      t.entry_number,
      t.description,
      t.reference_number,
      t.org_id,
      t.project_id,
      CASE
        WHEN p_account_id IS NULL THEN t.debit_account_id
        ELSE p_account_id
      END AS account_id,
      CASE
        WHEN p_account_id IS NULL THEN t.amount
        ELSE CASE WHEN t.debit_account_id = p_account_id THEN t.amount ELSE 0 END
      END::numeric AS debit,
      CASE
        WHEN p_account_id IS NULL THEN 0
        ELSE CASE WHEN t.credit_account_id = p_account_id THEN t.amount ELSE 0 END
      END::numeric AS credit,
      (CASE
        WHEN p_account_id IS NULL THEN (CASE WHEN t.debit_account_id = t.credit_account_id THEN 0 ELSE t.amount END)
        ELSE (CASE WHEN t.debit_account_id = p_account_id THEN t.amount WHEN t.credit_account_id = p_account_id THEN -t.amount ELSE 0 END)
      END)::numeric AS signed_amount,
      t.classification_id
    FROM public.transactions t
    WHERE TRUE
      AND (p_org_id IS NULL OR t.org_id = p_org_id)
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (NOT p_posted_only OR t.is_posted = TRUE)
      AND (p_classification_id IS NULL OR t.classification_id = p_classification_id)
      AND (p_analysis_work_item_id IS NULL OR t.analysis_work_item_id = p_analysis_work_item_id)
      AND (
        p_account_id IS NULL
        OR t.debit_account_id = p_account_id
        OR t.credit_account_id = p_account_id
      )
  ),
  opening AS (
    SELECT
      r.account_id,
      SUM(r.signed_amount)::numeric AS opening_balance
    FROM tx_rows r
    WHERE p_include_opening
      AND p_date_from IS NOT NULL
      AND r.entry_date < p_date_from
    GROUP BY r.account_id
  ),
  period AS (
    SELECT
      r.* 
    FROM tx_rows r
    WHERE (p_date_from IS NULL OR r.entry_date >= p_date_from)
      AND (p_date_to   IS NULL OR r.entry_date <= p_date_to)
  ),
  period_with_acct AS (
    SELECT
      p.transaction_id,
      p.entry_date,
      p.entry_number,
      p.description,
      p.reference_number,
      p.org_id,
      p.project_id,
      a.id AS account_id,
      a.code AS account_code,
      COALESCE(a.name_ar, a.name) AS account_name_ar,
      a.name AS account_name_en,
      p.debit,
      p.credit,
      p.signed_amount
    FROM period p
    JOIN public.accounts a ON a.id = p.account_id
  ),
  numbered AS (
    SELECT
      pw.*,
      COALESCE(o.opening_balance, 0)::numeric AS opening_balance,
      COUNT(*) OVER () AS total_rows,
      ROW_NUMBER() OVER (ORDER BY pw.entry_date, pw.entry_number, pw.transaction_id) AS rn
    FROM period_with_acct pw
    LEFT JOIN opening o ON o.account_id = pw.account_id
  )
  SELECT
    transaction_id,
    entry_date,
    entry_number,
    description,
    reference_number,
    account_id,
    account_code,
    account_name_ar,
    account_name_en,
    debit,
    credit,
    signed_amount,
    opening_balance,
    CASE WHEN opening_balance > 0 THEN opening_balance ELSE 0 END AS opening_debit,
    CASE WHEN opening_balance < 0 THEN abs(opening_balance) ELSE 0 END AS opening_credit,
    NULL::numeric AS running_balance,
    NULL::numeric AS running_debit,
    NULL::numeric AS running_credit,
    NULL::numeric AS period_total,
    NULL::numeric AS closing_balance,
    NULL::numeric AS closing_debit,
    NULL::numeric AS closing_credit,
    org_id,
    project_id,
    total_rows
  FROM numbered n
  WHERE (p_limit IS NULL OR n.rn > COALESCE(p_offset, 0))
    AND (p_limit IS NULL OR n.rn <= COALESCE(p_offset, 0) + p_limit)
  ORDER BY n.rn;
$$;

GRANT EXECUTE ON FUNCTION public.get_general_ledger_report_filtered(
  uuid, date, date, uuid, uuid, boolean, boolean, integer, integer, uuid, uuid
) TO anon, authenticated, service_role;

COMMIT;
