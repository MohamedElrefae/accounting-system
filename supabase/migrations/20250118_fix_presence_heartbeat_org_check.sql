-- 2025-01-18_fix_presence_heartbeat_org_check.sql
-- Fix presence heartbeat to use user's default org if no org_id provided
SET search_path = public;

-- Update the presence heartbeat function to handle cases where org_id is not provided
-- or user is not a member of the specified org
CREATE OR REPLACE FUNCTION public.rpc_presence_heartbeat(
  p_org_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  success boolean,
  message text,
  user_id uuid,
  org_id uuid,
  last_active_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_effective_org_id uuid;
  v_can_access boolean := false;
BEGIN
  -- Get user's default organization if no org_id provided
  IF p_org_id IS NULL THEN
    v_effective_org_id := public.get_user_default_organization();
  ELSE
    v_effective_org_id := p_org_id;
  END IF;
  
  -- Check if user can access the organization
  v_can_access := public.is_super_admin() 
    OR public.fn_is_org_member(v_effective_org_id);
  
  -- If user cannot access the org, use their default org if they have one
  IF NOT v_can_access THEN
    v_effective_org_id := public.get_user_default_organization();
    v_can_access := v_effective_org_id IS NOT NULL;
  END IF;
  
  -- If still cannot access, return error
  IF NOT v_can_access THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  
  -- Insert or update heartbeat
  INSERT INTO public.user_presence_heartbeats (
    user_id,
    org_id,
    last_active_at,
    metadata
  ) VALUES (
    v_user_id,
    v_effective_org_id,
    NOW(),
    p_metadata
  )
  ON CONFLICT (user_id, org_id) 
  DO UPDATE SET
    last_active_at = NOW(),
    metadata = p_metadata;
  
  -- Return success response
  RETURN QUERY SELECT 
    true as success,
    'Heartbeat recorded' as message,
    v_user_id as user_id,
    v_effective_org_id as org_id,
    NOW() as last_active_at;
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_presence_heartbeat(uuid, jsonb) TO authenticated, service_role;
