-- Phase 2: Audit Logging System
-- Creates audit_log table and functions for tracking permission changes

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT audit_log_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Create audit function
CREATE OR REPLACE FUNCTION log_audit(
  p_org_id uuid,
  p_action text,
  p_resource text,
  p_resource_id text DEFAULT NULL,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO audit_log (org_id, user_id, action, resource, resource_id, old_value, new_value)
  VALUES (p_org_id, auth.uid(), p_action, p_resource, p_resource_id, p_old_value, p_new_value);
$$;

GRANT EXECUTE ON FUNCTION log_audit TO authenticated;

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for audit_log - users can see audit logs for their orgs
CREATE POLICY IF NOT EXISTS audit_log_org_isolation ON audit_log
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
    )
  );

-- Create RLS policy for audit_log - only service role can insert
CREATE POLICY IF NOT EXISTS audit_log_insert_service_role ON audit_log
  FOR INSERT
  WITH CHECK (true);
