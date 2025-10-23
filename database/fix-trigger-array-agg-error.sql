-- ================================================================
-- FIX: Update_transaction_line_items_summary Trigger
-- Problem: Using array_agg (aggregate function) in trigger context
-- Solution: Replace with SUM() and COUNT()
-- ================================================================

BEGIN;

-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS trigger_update_transaction_summary ON public.transaction_line_items;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.update_transaction_line_items_summary();

-- Create the corrected function WITHOUT array_agg
CREATE OR REPLACE FUNCTION public.update_transaction_line_items_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update transaction totals when line items change
    UPDATE public.transactions 
    SET 
        line_items_total = COALESCE((
            SELECT SUM(total_amount) 
            FROM public.transaction_line_items 
            WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id)
        ), 0),
        line_items_count = COALESCE((
            SELECT COUNT(*) 
            FROM public.transaction_line_items 
            WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id)
        ), 0),
        has_line_items = COALESCE((
            SELECT COUNT(*) > 0 
            FROM public.transaction_line_items 
            WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id)
        ), false),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_transaction_summary
    AFTER INSERT OR UPDATE OR DELETE ON public.transaction_line_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_transaction_line_items_summary();

-- Verification
SELECT 'Trigger function fixed successfully!' as status;
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'trigger_update_transaction_summary';

COMMIT;
