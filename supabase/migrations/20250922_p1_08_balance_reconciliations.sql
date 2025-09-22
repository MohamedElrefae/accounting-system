-- Phase 1 / 08 - balance_reconciliations table
SET search_path = public;

CREATE TABLE IF NOT EXISTS public.balance_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id) ON DELETE RESTRICT,
  fiscal_period_id uuid REFERENCES public.fiscal_periods(id) ON DELETE SET NULL,
  as_of_date date NOT NULL,
  gl_total numeric(20,4),
  opening_total numeric(20,4),
  difference numeric(20,4),
  status text NOT NULL DEFAULT 'pending',
  notes_en text,
  notes_ar text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT br_status_chk CHECK (status IN ('pending','balanced','out_of_balance'))
);

CREATE INDEX IF NOT EXISTS idx_br_org_fy_status ON public.balance_reconciliations (org_id, fiscal_year_id, status);
CREATE INDEX IF NOT EXISTS idx_br_org_asof ON public.balance_reconciliations (org_id, as_of_date DESC);

DROP TRIGGER IF EXISTS trg_br_audit ON public.balance_reconciliations;
CREATE TRIGGER trg_br_audit
BEFORE INSERT OR UPDATE ON public.balance_reconciliations
FOR EACH ROW EXECUTE FUNCTION public.tg_set_audit_fields();

ALTER TABLE public.balance_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS br_select ON public.balance_reconciliations;
CREATE POLICY br_select ON public.balance_reconciliations
FOR SELECT TO authenticated
USING (public.fn_is_org_member(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS br_insert ON public.balance_reconciliations;
CREATE POLICY br_insert ON public.balance_reconciliations
FOR INSERT TO authenticated
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS br_update ON public.balance_reconciliations;
CREATE POLICY br_update ON public.balance_reconciliations
FOR UPDATE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()))
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS br_delete ON public.balance_reconciliations;
CREATE POLICY br_delete ON public.balance_reconciliations
FOR DELETE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));