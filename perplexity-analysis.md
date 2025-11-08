# Accounting Enterprise Project Snapshot

## 1. Structure Highlights
- App router entry + RTL root layout in `src/app/layout.tsx` with `Tajawal` font, `ThemeProvider`, and Sonner toaster.
- Dashboard area served by `src/app/(dashboard)/layout.tsx`, wrapping children in the `AppShell` shell after loading Supabase profile data.
- Core UI tokens in `tailwind.config.js` extending semantic colors, radii, and animations.
- Accounts tree feature housed under `src/app/(dashboard)/main-data/accounts-tree/` with server actions, hooks, and form components.

## 2. Legacy Feature Parity

| Feature | Status | Notes |
| --- | --- | --- |
| Accounts Tree unified CRUD | **Partially rebuilt** | New hook/controller manages nodes, dialogs, and Supabase calls; form supports layout customization and RTL fields. |
| Journals list | **Basic listing only** | Lists Supabase journal entries with filters; creation wizard (`/transactions/journals/new`) still missing. |
| Approvals dashboard | **Placeholder** | Falls back to mocked data when Supabase table empty; full workflow pending. |
| Auth login | **Functional** | Supabase password login with RTL form and error handling. |
| Reporting, settings, project cost tracking | **Not implemented** | Directory stubs exist but no production code. |

## 3. Planned / Missing Work

| Area | Gap | Priority |
| --- | --- | --- |
| Shadcn component expansion & layout primitives | Roadmap Phase 2 tasks outstanding (alerts, navigation, modals). | High |
| Journals creation wizard & posting flow | Not yet built; roadmap Phase 3 item 1. | Critical |
| Approvals workflow with audit trail | Planned in roadmap Phase 3 item 2; only summary cards today. | Critical |
| Project cost tracking views & reporting suite | Roadmap Phase 3 items 3-4; no UI yet. | High |
| React Query integration & testing stack | Phase 3/5 tasks; package.json currently lacks tanstack/react-query. | Medium |
| CI/CD, monitoring, E2E tests | Phase 5 roadmap; none configured yet. | Medium |

## 4. Architecture Overview

### Design System
- Semantic theming via CSS variables in `globals.css`, covering light/dark palettes, component surfaces, chart colors, and radii.
- Tailwind extends those tokens, container sizes, and animation utilities for accordion patterns.
- Shadcn setup (`components.json`) points to `src/components/ui`, using New York style and lucide icons.
- Layout enforces RTL, Arabic typography, and theme switching in the root layout.

### Data Fetching & Caching
- Supabase interactions happen through server components and actions (`createSupabaseServerClient`, `createSupabaseRouteHandlerClient`).
- No TanStack Query or other caching layer yet; hooks manage local state and refresh manually.

### State Management
- Complex state handled via custom hooks (`useAccountsTree`, `useAccountForm`) storing dialog drafts, layout preferences, and validation logic with local storage persistence.
- No global store (Zustand/Redux) detected; state remains feature-local.

### Role-Based Access / Middleware
- Middleware guards protected paths, checks Supabase session, and updates membership `last_active_at` via service-role client.
- Dashboard layout fetches user profile/role to hydrate `AppShell`.

## 5. Technical Issues & Next Steps

| Issue | Impact | Suggested Fix |
| --- | --- | --- |
| Missing caching layer | Re-fetching tree data on every interaction; no centralized cache. | Introduce TanStack Query with SSR hydration per roadmap. |
| Service role usage in edge middleware | Potential key leakage and costly calls on every request. | Move `updateLastActive` to server action/API with RLS-safe RPC. |
| Major features absent (reports, approvals workflow, journals wizard) | Blocks parity with legacy system. | Deliver roadmap Phase 3 milestones first. |
| Lack of automated testing | Higher regression risk. | Bootstrap Vitest + Testing Library; plan Playwright in Phase 5. |
| README still default | Onboarding confusion. | Update with Supabase/env setup and new architecture notes. |

---

*Prepared for import into Perplexity for further analysis.*
