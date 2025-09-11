-- 009_accounting_validation_system.sql
-- Comprehensive validation system to prevent backwards/incorrect journal entries
-- This system validates transactions against account normal balances and accounting rules

BEGIN;

-- 1) Add normal_balance field to accounts table if not exists
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS normal_balance TEXT DEFAULT 'debit' 
    CHECK (normal_balance IN ('debit', 'credit'));

-- 2) Update existing accounts with proper normal balances based on category
UPDATE public.accounts SET normal_balance = CASE 
  WHEN LOWER(category) IN ('asset', 'assets', 'expense', 'expenses') THEN 'debit'
  WHEN LOWER(category) IN ('liability', 'liabilities', 'equity', 'revenue', 'income') THEN 'credit'
  ELSE 'debit' -- Default fallback
END WHERE normal_balance IS NULL;

-- 3) Create function to validate transaction logic
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
  SELECT id, code, name, category, normal_balance, is_postable, status
  INTO debit_account
  FROM public.accounts 
  WHERE id = p_debit_account_id;

  SELECT id, code, name, category, normal_balance, is_postable, status  
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
  IF LOWER(debit_account.category) IN ('revenue', 'income') AND 
     NOT (p_description ILIKE '%رد%' OR p_description ILIKE '%عكس%' OR p_description ILIKE '%تصحيح%') THEN
    RETURN QUERY SELECT TRUE, 'warning'::TEXT,
      format('تحذير: قيد غير اعتيادي - حساب الإيراد %s في الجانب المدين', debit_account.code),
      format('هل تقصد: من %s إلى %s؟', credit_account.code, debit_account.code);
    RETURN;
  END IF;

  -- Liability/Equity account debited without clear reason (could be payment/reduction)
  IF LOWER(debit_account.category) IN ('liability', 'liabilities', 'equity') AND
     NOT (p_description ILIKE '%دفع%' OR p_description ILIKE '%سداد%' OR p_description ILIKE '%تخفيض%') THEN
    RETURN QUERY SELECT TRUE, 'info'::TEXT,
      format('ملاحظة: حساب %s في الجانب المدين - تأكد أن هذا صحيح', debit_account.category),
      'تأكد من صحة الاتجاه المحاسبي'::TEXT;
    RETURN;
  END IF;

  -- Asset account credited without clear reason (could be sale/disposal)
  IF LOWER(credit_account.category) IN ('asset', 'assets') AND
     NOT (p_description ILIKE '%بيع%' OR p_description ILIKE '%استبعاد%' OR p_description ILIKE '%تخفيض%') THEN
    RETURN QUERY SELECT TRUE, 'info'::TEXT,
      format('ملاحظة: حساب الأصول %s في الجانب الدائن - تأكد أن هذا صحيح', credit_account.code),
      'تأكد من صحة الاتجاه المحاسبي'::TEXT;
    RETURN;
  END IF;

  -- Expense account credited (unusual - expenses normally debited)
  IF LOWER(credit_account.category) IN ('expense', 'expenses') AND
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

-- 4) Create trigger function for transaction validation
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

-- 5) Create validation trigger (only for unposted transactions)
DROP TRIGGER IF EXISTS tr_transaction_accounting_validation ON public.transactions;
CREATE TRIGGER tr_transaction_accounting_validation
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW 
  WHEN (NEW.is_posted = FALSE)
  EXECUTE FUNCTION public.check_transaction_accounting_logic();

-- 6) Create function to check account balance trends
CREATE OR REPLACE FUNCTION public.get_account_balance_info(p_account_id UUID)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  normal_balance TEXT,
  current_balance DECIMAL,
  natural_side_balance DECIMAL,
  contra_side_balance DECIMAL,
  is_contra_account BOOLEAN
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH account_info AS (
    SELECT a.id, a.code, a.name, a.normal_balance
    FROM public.accounts a
    WHERE a.id = p_account_id
  ),
  balance_calc AS (
    SELECT 
      SUM(CASE WHEN t.debit_account_id = p_account_id THEN t.amount ELSE 0 END) as total_debits,
      SUM(CASE WHEN t.credit_account_id = p_account_id THEN t.amount ELSE 0 END) as total_credits
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
      WHEN ai.normal_balance = 'debit' THEN COALESCE(bc.total_debits, 0) - COALESCE(bc.total_credits, 0)
      ELSE COALESCE(bc.total_credits, 0) - COALESCE(bc.total_debits, 0)
    END as current_balance,
    CASE WHEN ai.normal_balance = 'debit' THEN COALESCE(bc.total_debits, 0) ELSE COALESCE(bc.total_credits, 0) END as natural_side_balance,
    CASE WHEN ai.normal_balance = 'debit' THEN COALESCE(bc.total_credits, 0) ELSE COALESCE(bc.total_debits, 0) END as contra_side_balance,
    CASE 
      WHEN ai.normal_balance = 'debit' THEN COALESCE(bc.total_credits, 0) > COALESCE(bc.total_debits, 0)
      ELSE COALESCE(bc.total_debits, 0) > COALESCE(bc.total_credits, 0)
    END as is_contra_account
  FROM account_info ai
  CROSS JOIN balance_calc bc;
END;
$$;

-- 7) Create audit trail for validation overrides
CREATE TABLE IF NOT EXISTS public.transaction_validation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id),
  validation_level TEXT NOT NULL CHECK (validation_level IN ('error', 'warning', 'info', 'override')),
  validation_message TEXT NOT NULL,
  suggested_fix TEXT,
  user_action TEXT, -- 'ignored', 'corrected', 'overridden'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8) Create RLS policies for validation log
ALTER TABLE public.transaction_validation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validation logs for their org" ON public.transaction_validation_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_validation_log.transaction_id 
        AND t.org_id IN (SELECT org_id FROM public.user_organizations WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert validation logs for their org" ON public.transaction_validation_log
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_validation_log.transaction_id 
        AND t.org_id IN (SELECT org_id FROM public.user_organizations WHERE user_id = auth.uid())
    )
  );

-- 9) Create function to log validation results
CREATE OR REPLACE FUNCTION public.log_transaction_validation(
  p_transaction_id UUID,
  p_level TEXT,
  p_message TEXT,
  p_suggested_fix TEXT DEFAULT NULL,
  p_user_action TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.transaction_validation_log (
    transaction_id, validation_level, validation_message, 
    suggested_fix, user_action, created_by
  ) VALUES (
    p_transaction_id, p_level, p_message, 
    p_suggested_fix, p_user_action, auth.uid()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 10) Create view for transaction validation report
CREATE OR REPLACE VIEW public.v_transaction_validation_report AS
SELECT 
  t.id as transaction_id,
  t.entry_number,
  t.entry_date,
  t.description,
  t.amount,
  da.code as debit_account_code,
  da.name as debit_account_name, 
  da.category as debit_category,
  da.normal_balance as debit_normal_balance,
  ca.code as credit_account_code,
  ca.name as credit_account_name,
  ca.category as credit_category, 
  ca.normal_balance as credit_normal_balance,
  tvl.validation_level,
  tvl.validation_message,
  tvl.suggested_fix,
  tvl.user_action,
  tvl.created_at as validation_date,
  t.is_posted,
  t.created_at as transaction_date
FROM public.transactions t
LEFT JOIN public.accounts da ON da.id = t.debit_account_id
LEFT JOIN public.accounts ca ON ca.id = t.credit_account_id  
LEFT JOIN public.transaction_validation_log tvl ON tvl.transaction_id = t.id
WHERE tvl.validation_level IS NOT NULL
ORDER BY tvl.created_at DESC;

COMMIT;

-- Grant permissions
GRANT SELECT, INSERT ON public.transaction_validation_log TO authenticated;
GRANT SELECT ON public.v_transaction_validation_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_transaction_logic TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_balance_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_transaction_validation TO authenticated;
