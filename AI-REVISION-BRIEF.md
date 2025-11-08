# AI Revision Brief — Make the Master Plan Fit This App (Vite + MUI + Supabase + RTL/Arabic)

This brief gives an AI agent the exact context and constraints to revise “START-HERE-Master-Plan-Summary (1).md” into an integration-first plan that matches the current codebase and owner rules.

—

## 1) Snapshot of the Current App (from repo analysis)
- Frontend stack: Vite + React 18 + TypeScript + MUI 5 (+ Emotion), TanStack React Query 4
- Theming: Unified tokens in `src/theme/tokens.ts`; app theme in `src/styles/theme.ts` (light/dark). Avoid inline themes.
- RTL/Arabic: `src/contexts/RtlCacheProvider.tsx` with stylis-plugin-rtl; ArabicTextEngine in `src/utils/ArabicTextEngine.ts` for numerals, export-safe formatting; many pages support Arabic.
- Navigation/pages: Extensive modules under `src/pages` (Fiscal, Inventory, Reports, Documents, Approvals, Admin, Transactions, MainData, Projects). Not a greenfield app.
- Security & permissions: Permission constants in `src/constants/permissions.ts`; UI gating via `WithPermission` HOC and `security/RequirePermission` (index). Supabase RLS/SQL policies present across `src/database/migrations` and `supabase/migrations`.
- Data layer: Supabase JS client `src/utils/supabase.ts` with env-guard; many SQL migrations and verification scripts; multi-tenant org_id; approvals engine; documents storage with edge functions; transaction line items migration and triggers.
- Tooling: Vitest unit tests, Playwright e2e (`tests/e2e`), GitHub Actions CI (lint, tsc, build, tests), Vite analyzer.
- Deploy: Vercel config present; Netlify file exists but Vercel seems primary.

Key implication: Do not switch to Next.js/Tailwind; double down on Vite + MUI + tokens + RTL.

—

## 2) Owner Rules to bake into the plan
- SQL changes must be provided in separate APPLY and VERIFY blocks, and verification must be run before continuing.
- Any UI additions/edits must use unified theme tokens, full RTL/Arabic support, and no inline themes.
- Ensure tight sync among backend (SQL/RLS), services, and UI.
- For schema info, do not assume repo; include SQL to fetch latest schema.

—

## 3) What’s wrong with the attached plan (and how to fix it)
- Mentions Next.js 14 + Tailwind + shadcn (not used) → Replace with Vite + MUI + Emotion + tokens.ts.
- Treats project as greenfield → Replace with Integration/Hardening plan leveraging existing modules.
- “OpenAI CODEX” is obsolete → Use a generic “AI agent (auto)” for complex refactors.
- Over-indexes on creating 25+ components → Focus on unifying existing components to tokens, RTL, and Arabic.
- Costs/timeline assume rebuild → Recast to a 3–4 week integration sprint with verification gates.

—

## 4) Revised Phases (Integration-first, 3–4 weeks)

Phase 1 — Baseline & Schema Sync (Days 1–3)
- Run schema discovery SQL; confirm org_id, RLS, functions, triggers, matviews status.
- Establish e2e “happy paths” for key flows (Transactions, Reports, Inventory, Documents) to lock a baseline.
- Deliverables: Schema report, red/yellow/green dashboard, CI badge green.

Phase 2 — Theme/RTL/Arabic Unification (Days 4–8)
- Audit components for inline colors/styles; refactor to consume `tokens.ts` and app theme; ensure all pages render RTL correctly.
- Verify Arabic numerals/exports via ArabicTextEngine on Reports and PDF/Excel flows.
- Deliverables: Theme compliance report, screenshots LTR/RTL, automated visual checks if feasible.

Phase 3 — RBAC & RLS Parity (Days 9–12)
- Ensure PERMISSIONS constants map 1:1 to Supabase policies; gate all sensitive UI.
- Add verification SQL to assert RLS denies/permits expected actions per role/org.
- Deliverables: Permission coverage matrix, passing policy verification SQL.

Phase 4 — Transactions + Line Items Hardening (Days 13–17)
- Finish migration to `transaction_lines` including totals triggers and child line items; align UI forms (MultiLineEditor, LineItems, TotalsFooter).
- Run provided verification SQL; fix any mismatches.
- Deliverables: Passing totals/consistency checks; UX video of entry→post→reports.

Phase 5 — Approvals, Documents, Inventory Integration (Days 18–21)
- Verify approvals workflow end-to-end; documents RLS and edge functions; inventory posting to GL.
- Deliverables: E2E recordings; policy verification SQL green.

Phase 6 — Reports Reconciliation + Performance (Days 22–25)
- Reconcile Trial Balance, GL, BS/PL using provided tests and SQL; add React Query caching where missing.
- Optional: add vite-plugin-pwa for offline caching (if desired).
- Deliverables: Consistency tests green; bundle stats; perf checklist.

Phase 7 — Tests, CI, Release (Days 26–28)
- Expand Vitest coverage and Playwright scenarios; ensure CI runs both.
- Deliverables: Coverage report; CI stable; release notes.

Phase 8 — Deployment & Runbook (Days 29–30)
- Vercel deploy; Supabase migrations with APPLY/VERIFY gates; rollback plan.
- Deliverables: Production URL, runbook, handover.

—

## 5) Required SQL blocks (copy & run in Supabase) — discovery and verification

Note: Always run VERIFY after APPLY and proceed only if results are OK.

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

Trial Balance/GL sanity (read-only)
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

Proceed only when all VERIFY queries are satisfactory or documented with action items.

—

## 6) Mandatory UI/Theming guardrails for agent
- Use `src/theme/tokens.ts` and `src/styles/theme.ts`. Do not hardcode colors/spacing.
- Ensure all pages/components render correctly in RTL (Arabic) and LTR; wrap app with `RtlCacheProvider`.
- Use `WithPermission` and permission constants to gate actions; never show forbidden actions.
- Keep React Query patterns consistent (keys, caching, invalidation).

—

## 7) Edit instructions to revise the attached plan
- Replace stack references: “Next.js 14, Tailwind, shadcn” → “Vite, MUI 5, Emotion, tokens.ts, RTL via stylis-plugin-rtl”.
- Replace “OpenAI CODEX” with “AI agent (auto)” for complex refactors or SQL audits.
- Rework phases to those in Section 4 with day ranges and concrete deliverables.
- For any DB step, include APPLY and VERIFY SQL blocks (read-only unless migration is required), per Section 5 samples.
- Add a “Schema First” section that instructs to run schema discovery before assuming table names.
- Update Tool/Cost matrix: heavy reuse of existing stack; minimal extra cost; CI already in place.

—

## 8) Ready-to-Copy Prompt for the AI Agent (to rewrite the plan)

System: You are revising a master plan for an existing enterprise app. Obey these hard rules:
- Stack is Vite + React 18 + TypeScript + MUI 5 + Emotion + TanStack Query, with unified tokens and full RTL/Arabic support. Do not propose Next.js, Tailwind, or shadcn.
- Any UI work must use `tokens.ts` and `theme.ts`, be RTL-safe, and avoid inline theming.
- Backend is Supabase Postgres with RLS. Do not assume schema from code; when schema is needed, provide SQL VERIFY queries first.
- For any database change, include separate APPLY and VERIFY SQL blocks; proceed only if VERIFY passes.
- Keep the plan integration-first, not greenfield. Align RBAC UI permissions with Supabase RLS.
- Retain existing CI (lint, typecheck, build, tests) and expand tests with Vitest/Playwright.

User context summary:
- The repo has extensive pages (Fiscal, Inventory, Reports, Documents, Approvals, Admin, Transactions), permissions constants, RTL cache provider, Arabic text engine, and many SQL migrations and verification scripts.
- Multi-tenant `org_id` is used throughout; approvals workflow and documents storage exist; transaction line items migration and totals triggers are in-progress and must be verified.

Task: Rewrite “START-HERE-Master-Plan-Summary (1).md” to:
1) Replace stack/tooling mismatches and costs, 2) adopt the phased Integration/Hardening plan with day ranges, 3) embed SQL VERIFY blocks (from templates provided), 4) add theme/RTL guardrails, 5) ensure RBAC/RLS parity and end-to-end verification gates, 6) keep a 30-day timeline.

Deliverables: A complete, execution-ready plan aligned to this codebase, with day-by-day tasks, success criteria, APPLY/VERIFY SQL where relevant, and clear handoff artifacts.

—

## 9) Optional additions
- Add vite-plugin-pwa for offline support if required by users.
- Introduce basic visual regression checks for RTL/LTR using Playwright screenshots.
