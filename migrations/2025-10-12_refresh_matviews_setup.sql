-- Migration: Setup matview refresh function and scheduling (pg_cron)
-- Purpose: Provide idempotent setup for refreshing reporting materialized views
-- Safety: Run multiple times; guarded by existence checks
-- Stop-and-verify: Uncomment schedule blocks you want to enable

BEGIN;

-- 0) Ensure required objects exist (matview, etc.). Adjust as needed for your environment.
-- If the matview does not exist yet, skip index creation gracefully.

-- 1) Ensure a UNIQUE index exists for CONCURRENTLY refresh
DO $$
DECLARE
  v_matview_exists boolean;
  v_idx_exists boolean;
BEGIN
  SELECT to_regclass('public.mv_expenses_categories_rollups') IS NOT NULL INTO v_matview_exists;

  IF v_matview_exists THEN
    -- Check if a unique index exists already on (id) or (id, org_id)
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename  = 'mv_expenses_categories_rollups'
        AND indexdef ILIKE '%UNIQUE%'
    ) INTO v_idx_exists;

    IF NOT v_idx_exists THEN
      -- Attempt to create a unique index on (id). If not unique, fallback to (id, org_id)
      BEGIN
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_expenses_rollups_id ON public.mv_expenses_categories_rollups (id)';
      EXCEPTION WHEN unique_violation OR others THEN
        -- Fallback pair
        BEGIN
          EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_expenses_rollups_id_org ON public.mv_expenses_categories_rollups (id, org_id)';
        EXCEPTION WHEN others THEN
          RAISE NOTICE 'Could not create unique index for concurrent refresh. Use non-concurrent refresh or adjust unique key.';
        END;
      END;
    END IF;
  ELSE
    RAISE NOTICE 'Matview public.mv_expenses_categories_rollups does not exist; skipping unique index setup.';
  END IF;
END
$$;

-- 2) Create concurrent refresh function (idempotent)
CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews_concurrent()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh in dependency-safe order if needed
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_expenses_categories_rollups;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Refresh failed for mv_expenses_categories_rollups: %', SQLERRM;
  END;
END
$$;

-- 3) (Optional) Create non-concurrent refresh function
CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_expenses_categories_rollups;
END
$$;

-- 4) Optional: lightweight refresh log table
CREATE TABLE IF NOT EXISTS public.mv_refresh_log (
  id bigserial PRIMARY KEY,
  matview_name text NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  message text NULL
);

-- 5) Optional: wrap refresh with logging variant (example for concurrent refresh)
CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews_concurrent_logged()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_ok boolean := true;
BEGIN
  BEGIN
    PERFORM public.refresh_reporting_matviews_concurrent();
  EXCEPTION WHEN others THEN
    v_ok := false;
    INSERT INTO public.mv_refresh_log (matview_name, ok, message)
    VALUES ('mv_expenses_categories_rollups', false, SQLERRM);
  END;

  IF v_ok THEN
    INSERT INTO public.mv_refresh_log (matview_name, ok, message)
    VALUES ('mv_expenses_categories_rollups', true, 'ok');
  END IF;
END
$$;

-- 6) Enable pg_cron (if available) and schedule jobs (comment/uncomment as needed)
-- Note: Not all managed Postgres instances allow CREATE EXTENSION pg_cron.
-- Guard the extension creation; if not available, skip scheduling.
DO $$
DECLARE
  v_has_pg_cron boolean;
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
    v_has_pg_cron := true;
  EXCEPTION WHEN insufficient_privilege OR undefined_file OR feature_not_supported THEN
    v_has_pg_cron := false;
  END;

  IF v_has_pg_cron THEN
    -- Example schedules (commented by default). Uncomment what you need.

    -- Every 15 minutes
    -- PERFORM cron.schedule('refresh_matviews_15m', '*/15 * * * *', $$SELECT public.refresh_reporting_matviews_concurrent_logged();$$);

    -- Nightly at 02:00
    -- PERFORM cron.schedule('refresh_matviews_nightly', '0 2 * * *', $$SELECT public.refresh_reporting_matviews_concurrent_logged();$$);

    -- On the hour with jitter to avoid stampede
    -- PERFORM cron.schedule('refresh_matviews_hourly_jitter', '0 * * * *', $$SELECT pg_sleep(5 + (random()*10)); SELECT public.refresh_reporting_matviews_concurrent_logged();$$);
  ELSE
    RAISE NOTICE 'pg_cron extension not available; skipping schedule creation. Use app-managed or event-driven refresh.';
  END IF;
END
$$;

COMMIT;
