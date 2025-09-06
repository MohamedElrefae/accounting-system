# Data migration progress and next steps — aligned with journal_import_progress.md (PostgreSQL)

This guide extends and aligns with journal_import_progress.md, preserving your established staging → normalize → validate → upsert → insert pipeline for DailyJournalR6.csv (semicolon-delimited, Arabic headers). It focuses on fixing unreadable text (�) in description, debit_account_name, and credit_account_name that appeared after the CSV import.

Tables in scope
- public.transaction_classification
- public.transactions
- Existing staging assets from prior session: staging.raw_transactions, staging.trx_normalized, staging.accounts_delta, and helper tables referenced in journal_import_progress.md

What happened
- CSV imported with a client assuming UTF-8 while the source is likely Windows-1256 (Arabic) or similar; the client replaced unknown bytes with U+FFFD (�) before sending to Postgres.
- Result: � is now stored in public.transactions and possibly public.transaction_classification. Postgres stores valid UTF-8 only; once � is stored, the original characters are lost. The fix is to re-load from the original CSV using the correct encoding and update affected rows deterministically using your existing keys (reference_number, entry_date, amount, and account codes where needed).

Plan overview
1) Diagnose quickly (counts, previews) to confirm scope.
2) Backup affected text columns.
3) Reload a fresh copy of the CSV into a temporary staging table using correct encoding and delimiter (';').
4) Map reloaded rows to your normalized keys and safely update only garbled text in facts, preserving IDs, codes, and numbering.
5) Verification: ensure zero "�" remain and UI renders Arabic text correctly.

—

Copy-ready SQL: Diagnosis and verification

Database encodings
```sql path=null start=null
SHOW server_encoding;
SHOW client_encoding;
SELECT datname, datcollate, datctype FROM pg_database WHERE datname = current_database();
```

Counts per table/column containing U+FFFD (�)
```sql path=null start=null
SELECT
  'transaction_classification' AS table_name,
  SUM((description LIKE '%�%')::int)       AS description_bad,
  SUM((debit_account_name LIKE '%�%')::int)  AS debit_bad,
  SUM((credit_account_name LIKE '%�%')::int) AS credit_bad
FROM public.transaction_classification
UNION ALL
SELECT
  'transactions' AS table_name,
  SUM((description LIKE '%�%')::int)       AS description_bad,
  SUM((debit_account_name LIKE '%�%')::int)  AS debit_bad,
  SUM((credit_account_name LIKE '%�%')::int) AS credit_bad
FROM public.transactions;
```

Preview problematic rows (facts only)
```sql path=null start=null
SELECT reference_number, entry_date, amount,
       LEFT(description, 80) AS description_preview,
       LEFT(debit_account_name, 80)  AS debit_preview,
       LEFT(credit_account_name, 80) AS credit_preview
FROM public.transactions
WHERE description LIKE '%�%' OR debit_account_name LIKE '%�%' OR credit_account_name LIKE '%�%'
ORDER BY entry_date, reference_number, amount
LIMIT 50;
```

—

Backup before changes (aligned to facts and classifications)
```sql path=null start=null
CREATE TABLE IF NOT EXISTS public.transaction_classification_text_backup AS
SELECT id, description, debit_account_name, credit_account_name, now() AS backed_up_at
FROM public.transaction_classification;

CREATE TABLE IF NOT EXISTS public.transactions_text_backup AS
SELECT id, reference_number, entry_date, amount,
       description, debit_account_name, credit_account_name,
       now() AS backed_up_at
FROM public.transactions;

SELECT 'transaction_classification_text_backup' AS table_name, COUNT(*) FROM public.transaction_classification_text_backup
UNION ALL
SELECT 'transactions_text_backup' AS table_name, COUNT(*) FROM public.transactions_text_backup;
```

—

Reload source with correct encoding (semicolon-delimited)
Option A — server-side COPY (file must be readable by the Postgres server)
```sql path=null start=null
-- Create a temporary raw table for reload (structure minimal for mapping)
CREATE TEMP TABLE stg_reload_raw (
  reference_number text,
  entry_date       date,
  amount           numeric(18,2),
  debit_account_code  text,
  credit_account_code text,
  debit_account_name_src  text,
  credit_account_name_src text,
  txn_description         text
);

-- IMPORTANT: Adjust the column order to match DailyJournalR6_mapped.csv
-- and include all required columns for your normalization if needed.
COPY stg_reload_raw
FROM '/absolute/path/to/DailyJournalR6_mapped.csv'
WITH (
  FORMAT csv,
  HEADER true,
  DELIMITER ';',
  ENCODING 'WIN1256'
);

-- Sanity check: ensure Arabic text is readable now
SELECT LEFT(txn_description, 80) AS desc_preview,
       LEFT(debit_account_name_src, 80)  AS debit_name_preview,
       LEFT(credit_account_name_src, 80) AS credit_name_preview
FROM stg_reload_raw
LIMIT 20;
```

Option B — client-side \copy (useful when server cannot access your local file)
```sql path=null start=null
\encoding WIN1256
CREATE TEMP TABLE stg_reload_raw (
  reference_number text,
  entry_date       date,
  amount           numeric(18,2),
  debit_account_code  text,
  credit_account_code text,
  debit_account_name_src  text,
  credit_account_name_src text,
  txn_description         text
);

\copy stg_reload_raw FROM 'C:/absolute/path/DailyJournalR6_mapped.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');

SELECT LEFT(txn_description, 80) AS desc_preview,
       LEFT(debit_account_name_src, 80)  AS debit_name_preview,
       LEFT(credit_account_name_src, 80) AS credit_name_preview
FROM stg_reload_raw
LIMIT 20;
```

—

Targeted, idempotent fix for garbled text in facts
This keeps your IDs, codes, and entry numbers unchanged, and only updates the text fields from correctly reloaded data. It uses the same business keys you used downstream: (reference_number, entry_date, amount) and the debit/credit codes where needed to disambiguate.

```sql path=null start=null
BEGIN;

-- 1) Limit the candidate set to only rows currently containing "�"
CREATE TEMP TABLE fix_candidates AS
SELECT t.id, t.reference_number, t.entry_date, t.amount,
       t.debit_account_code, t.credit_account_code
FROM public.transactions t
WHERE t.description LIKE '%�%'
   OR t.debit_account_name LIKE '%�%'
   OR t.credit_account_name LIKE '%�%';

-- 2) Join back to reloaded source (stg_reload_raw) to fetch good text
--    If multiple CSV rows per key exist, prefer exact match on codes, else fall back to (ref, date, amount)
WITH reload_match AS (
  SELECT r.*, 
         row_number() OVER (
           PARTITION BY r.reference_number, r.entry_date, r.amount
           ORDER BY CASE WHEN r.debit_account_code IS NOT NULL AND r.credit_account_code IS NOT NULL THEN 0 ELSE 1 END
         ) AS pref
  FROM stg_reload_raw r
)
UPDATE public.transactions t
SET description         = COALESCE(r.txn_description, t.description),
    debit_account_name  = COALESCE(r.debit_account_name_src, t.debit_account_name),
    credit_account_name = COALESCE(r.credit_account_name_src, t.credit_account_name)
FROM fix_candidates c
LEFT JOIN stg_reload_raw r
  ON r.reference_number = c.reference_number
 AND r.entry_date       = c.entry_date
 AND r.amount           = c.amount
 AND (r.debit_account_code  IS NOT DISTINCT FROM c.debit_account_code
   OR r.credit_account_code IS NOT DISTINCT FROM c.credit_account_code)
WHERE t.id = c.id;

-- 3) Verification: ensure no remaining replacement characters
SELECT COUNT(*) AS remaining_with_replacement
FROM public.transactions
WHERE description LIKE '%�%'
   OR debit_account_name LIKE '%�%'
   OR credit_account_name LIKE '%�%';

COMMIT;
```

Notes
- If the update does not fully resolve the characters, re-check that the CSV truly displays Arabic correctly after setting ENCODING and DELIMITER as above.
- If some rows cannot be matched by (ref, date, amount), add additional join keys present in your mapped CSV.

—

Optional: repair transaction_classification text similarly
If your classification names or descriptions are also affected, reload a small CSV or prepare a mapping table of (code/name) with clean UTF-8 and update only rows containing "�".

```sql path=null start=null
-- Example skeleton (adjust keys/columns to your actual classification source)
-- CREATE TEMP TABLE stg_classification_fix (code text, name_clean text, description_clean text);
-- \encoding WIN1256
-- \copy stg_classification_fix FROM 'C:/path/to/transaction_classification_fix.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');

UPDATE public.transaction_classification tc
SET name        = COALESCE(f.name_clean, tc.name),
    description = COALESCE(f.description_clean, tc.description)
FROM stg_classification_fix f
WHERE (tc.description LIKE '%�%' OR tc.name LIKE '%�%')
  AND f.code::text = tc.code::text;
```

—

Post-fix verification
```sql path=null start=null
-- Recount affected rows
SELECT
  'transactions' AS table_name,
  SUM((description LIKE '%�%')::int)       AS description_bad,
  SUM((debit_account_name LIKE '%�%')::int)  AS debit_bad,
  SUM((credit_account_name LIKE '%�%')::int) AS credit_bad
FROM public.transactions
UNION ALL
SELECT
  'transaction_classification' AS table_name,
  SUM((description LIKE '%�%')::int)       AS description_bad,
  SUM((debit_account_name LIKE '%�%')::int)  AS debit_bad,
  SUM((credit_account_name LIKE '%�%')::int) AS credit_bad
FROM public.transaction_classification;

-- Spot check a few rows
SELECT reference_number, entry_date, amount,
       LEFT(description, 80), LEFT(debit_account_name, 80), LEFT(credit_account_name, 80)
FROM public.transactions
ORDER BY entry_date DESC, reference_number
LIMIT 20;
```

—

Why this aligns with journal_import_progress.md
- Respects your staging pipeline and keys from DailyJournalR6_mapped.csv.
- Uses only text updates in facts; does not change account IDs, codes, numbering, or posting flags.
- Can be repeated safely (idempotent), and can be narrowed by date/reference if desired.

UI integration reminder
- After DB fix, confirm API responses are UTF-8 and that the UI uses fonts that support Arabic and your unified token theme (no inline styles). If text still appears as boxes, verify font fallback and RTL support.

Checklist (copy-ready)
- [ ] Step 0 — Remap source CSV using the provided mapping:
      PowerShell:
      python scripts/remap_daily_journal.py `
        --source "DailyJournalR6.csv" `
        --mapping "mappings/daily_journal_r6_mapping.json" `
        --output "DailyJournalR6_mapped_fixed.csv" `
        --source-encoding "cp1256" `
        --normalize-numeric
- [ ] Run Diagnosis blocks and confirm scope.
- [ ] Run Backup block.
- [ ] Reload CSV with correct ENCODING and DELIMITER into stg_reload_raw using DailyJournalR6_mapped_fixed.csv.
- [ ] Run Targeted fix UPDATE.
- [ ] Run Post-fix verification (zero rows with "�").
- [ ] Validate UI rendering.

