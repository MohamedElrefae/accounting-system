-- Phase 1 / 02 - fiscal_years table, indexes, RLS, trigger
SET search_path = public;

CREATE TABLE IF NOT EXISTS public.fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  year_number integer NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  description_en text,
  description_ar text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  is_current boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  closed_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fiscal_years_date_range_chk CHECK (start_date <= end_date),
  CONSTRAINT fiscal_years_status_chk CHECK (status IN ('draft','active','closed','archived')),
  CONSTRAINT fiscal_years_unique_per_org_year UNIQUE (org_id, year_number)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_years_org_status_current ON public.fiscal_years (org_id, status, is_current);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_org_year ON public.fiscal_years (org_id, year_number);

DROP TRIGGER IF EXISTS trg_fiscal_years_audit ON public.fiscal_years;
CREATE TRIGGER trg_fiscal_years_audit
BEFORE INSERT OR UPDATE ON public.fiscal_years
FOR EACH ROW EXECUTE FUNCTION public.tg_set_audit_fields();

ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fiscal_years_select ON public.fiscal_years;
CREATE POLICY fiscal_years_select ON public.fiscal_years
FOR SELECT TO authenticated
USING (public.fn_is_org_member(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS fiscal_years_insert ON public.fiscal_years;
CREATE POLICY fiscal_years_insert ON public.fiscal_years
FOR INSERT TO authenticated
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS fiscal_years_update ON public.fiscal_years;
CREATE POLICY fiscal_years_update ON public.fiscal_years
FOR UPDATE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()))
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS fiscal_years_delete ON public.fiscal_years;
CREATE POLICY fiscal_years_delete ON public.fiscal_years
FOR DELETE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));