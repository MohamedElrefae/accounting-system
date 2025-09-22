-- Phase 1 / 06 - opening_balances table, indexes, RLS, trigger
SET search_path = public;

CREATE TABLE IF NOT EXISTS public.opening_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE RESTRICT,
  cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT,
  amount numeric(20,4) NOT NULL,
  currency_code text,
  import_id uuid REFERENCES public.opening_balance_imports(id) ON DELETE SET NULL,
  is_locked boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ob_unique_row ON public.opening_balances (
  org_id, fiscal_year_id, account_id,
  COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE INDEX IF NOT EXISTS idx_ob_org_fy ON public.opening_balances (org_id, fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_ob_org_account ON public.opening_balances (org_id, account_id);
CREATE INDEX IF NOT EXISTS idx_ob_org_project ON public.opening_balances (org_id, project_id);
CREATE INDEX IF NOT EXISTS idx_ob_org_cost_center ON public.opening_balances (org_id, cost_center_id);
CREATE INDEX IF NOT EXISTS idx_ob_org_locked ON public.opening_balances (org_id, is_locked);

DROP TRIGGER IF EXISTS trg_ob_audit ON public.opening_balances;
CREATE TRIGGER trg_ob_audit
BEFORE INSERT OR UPDATE ON public.opening_balances
FOR EACH ROW EXECUTE FUNCTION public.tg_set_audit_fields();

ALTER TABLE public.opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ob_select ON public.opening_balances;
CREATE POLICY ob_select ON public.opening_balances
FOR SELECT TO authenticated
USING (public.fn_is_org_member(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS ob_insert ON public.opening_balances;
CREATE POLICY ob_insert ON public.opening_balances
FOR INSERT TO authenticated
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS ob_update ON public.opening_balances;
CREATE POLICY ob_update ON public.opening_balances
FOR UPDATE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()))
WITH CHECK (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));

DROP POLICY IF EXISTS ob_delete ON public.opening_balances;
CREATE POLICY ob_delete ON public.opening_balances
FOR DELETE TO authenticated
USING (public.fn_can_manage_fiscal(org_id, public.fn_current_user_id()));