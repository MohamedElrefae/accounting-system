-- Phase 1 / 04 - period_closing_checklists table, indexes, RLS, trigger
SET search_path = public;

CREATE TABLE IF NOT EXISTS public.period_closing_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id) ON DELETE RESTRICT,
  fiscal_period_id uuid NOT NULL REFERENCES public.fiscal_periods(id) ON DELETE RESTRICT,
  name_en text NOT NULL,
  name_ar text,
  description_en text,
  description_ar text,
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcl_status_chk CHECK (status IN ('pending','in_progress','completed')),
  CONSTRAINT pcl_unique_name_per_period UNIQUE (org_id, fiscal_period_id, name_en)
);

CREATE INDEX IF NOT EXISTS idx_pcl_org_period_status ON public.period_closing_checklists (org_id, fiscal_period_id, status);
CREATE INDEX IF NOT EXISTS idx_pcl_fiscal_year ON public.period_closing_checklists (fiscal_year_id);

DROP TRIGGER IF EXISTS trg_pcl_audit ON public.period_closing_checklists;
CREATE TRIGGER trg_pcl_audit
BEFORE INSERT OR UPDATE ON public.period_closing_checklists
FOR EACH ROW EXECUTE FUNCTION public.tg_set_audit_fields();

ALTER TABLE public.period_closing_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pcl_select ON public.period_closing_checklists;
CREATE POLICY pcl_select ON public.period_closing_checklists
FOR SELECT TO authenticated
USING (public.fn_is_org_member(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS pcl_insert ON public.period_closing_checklists;
CREATE POLICY pcl_insert ON public.period_closing_checklists
FOR INSERT TO authenticated
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS pcl_update ON public.period_closing_checklists;
CREATE POLICY pcl_update ON public.period_closing_checklists
FOR UPDATE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()))
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS pcl_delete ON public.period_closing_checklists;
CREATE POLICY pcl_delete ON public.period_closing_checklists
FOR DELETE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));