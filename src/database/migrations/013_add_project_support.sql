-- 013_add_project_support.sql
-- Add project support to transactions table for project-based financial reporting
-- This migration is idempotent and can be run multiple times safely

BEGIN;

-- 1. Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  start_date DATE,
  end_date DATE,
  budget_amount DECIMAL(15, 2),
  created_by UUID,
  org_id UUID, -- For multi-tenant support
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_project_code_per_org UNIQUE(org_id, code)
);

-- 2. Add project_id to transactions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.transactions 
    ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 3. Add org_id to transactions table if it doesn't exist (for consistency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.transactions 
    ADD COLUMN org_id UUID;
  END IF;
END$$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON public.transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON public.transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects(code);

-- 5. Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for projects table
-- Allow authenticated users to view projects
DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT
  USING (true);

-- Allow authenticated users to insert projects
DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update projects they created or have manage permissions
DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects
  FOR UPDATE
  USING (
    created_by = auth.uid() 
    OR public.has_permission(auth.uid(), 'projects.manage')
  );

-- Allow users to delete projects they created or have manage permissions
DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_delete ON public.projects
  FOR DELETE
  USING (
    created_by = auth.uid() 
    OR public.has_permission(auth.uid(), 'projects.manage')
  );

-- 7. Add project-related permissions
INSERT INTO public.permissions(name, description)
VALUES 
  ('projects.create', 'Create new projects'),
  ('projects.update', 'Update projects'),
  ('projects.delete', 'Delete projects'),
  ('projects.manage', 'Manage all projects')
ON CONFLICT (name) DO NOTHING;

-- 8. Create function to get current user's org_id (placeholder - adjust based on your auth setup)
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  -- This is a placeholder function. In a real implementation, you would:
  -- 1. Get the org_id from user profile/claims
  -- 2. Or from a user_organizations table
  -- 3. Or from auth JWT claims
  -- For now, we'll return NULL which means "default organization"
  SELECT NULL::UUID;
$$;

-- 9. Create function to set default org_id for transactions
CREATE OR REPLACE FUNCTION public.set_transaction_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set org_id if not provided
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.get_current_org_id();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 10. Create trigger to automatically set org_id on transaction insert
DROP TRIGGER IF EXISTS tr_set_transaction_org_id ON public.transactions;
CREATE TRIGGER tr_set_transaction_org_id
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_transaction_org_id();

-- 11. Update existing transactions to have a default org_id (if they don't have one)
UPDATE public.transactions 
SET org_id = public.get_current_org_id() 
WHERE org_id IS NULL;

-- 12. Insert some sample projects (optional - for testing)
INSERT INTO public.projects (code, name, description, status, budget_amount, org_id, created_by)
VALUES 
  ('GENERAL', 'عام', 'المشروع العام للمعاملات غير المخصصة لمشروع معين', 'active', NULL, public.get_current_org_id(), auth.uid()),
  ('PROJ001', 'مشروع التطوير الأول', 'مشروع تطوير النظام المحاسبي', 'active', 100000.00, public.get_current_org_id(), auth.uid()),
  ('PROJ002', 'مشروع التسويق', 'حملة التسويق الرقمي', 'active', 50000.00, public.get_current_org_id(), auth.uid())
ON CONFLICT (org_id, code) DO NOTHING;

-- 13. Create view for project-based transaction reporting
CREATE OR REPLACE VIEW public.v_transactions_with_project AS
SELECT 
  t.*,
  p.code as project_code,
  p.name as project_name,
  p.status as project_status,
  p.budget_amount as project_budget
FROM public.transactions t
LEFT JOIN public.projects p ON t.project_id = p.id;

-- 14. Create function for project-based financial summary
CREATE OR REPLACE FUNCTION public.get_project_financial_summary(
  p_project_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  project_id UUID,
  project_code TEXT,
  project_name TEXT,
  project_budget DECIMAL(15,2),
  total_transactions_count BIGINT,
  total_debits DECIMAL(15,2),
  total_credits DECIMAL(15,2),
  net_amount DECIMAL(15,2),
  budget_utilization_percent DECIMAL(5,2)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH project_stats AS (
    SELECT 
      COALESCE(t.project_id, '00000000-0000-0000-0000-000000000000'::UUID) as pid,
      COUNT(t.id) as tx_count,
      SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_debits,
      SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_credits,
      SUM(t.amount) as net_amount
    FROM public.transactions t
    WHERE (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (p_date_from IS NULL OR t.entry_date >= p_date_from)
      AND (p_date_to IS NULL OR t.entry_date <= p_date_to)
      AND t.is_posted = true
    GROUP BY COALESCE(t.project_id, '00000000-0000-0000-0000-000000000000'::UUID)
  )
  SELECT 
    CASE WHEN ps.pid = '00000000-0000-0000-0000-000000000000'::UUID THEN NULL ELSE ps.pid END,
    COALESCE(p.code, 'UNASSIGNED'),
    COALESCE(p.name, 'غير مخصص لمشروع'),
    p.budget_amount,
    ps.tx_count,
    ps.total_debits,
    ps.total_credits,
    ps.net_amount,
    CASE 
      WHEN p.budget_amount IS NOT NULL AND p.budget_amount > 0 
      THEN (ABS(ps.net_amount) / p.budget_amount * 100.0)::DECIMAL(5,2)
      ELSE NULL 
    END as budget_utilization_percent
  FROM project_stats ps
  LEFT JOIN public.projects p ON ps.pid = p.id
  ORDER BY COALESCE(p.code, 'UNASSIGNED');
END;
$$;

COMMIT;
