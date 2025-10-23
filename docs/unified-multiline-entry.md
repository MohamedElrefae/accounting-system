# Unified Multiline Entry — Implementation Record and Plan

This document summarizes the work completed to reset and seed the accounting chart (Egyptian COA) and enforce unified multiline transaction entry. It also outlines remaining tasks and a program-friendly plan for further backend and UI changes.

Status: Completed DB reset and seeding. Enforced multiline-only, balanced transactions, and leaf-account posting rules. Next up: optional DB guards and frontend updates for a smooth line-entry UX.


## Decisions and Outcomes

- Remove coexistence and use only the new Egyptian COA in `public.accounts`.
- Global unique index on `accounts.code` respected. One canonical set of codes is seeded for org MAIN.
- Enforced that transactions must be entered via `transaction_lines` only.
- Enforced that each transaction is:
  - Multi-line (>= 2 lines)
  - Balanced (sum of debits == sum of credits, totals > 0)
- Enforced that lines can only reference active, postable accounts that allow transactions.


## Environment Snapshot

- Target org: `bc16bacc-4fbe-4aeb-8ab1-fef2d895b441` (MAIN)
- Key tables/columns (present):
  - `public.accounts`:
    - id (uuid, default gen_random_uuid)
    - org_id (uuid, NOT NULL)
    - code (text, UNIQUE)
    - name (text)
    - name_ar (varchar)
    - category (public.account_category)
    - normal_balance (enum)
    - parent_id (uuid, nullable)
    - level (int)
    - path (ltree)
    - status (public.account_status)
    - description (text)
    - created_at, updated_at
    - is_standard (boolean)
    - allow_transactions (boolean)
    - is_postable (boolean)
    - is_active (boolean)
  - `public.transactions`:
    - debit_account_id, credit_account_id (legacy, now disallowed by CHECK)
  - `public.transaction_lines`:
    - transaction_id (FK -> transactions)
    - account_id (FK -> accounts)
    - line_no (unique per transaction)
    - debit_amount, credit_amount (numeric(15,4), non-negative, exactly one side positive)


## Work Completed (DB)

### 1) Backup and FK reference clearing

- Took timestamped backups of `public.accounts` before changes.
- Enumerated all FKs referencing `public.accounts` and cleared referencing rows/columns safely.
  - Transactional/detail tables: DELETE rows.
  - Config/master tables: NULLify FK columns when nullable; otherwise DELETE rows.

Program-friendly reference (illustrative):
```sql path=null start=null
-- Example: guarded deletion/nullification (simplified excerpt)
-- DELETE transactional rows
DELETE FROM public.transaction_lines WHERE account_id IS NOT NULL;
DELETE FROM public.transactions WHERE debit_account_id IS NOT NULL OR credit_account_id IS NOT NULL;
DELETE FROM public.opening_balances WHERE account_id IS NOT NULL;
DELETE FROM public.account_balance_snapshots WHERE account_id IS NOT NULL;

-- NULLify config references when nullable, else DELETE
UPDATE public.company_config SET input_vat_account_id = NULL WHERE input_vat_account_id IS NOT NULL;
```


### 2) Hard reset of accounts

- Truncated with CASCADE to satisfy FK restrictions.
```sql path=null start=null
BEGIN;
TRUNCATE TABLE public.accounts CASCADE;
COMMIT;
SELECT COUNT(*) AS accounts_after_reset FROM public.accounts; -- expected 0
```


### 3) Seeding the Egyptian COA (single org, globally unique codes)

- Inserted roots first, then children iteratively.
- Set fields: `org_id`=MAIN, `category` enum, `path` derived as `ltree` from codes, `level` via `nlevel(path)`, `is_postable/allow_transactions` set for leaves, `is_active=true`, `is_standard=true`, `status='active'`.

Excerpt of the seeding logic (program-friendly skeleton):
```sql path=null start=null
-- Seed roots
INSERT INTO public.accounts (
  org_id, code, name, name_ar,
  category, parent_id,
  level, path,
  description, created_at, updated_at,
  is_standard, allow_transactions, is_postable, is_active, status
)
SELECT
  'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
  c.code, c.name, c.name_ar,
  c.category, NULL,
  1, (c.code)::public.ltree,
  NULL, NOW(), NOW(),
  true, c.allow_transactions, c.is_postable, true, 'active'::public.account_status
FROM coa c
WHERE c.parent_code IS NULL
ON CONFLICT (code) DO UPDATE SET ...;

-- Seed children iteratively (parent found by code)
INSERT INTO public.accounts (
  org_id, code, name, name_ar,
  category, parent_id,
  level, path,
  description, created_at, updated_at,
  is_standard, allow_transactions, is_postable, is_active, status
)
SELECT
  'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
  c.code, c.name, c.name_ar,
  c.category,
  p.id,
  nlevel(p.path || (c.code)::public.ltree),
  (p.path || (c.code)::public.ltree),
  NULL, NOW(), NOW(),
  true, c.allow_transactions, c.is_postable, true, 'active'::public.account_status
FROM coa c
JOIN public.accounts p ON p.code = c.parent_code
WHERE NOT EXISTS (SELECT 1 FROM public.accounts a2 WHERE a2.code = c.code)
ON CONFLICT (code) DO UPDATE SET ...;
```

Validation result (sample):
```sql path=null start=null
-- Normal balance sanity (sample)
SELECT code, category, normal_balance
FROM public.accounts
WHERE code IN ('1110','2110','4100','5120')
ORDER BY code;
-- Expected mapping:
-- 1110 asset -> debit
-- 2110 liability -> credit
-- 4100 revenue -> credit
-- 5120 expense -> debit
```


### 4) Enforce unified multiline entry (DB-level)

4.1 Disallow legacy single-line columns in `transactions`
```sql path=null start=null
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_no_legacy_accounts,
ADD CONSTRAINT transactions_no_legacy_accounts
CHECK (debit_account_id IS NULL AND credit_account_id IS NULL);
```

4.2 Only leaf, active, allowed accounts may be used in `transaction_lines`
```sql path=null start=null
CREATE OR REPLACE FUNCTION public.fn_check_line_account_postable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_postable boolean;
  v_allow boolean;
  v_active boolean;
BEGIN
  SELECT a.is_postable, a.allow_transactions, a.is_active
  INTO v_is_postable, v_allow, v_active
  FROM public.accounts a
  WHERE a.id = NEW.account_id;

  IF v_is_postable IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Account % is not postable', NEW.account_id USING ERRCODE = 'check_violation';
  END IF;
  IF v_allow IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Account % does not allow transactions', NEW.account_id USING ERRCODE = 'check_violation';
  END IF;
  IF v_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Account % is not active', NEW.account_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_check_line_account_postable ON public.transaction_lines;
CREATE TRIGGER trg_check_line_account_postable
BEFORE INSERT OR UPDATE ON public.transaction_lines
FOR EACH ROW
EXECUTE FUNCTION public.fn_check_line_account_postable();
```

4.3 Enforce >= 2 lines and balance at commit (deferrable constraint triggers)
```sql path=null start=null
CREATE OR REPLACE FUNCTION public.fn_tx_must_be_balanced()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx_id uuid;
  v_lines int;
  v_debits numeric(30,4);
  v_credits numeric(30,4);
BEGIN
  IF TG_TABLE_NAME = 'transaction_lines' THEN
    IF TG_OP IN ('INSERT','UPDATE') THEN
      v_tx_id := NEW.transaction_id;
    ELSE
      v_tx_id := OLD.transaction_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    IF TG_OP IN ('INSERT','UPDATE') THEN
      v_tx_id := NEW.id;
    ELSE
      v_tx_id := OLD.id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unexpected table: %', TG_TABLE_NAME;
  END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(debit_amount),0), COALESCE(SUM(credit_amount),0)
  INTO v_lines, v_debits, v_credits
  FROM public.transaction_lines
  WHERE transaction_id = v_tx_id;

  IF v_lines < 2 THEN
    RAISE EXCEPTION 'Transaction % must have at least two lines (has %)', v_tx_id, v_lines
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_debits <> v_credits OR v_debits <= 0 THEN
    RAISE EXCEPTION 'Transaction % not balanced: debits=%, credits=%', v_tx_id, v_debits, v_credits
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_tx_balanced_lines ON public.transaction_lines;
CREATE CONSTRAINT TRIGGER trg_tx_balanced_lines
AFTER INSERT OR UPDATE OR DELETE ON public.transaction_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.fn_tx_must_be_balanced();

DROP TRIGGER IF EXISTS trg_tx_balanced_tx ON public.transactions;
CREATE CONSTRAINT TRIGGER trg_tx_balanced_tx
AFTER INSERT OR UPDATE ON public.transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.fn_tx_must_be_balanced();
```


### 5) Smoke tests executed

5.1 Header insert with legacy columns NULL (should pass)
```sql path=null start=null
WITH new_tx AS (
  INSERT INTO public.transactions (id, debit_account_id, credit_account_id, created_at)
  VALUES (gen_random_uuid(), NULL, NULL, NOW())
  RETURNING id
)
SELECT id AS tx_id FROM new_tx;
```

5.2 One line should fail (must have >= 2)
```sql path=null start=null
DO $$
DECLARE v_tx uuid; v_a_debit uuid; BEGIN
  INSERT INTO public.transactions (id, debit_account_id, credit_account_id, created_at)
  VALUES (gen_random_uuid(), NULL, NULL, NOW()) RETURNING id INTO v_tx;
  SELECT id INTO v_a_debit FROM public.accounts WHERE code = '1110';
  INSERT INTO public.transaction_lines (transaction_id, line_no, account_id, debit_amount, credit_amount)
  VALUES (v_tx, 1, v_a_debit, 100, 0);
END $$;
```

5.3 Two lines unbalanced should fail
```sql path=null start=null
DO $$
DECLARE v_tx uuid; v_a_debit uuid; v_a_credit uuid; BEGIN
  INSERT INTO public.transactions (id, debit_account_id, credit_account_id, created_at)
  VALUES (gen_random_uuid(), NULL, NULL, NOW()) RETURNING id INTO v_tx;
  SELECT id INTO v_a_debit FROM public.accounts WHERE code = '1110';
  SELECT id INTO v_a_credit FROM public.accounts WHERE code = '2110';
  INSERT INTO public.transaction_lines (transaction_id, line_no, account_id, debit_amount, credit_amount)
  VALUES (v_tx, 1, v_a_debit, 100, 0), (v_tx, 2, v_a_credit, 0, 90);
END $$;
```

5.4 Two lines balanced should pass
```sql path=null start=null
DO $$
DECLARE v_tx uuid; v_a_debit uuid; v_a_credit uuid; BEGIN
  INSERT INTO public.transactions (id, debit_account_id, credit_account_id, created_at)
  VALUES (gen_random_uuid(), NULL, NULL, NOW()) RETURNING id INTO v_tx;
  SELECT id INTO v_a_debit FROM public.accounts WHERE code = '1110';
  SELECT id INTO v_a_credit FROM public.accounts WHERE code = '2110';
  INSERT INTO public.transaction_lines (transaction_id, line_no, account_id, debit_amount, credit_amount)
  VALUES (v_tx, 1, v_a_debit, 100, 0), (v_tx, 2, v_a_credit, 0, 100);
END $$;

SELECT t.id AS tx_id, COUNT(tl.*) AS lines, SUM(tl.debit_amount) AS debits, SUM(tl.credit_amount) AS credits
FROM public.transactions t
JOIN public.transaction_lines tl ON tl.transaction_id = t.id
GROUP BY t.id
ORDER BY t.id DESC
LIMIT 5;
```

5.5 Non-postable/inactive account should be blocked
```sql path=null start=null
DO $$
DECLARE v_tx uuid; v_a_bad uuid; v_a_ok uuid; v_flags record; BEGIN
  SELECT id INTO v_a_bad FROM public.accounts WHERE code = '1110';
  SELECT id INTO v_a_ok  FROM public.accounts WHERE code = '2110';
  SELECT is_postable, allow_transactions, is_active INTO v_flags FROM public.accounts WHERE id = v_a_bad;
  UPDATE public.accounts SET is_postable = false WHERE id = v_a_bad;

  INSERT INTO public.transactions (id, debit_account_id, credit_account_id, created_at)
  VALUES (gen_random_uuid(), NULL, NULL, NOW()) RETURNING id INTO v_tx;

  INSERT INTO public.transaction_lines (transaction_id, line_no, account_id, debit_amount, credit_amount)
  VALUES (v_tx, 1, v_a_bad, 100, 0), (v_tx, 2, v_a_ok, 0, 100);

EXCEPTION WHEN others THEN
  UPDATE public.accounts
  SET is_postable = COALESCE(v_flags.is_postable, true),
      allow_transactions = COALESCE(v_flags.allow_transactions, true),
      is_active = COALESCE(v_flags.is_active, true)
  WHERE id = v_a_bad;
  RAISE;
END $$;
```


## Remaining Work & Recommendations

1) Optional DB guards
   - Enforce that all accounts seeded belong to org MAIN (sanity check query during CI).
   - Add an index on `accounts(parent_id)` if hierarchy queries are frequent.
   - Consider a generated column or trigger to auto-derive `normal_balance` from `category` if not already in place.

2) API changes (backend)
   - Remove/ignore `debit_account_id` and `credit_account_id` in request DTOs.
   - Require transaction header + array of lines in a single request/transaction.
   - Validate line rules server-side before hitting the DB for better UX.

3) UI changes (frontend)
   - Remove legacy single-line fields.
   - Add line editor (add/remove lines, line_no auto or reorder support).
   - Client validations mirroring DB:
     - Exactly one side positive per line
     - Non-negative amounts
     - At least two lines and balanced totals before enabling submit
     - Account picker filters: `is_postable=true AND allow_transactions=true AND is_active=true`
   - Inline totals summary and balanced status indicator.

4) Migration hygiene
   - Add a migration that codifies the triggers and constraints (idempotent) for non-prod/prod rollout.
   - Add rollback migrations to drop constraints/triggers if needed.

5) Documentation and CI
   - Include this document in repo under `DOCS/` and link from README.
   - Add CI smoke tests (SQL or integration tests) to assert:
     - Seeding success and code uniqueness
     - Transactions failing/passing under the scenarios above


## Rollback Procedures

- Restore from the latest backup table:
```sql path=null start=null
DO $$
DECLARE t text; BEGIN
  SELECT c.relname INTO t
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'accounts_backup_%'
  ORDER BY c.relname DESC LIMIT 1;
  IF t IS NULL THEN RAISE EXCEPTION 'No accounts_backup_* found'; END IF;
  EXECUTE 'TRUNCATE TABLE public.accounts CASCADE';
  EXECUTE format('INSERT INTO public.accounts SELECT * FROM public.%I', t);
END $$;

SELECT COUNT(*) AS accounts_restored_rows FROM public.accounts;
```

- Remove the multiline/balance constraints if needed:
```sql path=null start=null
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_no_legacy_accounts;
DROP TRIGGER IF EXISTS trg_check_line_account_postable ON public.transaction_lines;
DROP FUNCTION IF EXISTS public.fn_check_line_account_postable();
DROP TRIGGER IF EXISTS trg_tx_balanced_lines ON public.transaction_lines;
DROP TRIGGER IF EXISTS trg_tx_balanced_tx ON public.transactions;
DROP FUNCTION IF EXISTS public.fn_tx_must_be_balanced();
```


## Appendix: Quick Queries

- Count active accounts by category/postability
```sql path=null start=null
SELECT category, is_postable, COUNT(*) AS cnt
FROM public.accounts
WHERE is_active = true
GROUP BY category, is_postable
ORDER BY category, is_postable;
```

- Check parent linkage for key codes
```sql path=null start=null
SELECT code, parent_id IS NOT NULL AS has_parent
FROM public.accounts
WHERE code IN ('1100','1110','1200','1210','5100','5120')
ORDER BY code;
```

- Fetch leaf accounts for UI picker
```sql path=null start=null
SELECT id, code, name, name_ar
FROM public.accounts
WHERE is_postable = true AND allow_transactions = true AND is_active = true
ORDER BY code;
```



## Materialized Views: Scheduling and Refresh

This section outlines options to keep materialized views (e.g., `mv_expenses_categories_rollups`) fresh with minimal operational overhead. Use whichever approach best fits your environment.

Pre-requisites for CONCURRENTLY refresh
- Ensure each materialized view has a UNIQUE index on one or more columns (no WHERE clause). Example:
```sql path=null start=null
-- If (id) is unique
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_expenses_rollups_id
  ON public.mv_expenses_categories_rollups (id);

-- Or if (id, org_id) is the unique key
CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_expenses_rollups_id_org
  ON public.mv_expenses_categories_rollups (id, org_id);
```

### Option 1 — Database-native scheduler (pg_cron)

1) Enable pg_cron (one-time):
```sql path=null start=null
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2) Create a reusable refresh function:
```sql path=null start=null
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
```

3) Schedule jobs:
```sql path=null start=null
-- Every 15 minutes
SELECT cron.schedule(
  'refresh_matviews_15m',
  '*/15 * * * *',
  $$SELECT public.refresh_reporting_matviews_concurrent();$$
);

-- Nightly at 02:00
SELECT cron.schedule(
  'refresh_matviews_nightly',
  '0 2 * * *',
  $$SELECT public.refresh_reporting_matviews_concurrent();$$
);

-- On the hour with small jitter
SELECT cron.schedule(
  'refresh_matviews_hourly_jitter',
  '0 * * * *',
  $$SELECT pg_sleep(5 + (random()*10)); SELECT public.refresh_reporting_matviews_concurrent();$$
);
```

4) Manage jobs:
```sql path=null start=null
SELECT * FROM cron.job ORDER BY jobname;                -- list
SELECT cron.run_job('refresh_matviews_15m');            -- run now
SELECT cron.unschedule(jobid) FROM cron.job
WHERE jobname = 'refresh_matviews_15m';                -- unschedule
```

### Option 2 — Application-managed refresh
- Expose a small admin endpoint that executes `SELECT public.refresh_reporting_matviews_concurrent();`
- Call it after batch postings or on a timer (e.g., every 10–15 minutes). Useful when pg_cron is not available.

### Option 3 — Event-driven (LISTEN/NOTIFY + debounce worker)

1) Notify on changes:
```sql path=null start=null
CREATE OR REPLACE FUNCTION public.fn_notify_reporting_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify('reporting_changed', 'changed');
  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_notify_reporting_tl ON public.transaction_lines;
CREATE TRIGGER trg_notify_reporting_tl
AFTER INSERT OR UPDATE OR DELETE ON public.transaction_lines
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_notify_reporting_change();

DROP TRIGGER IF EXISTS trg_notify_reporting_subtree ON public.sub_tree;
CREATE TRIGGER trg_notify_reporting_subtree
AFTER INSERT OR UPDATE OR DELETE ON public.sub_tree
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_notify_reporting_change();
```

2) Worker process:
- LISTEN on `reporting_changed`
- Debounce (e.g., wait 30–60s without new events)
- Run `SELECT public.refresh_reporting_matviews_concurrent();`

### Option 4 — Off-hours non-concurrent refresh
- If a brief read lock is acceptable, skip the UNIQUE index and refresh off-hours.
```sql path=null start=null
CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_expenses_categories_rollups;
END
$$;

-- Nightly at 02:00 (requires pg_cron)
SELECT cron.schedule(
  'refresh_matviews_offhours',
  '0 2 * * *',
  $$SELECT public.refresh_reporting_matviews();$$
);
```

### Monitoring and logging
- Track outcomes of scheduled jobs:
```sql path=null start=null
SELECT *
FROM cron.job_run_details
ORDER BY runid DESC
LIMIT 20;
```

- Optional lightweight log table:
```sql path=null start=null
CREATE TABLE IF NOT EXISTS public.mv_refresh_log (
  id bigserial PRIMARY KEY,
  matview_name text NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  message text NULL
);
```
- Append entries from the refresh function inside each TRY/EXCEPTION block as needed.

## Appendix: Progress Summary (2025-10-13)
- Header/lines refactor: line-driven aggregation trigger in place; header aggregates maintained (total_debits, total_credits, line_items_count, line_items_total, has_line_items).
- Line-based core views: balance_sheet_view_v2, income_statement_view_v2, financial_summary_view_v2, trial_balance_view_v2 with canonical wrappers.
- Ops/rollups updated: v_tx_lines (project moved to lines), v_cost_center_costs_monthly (line-based), v_cost_centers (line-based), sub_tree_full_v2, v_expenses_categories_rollups_v2.
- Legacy header columns dropped from transactions: debit_account_id, credit_account_id, amount, source_module, source_reference_id.
- Validation/AP updated: transaction_validation_report_v2 and v_ap_invoice_postings_v2 now derive amount from line totals, wrappers updated.
- New analysis datasets: v_gl_lines_with_counterparty (line-grain with counterparty arrays) and v_gl_pairwise_entries (pairwise normalized using interval overlap). Materialized variants and indexes prepared.
- Transactions-level exports: v_gl_transactions_fact and v_gl_transactions_export_flat (CSV-friendly flattened), with materialized variants and optional pg_cron scheduling.
- Materialized views refreshed post-drop; current counts observed were 0 rows for mv_expenses_categories_rollups, mv_gl_transactions_fact, mv_gl_transactions_export_flat (expected if upstream data not yet present or filters exclude current data).

### Operational sanity queries (quick checks)
- Verify main views compile and return zero-or-more rows without errors. Useful after deployments.

```sql path=null start=null
-- Core enriched view and wrapper
SELECT 1 FROM public.transactions_enriched_v2 LIMIT 1;
SELECT 1 FROM public.transactions_enriched LIMIT 1;

-- Financial statements (v2)
SELECT 1 FROM public.balance_sheet_view_v2 LIMIT 1;
SELECT 1 FROM public.income_statement_view_v2 LIMIT 1;
SELECT 1 FROM public.trial_balance_view_v2 LIMIT 1;

-- Ops rollups
SELECT 1 FROM public.v_accounts_activity_rollups_v2 LIMIT 1;
SELECT 1 FROM public.v_expenses_categories_rollups_v2 LIMIT 1;

-- Validation / AP
SELECT 1 FROM public.transaction_validation_report_v2 LIMIT 1;
SELECT 1 FROM public.v_ap_invoice_postings_v2 LIMIT 1;

-- GL analytics
SELECT 1 FROM public.v_gl_lines_with_counterparty LIMIT 1;
SELECT 1 FROM public.v_gl_pairwise_entries LIMIT 1;

-- GL facts/exports
SELECT 1 FROM public.v_gl_transactions_fact LIMIT 1;
SELECT 1 FROM public.v_gl_transactions_export_flat LIMIT 1;
```

- Verify materialized views exist and counts are as expected for your dataset:
```sql path=null start=null
SELECT 'mv_expenses_categories_rollups' AS matview, COUNT(*) AS cnt FROM public.mv_expenses_categories_rollups
UNION ALL
SELECT 'mv_gl_transactions_fact', COUNT(*) FROM public.mv_gl_transactions_fact
UNION ALL
SELECT 'mv_gl_transactions_export_flat', COUNT(*) FROM public.mv_gl_transactions_export_flat;
```

### Optional: pg_cron scheduling quick recipes

1) Ensure pg_cron is installed (requires superuser privileges in many environments). If not available, skip to application-managed refresh.
```sql path=null start=null
-- Stop and verify this before proceeding to scheduling
SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
-- If zero rows, attempt to enable (may require superuser):
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2) Create/replace a refresh function. Use CONCURRENTLY only if your materialized views have a UNIQUE index.
```sql path=null start=null
CREATE OR REPLACE FUNCTION public.refresh_reporting_matviews_concurrent()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_expenses_categories_rollups;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Refresh failed: mv_expenses_categories_rollups: %', SQLERRM;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gl_transactions_fact;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Refresh failed: mv_gl_transactions_fact: %', SQLERRM;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_gl_transactions_export_flat;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Refresh failed: mv_gl_transactions_export_flat: %', SQLERRM;
  END;
END
$$;
```

3) Schedule jobs (examples). Adjust CRON expressions to your needs.
```sql path=null start=null
-- Stop and verify: list existing jobs
SELECT * FROM cron.job ORDER BY jobname;

-- Every 15 minutes
SELECT cron.schedule(
  'refresh_matviews_15m',
  '*/15 * * * *',
  $$SELECT public.refresh_reporting_matviews_concurrent();$$
);

-- Nightly at 02:00
SELECT cron.schedule(
  'refresh_matviews_nightly',
  '0 2 * * *',
  $$SELECT public.refresh_reporting_matviews_concurrent();$$
);

-- On the hour with jitter
SELECT cron.schedule(
  'refresh_matviews_hourly_jitter',
  '0 * * * *',
  $$SELECT pg_sleep(5 + (random()*10)); SELECT public.refresh_reporting_matviews_concurrent();$$
);
```

4) Monitor and manage jobs
```sql path=null start=null
-- View jobs
SELECT * FROM cron.job ORDER BY jobname;

-- Run now
SELECT cron.run_job('refresh_matviews_15m');

-- Unschedule
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'refresh_matviews_15m';

-- Recent runs
SELECT * FROM cron.job_run_details ORDER BY runid DESC LIMIT 20;
```

### Post‑migration verification checklist

- Schema integrity (legacy columns are gone)
```sql path=null start=null
SELECT c.column_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'transactions'
  AND c.column_name IN (
    'debit_account_id','credit_account_id','amount','source_module','source_reference_id'
  );
-- Expect: 0 rows
```

- Transaction balance invariant (no unbalanced posted transactions)
```sql path=null start=null
SELECT t.id, SUM(tl.debit_amount) AS debits, SUM(tl.credit_amount) AS credits
FROM public.transactions t
JOIN public.transaction_lines tl ON tl.transaction_id = t.id
WHERE t.is_posted = true
GROUP BY t.id
HAVING COALESCE(SUM(tl.debit_amount),0) <> COALESCE(SUM(tl.credit_amount),0)
   OR COALESCE(SUM(tl.debit_amount),0) <= 0;
-- Expect: 0 rows
```

- Constraint triggers present and deferrable
```sql path=null start=null
SELECT tg.tgname, c.relname AS table_name, tg.tgconstrrelid, tg.tgdeferrable, tg.tginitdeferred
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
WHERE c.relname IN ('transaction_lines','transactions')
  AND tg.tgname IN ('trg_tx_balanced_lines','trg_tx_balanced_tx','trg_check_line_account_postable')
ORDER BY c.relname, tg.tgname;
```

- Views/materialized views compile
```sql path=null start=null
SELECT 1 FROM public.transactions_enriched_v2 LIMIT 1;
SELECT 1 FROM public.transactions_enriched LIMIT 1;
SELECT 1 FROM public.balance_sheet_view_v2 LIMIT 1;
SELECT 1 FROM public.income_statement_view_v2 LIMIT 1;
SELECT 1 FROM public.trial_balance_view_v2 LIMIT 1;
SELECT 1 FROM public.v_gl_transactions_fact LIMIT 1;
SELECT 1 FROM public.v_gl_transactions_export_flat LIMIT 1;
```

### Performance index recommendations (line‑based model)

- Ensure these indexes exist for common filters/joins:
```sql path=null start=null
-- FK and join accelerators
CREATE INDEX IF NOT EXISTS ix_tl_transaction_id ON public.transaction_lines (transaction_id);
CREATE INDEX IF NOT EXISTS ix_tl_account_id      ON public.transaction_lines (account_id);

-- If org_id is replicated onto lines
-- CREATE INDEX IF NOT EXISTS ix_tl_org_id ON public.transaction_lines (org_id);

-- Unique line ordering per transaction (enforced if not already)
-- If a unique constraint exists at the app level, encode it in DB too
ALTER TABLE public.transaction_lines
  ADD CONSTRAINT IF NOT EXISTS uq_transaction_line_no
  UNIQUE (transaction_id, line_no);

-- Optional partials to speed rollups
-- CREATE INDEX IF NOT EXISTS ix_tl_debits  ON public.transaction_lines (transaction_id) WHERE debit_amount  > 0;
-- CREATE INDEX IF NOT EXISTS ix_tl_credits ON public.transaction_lines (transaction_id) WHERE credit_amount > 0;
```

- Accounts hierarchy helpers:
```sql path=null start=null
-- Useful for subtree queries
CREATE INDEX IF NOT EXISTS ix_accounts_parent_id ON public.accounts (parent_id);
-- If using ltree path
-- CREATE INDEX IF NOT EXISTS ix_accounts_path_gist ON public.accounts USING GIST (path);
```

### Decommission and cleanup notes

- Application/API
  - Remove any references to dropped transactions columns in DTOs, migrations, and serializers.
  - Ensure UI and API exclusively use transaction_lines for amounts and account mapping.
  - Keep wrapper views if external tools rely on legacy names; otherwise consider consolidating to the v2 names.

- Reporting/exports
  - If materialized views must be highly available during refresh, add UNIQUE indexes to support CONCURRENTLY.
  - Consider nightly full refresh plus frequent incremental refresh if your data volume is high.

- Observability
  - Track pg_cron job runs (cron.job_run_details) and alert on failures.
  - Optionally log refresh outcomes to public.mv_refresh_log as noted earlier.

---
Maintained by: Agent Mode (AI Terminal)
Last updated: 2025-10-13
