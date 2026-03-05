-- 003_alter_transaction_line_items.sql
-- Step 3: Extend transaction_line_items table with adjustment columns

ALTER TABLE public.transaction_line_items
  ADD COLUMN deduction_percentage NUMERIC(10,6) NULL,
  ADD COLUMN addition_percentage  NUMERIC(10,6) NULL,
  ADD COLUMN deduction_amount     NUMERIC(15,4) NOT NULL DEFAULT 0,
  ADD COLUMN addition_amount      NUMERIC(15,4) NOT NULL DEFAULT 0,
  ADD COLUMN net_amount           NUMERIC(15,4) NOT NULL DEFAULT 0;

-- Create partial indexes for performance
CREATE INDEX idx_tli_has_deduction
  ON public.transaction_line_items(deduction_percentage)
  WHERE deduction_percentage IS NOT NULL;

CREATE INDEX idx_tli_has_addition
  ON public.transaction_line_items(addition_percentage)
  WHERE addition_percentage IS NOT NULL;
