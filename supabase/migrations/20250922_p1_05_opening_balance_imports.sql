-- Phase 1 / 05 - opening_balance_imports table, indexes, RLS, trigger
SET search_path = public;

CREATE TABLE IF NOT EXISTS public.opening_balance_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id) ON DELETE RESTRICT,
  source text NOT NULL,
  source_file_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  success_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  error_report jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT obi_status_chk CHECK (status IN ('pending','processing','completed','failed','partially_completed'))
);

CREATE INDEX IF NOT EXISTS idx_obi_org_fy_status ON public.opening_balance_imports (org_id, fiscal_year_id, status);
CREATE INDEX IF NOT EXISTS idx_obi_created_at ON public.opening_balance_imports (created_at DESC);

DROP TRIGGER IF EXISTS trg_obi_audit ON public.opening_balance_imports;
CREATE TRIGGER trg_obi_audit
BEFORE INSERT OR UPDATE ON public.opening_balance_imports
FOR EACH ROW EXECUTE FUNCTION public.tg_set_audit_fields();

ALTER TABLE public.opening_balance_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS obi_select ON public.opening_balance_imports;
CREATE POLICY obi_select ON public.opening_balance_imports
FOR SELECT TO authenticated
USING (public.fn_is_org_member(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS obi_insert ON public.opening_balance_imports;
CREATE POLICY obi_insert ON public.opening_balance_imports
FOR INSERT TO authenticated
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS obi_update ON public.opening_balance_imports;
CREATE POLICY obi_update ON public.opening_balance_imports
FOR UPDATE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()))
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS obi_delete ON public.opening_balance_imports;
CREATE POLICY obi_delete ON public.opening_balance_imports
FOR DELETE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));