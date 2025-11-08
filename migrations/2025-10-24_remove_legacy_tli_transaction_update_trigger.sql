-- Migration: Remove legacy transaction update trigger from transaction_line_items
-- Purpose: Avoid firing transactions triggers (e.g., cost center guard) during line item changes
-- Date: 2025-10-24

BEGIN;

-- Drop the old trigger that updates public.transactions from transaction_line_items
DROP TRIGGER IF EXISTS trigger_update_transaction_summary ON public.transaction_line_items;

-- Drop the old trigger function
DROP FUNCTION IF EXISTS public.update_transaction_line_items_summary();

COMMIT;
