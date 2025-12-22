-- 2025-12-20_rate_limit_and_fix_transactions_rls.sql
SET search_path = public;

-- 1) SECURITY: remove debug policy that exposes transactions publicly
DO $$ BEGIN
  DROP POLICY IF EXISTS debug_transactions_policy ON public.transactions;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Ensure RLS is enabled on transactions
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

-- Create proper policies for transactions
DO $$ BEGIN
  DROP POLICY IF EXISTS tx_select ON public.transactions;
  DROP POLICY IF EXISTS tx_insert ON public.transactions;
  DROP POLICY IF EXISTS tx_update ON public.transactions;
  DROP POLICY IF EXISTS tx_delete ON public.transactions;

  CREATE POLICY tx_select ON public.transactions
    FOR SELECT TO authenticated
    USING (public.is_super_admin() OR public.fn_is_org_member(org_id));

  CREATE POLICY tx_insert ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin() OR public.fn_is_org_member(org_id));

  CREATE POLICY tx_update ON public.transactions
    FOR UPDATE TO authenticated
    USING (public.is_super_admin() OR public.fn_is_org_member(org_id))
    WITH CHECK (public.is_super_admin() OR public.fn_is_org_member(org_id));

  CREATE POLICY tx_delete ON public.transactions
    FOR DELETE TO authenticated
    USING (public.is_super_admin() OR public.fn_is_org_member(org_id));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 2) COMMERCIAL: DB-enforced rate limiting (cannot be bypassed by direct Supabase calls)

-- Counters table for per-user rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  scope_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_key, window_start)
);

-- Lock down direct access to the counters table (functions only)
REVOKE ALL ON TABLE public.rate_limit_counters FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limit_counters FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limit_counters TO service_role;

-- Consume one unit from a rate limit bucket for the current authenticated user.
-- SECURITY DEFINER so it can update counters table while callers cannot.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_scope_key text;
  v_window_start timestamptz;
  v_count integer;
BEGIN
  -- Allow privileged roles to bypass (service operations, maintenance)
  IF current_user IN ('service_role', 'postgres') THEN
    RETURN;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;
  IF p_scope IS NULL OR length(trim(p_scope)) = 0 THEN
    RAISE EXCEPTION 'invalid rate limit scope' USING ERRCODE = '22023';
  END IF;
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RAISE EXCEPTION 'invalid rate limit limit' USING ERRCODE = '22023';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'invalid rate limit window' USING ERRCODE = '22023';
  END IF;

  v_scope_key := p_scope || ':' || v_uid::text;
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limit_counters(scope_key, window_start, count, updated_at)
  VALUES (v_scope_key, v_window_start, 1, now())
  ON CONFLICT (scope_key, window_start)
  DO UPDATE SET count = public.rate_limit_counters.count + 1,
                updated_at = now()
  RETURNING count INTO v_count;

  IF v_count > p_limit THEN
    RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = '42900';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO authenticated, service_role;

-- Trigger: rate limit writes to transactions (create/update/delete)
CREATE OR REPLACE FUNCTION public.tg_rate_limit_transactions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.consume_rate_limit('transactions_write', 60, 60);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS zzz_rate_limit_transactions ON public.transactions;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE TRIGGER zzz_rate_limit_transactions
BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.tg_rate_limit_transactions();

-- Trigger: rate limit writes to transaction_lines (bulk inserts are expected)
CREATE OR REPLACE FUNCTION public.tg_rate_limit_transaction_lines()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.consume_rate_limit('transaction_lines_write', 1000, 60);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS zzz_rate_limit_transaction_lines ON public.transaction_lines;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE TRIGGER zzz_rate_limit_transaction_lines
BEFORE INSERT OR UPDATE OR DELETE ON public.transaction_lines
FOR EACH ROW EXECUTE FUNCTION public.tg_rate_limit_transaction_lines();
