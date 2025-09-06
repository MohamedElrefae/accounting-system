# Journal Import: Progress Log and Next Steps

Date: 2025-09-05
Environment: Supabase (PostgreSQL)

Summary
- Source file: DailyJournalR6.csv (semicolon-delimited, Arabic headers)
- Mapped file created for import: DailyJournalR6_mapped.csv
- Approach: Staging → Normalize → Validate → Masters Upsert → Accounts STRICT sync → Transactions insert
- Orientation: Mapping B (debit <- raw.credit_account_*, credit <- raw.debit_account_*)
- Idempotency: All steps are repeatable and guard against duplicates
- Status: Data is loaded into staging. Transactions were inserted excluding rows where debit==credit. Same-account rows are logged for manual correction.

What’s already set up
- Staging schema and tables: staging.raw_transactions, staging.trx_normalized, staging.accounts_delta
- Helper tables used during normalization/fill/dedup: staging.ref_unique, staging.trx_computed, staging.trx_ranked, staging.trx_missing_codes, staging.trx_duplicates_dropped
- Accounts delta built and missing accounts inserted with enum + ltree aware insert, skipping generated columns
- transaction_classification upserted with unique-name-safe logic (to avoid (org_id, name) conflicts)
- Transactions insert implemented with functionless entry_number generation (per company_config), excluding rows where debit==credit
- Same-account entries captured in:
  - staging.trx_same_account (report)
  - staging.trx_corrections (worksheet to capture manual fixes)

How to resume later
1) Review same-account rows
```sql path=null start=null
-- Count and a sample
SELECT COUNT(*) AS same_account_count
FROM staging.trx_normalized
WHERE debit_account_code::text = credit_account_code::text;

SELECT reference_number, entry_date, amount,
       debit_account_code AS account_code,
       debit_account_name_src, credit_account_name_src
FROM staging.trx_normalized
WHERE debit_account_code::text = credit_account_code::text
ORDER BY entry_date, reference_number, amount
LIMIT 25;
```

2) Prepare/seed corrections sheet (only needed once)
```sql path=null start=null
-- Corrections worksheet (you’ll set the new_* codes)
CREATE TABLE IF NOT EXISTS staging.trx_corrections (
  reference_number    text        NOT NULL,
  entry_date          date        NOT NULL,
  amount              numeric(18,2) NOT NULL,
  current_debit_code  text        NOT NULL,
  current_credit_code text        NOT NULL,
  new_debit_code      text        NULL,
  new_credit_code     text        NULL,
  note                text        NULL,
  PRIMARY KEY (reference_number, entry_date, amount, current_debit_code, current_credit_code)
);

-- Seed rows where debit == credit
INSERT INTO staging.trx_corrections (
  reference_number, entry_date, amount,
  current_debit_code, current_credit_code
)
SELECT
  reference_number, entry_date, amount,
  debit_account_code, credit_account_code
FROM staging.trx_normalized
WHERE debit_account_code::text = credit_account_code::text
ON CONFLICT DO NOTHING;

-- Preview
SELECT *
FROM staging.trx_corrections
ORDER BY entry_date, reference_number, amount
LIMIT 50;
```

3) Fill corrections (you edit these UPDATEs)
- For each row that needs import, set new_debit_code and new_credit_code (must be different and exist in public.accounts).
- Copy one line per row and replace the placeholders.
```sql path=null start=null
-- TEMPLATE (replace {{...}})
UPDATE staging.trx_corrections
SET new_debit_code = '{{DEBIT_CODE}}', new_credit_code = '{{CREDIT_CODE}}', note = 'manual fix'
WHERE reference_number = '{{REF}}' AND entry_date = '{{YYYY-MM-DD}}' AND amount = {{AMOUNT}};

-- Example:
-- UPDATE staging.trx_corrections
-- SET new_debit_code = '1110', new_credit_code = '1120', note = 'bank -> AR'
-- WHERE reference_number = '416-01' AND entry_date = '2024-06-13' AND amount = 900000;
```

4) Validate corrections
```sql path=null start=null
-- Rows with both new codes and they differ
SELECT COUNT(*) AS rows_ready
FROM staging.trx_corrections
WHERE new_debit_code IS NOT NULL
  AND new_credit_code IS NOT NULL
  AND new_debit_code::text IS DISTINCT FROM new_credit_code::text;

-- New codes exist in accounts?
SELECT
  COUNT(*) FILTER (WHERE a1.id IS NULL) AS missing_new_debit_codes,
  COUNT(*) FILTER (WHERE a2.id IS NULL) AS missing_new_credit_codes
FROM staging.trx_corrections c
LEFT JOIN public.accounts a1 ON a1.code::text = c.new_debit_code
LEFT JOIN public.accounts a2 ON a2.code::text = c.new_credit_code
WHERE c.new_debit_code IS NOT NULL
  AND c.new_credit_code IS NOT NULL;

-- Preview ready corrections
SELECT c.*
FROM staging.trx_corrections c
LEFT JOIN public.accounts a1 ON a1.code::text = c.new_debit_code
LEFT JOIN public.accounts a2 ON a2.code::text = c.new_credit_code
WHERE c.new_debit_code IS NOT NULL
  AND c.new_credit_code IS NOT NULL
  AND a1.id IS NOT NULL
  AND a2.id IS NOT NULL
ORDER BY c.entry_date, c.reference_number, c.amount
LIMIT 50;
```

5) Apply corrected rows (insert only corrected subset)
- This generates entry_number inline and inserts only the corrected records that aren’t already in public.transactions.
```sql path=null start=null
WITH cfg AS (
  SELECT
    transaction_number_prefix                  AS prefix,
    transaction_number_use_year_month          AS use_ym,
    transaction_number_length                  AS pad,
    COALESCE(transaction_number_separator, '') AS sep
  FROM public.company_config
  LIMIT 1
),
corrections_ready AS (
  SELECT
    c.reference_number,
    c.entry_date,
    c.amount,
    c.new_debit_code  AS debit_account_code,
    c.new_credit_code AS credit_account_code
  FROM staging.trx_corrections c
  WHERE c.new_debit_code IS NOT NULL
    AND c.new_credit_code IS NOT NULL
    AND c.new_debit_code::text IS DISTINCT FROM c.new_credit_code::text
),
src AS (
  SELECT
    n.entry_date,
    n.reference_number,
    n.txn_description,
    n.amount,
    cr.debit_account_code,
    cr.credit_account_code,
    n.debit_account_name_src,
    n.credit_account_name_src,
    n.classification_code,
    n.work_item_code,
    n.expenses_code,
    (SELECT default_org_id FROM public.company_config LIMIT 1)     AS org_id,
    (SELECT default_project_id FROM public.company_config LIMIT 1) AS project_id
  FROM corrections_ready cr
  JOIN staging.trx_normalized n
    ON n.reference_number = cr.reference_number
   AND n.entry_date       = cr.entry_date
   AND n.amount           = cr.amount
),
candidates AS (
  SELECT
    s.*,
    (SELECT transaction_number_prefix FROM public.company_config LIMIT 1)                  AS prefix,
    (SELECT COALESCE(transaction_number_separator, '') FROM public.company_config LIMIT 1) AS sep,
    (SELECT transaction_number_length FROM public.company_config LIMIT 1)                  AS pad,
    CASE WHEN (SELECT transaction_number_use_year_month FROM public.company_config LIMIT 1)
         THEN to_char(s.entry_date,'YYYYMM') ELSE NULL END AS ym_str
  FROM src s
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.reference_number = s.reference_number
      AND t.entry_date       = s.entry_date
      AND t.amount           = s.amount
      AND t.debit_account_code::text  = s.debit_account_code
      AND t.credit_account_code::text = s.credit_account_code
  )
),
existing_max AS (
  SELECT
    c.ym_str,
    COALESCE(MAX(substring(t.entry_number FROM '[0-9]+$')::int), 0) AS max_suffix
  FROM candidates c
  LEFT JOIN public.transactions t
    ON (
      (c.ym_str IS NULL AND t.entry_number LIKE c.prefix || c.sep || '%')
      OR
      (c.ym_str IS NOT NULL AND t.entry_number LIKE c.prefix || c.sep || c.ym_str || c.sep || '%')
    )
  GROUP BY c.ym_str
),
numbered AS (
  SELECT
    c.*,
    row_number() OVER (PARTITION BY c.ym_str ORDER BY c.entry_date, c.reference_number, c.amount) AS rn
  FROM candidates c
),
final AS (
  SELECT
    n.*,
    (e.max_suffix + n.rn) AS seq_num,
    CASE
      WHEN n.ym_str IS NULL
        THEN n.prefix || n.sep || lpad((e.max_suffix + n.rn)::text, n.pad, '0')
      ELSE n.prefix || n.sep || n.ym_str || n.sep || lpad((e.max_suffix + n.rn)::text, n.pad, '0')
    END AS entry_number
  FROM numbered n
  JOIN existing_max e ON e.ym_str IS NOT DISTINCT FROM n.ym_str
)
INSERT INTO public.transactions (
  entry_date, entry_number, reference_number,
  description, amount,
  debit_account_id, debit_account_code, debit_account_name,
  credit_account_id, credit_account_code, credit_account_name,
  classification_id, work_item_id, expenses_category_id,
  org_id, project_id, is_posted
)
SELECT
  f.entry_date,
  f.entry_number,
  f.reference_number,
  f.txn_description,
  f.amount,
  adebit.id,  adebit.code,  f.debit_account_name_src,
  acredit.id, acredit.code, f.credit_account_name_src,
  tc.id, wi.id, ec.id,
  f.org_id, f.project_id, FALSE
FROM final f
JOIN public.accounts adebit  ON adebit.code::text  = f.debit_account_code
JOIN public.accounts acredit ON acredit.code::text = f.credit_account_code
LEFT JOIN public.transaction_classification tc ON tc.code::text = f.classification_code
LEFT JOIN public.work_items wi                   ON wi.code::text = f.work_item_code
LEFT JOIN public.expenses_categories ec         ON ec.code::text = f.expenses_code;
```

6) Final verification
```sql path=null start=null
-- Remaining corrected rows to insert (should be 0)
WITH to_insert AS (
  SELECT 1
  FROM staging.trx_corrections c
  WHERE c.new_debit_code IS NOT NULL
    AND c.new_credit_code IS NOT NULL
    AND c.new_debit_code::text IS DISTINCT FROM c.new_credit_code::text
    AND NOT EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.reference_number = c.reference_number
        AND t.entry_date       = c.entry_date
        AND t.amount           = c.amount
        AND t.debit_account_code::text  = c.new_debit_code
        AND t.credit_account_code::text = c.new_credit_code
    )
)
SELECT COUNT(*) AS corrected_rows_remaining FROM to_insert;

-- Total transactions
SELECT COUNT(*) AS transactions_rows FROM public.transactions;

-- Reference numbers present in staging vs facts
SELECT 'staging_with_ref' AS src, COUNT(*) FROM staging.trx_normalized WHERE reference_number IS NOT NULL
UNION ALL
SELECT 'facts_with_ref', COUNT(*) FROM public.transactions WHERE reference_number IS NOT NULL;
```

Notes and decisions
- Mapping B chosen based on data (e.g., 1210 likely asset/cash), and verified with heuristic checks
- Amounts: cleaned Arabic/Persian numerals and separators before casting
- Safe fill-by-reference_number used to populate missing codes when unique per RN; unresolved rows logged
- Duplicates dropped deterministically (kept the one with more names); duplicates logged in staging.trx_duplicates_dropped
- STRICT accounts enforced via staging.accounts_delta; inserted missing accounts with enum + ltree casting and skipping generated columns (e.g., normal_balance)
- Master data upserts are org-aware; classification names disambiguated by appending [code] when needed to satisfy unique (org_id, name)
- Transactions numbering: computed inline per company_config (prefix/ym/length/separator)
- Trigger note: If your transactions trigger expects organization_id instead of org_id, either disable triggers during insert (re-enable after), or update the function to use org_id

Optional follow-ups
- Denormalized view for reporting (v_transactions_enriched)
```sql path=null start=null
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

- Fix the default org/project trigger to use correct column names per table
```sql path=null start=null
CREATE OR REPLACE FUNCTION public.set_default_organization_and_project()
RETURNS trigger AS $$
DECLARE
  v_org     uuid;
  v_project uuid;
BEGIN
  SELECT default_org_id, default_project_id
  INTO v_org, v_project
  FROM public.company_config
  LIMIT 1;

  IF TG_TABLE_NAME = 'transactions' THEN
    IF NEW.org_id IS NULL THEN NEW.org_id := v_org; END IF;
    IF NEW.project_id IS NULL THEN NEW.project_id := v_project; END IF;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'transaction_classification' THEN
    IF NEW.org_id IS NULL THEN NEW.org_id := v_org; END IF;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'work_items' THEN
    IF NEW.org_id IS NULL THEN NEW.org_id := v_org; END IF;
    RETURN NEW;

  ELSIF TG_TABLE_NAME = 'expenses_categories' THEN
    IF NEW.org_id IS NULL THEN NEW.org_id := v_org; END IF;
    RETURN NEW;

  ELSE
    RETURN NEW;
  END IF;
END
$$ LANGUAGE plpgsql;
```

Quick checklist (when you come back)
- [ ] Fill staging.trx_corrections with new_debit_code/new_credit_code
- [ ] Validate (rows_ready > 0, all new codes exist)
- [ ] Apply corrected insert block
- [ ] Final verification (corrected_rows_remaining = 0, reference numbers present)
- [ ] Optional: create v_transactions_enriched view
- [ ] Optional: update/align the default org/project trigger

If you prefer, share 5–10 rows (reference_number, entry_date, amount, new_debit_code, new_credit_code), and I will generate the exact UPDATE statements ready to paste.

