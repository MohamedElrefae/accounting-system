-- 015_trial_balance_enhanced_verify.sql
-- Verification queries for enhanced Trial Balance RPCs
-- Replace placeholders before running in Supabase SQL Editor

-- 1) Verify current trial balance (posted only)
select *
from public.get_trial_balance_current_tx_enhanced('{{ORG_ID}}', 'posted', null)
order by code
limit 100;

-- Check debits equal credits (major units)
with tb as (
  select * from public.get_trial_balance_current_tx_enhanced('{{ORG_ID}}', 'posted', null)
)
select
  sum(debit_amount) as total_debits,
  sum(credit_amount) as total_credits,
  (sum(debit_amount) - sum(credit_amount)) as difference
from tb;

-- 2) Verify as-of balances (posted only)
select *
from public.get_account_balances_as_of_tx_enhanced('{{ORG_ID}}', '{{AS_OF_ISO}}', 'posted', null)
order by code
limit 100;

-- Reconciliation check: net equals debit - credit (major units)
with tb as (
  select * from public.get_account_balances_as_of_tx_enhanced('{{ORG_ID}}', '{{AS_OF_ISO}}', 'posted', null)
)
select
  sum(debit_amount) as total_debits,
  sum(credit_amount) as total_credits,
  sum(balance_signed_amount) as net_balance,
  (sum(debit_amount) - sum(credit_amount)) as diff
from tb;

