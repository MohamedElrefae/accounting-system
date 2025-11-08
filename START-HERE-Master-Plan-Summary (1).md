# 🎯 Integration-First Plan — Vite + MUI + Supabase + RTL/Arabic

This replaces the previous Next.js/Tailwind/CODEX summary with a plan aligned to your stack, rules, and current codebase.

---

## What You Now Have (Aligned)
- Vite + React 18 + TypeScript + MUI 5 (Emotion) with unified tokens and RTL (stylis-plugin-rtl)
- Supabase Postgres with RLS and multi-tenant org_id
- React Query patterns, Vitest/Playwright, Vercel deploy
- This plan embeds VERIFY-first SQL and avoids schema assumptions

---

## Phases and Deliverables (30 days)

Phase 1 (Days 1–3): Baseline & Schema Sync
- Run schema discovery SQL; confirm org_id, RLS, functions/triggers
- Lock smoke e2e “happy paths” (Transactions, Reports, Inventory, Documents)
- Deliverables: Schema report, red/yellow/green dashboard, CI green

Phase 2 (Days 4–8): Theme/RTL/Arabic Unification
- Refactor inline styles to use tokens.ts and theme.ts; ensure RTL correctness
- Verify Arabic numerals/exports via ArabicTextEngine on key flows
- Deliverables: Theme compliance report, LTR/RTL screenshots

Phase 3 (Days 9–12): RBAC & RLS Parity
- Ensure UI permissions map 1:1 to Supabase policies; gate sensitive UI
- Deliverables: Permission coverage matrix; policy VERIFY SQL passing

Phase 4 (Days 13–17): Transactions + Line Items Hardening
- Complete/verify transaction_lines migration, totals triggers, and UI alignment
- Deliverables: Passing totals/consistency checks; UX video of entry→post→reports

Phase 5 (Days 18–21): Approvals, Documents, Inventory Integration
- Verify approvals workflow end-to-end; documents RLS and edge functions; inventory posting
- Deliverables: E2E recordings; policy verification green

Phase 6 (Days 22–25): Reports Reconciliation + Performance
- Reconcile TB/GL/BS/PL with VERIFY SQL; add missing React Query caching
- Deliverables: Consistency tests green; bundle/perf report

Phase 7 (Days 26–28): Tests, CI, Release
- Expand Vitest and Playwright; stabilize CI
- Deliverables: Coverage report; stable CI

Phase 8 (Days 29–30): Deployment & Runbook
- Vercel deploy; Supabase migrations with APPLY/VERIFY gates; rollback plan
- Deliverables: Production URL, runbook, handover

---

## Required SQL Blocks (Run in Supabase)

Schema Discovery (Read-only)
```sql
-- VERIFY: list tables under public with row counts (quick health)
select table_name,
       (xpath('/row/cnt/text()', xml_count))[1]::text::bigint as row_count
from (
  select table_name,
         query_to_xml(format('select count(*) as cnt from %I.%I', table_schema, table_name), false, true, '') as xml_count
  from information_schema.tables
  where table_schema = 'public'
) t
order by row_count desc nulls last;
```

RLS and Policies
```sql
-- VERIFY: RLS status and policies per table
select rt.schemaname, rt.tablename, rt.rowsecurity,
       p.policyname, p.cmd, p.permissive, p.roles
from pg_catalog.pg_tables rt
left join pg_catalog.pg_policies p
  on p.schemaname = rt.schemaname and p.tablename = rt.tablename
where rt.schemaname = 'public'
order by rt.tablename;
```

org_id Consistency
```sql
-- VERIFY: columns named org_id exist where expected
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public' and column_name='org_id'
order by table_name;
```

Functions/Triggers referencing transactions and line items
```sql
-- VERIFY: functions touching transactions/lines
select n.nspname as schema, p.proname as function,
       pg_get_functiondef(p.oid) like '%transaction_line%' as touches_line_items
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and (p.proname ilike '%transaction%' or p.proname ilike '%line%');
```

Trial Balance/GL sanity
```sql
-- VERIFY: sample TB vs GL totals alignment (adjust to your views)
select 'tb_total' as k, sum(debit - credit) as v from public.trial_balance_all_levels
union all
select 'gl_total' as k, sum(debit - credit) from public.gl_account_summary;
```

Approvals/documents coverage
```sql
-- VERIFY: approvals and documents RLS present
select tablename, policyname from pg_policies
where schemaname='public' and (tablename ilike '%approval%' or tablename ilike '%document%')
order by tablename;
```

Proceed only when VERIFY queries are satisfactory or action items are recorded.

---

## Mandatory UI/Theming Guardrails
- Use src/theme/tokens.ts and src/styles/theme.ts; no inline theming
- Ensure RTL (Arabic) correctness; wrap app with RtlCacheProvider
- Gate actions with WithPermission and permission constants; never show forbidden actions
- Keep React Query keys/caching/invalidation consistent

---

## Tooling and Costs (Adjusted)
- AI agent (auto) for complex refactors/SQL audits where useful
- Retain existing CI: lint, typecheck, build, tests; expand Vitest/Playwright
- Optional: vite-plugin-pwa for offline caching

---

## Start Immediately (Vite stack)
- Open the repo; run lint, typecheck, tests; ensure CI badge green
- Run the Schema Discovery VERIFY SQL above, record findings
- Begin Phase 2 audits to remove inline styles and enforce tokens + RTL

---

## Success Criteria
- RLS parity with UI permissions; VERIFY SQL passing
- RTL/Arabic correctness across pages; Arabic exports validated
- Transactions/lines totals consistency; reconciled reports
- CI stable; production deploy with runbook
