-- ============================================================================
-- Migration: Add Audit Log Retention Policy
-- Date: January 25, 2026
-- Purpose: Automatically delete old audit logs and manage retention
-- ============================================================================

-- ============================================================================
-- SECTION 1: Create retention policy configuration table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_retention_config (
  id SERIAL PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  retention_days INT DEFAULT 90,
  auto_delete BOOLEAN DEFAULT TRUE,
  last_cleanup TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id)
);

-- Add RLS policy
ALTER TABLE public.audit_retention_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON public.audit_retention_config
  FOR ALL USING (
    org_id IN (
      SELECT organization_id FROM public.org_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_audit_retention_config_org_id 
  ON public.audit_retention_config(org_id);

---

-- ============================================================================
-- SECTION 2: Function to cleanup old audit logs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
  p_org_id UUID DEFAULT NULL,
  p_retention_days INT DEFAULT 90
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  records_deleted INT,
  cleanup_timestamp TIMESTAMP
) AS $$
DECLARE
  v_deleted_count INT;
  v_cutoff_date TIMESTAMP;
BEGIN
  v_cutoff_date := NOW() - (p_retention_days || ' days')::INTERVAL;

  -- Delete old audit logs
  DELETE FROM public.audit_logs
  WHERE (p_org_id IS NULL OR org_id = p_org_id)
    AND created_at < v_cutoff_date;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Update cleanup timestamp
  UPDATE public.audit_retention_config
  SET last_cleanup = NOW()
  WHERE (p_org_id IS NULL OR org_id = p_org_id);

  RETURN QUERY SELECT 
    TRUE,
    'Cleanup completed. Deleted logs older than ' || p_retention_days || ' days',
    v_deleted_count,
    NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs(UUID, INT) TO authenticated;

---

-- ============================================================================
-- SECTION 3: Function to set retention policy for organization
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_audit_retention_policy(
  p_org_id UUID,
  p_retention_days INT DEFAULT 90,
  p_auto_delete BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  org_id UUID,
  retention_days INT,
  auto_delete BOOLEAN
) AS $$
DECLARE
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();

  -- Validate org access
  IF NOT EXISTS (
    SELECT 1 FROM public.org_memberships 
    WHERE organization_id = p_org_id AND user_id = v_current_user
  ) THEN
    RETURN QUERY SELECT FALSE, 'No access to organization', p_org_id, 0, FALSE;
    RETURN;
  END IF;

  -- Insert or update retention config
  INSERT INTO public.audit_retention_config (org_id, retention_days, auto_delete, created_at, updated_at)
  VALUES (p_org_id, p_retention_days, p_auto_delete, NOW(), NOW())
  ON CONFLICT (org_id) DO UPDATE
  SET retention_days = p_retention_days,
      auto_delete = p_auto_delete,
      updated_at = NOW();

  RETURN QUERY SELECT 
    TRUE,
    'Retention policy updated',
    p_org_id,
    p_retention_days,
    p_auto_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_audit_retention_policy(UUID, INT, BOOLEAN) TO authenticated;

---

-- ============================================================================
-- SECTION 4: Function to get retention policy
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_audit_retention_policy(
  p_org_id UUID
)
RETURNS TABLE(
  org_id UUID,
  retention_days INT,
  auto_delete BOOLEAN,
  last_cleanup TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    audit_retention_config.org_id,
    audit_retention_config.retention_days,
    audit_retention_config.auto_delete,
    audit_retention_config.last_cleanup,
    audit_retention_config.created_at,
    audit_retention_config.updated_at
  FROM public.audit_retention_config
  WHERE org_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_audit_retention_policy(UUID) TO authenticated;

---

-- ============================================================================
-- SECTION 5: Scheduled job function (to be called by pg_cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.scheduled_audit_cleanup()
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  total_deleted INT
) AS $$
DECLARE
  v_org_id UUID;
  v_retention_days INT;
  v_total_deleted INT := 0;
  v_deleted_count INT;
  v_cutoff_date TIMESTAMP;
BEGIN
  -- Process each organization with auto_delete enabled
  FOR v_org_id, v_retention_days IN
    SELECT org_id, retention_days
    FROM public.audit_retention_config
    WHERE auto_delete = TRUE
  LOOP
    v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;

    -- Delete old audit logs for this org
    DELETE FROM public.audit_logs
    WHERE org_id = v_org_id
      AND created_at < v_cutoff_date;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;

    -- Update cleanup timestamp
    UPDATE public.audit_retention_config
    SET last_cleanup = NOW()
    WHERE org_id = v_org_id;
  END LOOP;

  RETURN QUERY SELECT 
    TRUE,
    'Scheduled cleanup completed',
    v_total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.scheduled_audit_cleanup() TO authenticated;

---

-- ============================================================================
-- SECTION 6: Function to get cleanup statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_audit_cleanup_stats(
  p_org_id UUID DEFAULT NULL
)
RETURNS TABLE(
  org_id UUID,
  retention_days INT,
  auto_delete BOOLEAN,
  last_cleanup TIMESTAMP,
  days_since_cleanup INT,
  estimated_logs_to_delete INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    arc.org_id,
    arc.retention_days,
    arc.auto_delete,
    arc.last_cleanup,
    EXTRACT(DAY FROM (NOW() - arc.last_cleanup))::INT as days_since_cleanup,
    COUNT(al.id)::INT as estimated_logs_to_delete
  FROM public.audit_retention_config arc
  LEFT JOIN public.audit_logs al ON 
    al.org_id = arc.org_id 
    AND al.created_at < (NOW() - (arc.retention_days || ' days')::INTERVAL)
  WHERE (p_org_id IS NULL OR arc.org_id = p_org_id)
  GROUP BY arc.org_id, arc.retention_days, arc.auto_delete, arc.last_cleanup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_audit_cleanup_stats(UUID) TO authenticated;

---

-- ============================================================================
-- SECTION 7: Initialize default retention policies
-- ============================================================================

-- Insert default retention policy for each organization
INSERT INTO public.audit_retention_config (org_id, retention_days, auto_delete, created_at, updated_at)
SELECT id, 90, TRUE, NOW(), NOW()
FROM public.organizations
WHERE id NOT IN (SELECT org_id FROM public.audit_retention_config WHERE org_id IS NOT NULL)
ON CONFLICT (org_id) DO NOTHING;

---

-- ============================================================================
-- SECTION 8: Verification Queries
-- ============================================================================

-- Verify retention config table exists
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'audit_retention_config';

-- Verify retention functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'cleanup_old_audit_logs',
    'set_audit_retention_policy',
    'get_audit_retention_policy',
    'scheduled_audit_cleanup',
    'get_audit_cleanup_stats'
  )
ORDER BY routine_name;

-- Show current retention policies
SELECT 
  org_id,
  retention_days,
  auto_delete,
  last_cleanup,
  updated_at
FROM public.audit_retention_config
ORDER BY updated_at DESC;

-- Show cleanup statistics
SELECT * FROM public.get_audit_cleanup_stats();
