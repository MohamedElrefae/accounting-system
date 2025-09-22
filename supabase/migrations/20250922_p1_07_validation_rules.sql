-- Phase 1 / 07 - opening_balance_validation_rules table
SET search_path = public;

CREATE TABLE IF NOT EXISTS public.opening_balance_validation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  rule_code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  description_en text,
  description_ar text,
  severity text NOT NULL DEFAULT 'error',
  validation_expression text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obvr_severity_chk CHECK (severity IN ('info','warning','error')),
  CONSTRAINT obvr_unique_per_org_code UNIQUE (org_id, rule_code)
);

CREATE INDEX IF NOT EXISTS idx_obvr_org_active ON public.opening_balance_validation_rules (org_id, active);
CREATE INDEX IF NOT EXISTS idx_obvr_org_rule_code ON public.opening_balance_validation_rules (org_id, rule_code);

DROP TRIGGER IF EXISTS trg_obvr_audit ON public.opening_balance_validation_rules;
CREATE TRIGGER trg_obvr_audit
BEFORE INSERT OR UPDATE ON public.opening_balance_validation_rules
FOR EACH ROW EXECUTE FUNCTION public.tg_set_audit_fields();

ALTER TABLE public.opening_balance_validation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS obvr_select ON public.opening_balance_validation_rules;
CREATE POLICY obvr_select ON public.opening_balance_validation_rules
FOR SELECT TO authenticated
USING (public.fn_is_org_member(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS obvr_insert ON public.opening_balance_validation_rules;
CREATE POLICY obvr_insert ON public.opening_balance_validation_rules
FOR INSERT TO authenticated
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS obvr_update ON public.opening_balance_validation_rules;
CREATE POLICY obvr_update ON public.opening_balance_validation_rules
FOR UPDATE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()))
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS obvr_delete ON public.opening_balance_validation_rules;
CREATE POLICY obvr_delete ON public.opening_balance_validation_rules
FOR DELETE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));