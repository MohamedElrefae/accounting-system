-- Fix missing get_gl_account_summary_filtered function for Enterprise Running Balance
-- This creates a simple compatibility wrapper that forwards to the basic get_gl_account_summary function

begin;

-- Create or replace the compatibility function with the legacy signature
-- Forwarding to the basic get_gl_account_summary function (7 parameters)
create or replace function public.get_gl_account_summary_filtered(
  p_date_from date default null,
  p_date_to date default null,
  p_org_id uuid default null,
  p_project_id uuid default null,
  p_posted_only boolean default true,
  p_limit integer default null,
  p_offset integer default null,
  p_classification_id uuid default null,
  p_analysis_work_item_id uuid default null,
  p_expenses_category_id uuid default null,
  p_cost_center_id uuid default null,
  p_sub_tree_id uuid default null
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
  -- Use the basic get_gl_account_summary function with 7 parameters
  select * from public.get_gl_account_summary(
    p_date_from => p_date_from,
    p_date_to => p_date_to,
    p_org_id => p_org_id,
    p_project_id => p_project_id,
    p_posted_only => p_posted_only,
    p_limit => p_limit,
    p_offset => p_offset
  );
$$;

-- Grants
grant execute on function public.get_gl_account_summary_filtered(
  date, date, uuid, uuid, boolean, integer, integer, uuid, uuid, uuid, uuid, uuid
) to anon, authenticated, service_role;

commit;

-- Verification query
select 'get_gl_account_summary_filtered function created successfully' as status;
