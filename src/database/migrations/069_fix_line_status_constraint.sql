-- 069_fix_line_status_constraint.sql
-- Fixes the check constraint on transaction_lines.line_status

BEGIN;

-- 1. Drop existing constraint if it exists
ALTER TABLE public.transaction_lines 
DROP CONSTRAINT IF EXISTS transaction_lines_line_status_check;

-- 2. Ensure all existing rows have valid status (default to 'draft' if invalid)
UPDATE public.transaction_lines 
SET line_status = 'draft' 
WHERE line_status NOT IN ('draft', 'pending', 'approved', 'rejected', 'change_requested');

-- 3. Add the constraint back with all valid values
ALTER TABLE public.transaction_lines 
ADD CONSTRAINT transaction_lines_line_status_check 
CHECK (line_status IN ('draft', 'pending', 'approved', 'rejected', 'change_requested'));

COMMIT;
