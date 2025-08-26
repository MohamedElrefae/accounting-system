-- Final Project Support Migration - Tailored for Your Exact Schema
-- Execute this in the Supabase SQL Editor

-- 1. Add project permissions with all required columns
INSERT INTO public.permissions(name, name_ar, resource, action, description, description_ar, category)
VALUES 
  ('projects.create', 'إنشاء المشاريع', 'projects', 'create', 'Create new projects', 'إنشاء مشاريع جديدة', 'المشاريع'),
  ('projects.update', 'تعديل المشاريع', 'projects', 'update', 'Update existing projects', 'تعديل المشاريع الموجودة', 'المشاريع'),
  ('projects.delete', 'حذف المشاريع', 'projects', 'delete', 'Delete projects', 'حذف المشاريع', 'المشاريع'),
  ('projects.manage', 'إدارة المشاريع', 'projects', 'manage', 'Manage all project operations', 'إدارة جميع عمليات المشاريع', 'المشاريع')
ON CONFLICT (name) DO NOTHING;

-- 2. Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  start_date DATE,
  end_date DATE,
  budget_amount DECIMAL(15, 2),
  created_by UUID,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_project_code_per_org UNIQUE(org_id, code)
);

-- 3. Add project_id to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS project_id UUID;

-- Add foreign key constraint separately (in case projects table didn't exist before)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'transactions_project_id_fkey'
        AND table_name = 'transactions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END$$;

-- 4. Add org_id to transactions table for consistency
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS org_id UUID;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);

-- 6. Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for projects
DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects FOR SELECT USING (true);

DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update ON projects FOR UPDATE USING (
    created_by = auth.uid() 
    OR public.has_permission(auth.uid(), 'projects.manage')
);

DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete ON projects FOR DELETE USING (
    created_by = auth.uid() 
    OR public.has_permission(auth.uid(), 'projects.manage')
);

-- 8. Insert sample projects (only if they don't already exist)
INSERT INTO projects (code, name, description, status, budget_amount, created_by)
SELECT 'GENERAL', 'عام', 'المشروع العام للمعاملات غير المخصصة لمشروع معين', 'active', NULL, auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE code = 'GENERAL')
UNION ALL
SELECT 'PROJ001', 'مشروع التطوير الأول', 'مشروع تطوير النظام المحاسبي', 'active', 100000.00, auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE code = 'PROJ001')  
UNION ALL
SELECT 'PROJ002', 'مشروع التسويق', 'حملة التسويق الرقمي', 'active', 50000.00, auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE code = 'PROJ002');

-- 9. Create view for project-based transaction reporting
CREATE OR REPLACE VIEW v_transactions_with_project AS
SELECT 
  t.*,
  p.code as project_code,
  p.name as project_name,
  p.status as project_status,
  p.budget_amount as project_budget
FROM transactions t
LEFT JOIN projects p ON t.project_id = p.id;

-- 10. Create function for project financial summary
CREATE OR REPLACE FUNCTION get_project_financial_summary(
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
    FROM transactions t
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
  LEFT JOIN projects p ON ps.pid = p.id
  ORDER BY COALESCE(p.code, 'UNASSIGNED');
END;
$$;
