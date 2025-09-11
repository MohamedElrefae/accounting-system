-- 009_accounting_validation_system_final.sql
-- Comprehensive validation system to prevent backwards/incorrect journal entries
-- FINAL CORRECTED VERSION: Works with existing normal_side enum

BEGIN;

-- 1) The normal_balance column already exists as normal_side enum, so we'll work with it
-- First, let's update accounts that don't have normal_balance set
UPDATE public.accounts SET normal_balance = CASE 
  WHEN category::text IN ('asset', 'expense') THEN 'debit'::normal_side
  WHEN category::text IN ('liability', 'equity', 'revenue') THEN 'credit'::normal_side
  ELSE 'debit'::normal_side -- Default fallback
END WHERE normal_balance IS NULL;

-- 2) Create function to validate transaction logic
CREATE OR REPLACE FUNCTION public.validate_transaction_logic(
  p_debit_account_id UUID,
  p_credit_account_id UUID,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL
) RETURNS TABLE (
  is_valid BOOLEAN,
  warning_level TEXT,
  message TEXT,
  suggested_fix TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  debit_account RECORD;
  credit_account RECORD;
  validation_result RECORD;
BEGIN
  -- Get account details
  SELECT id, code, name, category::text as category, normal_balance::text as normal_balance, is_postable, status
  INTO debit_account
  FROM public.accounts 
  WHERE id = p_debit_account_id;

  SELECT id, code, name, category::text as category, normal_balance::text as normal_balance, is_postable, status  
  INTO credit_account
  FROM public.accounts 
  WHERE id = p_credit_account_id;

  -- Basic validation
  IF debit_account.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'error'::TEXT, 
      'الحساب المدين غير موجود'::TEXT,
      'تأكد من اختيار حساب مدين صحيح'::TEXT;
    RETURN;
  END IF;

  IF credit_account.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'error'::TEXT,
      'الحساب الدائن غير موجود'::TEXT, 
      'تأكد من اختيار حساب دائن صحيح'::TEXT;
    RETURN;
  END IF;

  -- Check if accounts are postable and active
  IF NOT debit_account.is_postable OR debit_account.status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'error'::TEXT,
      format('الحساب المدين %s غير قابل للترحيل أو غير نشط', debit_account.code),
      'اختر حساباً تفصيلياً نشطاً'::TEXT;
    RETURN;
  END IF;

  IF NOT credit_account.is_postable OR credit_account.status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'error'::TEXT,
      format('الحساب الدائن %s غير قابل للترحيل أو غير نشط', credit_account.code),
      'اختر حساباً تفصيلياً نشطاً'::TEXT;
    RETURN;
  END IF;

  -- Check same account on both sides
  IF p_debit_account_id = p_credit_account_id THEN
    RETURN QUERY SELECT FALSE, 'error'::TEXT,
      'لا يمكن أن يكون نفس الحساب مديناً ودائناً في نفس الوقت'::TEXT,
      'اختر حسابين مختلفين'::TEXT;
    RETURN;
  END IF;

  -- Amount validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 'error'::TEXT,
      'المبلغ يجب أن يكون أكبر من صفر'::TEXT,
      'أدخل مبلغاً صحيحاً'::TEXT;
    RETURN;
  END IF;

  -- Detect potentially backwards entries based on common patterns
  -- Revenue account debited (unusual - revenues normally credited)
  IF debit_account.category = 'revenue' AND 
     NOT (p_description ILIKE '%رد%' OR p_description ILIKE '%عكس%' OR p_description ILIKE '%تصحيح%') THEN
    RETURN QUERY SELECT TRUE, 'warning'::TEXT,
      format('تحذير: قيد غير اعتيادي - حساب الإيراد %s في الجانب المدين', debit_account.code),
      format('هل تقصد: من %s إلى %s؟', credit_account.code, debit_account.code);
    RETURN;
  END IF;

  -- Liability/Equity account debited without clear reason (could be payment/reduction)
  IF debit_account.category IN ('liability', 'equity') AND
     NOT (p_description ILIKE '%دفع%' OR p_description ILIKE '%سداد%' OR p_description ILIKE '%تخفيض%') THEN
    RETURN QUERY SELECT TRUE, 'info'::TEXT,
      format('ملاحظة: حساب %s في الجانب المدين - تأكد أن هذا صحيح', debit_account.category),
      'تأكد من صحة الاتجاه المحاسبي'::TEXT;
    RETURN;
  END IF;

  -- Asset account credited without clear reason (could be sale/disposal)
  IF credit_account.category = 'asset' AND
     NOT (p_description ILIKE '%بيع%' OR p_description ILIKE '%استبعاد%' OR p_description ILIKE '%تخفيض%') THEN
    RETURN QUERY SELECT TRUE, 'info'::TEXT,
      format('ملاحظة: حساب الأصول %s في الجانب الدائن - تأكد أن هذا صحيح', credit_account.code),
      'تأكد من صحة الاتجاه المحاسبي'::TEXT;
    RETURN;
  END IF;

  -- Expense account credited (unusual - expenses normally debited)
  IF credit_account.category = 'expense' AND
     NOT (p_description ILIKE '%رد%' OR p_description ILIKE '%استرداد%' OR p_description ILIKE '%تصحيح%') THEN
    RETURN QUERY SELECT TRUE, 'warning'::TEXT,
      format('تحذير: قيد غير اعتيادي - حساب المصروف %s في الجانب الدائن', credit_account.code),
      format('هل تقصد: من %s إلى %s؟', debit_account.code, credit_account.code);
    RETURN;
  END IF;

  -- All validations passed
  RETURN QUERY SELECT TRUE, 'success'::TEXT,
    'القيد صحيح محاسبياً'::TEXT,
    NULL::TEXT;
END;
$$;

-- 3) Create trigger function for transaction validation
CREATE OR REPLACE FUNCTION public.check_transaction_accounting_logic()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  validation_result RECORD;
BEGIN
  -- Only validate for new transactions or when amounts/accounts change
  IF TG_OP = 'UPDATE' AND 
     OLD.debit_account_id = NEW.debit_account_id AND 
     OLD.credit_account_id = NEW.credit_account_id AND
     OLD.amount = NEW.amount THEN
    RETURN NEW;
  END IF;

  -- Run validation
  SELECT * INTO validation_result
  FROM public.validate_transaction_logic(
    NEW.debit_account_id, 
    NEW.credit_account_id, 
    NEW.amount, 
    NEW.description
  );

  -- Block invalid transactions
  IF NOT validation_result.is_valid THEN
    RAISE EXCEPTION 'خطأ في القيد: %', validation_result.message;
  END IF;

  -- Log warnings but allow transaction (will be shown in UI)
  IF validation_result.warning_level IN ('warning', 'info') THEN
    -- Store validation result for frontend to display
    NEW.notes = COALESCE(NEW.notes, '') || 
                 CASE WHEN COALESCE(NEW.notes, '') = '' THEN '' ELSE ' | ' END ||
                 '[تحذير]: ' || validation_result.message;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Create validation trigger (only for unposted transactions)
DROP TRIGGER IF EXISTS tr_transaction_accounting_validation ON public.transactions;
CREATE TRIGGER tr_transaction_accounting_validation
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW 
  WHEN (NEW.is_posted = FALSE)
  EXECUTE FUNCTION public.check_transaction_accounting_logic();

-- 5) Create function to check account balance trends
CREATE OR REPLACE FUNCTION public.get_account_balance_details(p_account_id UUID)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  normal_balance TEXT,
  current_balance DECIMAL,
  total_debits DECIMAL,
  total_credits DECIMAL,
  is_contra_side BOOLEAN
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH account_info AS (
    SELECT a.id, a.code, a.name, a.normal_balance::text as normal_balance
    FROM public.accounts a
    WHERE a.id = p_account_id
  ),
  balance_calc AS (
    SELECT 
      COALESCE(SUM(CASE WHEN t.debit_account_id = p_account_id THEN t.amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN t.credit_account_id = p_account_id THEN t.amount ELSE 0 END), 0) as total_credits
    FROM public.transactions t
    WHERE (t.debit_account_id = p_account_id OR t.credit_account_id = p_account_id)
      AND t.is_posted = true
  )
  SELECT 
    ai.id,
    ai.code,
    ai.name,
    ai.normal_balance,
    CASE 
      WHEN ai.normal_balance = 'debit' THEN bc.total_debits - bc.total_credits
      ELSE bc.total_credits - bc.total_debits
    END as current_balance,
    bc.total_debits,
    bc.total_credits,
    CASE 
      WHEN ai.normal_balance = 'debit' THEN bc.total_credits > bc.total_debits
      ELSE bc.total_debits > bc.total_credits
    END as is_contra_side
  FROM account_info ai
  CROSS JOIN balance_calc bc;
END;
$$;

-- 6) Create audit trail for validation overrides
CREATE TABLE IF NOT EXISTS public.transaction_validation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL DEFAULT 'pre_save' CHECK (validation_type IN ('pre_save', 'pre_post', 'manual')),
  validation_result TEXT NOT NULL DEFAULT 'passed' CHECK (validation_result IN ('passed', 'failed', 'warning')),
  error_message TEXT,
  warning_messages TEXT[],
  field_errors JSONB,
  validated_at TIMESTAMPTZ DEFAULT now(),
  validated_by UUID REFERENCES auth.users(id)
);

-- 7) Create RLS policies for validation logs
ALTER TABLE public.transaction_validation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validation logs for their org" ON public.transaction_validation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_validation_logs.transaction_id 
        AND t.org_id IN (SELECT org_id FROM public.user_organizations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert validation logs for their org" ON public.transaction_validation_logs
  FOR INSERT WITH CHECK (
    validated_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_validation_logs.transaction_id 
        AND t.org_id IN (SELECT org_id FROM public.user_organizations WHERE user_id = auth.uid())
    )
  );

-- 8) Create function to log validation results
CREATE OR REPLACE FUNCTION public.log_transaction_validation(
  p_transaction_id UUID,
  p_validation_type TEXT DEFAULT 'pre_save',
  p_validation_result TEXT DEFAULT 'passed',
  p_error_message TEXT DEFAULT NULL,
  p_warning_messages TEXT[] DEFAULT NULL,
  p_field_errors JSONB DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.transaction_validation_logs (
    transaction_id, validation_type, validation_result, 
    error_message, warning_messages, field_errors, validated_by
  ) VALUES (
    p_transaction_id, p_validation_type, p_validation_result, 
    p_error_message, p_warning_messages, p_field_errors, auth.uid()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 9) Create view for transaction validation report
CREATE OR REPLACE VIEW public.transaction_validation_report AS
SELECT 
  t.id as transaction_id,
  t.entry_number,
  t.entry_date,
  t.description,
  t.amount,
  da.code as debit_account_code,
  da.name as debit_account_name, 
  da.category::text as debit_category,
  da.normal_balance::text as debit_normal_balance,
  ca.code as credit_account_code,
  ca.name as credit_account_name,
  ca.category::text as credit_category, 
  ca.normal_balance::text as credit_normal_balance,
  tvl.validation_type,
  tvl.validation_result,
  tvl.error_message,
  tvl.warning_messages,
  tvl.field_errors,
  tvl.validated_at,
  t.is_posted,
  t.created_at as transaction_date
FROM public.transactions t
LEFT JOIN public.accounts da ON da.id = t.debit_account_id
LEFT JOIN public.accounts ca ON ca.id = t.credit_account_id  
LEFT JOIN public.transaction_validation_logs tvl ON tvl.transaction_id = t.id
ORDER BY tvl.validated_at DESC;

-- 10) Create additional RPC functions for API integration
CREATE OR REPLACE FUNCTION public.validate_transaction_for_posting(p_transaction_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  tx RECORD;
  validation_result RECORD;
  result JSONB;
BEGIN
  -- Get transaction details
  SELECT * INTO tx FROM public.transactions WHERE id = p_transaction_id;
  
  IF tx.id IS NULL THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'errors', jsonb_build_array(
        jsonb_build_object(
          'field', 'general',
          'message', 'المعاملة غير موجودة'
        )
      ),
      'warnings', jsonb_build_array()
    );
  END IF;

  -- Check if already posted
  IF tx.is_posted THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'errors', jsonb_build_array(
        jsonb_build_object(
          'field', 'general',
          'message', 'المعاملة مرحلة بالفعل'
        )
      ),
      'warnings', jsonb_build_array()
    );
  END IF;

  -- Run validation
  SELECT * INTO validation_result
  FROM public.validate_transaction_logic(
    tx.debit_account_id, 
    tx.credit_account_id, 
    tx.amount, 
    tx.description
  );

  -- Build response
  IF NOT validation_result.is_valid THEN
    result = jsonb_build_object(
      'is_valid', false,
      'errors', jsonb_build_array(
        jsonb_build_object(
          'field', 'general',
          'message', validation_result.message
        )
      ),
      'warnings', jsonb_build_array()
    );
  ELSIF validation_result.warning_level IN ('warning', 'info') THEN
    result = jsonb_build_object(
      'is_valid', true,
      'errors', jsonb_build_array(),
      'warnings', jsonb_build_array(
        jsonb_build_object(
          'field', 'general',
          'message', validation_result.message,
          'details', validation_result.suggested_fix
        )
      )
    );
  ELSE
    result = jsonb_build_object(
      'is_valid', true,
      'errors', jsonb_build_array(),
      'warnings', jsonb_build_array()
    );
  END IF;

  RETURN result;
END;
$$;

COMMIT;

-- Grant permissions
GRANT SELECT, INSERT ON public.transaction_validation_logs TO authenticated;
GRANT SELECT ON public.transaction_validation_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_transaction_logic TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_balance_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_transaction_validation TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_transaction_for_posting TO authenticated;
