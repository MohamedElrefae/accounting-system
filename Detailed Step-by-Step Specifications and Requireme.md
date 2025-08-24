<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Detailed Step-by-Step Specifications and Requirements for UI Integration Plan

Based on my review of Warp AI's UI integration plan and your request, I've created a comprehensive, step-by-step implementation plan. This plan incorporates all the strengths of the original while addressing the recommended improvements. It ensures **full synchronization** with your existing app and database by:

- Explicitly referencing and integrating with current components (e.g., AuthProvider, useAuth hook, PermissionGuard, usePermissions hook from previous implementations).
- Leveraging existing Supabase setup (e.g., RLS, audit logs, user roles).
- Focusing on Arabic RTL support, enterprise-grade UX, and construction-specific features.
- Assuming you will provide the full database schema/content via SQL dump (as mentioned—you can run and paste it here for verification). I'll include placeholders for DB sync checks in each step.

The plan is divided into phases with **detailed steps**, **requirements**, **deliverables**, **verification**, and **sync checks**. It follows an iterative approach: foundations first, then core screens, components, performance, testing, and roadmap. Use your existing tech stack: React + Vite + Tailwind CSS + Supabase JS client + React Query + React Hook Form + react-toastify.

**Assumptions and Prerequisites**:

- Existing app structure: AuthContext, PermissionGuard, usePermissions hook, Supabase client in `src/lib/supabase.js`.
- Database: Assumes tables like `user_profiles`, `roles`, `permissions`, `audit_logs` exist. Provide SQL dump if needed for exact field matching.
- Currency: Default to SAR with multi-currency readiness.
- Localization: Use i18next or a simple JSON file for Arabic strings (e.g., `i18n.js` with RTL dir="rtl").
- Testing: Use Jest + React Testing Library for unit/integration; Cypress for E2E.

If you paste the SQL dump here, I can refine this plan further for exact field sync.

## **Phase 1: Foundations (Sync Existing Auth and Setup)**

**Goal**: Establish core integration with existing systems, including auth, state management, and API wrappers. Ensure RTL and Arabic support from the start.

### Step 1.1: Enhance Authentication Integration

- **Specifications**: Extend existing AuthProvider to include organization context (e.g., fetch user organizations from a new `organizations` table or extend `user_profiles`). Add MFA setup flow using Supabase's MFA API. Implement session refresh every 5 minutes and auto-logout after 15 minutes inactivity with a warning modal (use `useEffect` with timers).
- **Requirements**:
    - Use `useAuth` hook for user data.
    - Fetch organizations via Supabase query: `supabase.from('organizations').select('*').eq('user_id', user.id)`.
    - Arabic modal text: "سيتم تسجيل الخروج تلقائيًا بعد 30 ثانية بسبب عدم النشاط".
    - Sync Check: Ensure ties to existing `user_roles` for role-based MFA enforcement (e.g., mandatory for managers).
- **Deliverables**: Updated `AuthContext.jsx` with organization state and MFA component.
- **Verification**: Test login → organization fetch → MFA prompt; confirm auto-logout triggers.
- **DB Sync**: Query existing `user_profiles` for organization links (e.g., add `organization_id` if missing). Paste SQL dump to verify fields like `manager_id`.


### Step 1.2: Set Up State Management and API Wrappers

- **Specifications**: Use Zustand or React Context for global state (e.g., selected organization). Create custom hooks like `useSupabaseQuery` wrapping React Query for data fetching with caching (staleTime: 5min). Add error handling with Arabic messages (e.g., map "RLS violation" to "غير مصرح لك بالوصول إلى هذه البيانات").
- **Requirements**:
    - Infinite scrolling support for large datasets.
    - Optimistic updates for mutations (e.g., account creation).
    - RTL: Wrap app in `<div dir="rtl">` and use CSS for right-aligned text.
    - Sync Check: Integrate with existing `usePermissions` for query guards (e.g., skip if !hasPermission('accounts.read')).
- **Deliverables**: `useSupabaseQuery.js` hook; global state store.
- **Verification**: Mock query → check caching, error toasts in Arabic, permission blocks.
- **DB Sync**: Verify against dumped tables (e.g., ensure queries match `accounts` schema). Paste dump to confirm no conflicts.


### Step 1.3: Implement Session Management Additions

- **Specifications**: Add warning modal component for inactivity (use react-modal with Tailwind). Refresh JWT via Supabase API on activity.
- **Requirements**: Timer-based (e.g., `setTimeout`); customizable timeout via env (VITE_SESSION_TIMEOUT).
- **Deliverables**: `InactivityModal.jsx`.
- **Verification**: Simulate inactivity → modal appears; activity resets timer.
- **DB Sync**: Log inactivity events to existing `audit_logs` table.


## **Phase 2: Core Screens**

**Goal**: Build essential views, fully synced with existing auth and DB. Use Tailwind for responsive, dark-mode-ready design with RTL.

### Step 2.1: Chart of Accounts Screen

- **Specifications**: Dashboard page with hierarchical tree view (react-arborist for expand/collapse, virtualized rendering). Include search bar (debounced, supports Arabic/English). Add filters for type/status/project-linked fields. Drag-and-drop for reparenting with confirmation modal.
- **Requirements**:
    - Data: Fetch via `useSupabaseQuery` calling `get_account_tree` function.
    - Validation: Prevent reparenting cycles (DB check); highlight non-postable accounts.
    - Construction-Specific: Filter by cost center placeholders (stub for now).
    - RTL: Right-aligned tree icons/text; Arabic tooltips (e.g., "سحب وإفلات لإعادة التصنيف").
    - Sync Check: Guard with PermissionGuard (e.g., edit if hasPermission('accounts.manage')).
- **Deliverables**: `ChartOfAccounts.jsx` with tree and filters.
- **Verification**: Load tree → search → drag-drop → confirm DB update.
- **DB Sync**: Query dumped `accounts` table for hierarchy; ensure parent_id matches.


### Step 2.2: Journal Entry Editor Screen

- **Specifications**: Form for drafting entries with line items (account picker, debit/credit fields). Auto-calculate balance (highlight imbalances in red). Post/void buttons with confirmations. Draft saving to localStorage.
- **Requirements**:
    - Form: React Hook Form + yup (balance validation: debits === credits).
    - Account Picker: Modal with tree search (filter postable only).
    - Construction-Specific: Add project code field (validated against DB).
    - RTL: Right-aligned inputs/labels; Arabic validation messages.
    - Sync Check: Use existing audit logs for post actions; guard posting with permissions.
- **Deliverables**: `JournalEntryEditor.jsx`.
- **Verification**: Create unbalanced entry → error; balance and post → DB insert.
- **DB Sync**: Check dumped journal tables (if exist) or add if missing.


### Step 2.3: General Ledger and Trial Balance/Reports Screens

- **Specifications**: Ledger: Filtered table (account/date) with running balances and links to details. Trial Balance: Interactive table (ag-grid/TanStack) with as-of-date snapshots, exports (CSV/PDF via jsPDF), and simple charts (Chart.js).
- **Requirements**:
    - Data: Call DB functions like `get_account_balances_as_of`.
    - Visuals: Color-coded debits/credits; multi-currency display.
    - Construction-Specific: Filter by cost centers/projects.
    - RTL: Right-aligned tables/charts; Arabic export filenames.
    - Sync Check: Integrate PermissionGuard for exports (e.g., 'reports.export').
- **Deliverables**: `GeneralLedger.jsx`, `TrialBalance.jsx`.
- **Verification**: Filter ledger → export; generate report → match DB balances.
- **DB Sync**: Verify against dumped views/functions; paste dump for snapshot queries.


## **Phase 3: Components/UX**

**Goal**: Build reusable, polished components synced with existing hooks.

### Step 3.1: Account Picker and Money Input

- **Specifications**: Modal picker with tree hierarchy, searchable (debounce 300ms). Money Input: react-currency-input-field with SAR formatting, multi-currency dropdown (fetch rates via Edge Function).
- **Requirements**: Arabic search; tooltips for balances. Sync: Use usePermissions for access.
- **Deliverables**: `AccountPicker.jsx`, `MoneyInput.jsx`.
- **Verification**: Search → select; input amount → format correctly.
- **DB Sync**: Query accounts for picker data.


### Step 3.2: Toasts, Errors, and Global Loading

- **Specifications**: Centralized handler for errors (map to Arabic); skeletons for loading (react-loading-skeleton).
- **Requirements**: RTL toasts; log to audit table. Sync: Tie to existing toastify setup.
- **Deliverables**: `ErrorHandler.js`.
- **Verification**: Trigger error → Arabic toast; loading state shows skeleton.
- **DB Sync**: Ensure error logs insert into `audit_logs`.


## **Phase 4: Performance and Optimization**

- **Specifications**: Use React Query infinite scrolling/caching; memoize components; query batching.
- **Requirements**: Rate limit API calls; realtime subscriptions for balances.
- **Deliverables**: Optimized hooks.
- **Verification**: Load large tree → no lag; monitor with React Profiler.
- **DB Sync**: Optimize queries based on dump (e.g., add indexes).


## **Phase 5: Testing/Verification**

- **Specifications**: Unit (Jest for components); Integration (workflows); E2E (Cypress for RTL/role scenarios); Performance (Lighthouse); Accessibility (axe-core).
- **Requirements**: Cover edge cases like multi-currency, RLS violations.
- **Deliverables**: Test suites.
- **Verification**: 100% coverage; all tests pass.
- **DB Sync**: Mock DB with dump data for tests.


## **Phase 6: Roadmap**

- **Specifications**: Sprints for extensions (e.g., mobile sync, AI categorization).
- **Requirements**: Prioritize construction needs like project integration.
- **Deliverables**: Updated plan doc.
- **Verification**: Align with business goals.

This plan ensures full sync—implement iteratively, testing at each step. Paste your SQL dump for precise adjustments!

