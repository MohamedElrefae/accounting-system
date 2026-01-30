-- Create permission_audit_logs table for tracking all permission changes
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_action CHECK (action IN ('ASSIGN', 'REVOKE', 'MODIFY', 'CREATE', 'DELETE'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_permission_audit_org_id ON permission_audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_user_id ON permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_created_at ON permission_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_resource ON permission_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_action ON permission_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_permission_audit_org_created ON permission_audit_logs(org_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can view permission audit logs for their organization
CREATE POLICY "Users can view permission audit logs for their organization"
  ON permission_audit_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy: Only service role can insert audit logs
CREATE POLICY "Service role can insert permission audit logs"
  ON permission_audit_logs FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON permission_audit_logs TO authenticated;
GRANT INSERT ON permission_audit_logs TO authenticated;
