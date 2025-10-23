# Accounting System: Fiscal Management & Construction Dashboards

This document captures the plan, progress, and remaining work for the recent enhancements across Fiscal Management, Construction dashboards, and build infrastructure.

## 1) Goals and Scope

- Elevate the Fiscal Management experience with clear workflows: Opening Balance Import, Period Management, Validation, Reconciliation, and Approvals.
- Provide a Fiscal Year Dashboard with quick links to key tasks and status snapshots.
- Scaffold Construction dashboards for progress, costs, compliance, subcontractors, and materials.
- Improve build reliability (dev and production), while avoiding SQL changes unless explicitly approved.

## 2) High-Level Plan

1. Routing and Navigation
   - Add new routes for fiscal features and wire them into the sidebar under Fiscal.
   - Provide a Fiscal Year Dashboard with Quick Links to accelerate workflows.

2. Opening Balances & Period Closing UX
   - Opening Balance Import page (upload, validate, import)
   - Period Manager with details drawer (checklists, validation, reconciliation, lock/unlock, close with notes)
   - Validation Rule Manager (scaffold)
   - Reconciliation Dashboard (scaffold)
   - Approval Workflow and Approvals Center (scaffolds)
   - Audit Trail (scaffold)

3. Construction Analytics
   - Dashboard with Project Phase Progress and Cost Performance
   - Compliance Monitor, Subcontractor Management, Materials Dashboard
   - Date range controls and persisted filters

4. Build System & Developer Experience
   - Ensure dev server starts reliably (port fallback & HMR auto-port)
   - Fix production build issues (Supabase postgrest wrapper CJS/ESM interop)
   - Keep SQL paused unless approved; if migrations are introduced, pause and request explicit verification before execution

## 3) Work Completed

- Routes and Lazy Imports
  - Added/wired routes for:
    - /fiscal/dashboard (Fiscal Year Dashboard)
    - /fiscal/opening-balance-import
    - /fiscal/approval-workflow (scaffold)
    - /fiscal/approvals (scaffold)
    - /fiscal/validation-rules (scaffold)
    - /fiscal/reconciliation (scaffold)
    - /fiscal/audit-trail (scaffold)
    - /fiscal/construction

- Fiscal Year Dashboard
  - Quick Links to all fiscal pages above
  - Status snapshot tiles (open/locked/closed/imports/warnings/errors)
  - Loading and error states for data fetching

- Period Manager Enhancements
  - Details drawer with:
    - Checklists (generate default, escalate overdue)
    - Validation summary with errors/warnings lists
    - Balance Reconciliation panel + CSV export
  - Lock/unlock/close actions with notes

- Opening Balance Import Page
  - UI scaffolding for upload/validate/import flow (stub actions retained)
  - Client-side Excel/CSV preview (first 100 rows) and local validation (missing account_code, invalid amount, zero warnings)
  - Column mapping UI to select headers for account_code, amount, cost_center_code, project_code; normalization helper + tests
  - Dry-run simulation (no SQL) to preview outcomes client-side before import

- Additional Fiscal Scaffolds
  - Validation Rule Manager
  - Reconciliation Dashboard
  - Approval Workflow
  - Approvals Center
  - Opening Balance Audit Trail

- Construction Dashboard
  - Project Phase Progress chart
  - Cost Performance analytics (date range controls, persisted)
  - Compliance Monitor, Subcontractor Management, Materials dashboards

- Build System Improvements
  - Dev server: allow port fallback and HMR auto-port on Windows/OneDrive setups
  - Production build: fixed CJS/ESM interop by patching Supabase postgrest wrapper import via a small Vite transform
  - Moved CSS @import to top of WorkItemsTree.css to satisfy PostCSS
  - CI: Added GitHub Actions workflow (.github/workflows/ci.yml) to lint, type-check, build, and run migration check

- Performance Utilities
  - Lightweight ApplicationPerformanceMonitor service and Performance Dashboard (basic event list)

- Code Cleanups
  - Removed duplicate lazy imports and duplicate routes
  - Fixed stray JSX fragments and syntax issues (FiscalPeriodManager, ConstructionDashboard)

## 4) Files of Interest (selected)

- Routing: src/App.tsx
- Navigation: src/data/navigation.ts
- Fiscal Pages:
  - src/pages/Fiscal/FiscalYearDashboard.tsx
  - src/pages/Fiscal/OpeningBalanceImport.tsx
  - src/pages/Fiscal/FiscalPeriodManager.tsx
  - src/pages/Fiscal/ApprovalNotificationCenter.tsx
  - src/pages/Fiscal/OpeningBalanceApprovalWorkflow.tsx
  - src/pages/Fiscal/ValidationRuleManager.tsx
  - src/pages/Fiscal/BalanceReconciliationDashboard.tsx
  - src/pages/Fiscal/OpeningBalanceAuditTrail.tsx
  - src/pages/Fiscal/ConstructionDashboard.tsx
- Components & Services (selected):
  - src/components/Fiscal/* (panels, charts, controls)
  - src/services/* (PeriodClosingService, OpeningBalanceImportService, Construction services)
- Build Config:
  - vite.config.ts (Vite plugin patch + server config)
  - src/components/WorkItems/WorkItemsTree.css (@import order)
- Perf Utility:
  - src/services/ApplicationPerformanceMonitor.ts
  - src/pages/PerformanceDashboard.tsx

## 5) SQL Changes Policy

- Rule: Pause and request user verification before executing or proposing SQL.
- Note: A set of migration files existed in the working tree and were committed upon request to “commit everything now.” No automatic execution was performed.
- Next time we introduce new SQL, we will:
  - Propose a single migration per feature
  - Pause and present SQL in a properly formatted SQL block for review
  - Only proceed after approval

## 6) Remaining Tasks

- Fiscal Year Dashboard
  - Wire real status data where placeholders remain (ensure proper Supabase calls and org/year context)
  - Add unit/integration tests for quick links and status summaries

- Opening Balance Import
  - Implement file parsing and staged validation preview
  - Implement batched import with progress tracker and rollback on failure
  - Add error reporting and downloadable validation results

- Period Closing
  - Expand checklist editing and status updates
  - Export options (CSV/JSON) for validation results (some done; extend coverage)
  - Add tests for closing flows and reconciliation calculations

- Construction
  - Connect all dashboards to finalized APIs/services
  - Add loading/error states and empty placeholders where missing
  - Add tests for date range persistence and derived monthly actuals

- Build/Infra
  - Revisit Supabase wrapper patch after upgrading dependencies; remove Vite transform once upstream interop is resolved
  - CI: add checks for typecheck, build, and basic UI tests (playwright/RTL)
  - Create a pre-commit hook for lint/format/tsc (optional)

- Documentation & Developer Experience
  - Add brief READMEs for each major feature directory
  - Provide a quickstart subsection with common routes and test scripts

## 7) Verification Checklist

- Dev
  - npm run dev → app renders
  - Navigate to Fiscal Year Dashboard → Quick Links route correctly
- Build
  - npm run build → succeeds
  - npm run preview → pages render from dist and navigate properly
- Tests (incremental)
  - Run unit tests for CSV utils and core services (added: opening-balance.validation test, fiscal dashboard summarizer test)

## 8) Next Steps

### 8.1 Short-term polish (implemented)
- Opening Balance Import: server validation breakdown exports (CSV/JSON per section)
- Opening Balance Import: polling fallback for job status + realtime subscription
- Opening Balance Import: Reconciliation panel with PeriodClosingService and persisted period input
- Opening Balance Import: Compact Audit Trail panel with CSV/JSON export
- ValidationResults: accordion breakdowns with counts and number formatting

### 8.2 Near-term polish (planned next)
- Make identifiers clickable and copyable in history/audit lists and breakdowns where IDs are shown
- Right-align and format numeric columns across tables (history, audit, breakdowns)
- Optional navigation from IDs to relevant pages (e.g., Account Explorer) guarded by route capabilities
- Totals footer rows in breakdown tables (sum totals, count rows)
- Add unit tests for new UI helpers (formatting, copy-to-clipboard actions)

### 8.3 Backend integration follow-ups
- Fetch more detailed audit entries when available (opening balance import lifecycle events)
- Reconciliation: add currency-awareness and per-segment reconciliation when API supports it
- Approval flow wiring for opening balances

1. Open PRs from develop → main (or maintain direct pushes if preferred)
2. Prioritize remaining tasks above; I can create issues and link them to milestones
3. Plan the next SQL-backed feature carefully with a single migration and a user approval gate

---

Prepared by: Agent Mode (AI terminal assistant)
Date: 2025-09-22
