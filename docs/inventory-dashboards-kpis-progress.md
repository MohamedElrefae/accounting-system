# Inventory Dashboards & KPIs — Plan and Progress

Last updated: 2025-10-06
Location: docs/inventory-dashboards-kpis-progress.md

## Scope
Build executive and operational dashboards for Inventory with KPIs, trends, and drill-throughs. KPIs include: current valuation (by project/location), ageing at a glance, movement volatility, stock turns, days on hand, low stock alerts, and reconciliation status.

## Objectives
- KPI cards with org-scoped filters (Material/Location/Project/date)
- Trends by month for valuation, movements, and ageing buckets
- Drill-through to existing pages (Valuation, Ageing, Movement Summary/Detail)
- Export and print-friendly summaries
- Saved presets per dashboard

## Backend (data sources)
- Reuse existing public views with labels:
  - v_inv_stock_valuation, v_inv_stock_ageing, v_inv_movement_summary, v_inv_movement_detail
- Grouped views (prepared):
  - v_inv_valuation_by_project/location/material
  - v_inv_movement_summary_project_month
  - v_inv_movement_summary_project_material_month

Potential additions (deferred until needed):
- v_inv_stock_turns (per period): turns = COGS / avg_inventory
- v_inv_days_on_hand (per period)

## UI Plan
- Route: /inventory/dashboard
- Widgets:
  - KPI bar: total valuation, total on-hand qty, ageing (>90), last month movements (in/out), open reconciliation sessions
  - Charts: valuation trend by project, movement trend (in/out), ageing distribution
  - Tables: top projects by valuation, slow-moving materials
- Filters (FilterBar): Material, Location, Project, date range
- Actions: Save preset, Load preset, Export CSV, Print

## Milestones
1) Scaffold dashboard route and layout (KPI placeholders, FilterBar) — PENDING
2) Wire KPI cards to grouped views — PENDING
3) Add trends (valuation, movement) using monthly grouped views — PENDING
4) Ageing distribution widgets — PENDING
5) Drill-through links to existing detailed pages — PENDING
6) Presets (DB) for dashboard filters — PENDING
7) Print-friendly CSS for dashboard — PENDING
8) Finalize docs and QA — PENDING

## Open Questions
- Include SP/LY comparison on dashboard widgets?
- Include threshold-based low stock alerts (leveraging materials.minimum_stock_level)?
- Data refresh cadence for heavy aggregates (matviews)?
