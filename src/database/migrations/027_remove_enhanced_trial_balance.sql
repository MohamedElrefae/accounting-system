-- 027_remove_enhanced_trial_balance.sql
-- Purpose: Remove enhanced and grouped Trial Balance functions, keeping only the original Trial Balance and All Levels (GL summary-based) flows.
-- Safe to run multiple times due to IF EXISTS.

begin;

-- Drop enhanced flat functions
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced(uuid, timestamp with time zone, text, uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced_page(uuid, text, uuid, integer, text);

-- Drop grouped enhanced functions
DROP FUNCTION IF EXISTS public.get_trial_balance_current_grouped_tx_enhanced(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_grouped_tx_enhanced(uuid, timestamp with time zone, text, uuid);

-- Optional: Drop any debug-bypass variants if they were created by debug scripts
-- These signatures differ from the enhanced ones above
DROP FUNCTION IF EXISTS public.get_trial_balance_current_grouped(uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_as_of_grouped(uuid, date);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_trial_balance_as_of_tx_enhanced(uuid, date, integer, integer);

commit;
