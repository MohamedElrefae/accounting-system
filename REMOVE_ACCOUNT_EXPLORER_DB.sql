-- REMOVE_ACCOUNT_EXPLORER_DB.sql
-- Script to permanently remove Account Explorer database functions
-- Execute this script to clean up all database objects related to Account Explorer

BEGIN;

-- Drop the account explorer children function
DROP FUNCTION IF EXISTS public.get_account_children_with_balances(
  uuid, uuid, date, date, boolean, uuid, text
);

-- Drop the verify account GL summary function  
DROP FUNCTION IF EXISTS public.verify_account_gl_summary(
  uuid, date, date, uuid, uuid, boolean
);

COMMIT;
