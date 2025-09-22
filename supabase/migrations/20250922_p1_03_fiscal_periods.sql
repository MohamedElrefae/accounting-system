-- Phase 1 / 03 - fiscal_periods table, indexes, RLS, trigger
SET search_path = public;

CREATE TABLE IF NOT EXISTS public.fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id) ON DELETE RESTRICT,
  period_number integer NOT NULL,
  period_code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  description_en text,
  description_ar text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  is_current boolean NOT NULL DEFAULT false,
  closing_notes text,
  closed_at timestamptz,
  closed_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fiscal_periods_date_range_chk CHECK (start_date <= end_date),
  CONSTRAINT fiscal_periods_status_chk CHECK (status IN ('open','locked','closed')),
  CONSTRAINT fiscal_periods_unique_per_year_num UNIQUE (org_id, fiscal_year_id, period_number)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_org_year_status ON public.fiscal_periods (org_id, fiscal_year_id, status);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_org_current ON public.fiscal_periods (org_id, is_current);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_year_number ON public.fiscal_periods (fiscal_year_id, period_number);

DROP TRIGGER IF EXISTS trg_fiscal_periods_audit ON public.fiscal_periods;
CREATE TRIGGER trg_fiscal_periods_audit
BEFORE INSERT OR UPDATE ON public.fiscal_periods
FOR EACH ROW EXECUTE FUNCTION public.tg_set_audit_fields();

ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fiscal_periods_select ON public.fiscal_periods;
CREATE POLICY fiscal_periods_select ON public.fiscal_periods
FOR SELECT TO authenticated
USING (public.fn_is_org_member(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS fiscal_periods_insert ON public.fiscal_periods;
CREATE POLICY fiscal_periods_insert ON public.fiscal_periods
FOR INSERT TO authenticated
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS fiscal_periods_update ON public.fiscal_periods;
CREATE POLICY fiscal_periods_update ON public.fiscal_periods
FOR UPDATE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()))
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS fiscal_periods_delete ON public.fiscal_periods;
CREATE POLICY fiscal_periods_delete ON public.fiscal_periods
FOR DELETE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));