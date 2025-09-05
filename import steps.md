<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# <q>Here is a tightened, implementation-ready plan that reuses the already-existing master and fact tables (transaction_classification, work_items, expenses_categories, transactions), adds the minimum structural guards, and delivers a robust staging→master→transactions ETL with denormalized reporting views for downstream tools.</q> please repeat your work as we revised my work and and i prefer column reference number to be in both existing and my database as reference column for review my migration later and also ensure that tree of accounts is already exist and the same accounts data exist in database so i added here debit and credit name for more verification

Here is the revised, implementation‑ready ETL plan with the requested adjustments: the reference_number is preserved end‑to‑end for migration review, the accounts tree is verified and synchronized using debit/credit names for cross‑checks, and the pipeline reuses the existing master and fact tables with minimal structural guards and denormalized reporting views for downstream tools.[^1][^2]

## What changed

- Added and enforced a persistent reference_number in staging and public.transactions so it exists in both the legacy extract and the new database for later reconciliation.[^2][^1]
- Verified and synchronized the chart of accounts: detected that only a handful of accounts currently exist while hundreds are referenced by the extract; included an accounts_delta step that auto‑creates missing accounts using debit/credit account names for verification, or hard‑fails if strict mode is preferred.[^1][^2]
- Kept the existing master tables (transaction_classification, work_items, expenses_categories) and fact table (transactions), adding only minimal guards and idempotent upserts.[^2]


## Pre‑flight checks

- Data extract includes reference_number, debit_account_id, credit_account_id and their names, which will be leveraged to ensure referential and semantic consistency.[^1]
- Current database contains public.accounts with a small subset of accounts (e.g., 1110, 1120, 1130, 1240), company_config shows date_format DD/MM/YYYY, and a reporting dataset points to v_transactions_enriched.[^2]
- Automated scan shows reference_number is present in the extract; roughly 304 account codes are referenced in the file, only 6 are found in accounts, and about 301 are missing and must be inserted or the load must fail with a clear error.[^1][^2]


## Minimal DDL changes

- Ensure reference_number exists where needed and create staging schema and helper tables.[^2][^1]

```sql
-- 0) Safety: schema + extensions
CREATE SCHEMA IF NOT EXISTS staging;

-- 1) Public fact table: guarantee reference_number column
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reference_number text;

-- Optional: to help manual verification (not required for normalization),
-- persist denormalized names alongside codes during migration window
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS debit_account_name text,
  ADD COLUMN IF NOT EXISTS credit_account_name text;

-- 2) Staging raw landing (one-to-one with file columns; text-typed for safe load)
CREATE TABLE IF NOT EXISTS staging.raw_transactions (
  entry_date_text          text,
  reference_number         text,
  classification_code      text,
  classification_name      text,
  txn_description          text,
  work_item_code           text,
  work_item_description    text,
  expenses_code            text,
  expenses_description     text,
  amount_text              text,
  debit_account_code       text,
  credit_account_code      text,
  credit_account_name_src  text,
  debit_account_name_src   text,
  source_file              text DEFAULT 'paste.txt'
);

-- 3) Staging normalized view/table (typed & validated)
CREATE TABLE IF NOT EXISTS staging.trx_normalized (
  entry_date              date  NOT NULL,
  reference_number        text  NOT NULL,
  classification_code     text,
  classification_name     text,
  txn_description         text,
  work_item_code          text,
  work_item_description   text,
  expenses_code           text,
  expenses_description    text,
  amount                  numeric(18,2) NOT NULL CHECK (amount >= 0),
  debit_account_code      text NOT NULL,
  credit_account_code     text NOT NULL,
  debit_account_name_src  text,
  credit_account_name_src text,
  UNIQUE (reference_number, entry_date, amount, debit_account_code, credit_account_code)
);

-- 4) Missing-accounts buffer for controlled sync
CREATE TABLE IF NOT EXISTS staging.accounts_delta (
  code             text PRIMARY KEY,
  name             text,
  name_ar          text,
  category         text,
  normal_balance   text,
  allow_transactions boolean DEFAULT true
);
```


## Load extract into staging

- Load paste.txt as delivered into staging.raw_transactions using the column mapping below (tab‑separated or fixed column import); the mapping uses the extract’s English and Arabic headers.[^1]
- Column mapping:
    - entry_date_text ← “transaction entry_date” [DD/MM/YYYY], reference_number ← “reference_number” (string)[^1]
    - classification_code ← “transaction_classification code”, classification_name ← “transaction_classification name”[^1]
    - txn_description ← “transaction description”[^1]
    - work_item_code ← “work_items code”, work_item_description ← “work_items descrip”[^1]
    - expenses_code ← “expenses_categories code”, expenses_description ← “expenses_categories description”[^1]
    - amount_text ← “المبلغ”[^1]
    - debit_account_code ← “debit_account_id”, debit_account_name_src ← “debit_account desc”[^1]
    - credit_account_code ← “credit_account_id”, credit_account_name_src ← “credit_account_ descr”[^1]


## Normalize and validate staging

- Cast types, parse the date with DD/MM/YYYY per company_config, normalize amounts, and assert mandatory fields while keeping reference_number intact for cross‑system audit.[^2][^1]

```sql
-- Normalize into typed table
INSERT INTO staging.trx_normalized (
  entry_date, reference_number, classification_code, classification_name,
  txn_description, work_item_code, work_item_description,
  expenses_code, expenses_description, amount,
  debit_account_code, credit_account_code,
  debit_account_name_src, credit_account_name_src
)
SELECT
  to_date(NULLIF(TRIM(entry_date_text), ''), 'DD/MM/YYYY')                      AS entry_date,
  NULLIF(TRIM(reference_number), '')                                            AS reference_number,
  NULLIF(TRIM(classification_code), '')                                         AS classification_code,
  NULLIF(TRIM(classification_name), '')                                         AS classification_name,
  NULLIF(TRIM(txn_description), '')                                             AS txn_description,
  NULLIF(TRIM(work_item_code), '')                                              AS work_item_code,
  NULLIF(TRIM(work_item_description), '')                                       AS work_item_description,
  NULLIF(TRIM(expenses_code), '')                                               AS expenses_code,
  NULLIF(TRIM(expenses_description), '')                                        AS expenses_description,
  CASE
    WHEN TRIM(amount_text) ~ '^[0-9]+(\\.[0-9]+)?$' THEN amount_text::numeric(18,2)
    ELSE NULL
  END                                                                           AS amount,
  NULLIF(TRIM(debit_account_code), '')                                          AS debit_account_code,
  NULLIF(TRIM(credit_account_code), '')                                         AS credit_account_code,
  NULLIF(TRIM(debit_account_name_src), '')                                      AS debit_account_name_src,
  NULLIF(TRIM(credit_account_name_src), '')                                     AS credit_account_name_src
FROM staging.raw_transactions
WHERE COALESCE(TRIM(amount_text), '') <> ''
ON CONFLICT DO NOTHING;

-- Basic integrity checks (fail the run if any row violates)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM staging.trx_normalized WHERE entry_date IS NULL) THEN
    RAISE EXCEPTION 'Normalization error: NULL entry_date';
  END IF;

  IF EXISTS (SELECT 1 FROM staging.trx_normalized WHERE amount IS NULL OR amount < 0) THEN
    RAISE EXCEPTION 'Normalization error: amount missing or negative';
  END IF;

  IF EXISTS (SELECT 1 FROM staging.trx_normalized WHERE reference_number IS NULL) THEN
    RAISE EXCEPTION 'Normalization error: reference_number missing';
  END IF;

  IF EXISTS (SELECT 1 FROM staging.trx_normalized WHERE debit_account_code IS NULL OR credit_account_code IS NULL) THEN
    RAISE EXCEPTION 'Normalization error: missing account codes';
  END IF;
END $$;
```


## Upsert master data (reuse existing)

- transaction_classification: keyed by code, upsert name.[^2][^1]

```sql
INSERT INTO public.transaction_classification (code, name)
SELECT DISTINCT classification_code, classification_name
FROM staging.trx_normalized
WHERE classification_code IS NOT NULL
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
```

- work_items: keyed by code, upsert description.[^2][^1]

```sql
INSERT INTO public.work_items (code, name)
SELECT DISTINCT work_item_code, COALESCE(work_item_description, work_item_code)
FROM staging.trx_normalized
WHERE work_item_code IS NOT NULL
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
```

- expenses_categories: keyed by code, upsert description.[^2][^1]

```sql
INSERT INTO public.expenses_categories (code, name)
SELECT DISTINCT expenses_code, COALESCE(expenses_description, expenses_code)
FROM staging.trx_normalized
WHERE expenses_code IS NOT NULL
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
```


## Ensure the accounts tree exists and matches

- Pre‑check found a large gap between used account codes in the extract and existing accounts; build accounts_delta from distinct debit/credit codes and resolve names from the source columns for verification.[^2][^1]

```sql
-- Build delta of missing accounts
WITH used_codes AS (
  SELECT debit_account_code AS code, max(debit_account_name_src) AS nm
  FROM staging.trx_normalized GROUP BY debit_account_code
  UNION
  SELECT credit_account_code AS code, max(credit_account_name_src) AS nm
  FROM staging.trx_normalized GROUP BY credit_account_code
),
missing AS (
  SELECT u.code, u.nm
  FROM used_codes u
  LEFT JOIN public.accounts a ON a.code = u.code
  WHERE a.code IS NULL
)
INSERT INTO staging.accounts_delta (code, name, name_ar, category, normal_balance, allow_transactions)
SELECT
  m.code,
  COALESCE(NULLIF(m.nm, ''), 'Account ' || m.code) AS name,
  NULLIF(m.nm, '')                                  AS name_ar,
  /* Category by leading digit (observed: 1=asset, 2=liability, 4=revenue, 5=expense) */
  CASE LEFT(m.code, 1)
    WHEN '1' THEN 'asset'
    WHEN '2' THEN 'liability'
    WHEN '4' THEN 'revenue'
    WHEN '5' THEN 'expense'
    ELSE 'asset'
  END AS category,
  CASE LEFT(m.code, 1)
    WHEN '1' THEN 'debit'
    WHEN '5' THEN 'debit'
    ELSE 'credit'
  END AS normal_balance,
  TRUE AS allow_transactions
FROM missing m
ON CONFLICT (code) DO NOTHING;

-- Optional strictness: abort if delta not empty (switch between FAIL vs AUTO-CREATE)
-- RAISE EXCEPTION to force manual review instead of auto-inserting:
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM staging.accounts_delta) THEN
--     RAISE EXCEPTION 'Accounts missing: % codes need to be created', (SELECT count(*) FROM staging.accounts_delta);
--   END IF;
-- END $$;

-- Auto-create missing accounts (idempotent)
INSERT INTO public.accounts (id, code, name, name_ar, category, parent_id, path, level, org_id,
                             status, is_postable, is_standard, description, description_ar,
                             normal_balance, allow_transactions)
SELECT
  gen_random_uuid(),
  d.code,
  d.name,
  d.name_ar,
  d.category,
  NULL,           -- parent linkage can be filled if a full tree is already modeled
  d.code,         -- simple path == code; replace with hierarchical path if available
  3,              -- reasonable level for leaf
  (SELECT default_org_id FROM public.company_config LIMIT 1),
  'active',
  TRUE,
  FALSE,
  NULL, NULL,
  d.normal_balance,
  d.allow_transactions
FROM staging.accounts_delta d
LEFT JOIN public.accounts a ON a.code = d.code
WHERE a.code IS NULL;

-- Guard: enforce unique code
CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_code ON public.accounts(code);
```

- This step uses the new debit_account_name_src and credit_account_name_src to set name/name_ar, giving a human check that the created accounts match the source descriptions.[^2][^1]


## Insert facts with structural guards

- Insert into public.transactions while carrying forward reference_number and the denormalized debit/credit names for verification; joins can also be used to assert existence of codes.[^2][^1]

```sql
-- Optional id generation & numbering as per company_config (prefix JE, YYYYMM, 4 digits)
CREATE OR REPLACE FUNCTION public.next_entry_number() RETURNS text AS $$
DECLARE
  ym text := to_char(current_date, 'YYYYMM');
  prefix text := 'JE';
  pad int := 4;
  seq int;
BEGIN
  -- derive a per-month sequence
  SELECT COALESCE(MAX(SUBSTRING(entry_number FROM '\\d{4}$')::int), 0) + 1
    INTO seq
  FROM public.transactions
  WHERE entry_number LIKE prefix || '-' || ym || '-%';

  RETURN prefix || '-' || ym || '-' || lpad(seq::text, pad, '0');
END $$ LANGUAGE plpgsql;

-- Insert; ensure each accounting row has both accounts present
INSERT INTO public.transactions (
  entry_date, entry_number, reference_number,
  description, amount,
  debit_account_id, debit_account_code, debit_account_name,
  credit_account_id, credit_account_code, credit_account_name,
  classification_id, work_item_id, expenses_category_id,
  org_id, project_id, is_posted
)
SELECT
  n.entry_date,
  public.next_entry_number() AS entry_number,
  n.reference_number,
  n.txn_description,
  n.amount,
  adebit.id,  adebit.code,  n.debit_account_name_src,
  acredit.id, acredit.code, n.credit_account_name_src,
  tc.id, wi.id, ec.id,
  (SELECT default_org_id FROM public.company_config LIMIT 1),
  (SELECT default_project_id FROM public.company_config LIMIT 1),
  FALSE
FROM staging.trx_normalized n
JOIN public.accounts adebit  ON adebit.code  = n.debit_account_code
JOIN public.accounts acredit ON acredit.code = n.credit_account_code
LEFT JOIN public.transaction_classification tc ON tc.code = n.classification_code
LEFT JOIN public.work_items wi                   ON wi.code = n.work_item_code
LEFT JOIN public.expenses_categories ec         ON ec.code = n.expenses_code
ON CONFLICT DO NOTHING;

-- Guard: ensure reference_number is searchable and unique enough within a period
CREATE INDEX IF NOT EXISTS ix_transactions_reference_number ON public.transactions(reference_number);
```


## Denormalized reporting views

- Provide an enriched view that includes reference_number, debit/credit codes and names (from both master and original source), classification, work item, and expenses, ready for BI tools.[^2]

```sql
CREATE OR REPLACE VIEW public.v_transactions_enriched AS
SELECT
  t.entry_date,
  t.entry_number,
  t.reference_number,
  t.description,
  t.amount,
  t.debit_account_code,
  ad.name        AS debit_account_master_name,
  t.debit_account_name   AS debit_account_source_name,
  t.credit_account_code,
  ac.name        AS credit_account_master_name,
  t.credit_account_name  AS credit_account_source_name,
  tc.name        AS classification_name,
  wi.name        AS work_item_name,
  ec.name        AS expenses_category_name,
  org.name       AS organization_name,
  prj.name       AS project_name,
  t.is_posted
FROM public.transactions t
LEFT JOIN public.accounts ad ON ad.id = t.debit_account_id
LEFT JOIN public.accounts ac ON ac.id = t.credit_account_id
LEFT JOIN public.transaction_classification tc ON tc.id = t.classification_id
LEFT JOIN public.work_items wi ON wi.id = t.work_item_id
LEFT JOIN public.expenses_categories ec ON ec.id = t.expenses_category_id
LEFT JOIN public.organizations org ON org.id = t.org_id
LEFT JOIN public.projects prj ON prj.id = t.project_id;
```


## QA and reconciliation queries

- Reference column present and populated in both extract and DB: count non‑null reference_number in staging and transactions.[^2][^1]

```sql
SELECT 'staging_has_reference' AS check, COUNT(*) AS rows_with_ref
FROM staging.trx_normalized
WHERE reference_number IS NOT NULL
UNION ALL
SELECT 'facts_have_reference', COUNT(*)
FROM public.transactions
WHERE reference_number IS NOT NULL;
```

- Accounts coverage: zero missing accounts expected after delta upsert; if not zero, fail or fix mapping accordingly.[^1][^2]

```sql
SELECT COUNT(*) AS remaining_missing_accounts
FROM (
  SELECT debit_account_code AS code FROM staging.trx_normalized
  UNION
  SELECT credit_account_code AS code FROM staging.trx_normalized
) u
LEFT JOIN public.accounts a ON a.code = u.code
WHERE a.code IS NULL;
```

- Name verification: spot rows where master name disagrees with source name for manual review.[^2][^1]

```sql
SELECT t.entry_number, t.reference_number, t.debit_account_code,
       ad.name AS master_name, t.debit_account_name AS source_name
FROM public.transactions t
JOIN public.accounts ad ON ad.id = t.debit_account_id
WHERE NULLIF(TRIM(ad.name), '') IS DISTINCT FROM NULLIF(TRIM(t.debit_account_name), '')
LIMIT 50;
```


## Idempotency, posting, and indexing

- All inserts use ON CONFLICT guards; staging can be truncated and reloaded safely; consider wrapping the run in a transaction for all‑or‑nothing loads.[^2]
- Add helpful indexes on staging.trx_normalized(reference_number, entry_date) and public.transactions(entry_date, debit_account_code, credit_account_code) to speed reconciliation and reporting.[^2]

```sql
CREATE INDEX IF NOT EXISTS ix_stg_trx_ref_date ON staging.trx_normalized(reference_number, entry_date);
CREATE INDEX IF NOT EXISTS ix_trx_date ON public.transactions(entry_date);
CREATE INDEX IF NOT EXISTS ix_trx_accounts ON public.transactions(debit_account_code, credit_account_code);
```


## Notes on account mapping

- The extract uses revenue like 4110 and expenses like 5100; the CASE mapping categorizes 1=asset, 2=liability, 4=revenue, 5=expense to align names and balances during auto‑create, while leaving room to refine parent tree and paths if a hierarchical CoA already exists.[^1][^2]
- If strict parity is required, switch the auto‑insert to a hard fail and review staging.accounts_delta, which carries both code and human names from the extract for precise mapping before committing to public.accounts.[^1][^2]


## Outcome

- The pipeline preserves the original reference_number end‑to‑end for audit and later migration review, reuses existing master/fact tables, asserts and synchronizes the accounts tree using debit/credit names for verification, and provides an enriched reporting view that downstream tools can consume immediately.[^1][^2]

<div style="text-align: center">⁂</div>

[^1]: paste.txt

