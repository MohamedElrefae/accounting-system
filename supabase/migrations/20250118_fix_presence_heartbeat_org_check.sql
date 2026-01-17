-- 2025-01-18_fix_presence_heartbeat_org_check.sql
-- Fix presence heartbeat to use user's default org if no org_id provided
SET search_path = public;

-- Drop existing function first (it has different return type)
DROP FUNCTION IF EXISTS public.rpc_presence_heartbeat(uuid, jsonb);

-- Update the presence heartbeat function to handle cases where org_id is not provided
-- or user is not a member of the specified org
CREATE OR REPLACE FUNCTION public.rpc_presence_heartbeat(
  p_org_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_effective_org_id uuid;
  v_can_access boolean := false;
BEGIN
  -- Skip heartbeat if no authenticated user
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get user's default organization if no org_id provided
  IF p_org_id IS NULL THEN
    BEGIN
      v_effective_org_id := public.get_user_default_organization();
    EXCEPTION WHEN OTHERS THEN
      -- If get_user_default_organization fails, return silently
      RETURN;
    END;
  ELSE
    v_effective_org_id := p_org_id;
  END IF;
  
  -- If still no effective org, skip heartbeat
  IF v_effective_org_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check if user can access organization
  BEGIN
    v_can_access := public.is_super_admin() 
      OR public.fn_is_org_member(v_effective_org_id);
  EXCEPTION WHEN OTHERS THEN
    -- If permission check fails, assume no access
    v_can_access := false;
  END;
  
  -- If user cannot access org, try their default org
  IF NOT v_can_access THEN
    BEGIN
      v_effective_org_id := public.get_user_default_organization();
      v_can_access := v_effective_org_id IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      v_can_access := false;
    END;
  END IF;
  
  -- If still cannot access, skip heartbeat silently
  IF NOT v_can_access THEN
    RETURN;
  END IF;
  
  -- Insert or update heartbeat
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Silently fail on heartbeat errors to avoid breaking app
    RETURN;
  END;
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_presence_heartbeat(uuid, jsonb) TO authenticated, service_role;
