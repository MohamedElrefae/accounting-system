-- Phase 1 / 10 - Audit and approval helpers
SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_emit_audit_event(
  p_actor_id uuid,
  p_org_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_details jsonb := COALESCE(p_metadata,'{}'::jsonb); v_old jsonb := NULL; v_new jsonb := NULL; BEGIN
  IF p_action IS NULL OR p_entity_type IS NULL THEN RAISE EXCEPTION 'action and entity_type are required'; END IF;
  IF v_details ? 'old_values' THEN v_old := v_details->'old_values'; v_details := v_details - 'old_values'; END IF;
  IF v_details ? 'new_values' THEN v_new := v_details->'new_values'; v_details := v_details - 'new_values'; END IF;
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, old_values, new_values, details, created_at, entity_type, entity_id)
  VALUES (p_actor_id, p_action, p_entity_type, COALESCE(p_entity_id::text,NULL), v_old, v_new, v_details, now(), p_entity_type, COALESCE(p_entity_id::text,NULL));
END; $$;

CREATE OR REPLACE FUNCTION public.fn_create_approval_request(
  p_org_id uuid,
  p_target_table text,
  p_target_id uuid,
  p_requested_by uuid DEFAULT public.fn_current_user_id(),
  p_workflow_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_workflow_id uuid := p_workflow_id; v_request_id uuid; BEGIN
  IF p_org_id IS NULL OR p_target_table IS NULL OR p_target_id IS NULL THEN RAISE EXCEPTION 'org_id, target_table, and target_id are required'; END IF;
  IF v_workflow_id IS NULL THEN
    SELECT aw.id INTO v_workflow_id FROM public.approval_workflows aw WHERE (aw.org_id=p_org_id OR aw.org_id IS NULL) AND aw.is_active=TRUE AND aw.target_table=p_target_table ORDER BY aw.org_id DESC, aw.created_at ASC LIMIT 1;
  END IF;
  INSERT INTO public.approval_requests (target_table, target_id, org_id, workflow_id, current_step_order, status, submitted_by, submitted_at, meta, created_at, updated_at)
  VALUES (p_target_table, p_target_id, p_org_id, v_workflow_id, 1, 'pending', p_requested_by, now(), p_metadata, now(), now()) RETURNING id INTO v_request_id;
  RETURN v_request_id; END; $$;

DO $$ BEGIN
  BEGIN GRANT EXECUTE ON FUNCTION public.fn_emit_audit_event(uuid, uuid, text, uuid, text, jsonb) TO authenticated, service_role; EXCEPTION WHEN undefined_object THEN NULL; END;
  BEGIN GRANT EXECUTE ON FUNCTION public.fn_create_approval_request(uuid, text, uuid, uuid, uuid, jsonb) TO authenticated, service_role; EXCEPTION WHEN undefined_object THEN NULL; END;
END $$;