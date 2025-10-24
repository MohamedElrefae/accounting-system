-- 062_gl_summary_compat_wrapper.sql
-- Backward-compatibility wrapper: provide get_gl_account_summary_filtered
-- to forward to the unified get_gl_account_summary to avoid 404s in older UI code.

begin;

-- Create or replace a compatibility function with the legacy signature
create or replace function public.get_gl_account_summary_filtered(
  p_date_from date default null,
  p_date_to date default null,
  p_org_id text default null,
  p_project_id text default null,
  p_posted_only boolean default true,
  p_limit integer default null,
  p_offset integer default null,
  p_classification_id text default null,
  p_analysis_work_item_id text default null,
  p_expenses_category_id text default null,
  p_sub_tree_id text default null
)
returns table (
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
language sql
security definer
set search_path = public
as $$
  select * from public.get_gl_account_summary(
    p_date_from => p_date_from,
    p_date_to => p_date_to,
    p_org_id => p_org_id,
    p_project_id => p_project_id,
    p_posted_only => p_posted_only,
    p_limit => p_limit,
    p_offset => p_offset,
    p_classification_id => p_classification_id,
    p_cost_center_id => null,
    p_work_item_id => null,
    -- Map either legacy p_sub_tree_id or p_expenses_category_id into the new param
    p_sub_tree_id => coalesce(p_sub_tree_id, p_expenses_category_id),
    p_debit_account_id => null,
    p_credit_account_id => null,
    p_amount_min => null,
    p_amount_max => null,
    p_analysis_work_item_id => p_analysis_work_item_id
  );
$$;

-- Grants
grant execute on function public.get_gl_account_summary_filtered(
  date, date, text, text, boolean, integer, integer, text, text, text, text
) to anon, authenticated, service_role;

commit;
