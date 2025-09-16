-- 063_cost_analysis_settings.sql
-- Adds a simple org-level default tolerance for cost analysis variance

BEGIN;

CREATE TABLE IF NOT EXISTS public.cost_analysis_settings (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_tolerance numeric(18,6) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helper RPC: get default tolerance for org (returns 0 if not set)
CREATE OR REPLACE FUNCTION public.get_cost_analysis_default_tolerance(p_org_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((SELECT s.default_tolerance FROM public.cost_analysis_settings s WHERE s.org_id = p_org_id), 0)::numeric;
$$;

GRANT SELECT ON public.cost_analysis_settings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cost_analysis_default_tolerance(uuid) TO anon, authenticated, service_role;

COMMIT;