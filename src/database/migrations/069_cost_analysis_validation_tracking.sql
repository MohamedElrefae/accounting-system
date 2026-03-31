-- 069_cost_analysis_validation_tracking.sql
-- Adds validation tracking for cost analysis transactions

BEGIN;

-- Create cost analysis validation tracking table
CREATE TABLE IF NOT EXISTS public.cost_analysis_transaction_validation (
  transaction_id UUID PRIMARY KEY REFERENCES public.transactions(id) ON DELETE CASCADE,
  has_cost_analysis_items BOOLEAN DEFAULT false,
  is_two_line_transaction BOOLEAN DEFAULT false,
  dimensions_match BOOLEAN DEFAULT false,
  validation_errors JSONB DEFAULT '[]',
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_by UUID REFERENCES auth.users(id),
  -- Track when validation was last run
  last_validation_run TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cost_analysis_validation_has_items 
  ON public.cost_analysis_transaction_validation(has_cost_analysis_items);

CREATE INDEX IF NOT EXISTS idx_cost_analysis_validation_compliant 
  ON public.cost_analysis_transaction_validation(dimensions_match);

CREATE INDEX IF NOT EXISTS idx_cost_analysis_validation_validated_at 
  ON public.cost_analysis_transaction_validation(validated_at);

-- Create enriched view for cost analysis reporting
-- Note: Uses LEFT JOIN and COALESCE to handle missing dimension tables gracefully
CREATE OR REPLACE VIEW public.v_transactions_enriched_cost_analysis AS
SELECT 
  t.id AS transaction_id,
  t.entry_number,
  t.entry_date,
  t.description AS transaction_description,
  t.org_id,
  org.code AS org_code,
  org.name AS org_name,
  tl.line_no,
  tl.account_id,
  acc.code AS account_code,
  acc.name AS account_name,
  acc.name_ar AS account_name_ar,
  tl.debit_amount,
  tl.credit_amount,
  tl.description AS line_description,
  -- Dimensions (using safe LEFT JOINs with COALESCE fallbacks)
  tl.project_id,
  COALESCE(proj.code::text, ''::text) AS project_code,
  COALESCE(proj.name::text, ''::text) AS project_name,
  tl.cost_center_id,
  COALESCE(cc.code::text, ''::text) AS cost_center_code,
  COALESCE(cc.name::text, ''::text) AS cost_center_name,
  tl.work_item_id,
  COALESCE(wi.code::text, ''::text) AS work_item_code,
  COALESCE(wi.name::text, ''::text) AS work_item_name,
  tl.analysis_work_item_id,
  COALESCE(awi.code::text, ''::text) AS analysis_work_item_code,
  COALESCE(awi.name::text, ''::text) AS analysis_work_item_name,
  tl.classification_id,
  COALESCE(cls.code::text, ''::text) AS classification_code,
  COALESCE(cls.name::text, ''::text) AS classification_name,
  tl.sub_tree_id,
  COALESCE(st.code::text, ''::text) AS sub_tree_code,
  COALESCE(st.description::text, ''::text) AS sub_tree_name,
  -- Cost analysis info
  COALESCE(tli.item_count, 0) AS cost_analysis_items_count,
  COALESCE(tli.total_amount, 0) AS cost_analysis_total_amount,
  CASE WHEN COALESCE(tli.item_count, 0) > 0 THEN true ELSE false END AS has_cost_analysis_items,
  -- Validation status
  cav.has_cost_analysis_items AS validation_has_items,
  cav.is_two_line_transaction,
  cav.dimensions_match,
  cav.validation_errors,
  cav.validated_at,
  -- Transaction metadata
  t.approval_status,
  t.is_posted,
  t.created_by,
  t.created_at,
  t.updated_at
FROM public.transactions t
LEFT JOIN public.transaction_lines tl ON tl.transaction_id = t.id
LEFT JOIN public.accounts acc ON acc.id = tl.account_id
LEFT JOIN public.organizations org ON org.id = t.org_id
-- Safe dimension joins with COALESCE fallbacks
LEFT JOIN public.projects proj ON proj.id = tl.project_id
LEFT JOIN public.cost_centers cc ON cc.id = tl.cost_center_id
LEFT JOIN public.work_items wi ON wi.id = tl.work_item_id
LEFT JOIN public.analysis_work_items awi ON awi.id = tl.analysis_work_item_id
LEFT JOIN public.transaction_classification cls ON cls.id = tl.classification_id
LEFT JOIN public.sub_tree st ON st.id = tl.sub_tree_id
-- Cost analysis aggregation
LEFT JOIN (
  SELECT 
    tli.transaction_line_id,
    COUNT(tli.id) AS item_count,
    COALESCE(SUM(
        COALESCE(tli.quantity::numeric, 0) * 
        (COALESCE(tli.percentage::numeric, 100) / 100.0) * 
        COALESCE(tli.unit_price::numeric, 0)
      ), 0) AS total_amount
  FROM public.transaction_line_items tli
  GROUP BY tli.transaction_line_id
) tli ON tli.transaction_line_id = tl.id
-- Validation tracking
LEFT JOIN public.cost_analysis_transaction_validation cav ON cav.transaction_id = t.id
WHERE t.is_wizard_draft = false;

-- RPC function to validate cost analysis compliance for a transaction
CREATE OR REPLACE FUNCTION public.validate_cost_analysis_transaction(
  p_transaction_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_compliant BOOLEAN,
  validation_errors TEXT[],
  has_cost_analysis_items BOOLEAN,
  is_two_line_transaction BOOLEAN,
  dimensions_match BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_has_cost_analysis BOOLEAN := FALSE;
  v_is_two_line BOOLEAN := FALSE;
  v_dimensions_match BOOLEAN := TRUE;
  v_errors TEXT[] := '{}';
  v_line_count INTEGER := 0;
  v_debit_count INTEGER := 0;
  v_credit_count INTEGER := 0;
BEGIN
  -- Check if transaction has cost analysis items
  SELECT EXISTS(
    SELECT 1
    FROM public.transaction_line_items tli
    JOIN public.transaction_lines tl ON tl.id = tli.transaction_line_id
    WHERE tl.transaction_id = p_transaction_id
  )
  INTO v_has_cost_analysis;

  -- Get line count
  SELECT COUNT(*)
  INTO v_line_count
  FROM public.transaction_lines
  WHERE transaction_id = p_transaction_id;

  -- Check if it's exactly 2 lines
  v_is_two_line := (v_line_count = 2);

  -- If has cost analysis, validate two-lines rule
  IF v_has_cost_analysis THEN
    IF NOT v_is_two_line THEN
      v_errors := array_append(v_errors, 'Transaction must have exactly 2 lines when cost analysis is present'::text);
    END IF;
  END IF;

  -- Check debit/credit balance: exactly 1 debit and 1 credit line
  SELECT COUNT(*) INTO v_debit_count
  FROM public.transaction_lines
  WHERE transaction_id = p_transaction_id AND debit_amount > 0;

  SELECT COUNT(*) INTO v_credit_count
  FROM public.transaction_lines
  WHERE transaction_id = p_transaction_id AND credit_amount > 0;

  IF v_debit_count != 1 OR v_credit_count != 1 THEN
    v_errors := array_append(v_errors, 'Transaction must have exactly 1 debit line and 1 credit line'::text);
  END IF;

  -- Check dimension consistency if exactly 2 lines
  IF v_is_two_line THEN
    -- TODO: implement actual dimension comparison between the two lines.
    -- For now, we assume they match, as in your original comment.
    v_dimensions_match := TRUE;
  END IF;

  -- Update validation tracking
  INSERT INTO public.cost_analysis_transaction_validation (
    transaction_id,
    has_cost_analysis_items,
    is_two_line_transaction,
    dimensions_match,
    validation_errors,
    validated_by,
    last_validation_run
  ) VALUES (
    p_transaction_id,
    v_has_cost_analysis,
    v_is_two_line,
    v_dimensions_match,
    v_errors,
    p_user_id,
    NOW()
  )
  ON CONFLICT (transaction_id) DO UPDATE SET
    has_cost_analysis_items = EXCLUDED.has_cost_analysis_items,
    is_two_line_transaction = EXCLUDED.is_two_line_transaction,
    dimensions_match = EXCLUDED.dimensions_match,
    validation_errors = EXCLUDED.validation_errors,
    validated_by = EXCLUDED.validated_by,
    last_validation_run = EXCLUDED.last_validation_run;

  RETURN QUERY
  SELECT
    (v_dimensions_match AND cardinality(v_errors) = 0) AS is_compliant,
    v_errors AS validation_errors,
    v_has_cost_analysis AS has_cost_analysis_items,
    v_is_two_line AS is_two_line_transaction,
    v_dimensions_match AS dimensions_match;
END;
$func$;

-- RPC function to batch validate all transactions with cost analysis
CREATE OR REPLACE FUNCTION public.validate_all_cost_analysis_transactions(
  p_org_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  is_compliant BOOLEAN,
  validation_errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    tl.transaction_id,
    validate_result.is_compliant,
    validate_result.validation_errors
  FROM public.transaction_lines tl
  JOIN public.transactions t ON t.id = tl.transaction_id
  JOIN public.transaction_line_items tli ON tli.transaction_line_id = tl.id
  CROSS JOIN LATERAL public.validate_cost_analysis_transaction(tl.transaction_id, p_user_id) AS validate_result
  WHERE t.is_wizard_draft = false
    AND (p_org_id IS NULL OR t.org_id = p_org_id);
END;
$$;

-- Grant permissions
GRANT SELECT ON public.cost_analysis_transaction_validation TO authenticated, service_role;
GRANT SELECT ON public.v_transactions_enriched_cost_analysis TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_cost_analysis_transaction(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_all_cost_analysis_transactions(UUID, UUID) TO authenticated, service_role;

COMMIT;
