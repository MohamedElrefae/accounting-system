-- Clean up ALL versions of get_gl_account_summary_filtered and create one correct version
-- This resolves function overloading conflicts

begin;

-- Drop ALL versions of the function (ignore errors if they don't exist)
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered() CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, uuid, uuid, boolean, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, uuid, uuid, boolean, integer, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, uuid, uuid, boolean, integer, integer, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid, uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, text, text, boolean, integer, integer, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(date, date, text, text, boolean, integer, integer, text, text, text, text, text) CASCADE;

-- Create the final version with the exact signature expected by the TypeScript code
CREATE OR REPLACE FUNCTION public.get_gl_account_summary_filtered(
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_posted_only boolean DEFAULT true,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL
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
    -- Use transaction_lines table with basic columns
    SELECT
      tl.transaction_id,
      t.entry_date,
      tl.org_id,
      COALESCE(tl.project_id, t.project_id) as project_id,
      tl.account_id,
      COALESCE(tl.debit_amount, 0)::numeric AS debit,
      COALESCE(tl.credit_amount, 0)::numeric AS credit,
      (COALESCE(tl.debit_amount, 0)::numeric - COALESCE(tl.credit_amount, 0)::numeric) AS signed_amount
    FROM public.transaction_lines tl
    JOIN public.transactions t ON tl.transaction_id = t.id
    WHERE TRUE
      AND (p_org_id IS NULL OR tl.org_id = p_org_id)
      AND (p_project_id IS NULL OR COALESCE(tl.project_id, t.project_id) = p_project_id)
      AND (NOT p_posted_only OR t.is_posted = TRUE)
      AND tl.account_id IS NOT NULL
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
      COUNT(DISTINCT t.transaction_id)::bigint AS transaction_count
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

-- Grants for the function
GRANT EXECUTE ON FUNCTION public.get_gl_account_summary_filtered(
  date, date, uuid, uuid, boolean, integer, integer
) TO anon, authenticated, service_role;

commit;

-- Verification query
SELECT 
  'get_gl_account_summary_filtered function cleaned up and created successfully' as status,
  now() as created_at;

-- Check what functions exist now
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'get_gl_account_summary_filtered'
AND routine_schema = 'public';
