# Single-Entry Accounting Playbook (Supabase)

This playbook implements a simplified, single-entry accounting model and UI helpers. It avoids double-entry tables and computes balances directly from the `public.transactions` table.

- No ledger_entries or journal tables
- Tree of accounts stays in `public.accounts` (ltree)
- Balances and trial balance come from `public.transactions`
- Mode selector for balances: `posted` or `all`
- Breadcrumbs RPC for the Tree of Accounts

Important assumptions about `public.transactions`:
- Columns: `id, org_id, entry_number, entry_date, debit_account_id, credit_account_id, amount, is_posted, posted_at, created_by, created_at, updated_at`
- Amount is in minor units (BIGINT)


## 0) Optional cleanup of legacy double-entry objects

SQL to run in Supabase (copy/paste)
```sql
-- Drop views that may depend on double-entry (ignore errors if missing)
DROP VIEW IF EXISTS public.v_general_ledger;
DROP VIEW IF EXISTS public.v_trial_balance_current;

-- Drop functions that depended on double-entry (ignore errors if missing)
DROP FUNCTION IF EXISTS public.get_trial_balance_as_of_with_fallback(uuid, timestamptz);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of(uuid, timestamptz);
DROP FUNCTION IF EXISTS public.get_subtree_balance_as_of(uuid, text, timestamptz);

-- Drop legacy journal tables (ONLY if you are certain you won't use them)
DROP TABLE IF EXISTS public.ledger_entries;
DROP TABLE IF EXISTS public.journal_lines;
DROP TABLE IF EXISTS public.journal_entries;
```

Verification SQL to run
```sql
SELECT to_regclass('public.ledger_entries')  AS ledger_entries,
       to_regclass('public.journal_lines')   AS journal_lines,
       to_regclass('public.journal_entries') AS journal_entries;
```


## 1) Tree of Accounts UI helper view
Fast list with `has_children` and `path_text` for UI.

SQL to run in Supabase (copy/paste)
```sql
CREATE OR REPLACE VIEW public.v_accounts_tree_ui AS
SELECT
  a.org_id,
  a.id,
  a.code,
  a.name,
  a.category,
  a.normal_balance,
  a.is_postable,
  a.status,
  a.parent_id,
  a.level,
  a.path::text AS path_text,
  EXISTS (SELECT 1 FROM public.accounts c WHERE c.parent_id = a.id) AS has_children,
  a.created_at,
  a.updated_at
FROM public.accounts a;
```

Verification SQL to run
```sql
SELECT org_id, code, name, level, has_children
FROM public.v_accounts_tree_ui
ORDER BY path_text
LIMIT 50;
```


## 2) Balances (mode-selectable: posted or all)

We provide current and as-of balances that accept a `p_mode` selector:
- `posted`: uses `is_posted = true` (and `posted_at` for the as-of cutoff)
- `all`: uses all transactions (and `entry_date` for the as-of cutoff)

Note: Ensure `entry_date` and `posted_at` exist on your `transactions` table.

### 2A) Current balances per account (mode-selectable)

SQL to run in Supabase (copy/paste)
```sql
CREATE OR REPLACE FUNCTION public.get_account_balances_current_tx(
  p_org_id uuid,
  p_mode   text DEFAULT 'posted'  -- 'posted' | 'all'
)
RETURNS TABLE (
  account_id uuid,
  code text,
  name text,
  normal_balance normal_side,
  debits_minor bigint,
  credits_minor bigint,
  balance_signed_minor bigint,
  balance_natural_minor bigint
)
LANGUAGE sql STABLE
AS $$
  WITH tx AS (
    SELECT *
    FROM public.transactions t
    WHERE t.org_id = p_org_id
      AND (
        (p_mode = 'posted' AND t.is_posted = true) OR
        (p_mode = 'all')
      )
  ),
  debits AS (
    SELECT debit_account_id AS account_id, SUM(amount) AS debits_minor
    FROM tx
    GROUP BY debit_account_id
  ),
  credits AS (
    SELECT credit_account_id AS account_id, SUM(amount) AS credits_minor
    FROM tx
    GROUP BY credit_account_id
  ),
  totals AS (
    SELECT
      COALESCE(d.account_id, c.account_id) AS account_id,
      COALESCE(d.debits_minor, 0)  AS debits_minor,
      COALESCE(c.credits_minor, 0) AS credits_minor
    FROM debits d
    FULL OUTER JOIN credits c ON d.account_id = c.account_id
  )
  SELECT
    a.id,
    a.code,
    a.name,
    a.normal_balance,
    COALESCE(t.debits_minor, 0)  AS debits_minor,
    COALESCE(t.credits_minor, 0) AS credits_minor,
    COALESCE(t.debits_minor, 0) - COALESCE(t.credits_minor, 0) AS balance_signed_minor,
    CASE
      WHEN a.normal_balance = 'debit'
        THEN COALESCE(t.debits_minor, 0) - COALESCE(t.credits_minor, 0)
      ELSE COALESCE(t.credits_minor, 0) - COALESCE(t.debits_minor, 0)
    END AS balance_natural_minor
  FROM public.accounts a
  LEFT JOIN totals t ON t.account_id = a.id
  WHERE a.org_id = p_org_id
  ORDER BY a.path;
$$;
```

Verification SQL to run
```sql
-- Replace with your org_id and test both modes
SELECT *
FROM public.get_account_balances_current_tx('00000000-0000-0000-0000-000000000001', 'posted')
LIMIT 50;

SELECT *
FROM public.get_account_balances_current_tx('00000000-0000-0000-0000-000000000001', 'all')
LIMIT 50;
```


### 2B) As-of balances (mode-selectable, cutoff)
- For `posted`, uses `posted_at <= p_as_of`.
- For `all`, uses `entry_date <= p_as_of`.

SQL to run in Supabase (copy/paste)
```sql
CREATE OR REPLACE FUNCTION public.get_account_balances_as_of_tx(
  p_org_id uuid,
  p_as_of  timestamptz,
  p_mode   text DEFAULT 'posted'  -- 'posted' | 'all'
)
RETURNS TABLE (
  account_id uuid,
  code text,
  name text,
  normal_balance normal_side,
  balance_signed_minor bigint,
  balance_natural_minor bigint
)
LANGUAGE sql STABLE
AS $$
  WITH tx AS (
    SELECT *
    FROM public.transactions t
    WHERE t.org_id = p_org_id
      AND (
        (p_mode = 'posted' AND t.is_posted = true AND t.posted_at <= p_as_of) OR
        (p_mode = 'all'    AND t.entry_date <= p_as_of)
      )
  ),
  debits AS (
    SELECT debit_account_id AS account_id, SUM(amount) AS debits_minor
    FROM tx
    GROUP BY debit_account_id
  ),
  credits AS (
    SELECT credit_account_id AS account_id, SUM(amount) AS credits_minor
    FROM tx
    GROUP BY credit_account_id
  ),
  totals AS (
    SELECT
      COALESCE(d.account_id, c.account_id) AS account_id,
      COALESCE(d.debits_minor, 0)  AS debits_minor,
      COALESCE(c.credits_minor, 0) AS credits_minor
    FROM debits d
    FULL OUTER JOIN credits c ON d.account_id = c.account_id
  )
  SELECT
    a.id,
    a.code,
    a.name,
    a.normal_balance,
    COALESCE(t.debits_minor, 0) - COALESCE(t.credits_minor, 0) AS balance_signed_minor,
    CASE
      WHEN a.normal_balance = 'debit'
        THEN COALESCE(t.debits_minor, 0) - COALESCE(t.credits_minor, 0)
      ELSE COALESCE(t.credits_minor, 0) - COALESCE(t.debits_minor, 0)
    END AS balance_natural_minor
  FROM public.accounts a
  LEFT JOIN totals t ON t.account_id = a.id
  WHERE a.org_id = p_org_id
  ORDER BY a.path;
$$;
```

Verification SQL to run
```sql
-- Replace org_id; test both modes
SELECT *
FROM public.get_account_balances_as_of_tx('00000000-0000-0000-0000-000000000001', now(), 'posted')
LIMIT 50;

SELECT *
FROM public.get_account_balances_as_of_tx('00000000-0000-0000-0000-000000000001', now(), 'all')
LIMIT 50;
```


### 2C) Trial balance (current, mode-selectable)

SQL to run in Supabase (copy/paste)
```sql
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_tx(
  p_org_id uuid,
  p_mode   text DEFAULT 'posted'  -- 'posted' | 'all'
)
RETURNS TABLE (
  account_id uuid,
  code text,
  name text,
  debit_column_minor bigint,
  credit_column_minor bigint
)
LANGUAGE sql STABLE
AS $$
  WITH tx AS (
    SELECT *
    FROM public.transactions t
    WHERE t.org_id = p_org_id
      AND (
        (p_mode = 'posted' AND t.is_posted = true) OR
        (p_mode = 'all')
      )
  ),
  debits AS (
    SELECT debit_account_id AS account_id, SUM(amount) AS debits_minor
    FROM tx
    GROUP BY debit_account_id
  ),
  credits AS (
    SELECT credit_account_id AS account_id, SUM(amount) AS credits_minor
    FROM tx
    GROUP BY credit_account_id
  ),
  totals AS (
    SELECT
      COALESCE(d.account_id, c.account_id) AS account_id,
      COALESCE(d.debits_minor, 0)  AS debits_minor,
      COALESCE(c.credits_minor, 0) AS credits_minor
    FROM debits d
    FULL OUTER JOIN credits c ON d.account_id = c.account_id
  )
  SELECT
    a.id,
    a.code,
    a.name,
    CASE WHEN COALESCE(t.debits_minor,0) >= COALESCE(t.credits_minor,0)
         THEN COALESCE(t.debits_minor,0) - COALESCE(t.credits_minor,0)
         ELSE 0 END AS debit_column_minor,
    CASE WHEN COALESCE(t.credits_minor,0) >  COALESCE(t.debits_minor,0)
         THEN COALESCE(t.credits_minor,0) - COALESCE(t.debits_minor,0)
         ELSE 0 END AS credit_column_minor
  FROM public.accounts a
  LEFT JOIN totals t ON t.account_id = a.id
  WHERE a.org_id = p_org_id
  ORDER BY a.code;
$$;
```

Verification SQL to run
```sql
SELECT *
FROM public.get_trial_balance_current_tx('00000000-0000-0000-0000-000000000001', 'posted')
ORDER BY code
LIMIT 100;

SELECT *
FROM public.get_trial_balance_current_tx('00000000-0000-0000-0000-000000000001', 'all')
ORDER BY code
LIMIT 100;
```


## 3) Breadcrumbs RPC for Tree of Accounts
Returns ancestors (root → node) for a given account in an org.

SQL to run in Supabase (copy/paste)
```sql
CREATE OR REPLACE FUNCTION public.get_account_ancestors(
  p_org_id uuid,
  p_account_id uuid
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  level int,
  path_text text
)
LANGUAGE sql STABLE
AS $$
  WITH me AS (
    SELECT path
    FROM public.accounts
    WHERE org_id = p_org_id AND id = p_account_id
    LIMIT 1
  )
  SELECT a.id, a.code, a.name, a.level, a.path::text
  FROM public.accounts a, me
  WHERE a.org_id = p_org_id
    AND a.path @> me.path
  ORDER BY a.path;
$$;
```

Verification SQL to run
```sql
-- Replace with real ids
SELECT *
FROM public.get_account_ancestors(
  '00000000-0000-0000-0000-000000000001',  -- org_id
  '00000000-0000-0000-0000-000000000002'   -- account_id
);
```


## 4) UI Integration Plan (mode selector + breadcrumbs)

- Accounts Tree
  - Load roots: `from('v_accounts_tree_ui').select('*').eq('org_id', org).is('parent_id', null).order('code')`
  - Expand node: `...eq('parent_id', nodeId).order('code')`
  - Search: `or('code.ilike.%term%,name.ilike.%term%').order('path_text')`; optionally fetch ancestors via `get_account_ancestors` for breadcrumb context.
  - Breadcrumbs: call `rpc('get_account_ancestors', { p_org_id: org, p_account_id: id })` and render root→node chips.

- Balances (mode selector)
  - UI control: radio/tabs: `posted` vs `all`.
  - Current balances: `rpc('get_account_balances_current_tx', { p_org_id: org, p_mode: mode })`.
  - As-of balances: `rpc('get_account_balances_as_of_tx', { p_org_id: org, p_as_of: cutoff, p_mode: mode })`.
  - Trial balance: `rpc('get_trial_balance_current_tx', { p_org_id: org, p_mode: mode })`.

- Transactions page
  - Pickers limited to active, postable accounts: `from('accounts').select('id,code,name').eq('org_id', org).eq('status','active').eq('is_postable', true).order('code')`.
  - Create/update/post logic unchanged; posting sets `is_posted=true` and `posted_at`.
  - After post, refresh balances based on selected mode.

- RLS (simple for now)
  - You can keep permissive RLS for fast iteration.
  - When ready for org isolation, enable org-based policies and seed `org_memberships` for the active org.


## 5) Notes
- Mode semantics
  - `posted`: authoritative financials. As-of uses `posted_at`.
  - `all`: includes drafts/unposted. As-of uses `entry_date`.
- Performance
  - Add indexes if needed: `transactions(org_id, is_posted, posted_at)`, `transactions(org_id, entry_date)`, and `transactions(debit_account_id)`/`(credit_account_id)` depending on workload.
- Testing
  - Seed a few posted and unposted rows to test mode differences.


