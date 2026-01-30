-- ============================================================================
-- Migration: Create Audit Log Export Function
-- Date: January 25, 2026
-- Purpose: Export audit logs to CSV or JSON format
-- ============================================================================

-- ============================================================================
-- SECTION 1: Export audit logs as JSON
-- ============================================================================

CREATE OR REPLACE FUNCTION public.export_audit_logs_json(
  p_org_id UUID DEFAULT NULL,
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL,
  p_action_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  export_data JSONB,
  record_count INT,
  export_timestamp TIMESTAMP
) AS $$
DECLARE
  v_data JSONB;
  v_count INT;
BEGIN
  -- Build query with filters
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'org_id', org_id,
        'action', action,
        'table_name', table_name,
        'record_id', record_id,
        'old_values', old_values,
        'new_values', new_values,
        'ip_address', ip_address,
        'user_agent', user_agent,
        'created_at', created_at
      )
    ),
    COUNT(*)
  INTO v_data, v_count
  FROM public.audit_logs
  WHERE (p_org_id IS NULL OR org_id = p_org_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to)
    AND (p_action_filter IS NULL OR action ILIKE '%' || p_action_filter || '%');

  RETURN QUERY SELECT 
    COALESCE(v_data, '[]'::jsonb),
    COALESCE(v_count, 0),
    NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.export_audit_logs_json(UUID, TIMESTAMP, TIMESTAMP, TEXT) TO authenticated;

---

-- ============================================================================
-- SECTION 2: Export audit logs as CSV
-- ============================================================================

CREATE OR REPLACE FUNCTION public.export_audit_logs_csv(
  p_org_id UUID DEFAULT NULL,
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL,
  p_action_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  csv_data TEXT,
  record_count INT,
  export_timestamp TIMESTAMP
) AS $$
DECLARE
  v_csv TEXT;
  v_count INT;
BEGIN
  -- Build CSV header
  v_csv := 'ID,User ID,Org ID,Action,Table Name,Record ID,Old Values,New Values,IP Address,User Agent,Created At' || E'\n';

  -- Add CSV rows
  SELECT 
    v_csv || string_agg(
      quote_nullable(id::text) || ',' ||
      quote_nullable(user_id::text) || ',' ||
      quote_nullable(org_id::text) || ',' ||
      quote_nullable(action) || ',' ||
      quote_nullable(table_name) || ',' ||
      quote_nullable(record_id) || ',' ||
      quote_nullable(old_values::text) || ',' ||
      quote_nullable(new_values::text) || ',' ||
      quote_nullable(ip_address) || ',' ||
      quote_nullable(user_agent) || ',' ||
      quote_nullable(created_at::text),
      E'\n'
    ),
    COUNT(*)
  INTO v_csv, v_count
  FROM public.audit_logs
  WHERE (p_org_id IS NULL OR org_id = p_org_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to)
    AND (p_action_filter IS NULL OR action ILIKE '%' || p_action_filter || '%');

  RETURN QUERY SELECT 
    COALESCE(v_csv, ''),
    COALESCE(v_count, 0),
    NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.export_audit_logs_csv(UUID, TIMESTAMP, TIMESTAMP, TEXT) TO authenticated;

---

-- ============================================================================
-- SECTION 3: Get audit log summary statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_audit_log_summary(
  p_org_id UUID DEFAULT NULL,
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL
)
RETURNS TABLE(
  total_logs INT,
  unique_users INT,
  unique_actions INT,
  unique_tables INT,
  date_range_start TIMESTAMP,
  date_range_end TIMESTAMP,
  most_common_action TEXT,
  most_active_user UUID
) AS $$
DECLARE
  v_total INT;
  v_users INT;
  v_actions INT;
  v_tables INT;
  v_start TIMESTAMP;
  v_end TIMESTAMP;
  v_action TEXT;
  v_user UUID;
BEGIN
  -- Get summary statistics
  SELECT 
    COUNT(*),
    COUNT(DISTINCT user_id),
    COUNT(DISTINCT action),
    COUNT(DISTINCT table_name),
    MIN(created_at),
    MAX(created_at)
  INTO v_total, v_users, v_actions, v_tables, v_start, v_end
  FROM public.audit_logs
  WHERE (p_org_id IS NULL OR org_id = p_org_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  -- Get most common action
  SELECT action INTO v_action
  FROM public.audit_logs
  WHERE (p_org_id IS NULL OR org_id = p_org_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to)
  GROUP BY action
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Get most active user
  SELECT user_id INTO v_user
  FROM public.audit_logs
  WHERE (p_org_id IS NULL OR org_id = p_org_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to)
  GROUP BY user_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN QUERY SELECT 
    COALESCE(v_total, 0),
    COALESCE(v_users, 0),
    COALESCE(v_actions, 0),
    COALESCE(v_tables, 0),
    v_start,
    v_end,
    v_action,
    v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_audit_log_summary(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;

---

-- ============================================================================
-- SECTION 4: Get audit logs by action type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_audit_logs_by_action(
  p_action TEXT,
  p_org_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  id BIGINT,
  user_id UUID,
  org_id UUID,
  action TEXT,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    audit_logs.id,
    audit_logs.user_id,
    audit_logs.org_id,
    audit_logs.action,
    audit_logs.table_name,
    audit_logs.record_id,
    audit_logs.old_values,
    audit_logs.new_values,
    audit_logs.created_at
  FROM public.audit_logs
  WHERE action = p_action
    AND (p_org_id IS NULL OR org_id = p_org_id)
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_audit_logs_by_action(TEXT, UUID, INT) TO authenticated;

---

-- ============================================================================
-- SECTION 5: Get audit logs by user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_audit_logs_by_user(
  p_user_id UUID,
  p_org_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  id BIGINT,
  user_id UUID,
  org_id UUID,
  action TEXT,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    audit_logs.id,
    audit_logs.user_id,
    audit_logs.org_id,
    audit_logs.action,
    audit_logs.table_name,
    audit_logs.record_id,
    audit_logs.old_values,
    audit_logs.new_values,
    audit_logs.created_at
  FROM public.audit_logs
  WHERE user_id = p_user_id
    AND (p_org_id IS NULL OR org_id = p_org_id)
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_audit_logs_by_user(UUID, UUID, INT) TO authenticated;

---

-- ============================================================================
-- SECTION 6: Get audit logs by table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_audit_logs_by_table(
  p_table_name TEXT,
  p_org_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  id BIGINT,
  user_id UUID,
  org_id UUID,
  action TEXT,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    audit_logs.id,
    audit_logs.user_id,
    audit_logs.org_id,
    audit_logs.action,
    audit_logs.table_name,
    audit_logs.record_id,
    audit_logs.old_values,
    audit_logs.new_values,
    audit_logs.created_at
  FROM public.audit_logs
  WHERE table_name = p_table_name
    AND (p_org_id IS NULL OR org_id = p_org_id)
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_audit_logs_by_table(TEXT, UUID, INT) TO authenticated;

---

-- ============================================================================
-- SECTION 7: Verification Queries
-- ============================================================================

-- Verify export functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'export_audit_logs_json',
    'export_audit_logs_csv',
    'get_audit_log_summary',
    'get_audit_logs_by_action',
    'get_audit_logs_by_user',
    'get_audit_logs_by_table'
  )
ORDER BY routine_name;

-- Verify audit_logs table has data
SELECT 
  COUNT(*) as total_logs,
  COUNT(DISTINCT action) as unique_actions,
  COUNT(DISTINCT user_id) as unique_users
FROM public.audit_logs;
